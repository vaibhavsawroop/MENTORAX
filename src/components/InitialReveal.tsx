/**
 * InitialReveal — the first-visit entrance sequence (once per session).
 *
 * A Swiss-grid pixel reveal: hundreds of cells light up in a radial wave,
 * a neon wordmark burns in with a tube warm-up and chromatic ghosting, a
 * scan line sweeps the frame, then the pixels collapse from the centre and
 * the page opens underneath a light flare.
 *
 * Design notes
 * ────────────
 * • One GSAP timeline drives every phase — no setTimeout chains, so the
 *   sequence can never desynchronise.
 * • Tiles are built imperatively: ~300 React nodes for a 2.8 s overlay
 *   would be pure render cost. Cell size is derived from the device tier
 *   and capped at MAX_CELLS so weak phones allocate fewer, larger layers.
 * • Only transform/opacity are animated (plus a single-element blur on
 *   capable tiers). Colours are static per tile — the wave animates
 *   compositor-friendly opacity, never backgroundColor, which would force
 *   a repaint of the whole screen every frame.
 * • Reduced motion gets a short fader instead of the sequence.
 * • A timer guard force-finishes the overlay if requestAnimationFrame never
 *   fires (throttled webviews) so the site can never stay covered.
 * • When the doors open, `mentorax:entrance-done` is dispatched on `window`
 *   and `data-entrance` is cleared from <html>; the hero rocket watches that
 *   attribute on the animation frame, so the launch can't be missed.
 *
 * Plays once per session; add `?intro=1` to any URL to replay it on demand
 * (handy for QA and for showing the entrance off).
 *
 * All styling lives in styles.css (`.initial-reveal`, `.ir-*`).
 */
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { getDeviceProfile } from '../lib/device'

/** Neon palette, weighted: mostly signal lime and lilac, sparingly cyan. */
const PALETTE: readonly (readonly [string, number])[] = [
  ['#d8ff6a', 5], // neon lime — the primary signal
  ['#9b8aff', 4], // neon lilac
  ['#7ff5e0', 1.4], // cyan spark
  ['#fff6da', 0.7], // warm white
]
const PALETTE_WEIGHT = PALETTE.reduce((sum, [, weight]) => sum + weight, 0)

function pickAccent() {
  let roll = Math.random() * PALETTE_WEIGHT
  for (const [color, weight] of PALETTE) {
    roll -= weight
    if (roll <= 0) return color
  }
  return PALETTE[0][0]
}

/** Hard cap on tile count — each cell carries gradients, a bevel and its own
 *  compositor layer, so even a 4K screen gets a bounded grid. */
const MAX_CELLS = 360

function shouldPlay() {
  if (typeof window === 'undefined') return false
  // `?intro=1` replays the entrance without touching the session flag.
  if (new URLSearchParams(window.location.search).has('intro')) return true
  return !sessionStorage.getItem('mentorax-revealed')
}

export function InitialReveal() {
  const [active, setActive] = useState(shouldPlay)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return
    const wrapper = wrapperRef.current
    const tilesEl = wrapper?.querySelector<HTMLElement>('.ir-tiles')
    if (!wrapper || !tilesEl) return

    sessionStorage.setItem('mentorax-revealed', 'true')
    document.documentElement.dataset.entrance = 'running'

    const { tier, reducedMotion } = getDeviceProfile()
    const rich = tier !== 'low'

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      delete document.documentElement.dataset.entrance
      // The hero rocket listens for this instead of a hardcoded delay, so the
      // launch always lands exactly as the doors open.
      window.dispatchEvent(new Event('mentorax:entrance-done'))
    }
    const complete = () => {
      finish()
      setActive(false)
    }

    // ── Pixel grid ──────────────────────────────────────────────────────
    // Cell size follows the viewport but never drops below the tier's
    // baseline, and tile count is capped, so a huge desktop screen gets a
    // fine grid and a low-end phone gets ~100 chunky cells.
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const baseCell = tier === 'high' ? 84 : tier === 'mid' ? 104 : 140
    const cell = Math.max(baseCell, Math.sqrt((viewportW * viewportH) / MAX_CELLS))
    const cols = Math.max(1, Math.ceil(viewportW / cell))
    const rows = Math.max(1, Math.ceil(viewportH / cell))
    const grid: [number, number] = [cols, rows]

    tilesEl.replaceChildren()
    tilesEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    tilesEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`
    if (!reducedMotion) {
      const fragment = document.createDocumentFragment()
      for (let i = 0; i < cols * rows; i++) {
        const tile = document.createElement('span')
        tile.className = 'ir-tile'
        // The accent rides a custom property so the glass composition (sheen,
        // bevel, glow) stays in CSS and can be trimmed per device tier.
        tile.style.setProperty('--tile-accent', pickAccent())
        fragment.appendChild(tile)
      }
      tilesEl.appendChild(fragment)
    }

    const counter = { value: 0 }
    const counterEl = wrapper.querySelector<HTMLElement>('.ir-counter')
    const ctx = gsap.context(() => {
      const tiles = gsap.utils.toArray<HTMLElement>('.ir-tile', wrapper)
      const hud = gsap.utils.toArray<HTMLElement>('.ir-hud', wrapper)
      const corners = gsap.utils.toArray<HTMLElement>('.ir-corner', wrapper)

      const tl = gsap.timeline({ onComplete: complete, defaults: { ease: 'power3.out' } })

      /* Reduced motion: a quiet fade of the lockup, nothing else. */
      if (reducedMotion) {
        tl.fromTo('.ir-halo', { opacity: 0 }, { opacity: 1, duration: .4 }, 0)
          .fromTo('.ir-lockup', { opacity: 0 }, { opacity: 1, duration: .4 }, .05)
          .fromTo('.ir-tagline', { opacity: 0 }, { opacity: 1, duration: .35 }, .2)
          .to('.ir-lockup, .ir-tagline, .ir-halo', { opacity: 0, duration: .4 }, 1.1)
          .to('.ir-backdrop', { opacity: 0, duration: .45 }, 1.25)
        return
      }

      /* 1 — Frame, HUD and progress rail boot up. */
      tl.from(hud, { opacity: 0, y: 10, duration: .5, stagger: .07 }, .05)
        .from(corners, { opacity: 0, scale: .4, duration: .55, stagger: .08, ease: 'back.out(2)' }, .1)
        .fromTo('.ir-progress i', { scaleX: 0 }, { scaleX: 1, duration: 2.1, ease: 'none' }, .1)

      if (counterEl) {
        tl.to(counter, {
          value: 100,
          duration: 1.1,
          ease: 'power2.inOut',
          onUpdate: () => {
            counterEl.textContent = String(Math.round(counter.value)).padStart(3, '0')
          },
        }, .15)
      }

      /* 2 — Wave A: cells light up from the centre and settle to a dim ember. */
      tl.to(tiles, {
        opacity: .9,
        duration: .16,
        ease: 'power2.out',
        stagger: { amount: .55, grid, from: 'center' },
      }, .22)
        .to(tiles, { opacity: .16, duration: .5, ease: 'power2.inOut' }, .85)

      /* 3 — The lockup burns in: halo bloom, blur-to-sharp, tracking settle. */
      const lockupFrom = { opacity: 0, scale: .86, ...(rich ? { filter: 'blur(24px)' } : {}) }
      const lockupTo = { opacity: 1, scale: 1, ...(rich ? { filter: 'blur(0px)' } : {}) }

      tl.fromTo('.ir-halo', { opacity: 0, scale: .55 }, { opacity: 1, scale: 1, duration: .8 }, .5)
        .fromTo('.ir-lockup', lockupFrom, { ...lockupTo, duration: .8 }, .52)
        .fromTo('.ir-tagline',
          { opacity: 0, y: 14, letterSpacing: '.62em' },
          { opacity: 1, y: 0, letterSpacing: '.32em', duration: .6 }, .85)

      // Endless shine across the neon letters — deliberately a standalone
      // tween: an infinite repeat inside the timeline would make its
      // duration infinite and onComplete would never fire.
      gsap.to('.ir-wordmark', {
        backgroundPosition: '200% center',
        duration: 2.4,
        ease: 'none',
        repeat: -1,
        delay: .9,
      })

      if (rich) {
        /* 4 — CRT-style re-sync: the lockup jolts, then a ripple runs inward. */
        tl.to('.ir-lockup', {
          keyframes: [
            { x: -7, skewX: 7 },
            { x: 5, skewX: -5 },
            { x: 0, skewX: 0 },
          ],
          duration: .3,
          ease: 'power1.inOut',
        }, 1.1)
          .set(tiles, { scale: 1.16 }, 1.18)
          .to(tiles, {
            opacity: .8,
            scale: 1,
            duration: .2,
            ease: 'power2.out',
            stagger: { amount: .45, grid, from: 'edges' },
          }, 1.2)
          .to(tiles, { opacity: .16, duration: .45, ease: 'power2.inOut' }, 1.75)
      }

      /* 5 — Scan sweep: a neon bar travels the frame. */
      if (rich) {
        tl.fromTo('.ir-scan', { y: -10, opacity: 0 }, { opacity: 1, duration: .18 }, 1.25)
          .to('.ir-scan', { y: viewportH + 24, duration: .6, ease: 'power2.inOut' }, 1.31)
          .to('.ir-scan', { opacity: 0, duration: .2 }, 1.8)
      }

      /* 6 — The lockup burns out, then the doors open: backdrop fades, the
             pixels collapse from the centre and a flare blooms through. */
      tl.to('.ir-lockup', { opacity: 0, scale: 1.12, ...(rich ? { filter: 'blur(16px)' } : {}), duration: .45, ease: 'power2.in' }, 1.7)
        .to('.ir-halo, .ir-tagline, .ir-progress', { opacity: 0, duration: .35 }, 1.75)
        .to(hud, { opacity: 0, y: -8, duration: .3 }, 1.75)
        .to(corners, { opacity: 0, duration: .3 }, 1.75)

        .to('.ir-backdrop', { opacity: 0, duration: .5, ease: 'power2.inOut' }, 1.9)
        .to(tiles, {
          opacity: 0,
          scale: .06,
          duration: .5,
          ease: 'power3.inOut',
          stagger: { amount: .4, grid, from: 'center' },
        }, 1.9)
        .fromTo('.ir-flare', { opacity: 0, scale: .25 }, { opacity: .9, scale: 1.35, duration: .34, ease: 'power2.out' }, 1.9)
        .to('.ir-flare', { opacity: 0, scale: 2.1, duration: .5, ease: 'power2.in' }, 2.25)
    }, wrapper)

    /* rAF-dead guard: timers still fire in throttled webviews, so the overlay
       can never trap the page even if the ticker stalls. */
    const guard = window.setTimeout(complete, 5000)

    return () => {
      window.clearTimeout(guard)
      ctx.revert()
      tilesEl.replaceChildren()
      finish()
    }
  }, [active])

  if (!active) return null

  return (
    <div ref={wrapperRef} className="initial-reveal" aria-hidden="true">
      <div className="ir-backdrop" />

      <div className="ir-frame">
        <span className="ir-frame-line ir-frame-line-v" />
        <span className="ir-frame-line ir-frame-line-h" />
        <span className="ir-corner ir-corner-tl" />
        <span className="ir-corner ir-corner-tr" />
        <span className="ir-corner ir-corner-bl" />
        <span className="ir-corner ir-corner-br" />
      </div>

      <div className="ir-tiles" />

      <div className="ir-scan" />
      <div className="ir-flare" />

      <div className="ir-stage">
        <div className="ir-halo" />
        <div className="ir-lockup">
          <img className="ir-mark" src="/logo-mark.webp" alt="" decoding="async" />
          <span className="ir-wordmark" data-text="mentorax">
            mentora<span className="ir-x">x</span>
          </span>
        </div>
        <p className="ir-tagline">The Science of a Clear Path</p>
        <div className="ir-progress"><i /></div>
      </div>

      <div className="ir-hud ir-hud-tl"><b>MentoraX</b><span>EST. 2026 · IISER alumni</span></div>
      <div className="ir-hud ir-hud-tr"><b>Entrance sequence</b><span>Grid · 01</span></div>
      <div className="ir-hud ir-hud-bl"><b>IAT · NEST · CUET</b><span>Calibrating signal</span></div>
      <div className="ir-hud ir-hud-br"><b className="ir-counter">000</b><span>Sync</span></div>
    </div>
  )
}
