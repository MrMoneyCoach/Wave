# Born Bare — site

Cinematic single-product site for Born Bare bamboo nappies.
Funding-stage showpiece. Lives at `wearebornbare.com`.

## Stack

- Vite + React + TypeScript
- Tailwind CSS (brand palette baked in)
- React Three Fiber + drei (3D moments)
- GSAP (reserved for scroll choreography)

## Run

```bash
cd bornbare
npm install
npm run dev    # http://localhost:5174
npm run build  # outputs to dist/
```

## Project layout

```
bornbare/
├── public/
│   └── images/             ← drop AI / photographic assets here
├── src/
│   ├── components/         ← Nav, Reveal
│   ├── sections/           ← scroll moments (top → bottom in App.tsx)
│   │   ├── ColdOpen        Better sleep starts here.
│   │   ├── SleepingBaby    full-bleed photographic moment
│   │   ├── Promise         "Nothing between your baby…"
│   │   ├── Anatomy         3D layers reveal (placeholder model)
│   │   ├── Substance       "No chlorine, no latex…" on dark
│   │   ├── Planet          decomposition stats
│   │   ├── Founder         italic note
│   │   ├── Reserve         email waitlist
│   │   └── Footer          "Nothing but sleep."
│   └── three/
│       └── NappyPlaceholder  ← swap for real .glb when ready
└── tailwind.config.js     palette: bare / skin / earth / clay / stone / sage
```

## Assets needed in `public/images/`

| filename               | source                                        | used by         |
|------------------------|-----------------------------------------------|------------------|
| `sleeping-baby.jpg`    | Nano Banana Prompt A                          | SleepingBaby     |
| `tiny-hand.jpg`        | Nano Banana Prompt B                          | (planned)        |
| `nappy-context.jpg`    | Nano Banana Prompt C                          | (planned ambient)|
| `nappy-master.jpg`     | Nano Banana Prompt 1 (locked, no yellow)      | (transition)     |
| `nappy-angles/01..08`  | Prompts 2–9, then image-to-3D                 | will become .glb |

## Brand reference

See `born-bare/born-bare-brand-guidelines.pdf` on the `claude/alfred-project-bot-zLj9R` branch.

Palette + type are locked to that brief. Don't improvise.
