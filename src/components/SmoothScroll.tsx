import React, { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLocation } from 'react-router-dom'
import { getDeviceProfile } from '../lib/device'

gsap.registerPlugin(ScrollTrigger)

interface SmoothScrollProps {
  children: React.ReactNode
}

/** Shared Lenis handle so any component can smooth-scroll (BackToTop, anchors…) */
let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

export function smoothScrollTo(target: number | string | HTMLElement, offset = 0) {
  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.15 })
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const location = useLocation()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const { reducedMotion, isTouch } = getDeviceProfile()

    // Reduced-motion users and touch devices keep the browser's native scroll:
    // on touch, native momentum is smoother and cheaper than any JS smoothing.
    if (reducedMotion || isTouch) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      duration: 0.95,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      infinite: false,
      anchors: true,
    })

    lenisRef.current = lenis
    lenisInstance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    let ticks = 0
    const updateTicker = (time: number) => {
      ticks++
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(updateTicker)
    gsap.ticker.lagSmoothing(500, 33)

    // Some embedded webviews (in-app browser panes, occluded views) report
    // themselves "visible" but never fire requestAnimationFrame. GSAP's
    // ticker is rAF-driven, so every animation would freeze at its from-state
    // (invisible text) and Lenis would swallow wheel events without ever
    // scrolling. Timers still run in those webviews, so after a grace period
    // with zero ticker beats we fall back to static content + native scroll.
    const watchdog = window.setTimeout(() => {
      if (ticks > 0) return
      document.documentElement.dataset.animFallback = 'static'
      gsap.ticker.remove(updateTicker)
      lenis.destroy()
      if (lenisRef.current === lenis) lenisRef.current = null
      if (lenisInstance === lenis) lenisInstance = null
    }, 1200)

    // Webfonts change text metrics → re-measure every trigger once they land,
    // otherwise reveals computed against fallback-font layout misfire.
    const refreshOnFonts = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refreshOnFonts)
    window.addEventListener('load', refreshOnFonts)

    return () => {
      window.clearTimeout(watchdog)
      window.removeEventListener('load', refreshOnFonts)
      gsap.ticker.remove(updateTicker)
      lenis.destroy()
      lenisRef.current = null
      lenisInstance = null
    }
  }, [])

  // Route changes: jump to top, then re-measure triggers for the new page
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true })
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  return <div className="smooth-scroll-wrapper">{children}</div>
}
