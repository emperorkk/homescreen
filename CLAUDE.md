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
npm run test     # vitest run (unit tests for the pure logic)
npm run preview  # serve the built dist/
npm run deploy   # wrangler deploy (uploads dist/ as Worker assets)
```

`npm run build` typechecks first (`tsc -p tsconfig.json --noEmit`) and fails on
any type error — run it before pushing. `npm run test` (Vitest, config in
`vitest.config.ts`) covers the pure date/time logic only (`*.test.ts` next to the
modules: `orthodox`, `moon`, `fasting`, `namedays`, `timer/engine`); there is no
DOM/integration test harness. A `SessionStart` hook in `.claude/settings.json`
runs `npm install` so fresh web-session containers can build/test.

## Architecture

### App bootstrap & routing (`src/main.ts`, `src/router.ts`)
- `main.ts` is the single entry. It imports all CSS, applies the saved theme,
  starts the WebGL background, starts the alarm scheduler, registers the PWA
  install handler, and calls `startRouter(mount)`.
- Routing is **hash-based** with four routes: `home | timer | alarm | settings`
  (`#/`, `#/timer`, `#/alarm`, `#/settings`). Navigate with `go(route)`.
- `mount(route)` clears `#app`, sets `app.dataset.route`, and calls the matching
  `renderX(root)` screen function. **Every screen returns a cleanup function**
  that `mount` invokes before swapping screens — use it to clear timers,
  listeners, RAF loops, etc. (see the `dispose` patterns in components/screens).

### Screens (`src/screens/`)
- `home.ts` — clock + almanac panel + Timer/Alarm/Settings buttons + network &
  battery badges. Tapping the clock enters **nightstand** dim mode
  (`components/nightstand.ts`): a near-black overlay with a dimmed, slowly
  drifting clock + wake lock; tap/Esc to exit.
- `timer.ts` — the most complex screen. Two views (setup with presets/wheel
  picker, and countdown with SVG progress ring). Owns a `TimerEngine`, a
  `requestAnimationFrame` tick loop, wake lock, sound playback, vibration, and
  notifications. Long-pressing a preset chip (550ms) saves it as the default.
  Presets are **minutes** shown as `HH:MM`. The running/paused countdown is
  persisted (`homescreen.timer.v1`) and **resumed on mount** via the engine's
  `serialize()`/`restore()`; a timer that finished while away is discarded.
- `alarm.ts` — scheduled alarm clock. Manage multiple alarms (time, label,
  weekday repeat, enable). Alarms live in `state.alarms`.
- `settings.ts` — theme, language (el/en), units (°C/°F), clock format,
  per-row almanac visibility, manual location search, install button, sound
  selection/upload, haptics/notifications toggles.

### State (`src/state.ts`)
- A tiny localStorage-backed store (key `homescreen.state.v1`), versioned in the
  key name. `getState()`, `setState(patch)`, `onState(fn)` (returns unsubscribe).
- `setState` does a **shallow** merge, persists, and notifies listeners
  synchronously. Nested values (arrays/objects like `alarms`) must be replaced
  wholesale. New fields are backward-compatible — `read()` spreads over defaults.
- `main.ts` subscribes via `onState` to re-apply theme and start/stop the WebGL
  renderer when settings change. Screens read settings at render time, so
  changing a setting takes effect on the next navigation to that screen.

### Alarm clock (`src/screens/alarm.ts` + `src/alarm/scheduler.ts`)
- `startAlarmScheduler()` (from `main.ts`) polls every 10s; when an enabled
  alarm's `HH:MM` (and weekday) matches, it rings: looped sound + vibration +
  notification + a full-screen Dismiss/Snooze overlay. A `fired` Set dedupes
  within the minute. **PWA limitation:** only fires while the app/tab is awake.

### Timer engine (`src/timer/engine.ts`)
- `TimerEngine` is pure time math — **no timers or intervals inside it**. It
  tracks epochs and computes a `snapshot()` (status, remaining, progress) on
  demand. The UI drives it via RAF and reads snapshots. This makes it resilient
  to backgrounding (elapsed is always `Date.now()`-based, never tick-counted).
- `formatRemaining(ms)` formats `H:MM:SS` / `MM:SS`.
- `wake-lock.ts` wraps the Screen Wake Lock API defensively (feature-detected,
  all calls no-op if unsupported); `reacquireOnVisible()` re-grabs the lock when
  the tab becomes visible again.

### Almanac (`src/components/almanac.ts` + `src/util/{moon,orthodox,fasting,namedays,weather,i18n}.ts`)
The home-screen panel below the clock. Each row can be toggled off in settings
(`almWeather/almSun/almMoon/almFasting/almNameday/almHoliday`).
- `i18n.ts` — Greek default, English toggle (`state.lang`). `t()`, `moonName()`,
  `wmoName()`, `fastName()`, `locale()`. Resolves keys/indices returned by the
  pure modules. Orthodox feast names and name-day proper nouns stay Greek.
- `moon.ts` — moon phase from date (pure, no network); returns a phase `index`
  (0–7) + emoji; the name is resolved via i18n.
- `orthodox.ts` — Greek Orthodox holidays. `orthodoxPascha(year)` uses the Meeus
  Julian algorithm + 13-day offset (valid 1900–2099); movable feasts are offsets
  from Pascha, fixed feasts are calendar dates. `holidayOn` / `nextHoliday`.
- `fasting.ts` — `fastInfo(date)` approximates the lay fasting calendar (four
  major fasts + Wed/Fri rule + common fast-free windows) from the date / Pascha.
- `namedays.ts` — `nameDaysOn(date)`: Greek name days (fixed-date subset).
- `weather.ts` — current weather + **7-day forecast** + sunrise/sunset from the
  **keyless Open-Meteo API**, plus a reverse-geocoded city label (**keyless
  BigDataCloud**) and forward geocoding for the settings location search. Temps
  are fetched in Celsius and converted for display by the unit setting. WMO codes
  → an i18n key (+emoji). Location: a **manual override** (`state.locLat/locLon`)
  wins, else `navigator.geolocation`, else last-known/Athens. Cached in
  localStorage (`homescreen.coords.v1`, `homescreen.weather.v1`, 15-min TTL;
  `clearAlmanacCache()` on location change).
- The component renders moon/holiday/fasting/name-day synchronously and paints
  weather/sun async (cached first, then live fetch); failures degrade silently.
  Tapping the weather row expands the forecast strip. Network + geolocation are
  runtime/browser concerns — they don't affect the build.

### PWA install & device badges
- `src/pwa/install.ts` — captures `beforeinstallprompt`; `canInstall()`,
  `onInstallChange()`, `promptInstall()` drive the settings Install button.
  Imported for side-effect in `main.ts` so it registers early.
- `src/components/battery.ts` — Battery Status API badge (home top bar); renders
  nothing if unsupported.

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
