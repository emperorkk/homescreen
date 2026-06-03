# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Android-first PWA "homescreen" (clock + countdown timer) built with vanilla
TypeScript + Vite, deployed to Cloudflare Workers static assets. No UI framework —
DOM is built imperatively via the `el()`/`svg()` helpers in `src/util/dom.ts`.

## Commands

```bash
npm run dev      # Vite dev server on :5173 (host: true, accessible on LAN)
npm run build    # tsc --noEmit typecheck, THEN vite build -> dist/
npm run preview  # serve the built dist/
npm run deploy   # wrangler deploy (uploads dist/ as Worker assets)
```

There is no test runner and no linter configured. `npm run build` is the only
gate — it typechecks first (`tsc -p tsconfig.json --noEmit`) and fails the build
on any type error. Run it before pushing.

## Architecture

### App bootstrap & routing (`src/main.ts`, `src/router.ts`)
- `main.ts` is the single entry. It imports all CSS, applies the saved theme,
  starts the WebGL background, and calls `startRouter(mount)`.
- Routing is **hash-based** with three routes: `home | timer | settings`
  (`#/`, `#/timer`, `#/settings`). Navigate with `go(route)` from `router.ts`.
- `mount(route)` clears `#app`, sets `app.dataset.route`, and calls the matching
  `renderX(root)` screen function. **Every screen returns a cleanup function**
  that `mount` invokes before swapping screens — use it to clear timers,
  listeners, RAF loops, etc. (see the `dispose` patterns in components/screens).

### Screens (`src/screens/`)
- `home.ts` — clock + almanac panel + Timer/Settings buttons + network badge.
- `timer.ts` — the most complex screen. Two views (setup with presets/wheel
  picker, and countdown with SVG progress ring). Owns a `TimerEngine`, a
  `requestAnimationFrame` tick loop, wake lock, sound playback, vibration, and
  notifications. Long-pressing a preset chip (550ms) saves it as the default.
- `settings.ts` — theme picker, sound selection, custom sound upload.

### State (`src/state.ts`)
- A tiny localStorage-backed store (key `homescreen.state.v1`), versioned in the
  key name. `getState()`, `setState(patch)`, `onState(fn)` (returns unsubscribe).
- `setState` merges, persists, and notifies all listeners synchronously.
- `main.ts` subscribes via `onState` to re-apply theme and start/stop the WebGL
  renderer when settings change.

### Timer engine (`src/timer/engine.ts`)
- `TimerEngine` is pure time math — **no timers or intervals inside it**. It
  tracks epochs and computes a `snapshot()` (status, remaining, progress) on
  demand. The UI drives it via RAF and reads snapshots. This makes it resilient
  to backgrounding (elapsed is always `Date.now()`-based, never tick-counted).
- `formatRemaining(ms)` formats `H:MM:SS` / `MM:SS`.
- `wake-lock.ts` wraps the Screen Wake Lock API defensively (feature-detected,
  all calls no-op if unsupported); `reacquireOnVisible()` re-grabs the lock when
  the tab becomes visible again.

### Almanac (`src/components/almanac.ts` + `src/util/{moon,orthodox,weather}.ts`)
The home-screen panel below the clock. All labels are in **Greek**, temps in °C.
- `moon.ts` — moon phase from date (pure astronomical approximation, no network).
- `orthodox.ts` — Greek Orthodox holidays. `orthodoxPascha(year)` uses the Meeus
  Julian algorithm + 13-day offset (valid 1900–2099); movable feasts are offsets
  from Pascha, fixed feasts are calendar dates. `holidayOn` / `nextHoliday` drive
  the UI (shows today's feast, else the next upcoming).
- `weather.ts` — current weather + today's high/low + sunrise/sunset from the
  **keyless Open-Meteo API** (`api.open-meteo.com`, CORS-friendly). Location comes
  from `navigator.geolocation` with an **Athens fallback** if denied/unavailable;
  coords and the last result are cached in localStorage (`homescreen.coords.v1`,
  `homescreen.weather.v1`, 15-min TTL). WMO codes map to Greek descriptions+emoji.
- The component renders moon/holiday synchronously and paints weather/sun async
  (cached value first, then live fetch); failures degrade silently. Network +
  geolocation are runtime/browser concerns — they don't affect the build.

### Theming (`src/theme.ts`, `src/styles/`)
- Themes: `dark` (default), `light`, `marble`, `sandstone`, `cyberpunk`, `dos`.
- `applyTheme(id)` sets `document.documentElement.dataset.theme` and the
  `<meta name=theme-color>`. CSS is selected by `[data-theme="..."]` blocks.
- CSS layering: `tokens.css` defines `:root` CSS variables (the contract — colors,
  fonts, `--digit-gradient`, `--digit-shadow`, radii, safe-area insets);
  `base.css` is structure/layout consuming those vars; each `themes/*.css`
  overrides the vars (and occasionally adds theme-specific rules).
- **Gotcha:** the clock digits use `color: var(--fg)` by default. Only themes that
  define `--digit-gradient` (currently just `marble`) make digits transparent and
  paint a gradient via `background-clip: text` — and marble does that in its own
  `[data-theme="marble"] .clock` rule, not globally. Don't force transparent fill
  in `base.css`, or digits go invisible on every gradient-less theme.

### WebGL background (`src/webgl/renderer.ts`)
- A single full-screen triangle drawn with one "uber" fragment shader that
  branches per theme via the `uTheme` int uniform. Public API: `startRenderer`,
  `stopRenderer`, `setRendererTheme`, `setTimerProgress` (the running timer feeds
  `uProgress` into the shader for animated feedback).
- `THEMES[id].webgl` decides whether the canvas runs; the `dos` theme is the only
  one with `webgl: false` (it uses pure CSS scanlines instead).

### Audio (`src/audio/`)
- `library.ts` merges 9 bundled alarm sounds (`/sounds/d1..d9.mp3`) with
  user-uploaded sounds stored in IndexedDB. Sound IDs: bundled are `d1..d9`,
  user uploads are `u_<base36>`.
- `idb.ts` is a minimal Promise wrapper over IndexedDB (db `homescreen`, store
  `sounds`). User uploads are stored as Blobs and served via `URL.createObjectURL`
  (revoked in `stopSound`).
- Playback requires a user gesture; `playSound` swallows the autoplay rejection
  and relies on the caller invoking under a gesture.

### Deployment / PWA
- `src/worker.ts` is a trivial Worker that hands every request to the `ASSETS`
  binding; SPA fallback (`not_found_handling: single-page-application`) is
  configured in `wrangler.jsonc`, so all routes resolve to `index.html`.
- `public/sw.js` is a hand-written service worker (cache `homescreen-v1`,
  precache shell, registered from `main.ts`). It is **not** generated — bump the
  cache name / precache list there manually when the offline shell changes.
- `public/` is copied verbatim into `dist/` (manifest, icons, sounds, sw.js).

## Conventions worth matching
- Build DOM with `el(tag, attrs, children)` from `util/dom.ts`: `class`, `html`,
  `on*` event handlers, and boolean attrs are all handled there. Use `svg()` for
  SVG namespaced elements.
- Web platform APIs that may be missing (Wake Lock, Notification, vibrate) are
  always feature-detected and wrapped in try/catch that silently degrades — keep
  that pattern; this ships to varied Android browsers.
- Haptics go through `vibrate()` in `util/dom.ts`, which respects the user's
  `vibrate` setting — don't call `navigator.vibrate` directly.
- Resource ownership lives with the screen/component that created it; release it
  in the returned cleanup/`dispose` function.
