import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getDeviceProfile } from '../lib/device'

gsap.registerPlugin(ScrollTrigger)

// Android Chrome fires a resize every time the URL bar hides/shows while
// scrolling; each one re-measures every trigger and hitches the scroll.
ScrollTrigger.config({ ignoreMobileResize: true })

/**
 * ScrollFX — declarative, route-aware scroll choreography.
 *
 * Everything is opt-in via data attributes placed on existing DOM:
 *
 *   data-reveal="up|left|right|scale|fade|blur"  once-in staggered entrance
 *   data-parallax="-0.15"                        scrub-linked drift (speed = vh fraction)
 *   data-drift="60"                              scrub-linked decorative rotation
 *   data-skew                                    container leans with scroll velocity
 *
 * Built-ins: a top scroll-progress bar, a scrubbed hero pull-back, magnetic
 * CTAs and a cursor glow on pointer devices. All effects run off GSAP's
 * single ticker (shared with Lenis), animate only transform/opacity (plus
 * blur on high tier), and are skipped entirely for reduced-motion users.
 * Pointer-only extras (skew, magnetic, cursor glow) never mount on touch
 * devices — native fling stays untouched.
 */
export function ScrollFX() {
  const { pathname } = useLocation()

  useEffect(() => {
    const { reducedMotion, isTouch, tier } = getDeviceProfile()
    if (reducedMotion) return

    const cleanups: Array<() => void> = []

    const ctx = gsap.context(() => {
      /* ── Scroll progress bar ─────────────────────────────── */
      const bar = document.querySelector<HTMLElement>('.scroll-progress i')
      if (bar) {
        gsap.set(bar, { scaleX: 0, transformOrigin: '0 50%' })
        gsap.to(bar, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 0.4 },
        })
      }

      /* ── Staggered entrances (grouped per variant) ────────── */
      const isBlur = tier === 'high'
      // A reveal element waits in its from-state just outside its column. On a
      // phone there is no room for that sideways offset: an element sitting at
      // the column edge would poke past the viewport and let the page pan
      // horizontally (measured: 30 px of pan on /contact). Horizontal reveals
      // therefore become pure fades under 720 px, while vertical ones keep a
      // gentler offset. Root overflow is deliberately left alone — see
      // MOBILE_ARCHITECTURE.md §5 for why `<html>` must not be clipped.
      const isNarrow = window.matchMedia('(max-width: 720px)').matches
      const shiftY = isNarrow ? 22 : 46
      const shiftX = isNarrow ? 0 : 46
      const fromStates: Record<string, gsap.TweenVars> = {
        up: { y: shiftY, opacity: 0 },
        left: isNarrow ? { opacity: 0 } : { x: -shiftX, opacity: 0 },
        right: isNarrow ? { opacity: 0 } : { x: shiftX, opacity: 0 },
        scale: { y: 26, scale: 0.94, opacity: 0 },
        fade: { opacity: 0 },
        // Blur entrances reserve a filter layer — high tier only; lower
        // tiers silently downgrade to the scale variant.
        blur: isBlur
          ? { y: 30, scale: 0.94, opacity: 0, filter: 'blur(14px)' }
          : { y: 26, scale: 0.94, opacity: 0 },
      }

      Object.entries(fromStates).forEach(([variant, fromVars]) => {
        const els = gsap.utils.toArray<HTMLElement>(`[data-reveal="${variant}"]`)
        if (!els.length) return

        gsap.set(els, fromVars)
        ScrollTrigger.batch(els, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 1,
              filter: variant === 'blur' && isBlur ? 'blur(0px)' : undefined,
              duration: 0.85,
              ease: 'power3.out',
              stagger: 0.08,
              overwrite: true,
              // Free the inline transform afterwards so CSS :hover
              // translate/scale effects keep working on cards & stats.
              clearProps: variant === 'blur' && isBlur ? 'transform, filter' : 'transform',
            }),
        })
      })

      /* ── Parallax drift ───────────────────────────────────── */
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '-0.12')
        gsap.fromTo(
          el,
          { yPercent: speed * 50 },
          {
            yPercent: speed * -50,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section') || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        )
      })

      /* ── Decorative rotation drift (orbits, founder dial) ─── */
      gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el) => {
        const amount = parseFloat(el.dataset.drift || '60')
        gsap.fromTo(
          el,
          { rotation: -amount * 0.25 },
          {
            rotation: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section') || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          },
        )
      })

      /* ── Magnetic CTAs: buttons lean toward the pointer ──── */
      if (!isTouch && tier !== 'low') {
        gsap.utils.toArray<HTMLElement>('.arrow-link, .header-cta, .back-to-top').forEach((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' })
          const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' })
          const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect()
            xTo(((e.clientX - (r.left + r.width / 2)) / r.width) * 10)
            yTo(((e.clientY - (r.top + r.height / 2)) / r.height) * 8)
          }
          const onLeave = () => {
            xTo(0)
            yTo(0)
          }
          el.addEventListener('pointermove', onMove)
          el.addEventListener('pointerleave', onLeave)
          cleanups.push(() => {
            el.removeEventListener('pointermove', onMove)
            el.removeEventListener('pointerleave', onLeave)
          })
        })
      }

      /* ── Cursor glow: one composited radial light follows the pointer ── */
      if (!isTouch && tier !== 'low') {
        const glow = document.querySelector<HTMLElement>('.cursor-glow')
        if (glow) {
          const xTo = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3' })
          const yTo = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3' })
          const onMove = (e: PointerEvent) => {
            xTo(e.clientX)
            yTo(e.clientY)
            if (glow.style.opacity !== '1') gsap.to(glow, { opacity: 1, duration: 0.6 })
          }
          window.addEventListener('pointermove', onMove, { passive: true })
          cleanups.push(() => window.removeEventListener('pointermove', onMove))
        }
      }

      /* ── Hero: aurora canvas pulls back & softens as you leave ── */
      const heroCanvas = document.querySelector<HTMLElement>('.hero-aurora-canvas')
      if (heroCanvas) {
        gsap.to(heroCanvas, {
          scale: 1.14,
          yPercent: 7,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        })
      }

      const heroCopy = document.querySelector<HTMLElement>('.hero-copy')
      if (heroCopy) {
        gsap.to(heroCopy, {
          yPercent: -14,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        })
      }
    })

    return () => {
      cleanups.forEach((fn) => fn())
      ctx.revert()
    }
  }, [pathname])

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <i />
      </div>
      <div className="cursor-glow" aria-hidden="true" />
    </>
  )
}
