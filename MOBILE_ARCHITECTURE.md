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

## 7. Dark mode polish layer

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
