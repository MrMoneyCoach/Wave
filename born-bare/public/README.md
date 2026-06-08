# Static assets

Drop the photographic and brand assets here, organised by subfolder.
The site references them by path — no code changes needed when you add a file.

## Where each file goes

### `public/video/`
- `hero.mp4` — Kickstarter video, ~1080p, H.264, 8–15s loop
- `hero.webm` — same content, VP9 codec (smaller; optional but preferred)
- `hero-poster.jpg` — single still frame, 1920×1080, shown while the video loads

After uploading these, open `app/page.tsx` and uncomment the four lines
inside the `<VideoHero>` block at the top.

### `public/assets/`
Photography and brand artwork. Names below match what the site is looking for:

**Home**
- `tiny-hand-detail.jpg` — square
- `world-bamboo.jpg`, `world-linen.jpg`, `world-skin.jpg` — portrait
- `ren-portrait.png` — square, alpha

**Our Story**
- `story-window-light.jpg` — portrait
- `founder-portrait.jpg` — portrait

**Sustainability**
- `bamboo-detail.jpg` — portrait
- `soil-cycle.jpg` — portrait

**The Nappy**
- `nappy-product-hero.jpg` — square (the locked no-yellow-strip render)

### `public/` (root of this folder)
- `favicon.ico` — 32×32 multi-resolution
- `apple-touch-icon.png` — 180×180
- `og-image.jpg` — 1200×630 (social share preview)
- `logo.png` — 512×512 PNG with alpha (referenced by structured data)

## How to upload from GitHub

1. Browse to `born-bare/public/assets/` (or `video/`) on the `claude/alfred-project-bot-zLj9R` branch
2. Click **Add file → Upload files**
3. Drag in your files
4. Commit with a brief message like "Add hero imagery"
5. Vercel rebuilds automatically — refresh the preview in ~30s

The `ImagePlaceholder` slots disappear and the real image takes their
place. No code changes required.
