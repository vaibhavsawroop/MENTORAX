# MentoraX — Android-First Mobile Architecture

The site is authored for the weakest device in the room — a mid-range Android
phone on mobile data — and progressively enhances upward. Nothing heavy is
ever the default; it has to be *earned* by device capability.

## 1. Device tiering (`src/lib/device.ts`)

One profile, computed once at boot (before React renders, from `main.tsx`),
cached for the session:

| Signal | Source |
|---|---|
| Cores | `navigator.hardwareConcurrency` |
| RAM | `navigator.deviceMemory` (Chrome/Android — the platform that needs it most) |
| Touch / mobile | `(hover: none) and (pointer: coarse)` + viewport |
| Android | UA check, used for CSS-only polish |
| Reduced motion | `prefers-reduced-motion` → forced `low` |

Tiers and what they unlock:

| | `low` (most Androids, reduced-motion) | `mid` (good phones, weak laptops) | `high` (desktops, flagships) |
|---|---|---|---|
| Lenis smooth scroll | off (native momentum is smoother on touch anyway) | off on touch, on with wheel | on |
| Decorative WebGL (Clouds on plan cards) | **not rendered** | rendered | rendered |
| HeroScene canvas | CSS fallback | ≤1.5 DPR, no AA | ≤1.8 DPR, antialiased |
| Sparkles particles | 12 | 22 (mobile) / 48 | 48 |
| backdrop-filter | removed via CSS | reduced radii ≤720px | full |
| Infinite CSS animations | stopped | on | on |

The profile is stamped on `<html>` (`data-tier`, `.is-mobile`, `.is-android`,
`.is-touch`) so **the first paint already uses the right effect level** —
there is no heavy→light flash, and CSS never needs JS to hide effects.

## 2. Scroll pipeline — one clock

- **Lenis** drives wheel scroll; **GSAP's ticker** drives Lenis (`lenis.raf`
  inside `gsap.ticker`), ScrollTrigger, and every tween. One rAF loop total —
  no competing clocks, no drift between smooth scroll and triggers.
- Touch devices skip Lenis entirely: native fling momentum is smoother and
  cheaper than JS smoothing on Android.
- Route changes scroll to top and `ScrollTrigger.refresh()` on the next frame.
- `document.fonts.ready` and `window.load` both trigger a refresh — webfont
  metric shifts used to leave reveals mis-measured.
- Anchor links (`#policy-N` TOC) are handled by Lenis (`anchors: true`);
  horizontally-scrollable strips opt out via `data-lenis-prevent`.

## 3. ScrollFX (`src/components/ScrollFX.tsx`)

Declarative, route-aware, GSAP-only effects on existing DOM:

- `data-reveal="up|left|right|scale|fade|blur"` — batched stagger entrances via
  `ScrollTrigger.batch`, `once: true`, `clearProps: 'transform'` afterwards so
  CSS `:hover` transforms keep working. The `blur` variant animates a filter
  and is high-tier only; lower tiers silently get the scale variant.
- `data-parallax="<speed>"` — scrub-linked drift (speed ≈ viewport fraction).
- `data-drift="<degrees>"` — scrub-linked rotation for orbit rings / dials.
- `data-skew` — velocity lean: the container skews up to ±3.5° with scroll
  speed via `gsap.quickTo`, settling to rest through the same easing. Pointer
  devices only — on touch it would fight fling momentum.
- Magnetic CTAs (`.arrow-link`, `.header-cta`, `.back-to-top`) lean toward the
  pointer by a few px; a cursor glow — one composited radial-gradient layer —
  trails the mouse (multiply blend on light paper, screen blend in dark).
- `ScrollTrigger.config({ ignoreMobileResize: true })` — Android Chrome fires
  a resize on every URL-bar show/hide; ignoring them stops re-measure hitches
  mid-scroll.
- Built-ins: gradient scroll-progress bar; hero canvas pull-back + copy fade.
- Everything animates `transform`/`opacity` only (plus the high-tier blur),
  skips entirely for reduced motion, and re-initialises per route.

## 4. Typography that never overlaps

Display headings previously shipped with line-heights of 0.68–0.96, and the
GSAP word-mask (`.pop-word-box { overflow: hidden }`) clipped ascenders and
descenders ("pulse.", "signal." were measurably cut). Now:

- All heading line-heights ≥ 0.95 (most ≥ 1.02).
- `.pop-word-box` carries a **descender guard**: `padding-block: .16em;
  margin-block: -.16em` — the clip box grows without changing layout.
- `will-change: filter` is scoped to `.pop-mode-blur` only, so blur-mode
  words don't reserve extra texture memory site-wide.

## 5. Render-cost controls

- The hero background is the aurora shader composition
  (`src/scene/HeroAurora.tsx`): a ~2 KB clean-room WebGL color-flow shader
  (orange / cream / violet, pointer-reactive) clipped to a responsive blurred
  SVG mask, with a 31 KB rocket illustration layered on top — replacing the
  23 MB aurora video. Low tier / reduced motion get one static frame (no
  loop, no listeners); mid tier renders ~30 fps at DPR 1; the loop stops
  when the hero leaves the viewport or the tab hides.
- `will-change` is used surgically; GSAP clears inline transforms after
  reveals complete.
- Android Chrome gets trimmed box-shadows (large blurred shadows repaint
  badly during scroll there).
- `touch-action: manipulation` removes the 300 ms tap delay;
  `overscroll-behavior-y: none` stops pull-to-refresh fighting the page.
- Never set `overflow` on `<html>`: `overflow-x: clip/hidden` on the root
  element propagates to the viewport and can kill document scrolling in
  Chromium. The horizontal guard lives on `<body>` (`overflow-x: clip`).

## 5b. rAF watchdog — graceful degradation in throttled webviews

Embedded webviews (in-app browser panes, occluded views) can report
`visibility: "visible"` while **never firing `requestAnimationFrame`**.
GSAP's ticker is rAF-driven, so in those environments every animation
freezes at its from-state (invisible headings) and Lenis intercepts wheel
events without ever scrolling — a completely dead page.

`SmoothScroll` runs a timer-based watchdog (timers still fire when rAF
doesn't): if the shared ticker has produced zero beats ~1.2 s after boot,
the site drops to a static mode:

- `lenis.destroy()` → native scrolling is restored;
- `<html data-anim-fallback="static">` is stamped, and a CSS layer forces
  any element stuck at an inline `opacity: 0` (GSAP from-states *and*
  framer-motion `AnimateIn`) back to visible with `!important`;
- content mounted later (route changes) is covered by the CSS, not by DOM
  surgery, so the fallback keeps working for the whole session.

In a normal browser the watchdog sees ticker beats and does nothing —
zero overhead beyond one `setTimeout`. `TextPop` also skips all from-states
for `prefers-reduced-motion` users, so no path through the app can strand
text invisible.

## 6. Verification checklist

- `npm run build` passes type-check.
- DOM probe on every page: `document.querySelectorAll('.pop-word-box')` —
  zero elements with `scrollHeight > clientHeight + 1`.
- Live tab probe: every `.pop-word` inside the viewport has computed
  `opacity: 1` after reveal; `.scroll-progress i` has a non-identity
  transform matrix while scrolled.
- Throttled-webview probe: block rAF → within ~1.5 s `documentElement`
  gains `data-anim-fallback="static"` and words read `opacity: 1` from the
  CSS override (no inline surgery).
- Emulated mid-range Android (4 cores / 4 GB, touch) → `data-tier="mid"`,
  no Clouds contexts, Lenis off, native fling scroll.
- Entrance probe: load `/?intro=1` → `.ir-tile` cells exist (count ≤ 420),
  the progress rail ends at `scaleX(1)`, the counter reads `100`, and the
  overlay is unmounted while `performance.now()` is still ≈ 3 s.
  `?intro=1` replays the sequence on demand without touching session state.

## 7. First-visit entrance reveal (`src/components/InitialReveal.tsx`)

The pixel-Swiss neon intro, played once per session (or whenever `?intro=1`
is on the URL):

- **One GSAP timeline** drives every phase — frame/HUD boot, a centre-out
  pixel wave, the neon wordmark burn-in (blur-to-sharp, chromatic ghosts via
  `attr(data-text)` pseudo-elements, an infinite shine that is deliberately a
  *standalone* tween, since an infinite repeat inside a timeline would make
  `onComplete` unreachable), a CRT re-sync jolt with an inward ripple, a scan
  sweep, then the doors: backdrop fade, centre-out pixel collapse, flare.
- **Cost control** — cells are built imperatively (React nodes would be pure
  render cost for a ~2.8 s overlay), sized from the device tier and capped at
  420. Only `transform`/`opacity` animate (colours are static per cell), the
  single blur is skipped on `low`, and the grain/vignette/scanline/ghost
  layers are paint-once CSS.
- **Never traps the page** — a `setTimeout` guard force-finishes the overlay
  if the ticker stalls, and `html[data-anim-fallback="static"]` hides it
  outright. Both routes end in the same cleanup.
- **Choreography handshake** — the timeline dispatches
  `mentorax:entrance-done` as the doors open; `HeroShader` listens for it
  (with a fallback timer) so the rocket launches through the gap instead of
  racing a hardcoded delay.
- Reduced motion skips the scenery and gets a short fade of the lockup.

## 8. Asset + render budget

Fast loading and a quiet GPU on every device:

- **Images** — every in-page asset is WebP: mentor portraits 1.9 MB → 133 KB,
  batch banners 946 KB → 244 KB, the logo mark 82 KB → 1.4 KB (the 1024 px PNG
  stays only as the favicon), and the dark rocket is a downscaled 800 px WebP
  (157 KB → 80 KB). Below-the-fold portraits/banners carry
  `loading="lazy" decoding="async"`, so they are never part of first paint.
  Sources (PNG/JPG/AVIF) live in git history; regenerate the WebPs with a real
  encoder such as `sharp`. Never run a text-mode rewrite across binaries: the
  repo-wide `mentorax.in` domain purge (9422f00) read every image as text and
  wrote it back, expanding each `0x0A` byte to CRLF and leaving 13 files —
  every WebP, `logo.png`, the light rocket and both halftone JPEGs —
  unreadable. Scripts that walk the repo must skip binaries.
- **One rocket, not two** — `HeroShader` renders only the illustration the
  current theme shows. A `display: none` image is still downloaded, so
  shipping both used to cost every visitor an unseen 31–77 KB.
- **Fonts** — the Google Fonts request asks only for the faces the design
  uses (no italics: `em, i` are `font-style: normal`; no unused Syne 500), and
  `--mono` names `JetBrains Mono` — the family that is actually loaded. It used
  to name Space Mono, which was never fetched, so every mono label silently
  fell back to the system monospace while an unused italic was downloaded.
- **No live blur** — the dark-mode ambient orbs dropped `filter: blur(80px)`;
  the gradient falloff now does the diffusion, which removes a full-screen
  blur pass from every drifting frame. Same for the entrance halo.
- **Compositor-only keyframes** — the hero scanline rides `transform`
  (was animating `left`) and the checkout progress sweep rides `transform`
  (was animating `width`): neither re-runs layout any more.
- **Film grain** keeps its `overlay` blend on capable desktops but drops it on
  touch and `mid` tier — a blended full-screen layer is re-composited on every
  scroll frame, which quietly costs phones a lot.
- **Theme before first paint** — `main.tsx` stamps `data-theme` (saved choice
  or system preference) before React mounts, so dark-mode visitors no longer
  see one frame of the light theme, and the hero can pick its rocket
  illustration on the first render.

## 9. Dark mode polish layer

Dark mode is not just inverted `--paper`:

- **Orchestrated switch** — `ThemeSwitch` stamps `html.theming` for ~0.55 s;
  every themed surface (backgrounds, lines, cards, shadows) eases together
  instead of snapping at different speeds. The `<meta name="theme-color">`
  syncs so mobile browser chrome follows the page.
- **Film grain** — a fixed, fullscreen inline `feTurbulence` SVG at 4%
  opacity via `body::after` (dark only, low tier excluded). Compositor-only:
  zero repaint while scrolling; kills OLED banding on large flat surfaces.
- **Light sources** — in dark mode the primary cards act as lights:
  lilac glows on the featured edition card and CTA panels, lime on featured
  plan/book cards, neutral elevation shadows elsewhere.
- **Contrast fixes** — dark-ink washes that vanished on `#08070d`
  (carousel dots, dashboard active states) become light-ink washes;
  `body-large` text is lifted to keep ≥ 4.5:1.

## 10. Lighter first paint (chunking, deferred third parties)

Three changes here, all measurable in `npm run build` output:

- **Vendor chunking** (`vite.config.ts` → `manualChunks`). Everything used to
  land in one ~593 kB entry chunk, so a one-line app change invalidated the
  whole download and the parser worked through React, GSAP, framer-motion and
  three.js in a single task. Now: `vendor-react` (~231 kB), `vendor-motion`
  (~260 kB), `vendor-icons` (~7 kB), app code ~97 kB, and `vendor-3d`
  (~867 kB) which is imported *only* by the lazily-mounted hero scene. First
  paint drops by roughly 100 kB (29 kB gzipped) and repeat visits re-download
  just the app chunk. `chunkSizeWarningLimit` is raised to 900 with a comment
  because three.js is isolated and lazy by design.
- **Razorpay is no longer loaded on every page.** `checkout.js` used to be a
  blocking `<script>` in `index.html`. It is now injected by
  `src/components/Checkout.tsx` when a checkout page mounts (and awaited before
  the modal opens), so every other route skips the third-party download and its
  main-thread parse. Verified by probe: `window.Razorpay` is `undefined` on
  `/mentorship`, a function on `/checkout`.
- **Horizontal reveals are disabled under 720 px** (`ScrollFX.tsx`). See §11.

## 11. Horizontal panning on phones (fixed)

A reveal element sits in its from-state *outside* its own column until it is
scrolled into view. On `/contact` the enquiry form carried
`data-reveal="right"` (46 px), which pushed it past the viewport edge; the page
could then be panned sideways by ~30 px, and the form's right edge looked cut
off before it ever animated. Two rules came out of it:

- Horizontal reveal offsets (`left`/`right`) are dropped below 720 px — those
  variants become pure fades there, while vertical ones keep a gentler 22 px.
  Desktop is unchanged.
- The root element still must not be clipped (§5). `overflow-x: clip` on
  `<html>` was tested and *did* leave vertical scrolling intact in this
  Chromium, but it remains a root-overflow change with a catastrophic failure
  mode if a future engine disagrees, so the root cause is fixed instead.

Verification probe (emulated phone, every route): scroll the document
sideways with `window.scrollTo(600, 0)` and read `window.scrollX` — it must
stay `0`, and every `form.contact-form` must sit within the viewport before
*and* after its reveal.

## 12. Touch hover neutralisation (cascade-last)

`styles.css` ends with an `@media (hover: none), (pointer: coarse)` block. It
exists because the earlier touch block sits *before* the dark-theme and
`[data-tier]` variants, which re-declare the same hover transforms with equal
or higher specificity and therefore win. On a touch screen `:hover` sticks
after a tap: it both looks broken and keeps the compositor busy. The final
block neutralises those transforms/shadows/filters, keeps hover-revealed
labels visible, and drops hover-only decorative layers (`::after` sheens,
`.plan-card::before`) that only ever cost paint on touch.
