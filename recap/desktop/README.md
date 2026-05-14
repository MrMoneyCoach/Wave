# Recap Recorder (desktop)

A lightweight Electron app that records native system audio + mic and uploads the result to a Recap web app account. Use it when the browser recorder isn't an option (Safari, in-person hardware, or just for better quality on long calls).

- **macOS 13+**: native system-audio capture via ScreenCaptureKit (auto-wired through Electron's `setDisplayMediaRequestHandler`). No BlackHole / virtual audio cable needed.
- **Windows 10+**: native loopback capture.
- Signs in to the same Supabase project as the web app via email OTP. Sessions persist across restarts.
- Uploads directly to Supabase Storage (RLS-scoped to the user) and then calls the web app's transcription endpoint with a Bearer token.

## Run from source

```bash
cd recap/desktop
npm install
# Configure the connection (or do it in-app on first run):
cp ../.env.example .env
# Then in .env add (Vite-prefixed for the renderer):
#   VITE_RECAP_WEB_URL=https://your-recap.vercel.app
#   VITE_RECAP_SUPABASE_URL=https://xxxx.supabase.co
#   VITE_RECAP_SUPABASE_ANON_KEY=eyJh...
npm run dev
```

On first launch (without env vars baked in) the app will prompt for those three values and persist them in the OS app-data folder.

## Build distributables

```bash
npm run package:mac    # .dmg in release/
npm run package:win    # .exe installer in release/
```

(Unsigned by default. Add Apple/Microsoft signing creds via `electron-builder` env vars when ready to ship.)

## How it works

1. **Auth.** The renderer creates a Supabase client backed by a custom storage adapter that proxies to the Electron main process; the session is JSON-stored in `app.getPath('userData')/settings.json`.
2. **Capture.** `getDisplayMedia({ video: true, audio: true })` is intercepted by `session.setDisplayMediaRequestHandler` in `electron/main.ts`. Instead of Electron's built-in picker, we programmatically choose the primary screen and request `audio: "loopback"` — this triggers the OS-level screen-recording permission once and from then on gives us system audio. The video track is stopped immediately because we only want audio.
3. **Mix.** A `MediaStreamAudioDestinationNode` sums the screen-audio and mic streams. MediaRecorder records the mixed stream at 96 kbps opus (webm container; falls back to m4a if unsupported).
4. **Upload.** On Stop, we `POST /api/meetings` on the web app with `Authorization: Bearer <access_token>` and `source: 'desktop_app'`, then upload the blob to `recordings/<user-id>/<uuid>-<filename>` via the Supabase JS SDK, then `POST /api/meetings/:id/transcribe` to kick off Deepgram + Claude.
5. **Open on web.** When the upload finishes the app shows an "Open on web" button which uses `shell.openExternal` on the meeting URL.

## File map

```
desktop/
├── electron/
│   ├── main.ts        # window, IPC, displayMedia handler, persistent settings
│   └── preload.ts     # contextBridge exposing window.recap to renderer
├── renderer/
│   ├── App.tsx        # routing between Config / SignIn / Recorder
│   ├── Recorder.tsx   # capture + mix + upload pipeline
│   ├── supabase.ts    # client factory with persisted session adapter
│   ├── config.ts      # build-time defaults from VITE_RECAP_*
│   ├── styles.css
│   ├── main.tsx
│   └── index.html
├── vite.config.ts
└── package.json       # includes electron-builder config (mac/win targets)
```

## Privacy notes for users

- Audio never leaves your device unencrypted: uploads go straight to your Recap server's Supabase Storage bucket over HTTPS.
- The macOS camera-permission strings exist because the screen-share API umbrella-permission asks for it; no video is ever captured or stored.
- Sessions are stored in `~/Library/Application Support/Recap Recorder/settings.json` (macOS) or `%APPDATA%/Recap Recorder/settings.json` (Windows). Delete the file to fully sign out.
