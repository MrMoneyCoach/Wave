# Recap Recorder (mobile)

Expo / React Native app for capturing in-person meetings on iOS and Android. Records the device microphone, uploads to your Recap account, and triggers the same Deepgram + Claude pipeline as the web app.

**Mic-only.** iOS and Android do not let third-party apps capture system audio (i.e. the other side of a phone call) — that's an OS-level restriction, not a Recap limitation. For video calls use the web `/dashboard/record` or the desktop recorder; for in-person meetings, this app is the right tool.

## What's in it

- **Expo Router** (file-system routing, typed routes).
- **Email-OTP sign-in** against the same Supabase project as the web app. Session persists in AsyncStorage; the small server config blob lives in `SecureStore`.
- **First-run Connect screen** asks for Web URL + Supabase URL + anon key if those aren't baked into the build.
- **Recorder** built on `expo-av` — `HIGH_QUALITY` preset (m4a/AAC), pause / resume / stop, pause-aware timer.
- **Upload** reads the local recording as base64 → ArrayBuffer (the reliable way to push binary through `supabase.storage.upload` on RN), uploads to `recordings/<user-id>/<uuid>-<filename>`, then `POST /api/meetings/:id/transcribe` with a Bearer access token.
- **Home** polls in-progress meetings every 4s; tapping one opens a detail screen with the summary, first 200 transcript utterances, and an "Open on web" button for the full view.

## Run from source

```bash
cd recap/mobile
npm install
npx expo start          # iOS Simulator / Android Emulator / Expo Go
# or
npx expo run:ios        # device build (Mac required, Xcode installed)
npx expo run:android    # device build (Android Studio installed)
```

On first launch, enter your web URL + Supabase URL + anon key on the Connect screen.

## Build production binaries

Use EAS Build (Expo's free tier is fine for personal use):

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # produces an .ipa
eas build --platform android  # produces an .aab / .apk
```

Submit with `eas submit --platform ios` / `--platform android`.

## File map

```
mobile/
├── app/
│   ├── _layout.tsx          # AuthProvider + Stack header style
│   ├── index.tsx            # gate: redirects to /config | /sign-in | /home
│   ├── config.tsx           # first-run Connect form
│   ├── sign-in.tsx          # email-OTP sign-in
│   ├── home.tsx             # recordings list + Record CTA, with polling
│   ├── record.tsx           # the recorder
│   └── meeting/[id].tsx     # status + summary + transcript preview
├── components/ui.tsx         # Button, Field, Card, Heading, Muted, ErrorBox
├── lib/
│   ├── auth.tsx              # AuthContext (ready, config, supabase, session)
│   ├── storage.ts            # SecureStore (config) + AsyncStorage (session)
│   ├── supabase.ts           # Supabase client factory
│   ├── api.ts                # Bearer-authed REST helpers
│   ├── types.ts, theme.ts, format.ts
├── app.json                 # Expo config, permissions, plugins
├── babel.config.js
├── tsconfig.json
└── package.json
```

## Permissions

- **iOS**: `NSMicrophoneUsageDescription` — set in `app.json`. iOS will prompt the first time the user taps Start.
- **Android**: `RECORD_AUDIO` — set in `app.json`. Android will prompt the first time the user taps Start.

No camera, no location, no storage permissions are requested.

## Why mic-only

Apple and Google don't expose a public API for capturing audio from other apps (calls, FaceTime, etc.). This means we can't transcribe a Zoom call from inside Recap Mobile — but we *can* transcribe in-person meetings, lectures, doctor visits, fieldwork interviews, voice memos, etc.
