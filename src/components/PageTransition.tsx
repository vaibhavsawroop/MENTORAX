/**
 * PageTransition
 *
 * A full-screen MentoraX signal that slides in to cover the page swap,
 * then fades and slides out to reveal the new page.
 *
 * Phase chain (no setTimeout — driven entirely by onAnimationComplete):
 *   idle → in → out → idle
 *
 * The key={session} on the panel forces a clean remount if the user navigates
 * mid-transition, so initial state is always correct.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

type Phase = 'idle' | 'in' | 'out'

export function PageTransition() {
  const { pathname }     = useLocation()
  const prefersReduced   = useReducedMotion()
  const [phase, setPhase]     = useState<Phase>('idle')
  const [session, setSession] = useState(0)
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPath.current || prefersReduced) return
    prevPath.current = pathname
    setSession(s => s + 1) // remount → resets to initial position
    setPhase('in')
  }, [pathname, prefersReduced])

  if (phase === 'idle') return null

  const handleComplete = () =>
    setPhase(p => (p === 'in' ? 'out' : 'idle'))

  return (
    <motion.div
      key={session}
      className="page-transition"
      aria-hidden="true"
      initial={{ x: '-100%' }}
      animate={
        phase === 'in'
          ? { x: '0%', transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] } }
          : { x: '100%', transition: { duration: 0.58, ease: [0.64, 0, 0.78, 0] } }
      }
      onAnimationComplete={handleComplete}
    >
      <motion.div
        className="page-transition-glow"
        initial={{ opacity: 0, scale: .7 }}
        animate={{ opacity: phase === 'in' ? 1 : 0, scale: phase === 'in' ? 1 : 1.18 }}
        transition={{ duration: phase === 'in' ? .55 : .3, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="page-transition-orbit"
        initial={{ opacity: 0, rotate: -24, scale: .72 }}
        animate={{ opacity: phase === 'in' ? 1 : 0, rotate: phase === 'in' ? 0 : 20, scale: phase === 'in' ? 1 : 1.12 }}
        transition={{ duration: phase === 'in' ? .58 : .28, ease: [0.22, 1, 0.36, 1] }}
      >
        <i />
        <i />
        <i />
      </motion.div>
      <motion.div
        className="page-transition-brand"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: phase === 'in' ? 1 : 0, y: phase === 'in' ? 0 : -8 }}
        transition={{ duration: phase === 'in' ? .42 : .22, delay: phase === 'in' ? .1 : 0 }}
      >
        <img className="page-transition-mark" src="/logo-mark.webp" alt="" />
        <span>mentora<span className="page-transition-x">x</span></span>
      </motion.div>
    </motion.div>
  )
}
