import { lazy, Suspense, type FormEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { HoverMember, type HoverMemberItem } from './components/HoverMember'
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Crown,
  ExternalLink,
  HelpCircle,
  Mail,
  Menu,
  MessageCircle,
  Minus,
  MoveUpRight,
  Plus,
  Quote,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { studentTestimonials, faqs, type Faq } from './data'
import { PageTransition } from './components/PageTransition'
import { SmoothScroll, smoothScrollTo } from './components/SmoothScroll'
import { ScrollFX } from './components/ScrollFX'
import { TextPop } from './components/TextReveal'
import { getDeviceProfile } from './lib/device'
import { HeroAurora } from './scene/HeroAurora'

const navItems = [
  ['Mentorship', '/mentorship'],
  ['Books', '/books'],
  ['Mentors', '/mentors'],
  ['Our team', '/team'],
] as const

const HeroScene = lazy(() => import('./scene/HeroScene').then((m) => ({ default: m.HeroScene })))
const HalftoneReveal = lazy(() => import('./components/HalftoneReveal').then((m) => ({ default: m.HalftoneReveal })))
const CheckoutPage = lazy(() => import('./components/Checkout').then((m) => ({ default: m.CheckoutPage })))
const Clouds = lazy(() => import('./components/canvasui/Clouds').then((m) => ({ default: m.Clouds })))

const plans = [
  { name: 'Catalyst', index: '01', price: '₹1,500', originalPrice: '₹3,000', note: 'IAT 2027 · Class 12 + Droppers · Build Momentum, Crack IAT.', cohort: 'Class 12 & Droppers', duration: '1 Year', features: ['Guidance from 4 dedicated mentors (PCMB)', 'Interactive cohort Google Meet guidance sessions', 'Curated Daily Practice Problems (DPPs)', 'Complete IAT PYQ Solutions', 'Progress Tracking & Strategy Guidance', 'Personalised Study Plan & Doubt Support (WhatsApp)'], accent: 'lilac', productId: 'catalyst', banner: '/batches/catalyst.jpg' },
  { name: 'Quantum', index: '02', price: '₹5,000', originalPrice: '₹10,000', note: 'IAT 2027 · Class 12 + Droppers · Intensive Personalised 1-on-1 Guidance.', cohort: 'Class 12 & Droppers', duration: '1 Year (365 days)', features: ['Dedicated 1-on-1 personal mentor for 1 full year', 'Daily Targets via Email — planned schedules to your inbox', 'Structured Day Architecture — daily study plan & milestones', 'Continuous Support — calls, DMs & 1-on-1 Google Meet', 'Physical IAT MentoraX PYQ Book shipped to doorstep', 'All Core Resources — DPPs, IAT PYQs, 4-subject guidance'], accent: 'lime', featured: true, productId: 'quantum', banner: '/batches/quantum.jpg' },
  { name: 'Genesis', index: '03', price: '₹10,000', originalPrice: '₹20,000', note: 'IAT 2027 · Class 11 Foundation · 2-Year Long-Term Scientist Pathway.', cohort: 'Class 11 Foundation', duration: '2 Years (Class 11 + 12)', features: ['1-on-1 Personalised Mentorship with dedicated mentor', 'Planned Day Structure & Email Targets daily', 'Comprehensive Foundation Planning & milestone tracking', 'Regular Google Meet sessions with all 4 mentors', 'Continuous Support — calls, DMs & personalised check-ins', 'Physical IAT MentoraX PYQ Book shipped to doorstep'], accent: 'peach', productId: 'genesis', banner: '/batches/genesis.jpg' },
]

const materials = [
  ['01', 'Foundation files', 'Concept guides and essential references for the first steady layer.'],
  ['02', 'Practice archive', 'Purposeful problem sets, not endless downloads.'],
  ['03', 'Revision editions', 'Quick-reference tools for the stretch where time matters most.'],
  ['04', 'Strategy notes', 'The small, decisive patterns that are easy to miss alone.'],
]

type MentorCard = {
  initials: string
  name: string
  role: string
  detail: string
  tone: 'violet' | 'sage' | 'coral' | 'ink'
  portrait?: string
  portraitAlt?: string
  subjects: string[]
}

const mentors: MentorCard[] = [
  { initials: 'R', name: 'Raj', role: 'Mathematics Mentor', detail: 'IISER TVM · Mentored 2,200+ students across India with precision guidance on strategy, schedule optimization, and conceptual clarity.', tone: 'violet', portrait: '/mentors/raj.png', portraitAlt: 'Raj, MentoraX Mathematics Mentor', subjects: ['IAT Maths', 'Strategy', 'Schedule optimization'] },
  { initials: 'B', name: 'Bhavesha', role: 'Physics Mentor', detail: 'IISER TVM · Currently leading research projects at ISRO. Core guidance on exam methodology and physics orientation.', tone: 'sage', portrait: '/mentors/bhavesha.png', portraitAlt: 'Bhavesha, MentoraX Physics Mentor', subjects: ['Exam methodology', 'Physics orientation', 'ISRO research'] },
  { initials: 'AT', name: 'Aditya', role: 'Chemistry Mentor', detail: 'IIT Madras · AIR 544 in IAT 2026. Structured preparation blueprints for Physical, Organic, and Inorganic Chemistry.', tone: 'coral', portrait: '/mentors/aditya-thakur.png', portraitAlt: 'Aditya, MentoraX Chemistry Mentor', subjects: ['Physical', 'Organic', 'Inorganic'] },
  { initials: 'SB', name: 'Sparsh', role: 'Biology Mentor', detail: 'IISER Tirupati · Targeted NCERT retention tactics and high-efficiency revision roadmaps for Biology.', tone: 'ink', subjects: ['NCERT Biology', 'Retention tactics', 'Revision roadmaps'] },
]

const team = [
  ['Raj', 'Maths Mentor', 'A calm system, a clear next step, and personalised academic guidance.'],
  ['Bhavesha', 'Physics Mentor', 'Physics guidance grounded in research, clear concepts, and exam-aware thinking.'],
  ['Dipti', 'Co-founder & Mentor', 'Co-manages MentoraX with a focus on a considered, student-centred mentorship journey.'],
  ['Team member 04', 'Student experience', 'Details and portrait will be added from the source folder.'],
]

const pageTitle: Record<string, string> = {
  '/': 'MentoraX | The Science of a Clear Path',
  '/mentorship': 'Mentorship | MentoraX',
  '/books': 'Books | MentoraX',
  '/mentors': 'Mentors | MentoraX',
  '/team': 'Our Team | MentoraX',
  '/contact': 'Contact | MentoraX',
  '/refund-policy': 'Refund Policy | MentoraX',
  '/privacy-policy': 'Privacy Policy | MentoraX',
  '/terms': 'Terms & Conditions | MentoraX',
}

function ScrollManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pageTitle[pathname] ?? pageTitle['/']
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let wasVisible = false
    const onScroll = () => {
      const nextVisible = window.scrollY > 600
      if (nextVisible === wasVisible) return
      wasVisible = nextVisible
      setVisible(nextVisible)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="back-to-top"
          onClick={() => smoothScrollTo(0)}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Back to top"
        >
          <ChevronUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <AnimateIn key={item.question} delay={index * 0.05}>
            <div className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
              <button
                className="faq-trigger"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span className="faq-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="faq-question">{item.question}</span>
                <span className="faq-toggle-icon">{isOpen ? <Minus size={18} /> : <Plus size={18} />}</span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AnimateIn>
        )
      })}
    </div>
  )
}

function AnimateIn({ children, className = '', delay = 0, pop = true }: { children: React.ReactNode; className?: string; delay?: number; pop?: boolean }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: pop ? 30 : 20, scale: pop ? 0.97 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StatCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        let startTime: number | null = null
        const duration = 1600
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp
          const progress = Math.min((timestamp - startTime) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          el.textContent = `${Math.floor(eased * target)}${suffix}`
          if (progress < 1) frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target, suffix])

  return <span ref={ref} className="stat-number">0{suffix}</span>
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow"><span />{children}</p>
}

function ArrowLink({ to, children, solid = false, className = '' }: { to: string; children: React.ReactNode; solid?: boolean; className?: string }) {
  return <Link className={`arrow-link ${solid ? 'solid' : ''} ${className}`} to={to}>{children}<ArrowUpRight size={17} strokeWidth={1.8} /></Link>
}

function Tilt({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const move = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--rx', `${((event.clientY - box.top) / box.height - 0.5) * -3}deg`)
    event.currentTarget.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 3}deg`)
    event.currentTarget.style.setProperty('--glow-x', `${((event.clientX - box.left) / box.width) * 100}%`)
    event.currentTarget.style.setProperty('--glow-y', `${((event.clientY - box.top) / box.height) * 100}%`)
  }
  const leave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty('--rx')
    event.currentTarget.style.removeProperty('--ry')
  }
  return <div className={`tilt ${className}`} onMouseMove={move} onMouseLeave={leave}>{children}</div>
}

function Mark() { return <img className="mark" src="/logo.png" alt="MentoraX logo" /> }

import gsap from 'gsap'

function HeroShader() {
  const rocketRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!rocketRef.current) return
    const el = rocketRef.current
    
    let ctx = gsap.context(() => {
      const animateRocket = () => {
        if (reducedMotion) {
          gsap.set(el, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 })
          return
        }
        
        // Kill existing animations before restarting
        gsap.killTweensOf(el)
        
        // Parabolic flight effect: Start further inside (more left/down) so it's fully visible
        gsap.set(el, { opacity: 0, x: -280, y: 200, rotation: -18, scale: 0.7 })
        
        let initialDelay = 0.15
        if (typeof window !== 'undefined' && !sessionStorage.getItem('mentorax-rocket-delayed')) {
          initialDelay = 2.4 // Wait for InitialReveal blast doors
          sessionStorage.setItem('mentorax-rocket-delayed', 'true')
        }
        
        // Fade, Scale and Rotate (Buttery smooth)
        gsap.to(el, { opacity: 1, rotation: 0, scale: 1, duration: 1.8, ease: "power3.out", delay: initialDelay })
        
        // The Parabolic Curve (Longer duration, smoother eases)
        gsap.to(el, { x: 0, duration: 1.8, ease: "power2.out", delay: initialDelay })
        gsap.to(el, { y: 0, duration: 1.8, ease: "back.out(1.1)", delay: initialDelay })
        
        // Subtle floating loop after landing
        gsap.to(el, {
          y: "-=10",
          duration: 3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: initialDelay + 1.85
        })
      }

      // Run on mount
      animateRocket()

      // Watch for theme changes to run the flight again
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === 'data-theme') {
            animateRocket()
          }
        }
      })
      observer.observe(document.documentElement, { attributes: true })

      return () => observer.disconnect()
    })
    
    return () => ctx.revert()
  }, [reducedMotion])

  return (
    <>
      <div className="hero-shader-wrap" aria-hidden="true">
        <HeroAurora />
      </div>
      <div ref={rocketRef} className="hero-rocket-container">
        <img className="hero-rocket rocket-light" src="/rocket-illustration.avif" alt="MentoraX rocket illustration" aria-hidden="true" decoding="async" />
        <img className="hero-rocket rocket-dark" src="/rocket-illustration-inverted.avif" alt="MentoraX rocket illustration" aria-hidden="true" decoding="async" />
      </div>
    </>
  )
}

function ThemeSwitch() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('mentorax-theme')
    if (saved) return saved === 'dark'
    // First visit: detect system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    const root = document.documentElement

    // Coordinate the switch: for 1.2s every surface that paints
    // with the theme (backgrounds, cards, lines, shadows) eases together
    // instead of snapping at different times.
    root.classList.add('theming')
    window.setTimeout(() => root.classList.remove('theming'), 1200)

    // Keep the browser chrome (mobile address bar, task switcher) in sync.
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#08070d' : '#ffffff')

    if (dark) {
      root.setAttribute('data-theme', 'dark')
      localStorage.setItem('mentorax-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
      localStorage.setItem('mentorax-theme', 'light')
    }
  }, [dark])

  return (
    <label className="theme-switch" aria-label="Toggle dark mode">
      <input
        type="checkbox"
        className="theme-switch__checkbox"
        checked={dark}
        onChange={() => setDark(!dark)}
      />
      <div className="theme-switch__container">
        <div className="theme-switch__circle-container">
          <div className="theme-switch__sun-moon-container">
            <div className="theme-switch__moon">
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
              <div className="theme-switch__spot" />
            </div>
          </div>
        </div>
        <div className="theme-switch__clouds">
          <div className="theme-switch__clouds-inner" />
        </div>
        <div className="theme-switch__stars-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.56379 136.996 7.56587 137 8.72727C137.004 7.56587 137.392 6.56379 138.169 5.71123C138.945 4.85867 139.889 4.40947 141 4.35447C139.889 4.29946 138.945 3.85027 138.169 3.00688C137.392 2.16349 137.004 1.16141 137 0C136.996 1.16141 136.607 2.16349 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1614 35 19C35.0044 20.1614 35.3925 21.1635 36.1687 22.0069C36.9449 22.8503 37.8886 23.2995 39 23.3545C37.8886 23.4095 36.9449 23.8587 36.1687 24.7112C35.3925 25.5638 35.0044 26.5659 35 27.7273C34.9956 26.5659 34.6075 25.5638 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM114 36.3545C115.111 36.2995 116.055 35.8503 116.831 35.0069C117.607 34.1635 117.996 33.1614 118 32C118.004 33.1614 118.392 34.1635 119.169 35.0069C119.945 35.8503 120.889 36.2995 122 36.3545C120.889 36.4095 119.945 36.8587 119.169 37.7112C118.392 38.5638 118.004 39.5659 118 40.7273C117.996 39.5659 117.607 38.5638 116.831 37.7112C116.055 36.8587 115.111 36.4095 114 36.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1614 4 32C4.00441 33.1614 4.39251 34.1635 5.16869 35.0069C5.94487 35.8503 6.88864 36.2995 8 36.3545C6.88864 36.4095 5.94487 36.8587 5.16869 37.7112C4.39251 38.5638 4.00441 39.5659 4 40.7273C3.99559 39.5659 3.6075 38.5638 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56 46.3545C57.1114 46.2995 58.0551 45.8503 58.8313 45.0069C59.6075 44.1635 59.9956 43.1614 60 42C60.0044 43.1614 60.3925 44.1635 61.1687 45.0069C61.9449 45.8503 62.8886 46.2995 64 46.3545C62.8886 46.4095 61.9449 46.8587 61.1687 47.7112C60.3925 48.5638 60.0044 49.5659 60 50.7273C59.9956 49.5659 59.6075 48.5638 58.8313 47.7112C58.0551 46.8587 57.1114 46.4095 56 46.3545Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </label>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  // The floating island condenses once the page moves under it.
  useEffect(() => {
    let wasScrolled = false
    const onScroll = () => {
      const nextScrolled = window.scrollY > 12
      if (nextScrolled === wasScrolled) return
      wasScrolled = nextScrolled
      setScrolled(nextScrolled)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}><div className="header-inner"><Link className="wordmark" to="/"><Mark /><span>mentora<span className="wordmark-x">x</span></span></Link><nav className="desktop-nav" aria-label="Main navigation">{navItems.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav><div className="header-actions"><ThemeSwitch /><Link className="header-contact" to="/contact">Start a conversation <ArrowUpRight size={14} /></Link><Link className="header-cta" to="/mentorship">Apply to MentoraX <ArrowRight size={15} /></Link><button className="menu-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></div><AnimatePresence>{open && <motion.div className="mobile-menu" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .2 }}>{navItems.map(([label, to]) => <NavLink key={to} to={to}>{label}<ArrowUpRight size={17} /></NavLink>)}<Link to="/contact">Start a conversation <ArrowRight size={17} /></Link></motion.div>}</AnimatePresence></header>
}

function Footer() {
  const openBuilderInstagram = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!/android/i.test(navigator.userAgent)) return
    event.preventDefault()
    window.location.href = 'intent://instagram.com/_u/vaibhavsawroop/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=https%3A%2F%2Fwww.instagram.com%2Fvaibhavsawroop%2F;end'
  }

  return <footer className="site-footer"><div className="footer-grid"><div data-reveal="up"><Link className="wordmark footer-mark" to="/"><Mark /><span>mentora<span className="wordmark-x">x</span></span></Link><p className="footer-statement">A focused mentorship studio for IAT, NEST, CUET, and science entrance aspirants. Managed with intent by Raj &amp; Dipti.</p><div className="social-links"><a href="mailto:managementrajiiserit@gmail.com" aria-label="Email MentoraX"><Mail size={17} /></a></div></div><FooterColumn title="Explore" links={navItems} /><FooterColumn title="Company" links={[["Contact Us", "/contact"], ["Refund & Cancellation Policy", "/refund-policy"], ["Privacy Policy", "/privacy-policy"], ["Terms & Conditions", "/terms"]]} /><div className="footer-note" data-reveal="up"><span className="tiny-kicker">A note from us</span><p>There is no shortcut to a good path. Only better guidance along it.</p></div></div><div className="footer-bottom"><span>© 2026 MentoraX. All Rights Reserved.</span><span>Website Built By <a className="builder-credit" href="https://www.instagram.com/vaibhavsawroop" target="_blank" rel="noopener noreferrer" onClick={openBuilderInstagram}>Vaibhav Sawroop</a></span><span>Made for the long game.</span></div></footer>
}

function FooterColumn({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return <div className="footer-column" data-reveal="up"><span className="tiny-kicker">{title}</span>{links.map(([name, href]) => <Link key={href} to={href}>{name}</Link>)}</div>
}

function Layout() {
  return (
    <SmoothScroll>
      <ScrollManager />
      <ScrollFX />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <PageTransition />
    </SmoothScroll>
  )
}

function DeferredHeroScene() {
  const ref = useRef<HTMLDivElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const { tier, reducedMotion } = getDeviceProfile()

  useEffect(() => {
    const el = ref.current
    if (!el || tier === 'low' || reducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNearViewport(entry.isIntersecting)
      },
      { rootMargin: '320px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [tier, reducedMotion])

  return (
    <div ref={ref} className="closing-orb" data-parallax="-0.1" aria-hidden="true">
      <div className="hero-css-fallback" />
      {nearViewport && <Suspense fallback={null}><HeroScene /></Suspense>}
    </div>
  )
}

function PageIntro({ index, eyebrow, title, italic, copy, side }: { index: string; eyebrow: string; title: string; italic?: string; copy: string; side?: string }) {
  return (
    <section className="page-intro">
      <div className="page-intro-grid">
        <AnimateIn>
          <div className="page-index" data-parallax="-0.18">{index}</div>
        </AnimateIn>
        <AnimateIn delay={.07}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <TextPop as="h1" delay={0.08}>
            {title} {italic && <em>{italic}</em>}
          </TextPop>
        </AnimateIn>
        <AnimateIn delay={.14}>
          <p className="intro-copy">{copy}</p>
          {side && <p className="intro-side">{side}</p>}
        </AnimateIn>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const total = studentTestimonials.length
  const prefersReduced = useReducedMotion()

  const prev = useCallback(() => setActive(i => (i - 1 + total) % total), [total])
  const next = useCallback(() => setActive(i => (i + 1) % total), [total])

  useEffect(() => {
    if (paused || prefersReduced) return
    const id = setInterval(next, 4600)
    return () => clearInterval(id)
  }, [paused, next, prefersReduced])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  return (
    <section
      className="testimonials-section section-pad"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const dx = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(dx) > 52) dx > 0 ? next() : prev()
        touchStartX.current = null
      }}
    >
      <div className="section-head">
        <div>
          <Eyebrow>Verified Student Admissions</Eyebrow>
          <h2>Real results. <em>Real IISER admits.</em></h2>
        </div>
        <p>Direct feedback from aspirants who transformed their IAT &amp; NEST preparation with MentoraX guidance.</p>
      </div>

      <div
        className="slideshow-stage"
        aria-roledescription="carousel"
        aria-label="Student testimonials"
      >
        <div
          className="slideshow-track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {studentTestimonials.map((t, i) => (
            <div
              key={t.id}
              className="slideshow-item"
              aria-hidden={i !== active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}`}
            >
              <article className="slide-card">
                <div className="slide-card-top">
                  <span className="college-badge">{t.badge}</span>
                </div>
                <p className="slide-quote">"{t.comment}"</p>
                <div className="slide-author">
                  <span className="slide-name">{t.author}</span>
                  <span className="yt-proof-tag"><span />{t.handle}</span>
                </div>
                {t.reply && (
                  <div className="mentor-reply-box">
                    <MessageCircle size={14} />
                    <span>{t.reply}</span>
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="slideshow-controls">
        <button className="slide-arrow" onClick={prev} aria-label="Previous review">
          <ChevronLeft size={18} />
        </button>
        <div className="slide-dots" role="tablist" aria-label="Testimonial navigation">
          {studentTestimonials.map((t, i) => (
            <button
              key={t.id}
              className={`slide-dot${i === active ? ' slide-dot-active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Review by ${t.author}`}
              role="tab"
              aria-selected={i === active}
            />
          ))}
        </div>
        <button className="slide-arrow" onClick={next} aria-label="Next review">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}

function Home() {
  // Low-tier devices retain the card design without allocating WebGL; capable
  // phones keep the cloud motion at the renderer's mobile frame budget.
  const { allowDecorativeWebGL } = getDeviceProfile()
  const planCloudsEnabled = allowDecorativeWebGL

  return <>
    <section className="hero">
      <HeroShader />
      <div className="hero-wrap">
        <div className="hero-copy">
          <motion.div
            className="hero-proof-badge"
            initial={{ opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="proof-dot" />
            <span>92+ IISER admits</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .06, ease: [0.22, 1, 0.36, 1] }}>
            <Eyebrow>For IAT &amp; NEST aspirants</Eyebrow>
          </motion.div>

          <TextPop as="h1" mode="popup" delay={0.16}>
            The science<br />of a clear path.
          </TextPop>

          <motion.p
            className="hero-lede"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .7, delay: .22, ease: [0.22, 1, 0.36, 1] }}
          >
            MentoraX is the thoughtful, high-touch mentoring space for students who want their effort to compound.
          </motion.p>

          <motion.div
            className="hero-buttons"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .6, delay: .32, ease: [0.22, 1, 0.36, 1] }}
          >
            <ArrowLink solid to="/mentorship">Explore mentorship</ArrowLink>
            <ArrowLink to="/mentors">Meet your mentors</ArrowLink>
          </motion.div>

          <motion.div
            className="hero-tier-pills"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: .7, delay: .52 }}
          >
            <span className="tier-pill tier-foundation">Catalyst</span>
            <span className="tier-pill tier-momentum">Quantum</span>
            <span className="tier-pill tier-intensive">Genesis</span>
          </motion.div>
        </div>

        <div className="hero-art">
          <motion.div
            className="orbit-caption orbit-caption-one"
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="caption-dot" />
            doubt → direction
          </motion.div>

          <motion.div
            className="orbit-caption orbit-caption-two"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>01</span>
            <b>Start where<br />you are.</b>
          </motion.div>
        </div>
      </div>

      <div className="hero-bottom">
        <span>Scroll to calibrate</span>
        <div className="scroll-rule"><i /></div>
        <span>MentoraX · 2026</span>
      </div>
    </section>

    <section className="stats-banner section-pad">
      <div className="stats-grid">
        <div className="stat-item" data-reveal="up">
          <StatCounter target={92} suffix="+" />
          <span>IISER admits</span>
        </div>
        <div className="stat-item" data-reveal="up">
          <StatCounter target={400} suffix="+" />
          <span>Student hours</span>
        </div>
        <div className="stat-item" data-reveal="up">
          <StatCounter target={12} />
          <span>Strategy modules</span>
        </div>
      </div>
    </section>

    <section className="manifesto section-pad"><div className="manifesto-grid"><AnimateIn><span className="oversized-number" data-parallax="-0.15">01</span></AnimateIn><AnimateIn><div><Eyebrow>Not another content pile</Eyebrow><TextPop as="h2" mode="skew">A good plan has a <em>pulse.</em></TextPop></div></AnimateIn><AnimateIn delay={.08}><p className="body-large">At MentoraX, mentorship is built around the difference between knowing what matters and actually knowing what to do next. The feeling is calm, exact, and personal.</p><ArrowLink to="/team">Why we built this</ArrowLink></AnimateIn></div></section>

    <section className="field-notes section-pad"><div className="section-head"><div><Eyebrow>The MentoraX field notes</Eyebrow><TextPop as="h2" mode="blur">Less static. More <em>signal.</em></TextPop></div><p>We have a bias for the few things that genuinely shift preparation forward.</p></div><div className="feature-list" data-skew=""><FeatureCard number="01" icon={<Compass />} title="A map you will use." text="Preparation becomes easier to trust when the next move is visible, and made for your actual week." /><FeatureCard number="02" icon={<MessageCircle />} title="A voice when you need one." text="A real mentoring relationship makes doubt smaller, faster than more content ever can." /><FeatureCard number="03" icon={<Target />} title="A rhythm that holds." text="The aim isn’t study intensity for a week. It’s a system that keeps you moving for the full arc." /></div></section>

    <section className="way section-pad"><div className="way-top"><Eyebrow>How the work unfolds</Eyebrow><span className="tiny-kicker">A four-part sequence</span></div><div className="way-grid"><WayItem number="01" title="Orient" copy="Meet your current level with honesty and without drama." /><WayItem number="02" title="Build" copy="Turn a large ambition into a rhythm you can live with." /><WayItem number="03" title="Refine" copy="Use feedback to find the few gaps that actually matter." /><WayItem number="04" title="Perform" copy="Arrive for the exam with calm, strategy, and self-trust." /></div></section>

    <TestimonialsSection />

    <section className="founders-section section-pad"><div className="founder-portrait-panel" data-drift="6"><div className="founder-orbit"><span>MentoraX</span><i>✦</i><span>MentoraX</span><i>✦</i><span>MentoraX</span></div><div className="founder-initials">R <i>+</i> D</div><span className="rd-pun-label">Research &amp; Development</span><p>Managed personally by<br /><b>Raj &amp; Dipti</b></p></div><div className="founder-copy"><AnimateIn><Eyebrow>R+D — the real kind</Eyebrow><TextPop as="h2" mode="popup">Warmth is not the opposite of <em>rigour.</em></TextPop><p className="body-large">R+D at MentoraX means two things at once: Raj &amp; Dipti, and the Research &amp; Development mindset that IISER, IAT, and NEST are built on. We believe the best exam prep is also the best science education.</p><div className="founder-quote"><Quote size={21} /><p>"The aim is not to make a student busier. It's to help them become more certain."</p></div><ArrowLink to="/team">Meet the MentoraX team</ArrowLink></AnimateIn></div></section>

    <section className="program-preview section-pad"><AnimateIn><div className="section-head"><div><Eyebrow>Find your level of support</Eyebrow><TextPop as="h2" mode="bounce">Designed for a very real <em>journey.</em></TextPop></div><ArrowLink to="/mentorship">View the program</ArrowLink></div></AnimateIn><div className="plan-strip" data-skew="">{plans.map((plan, index) => <AnimateIn key={plan.name} delay={index * .06}>{plan.name !== 'Quantum' && planCloudsEnabled ? <Suspense fallback={<Tilt className="plan-card"><PlanCardContent plan={plan} /></Tilt>}><Clouds className="plan-clouds" scale={1.1} speed={0.38} cover={0.2} density={1.75} shading={0.3} opacity={0.65} shadow={0.1} wind={0.5} windRadius={200} quality={0.75}><Tilt className="plan-card"><PlanCardContent plan={plan} /></Tilt></Clouds></Suspense> : <Tilt className={`plan-card ${plan.featured ? 'plan-card-featured' : ''}`}><PlanCardContent plan={plan} /></Tilt>}</AnimateIn>)}</div></section>

    <section className="book-banner">
      <div>
        <span className="tiny-kicker">The MentoraX library</span>
        <TextPop as="h2" mode="blur">Resources that stay <em>on your desk.</em></TextPop>
        <p>Purpose-built books and revision editions are arriving here soon.</p>
        <ArrowLink to="/books">See the library</ArrowLink>
      </div>
      <motion.div
        className="book-sculpture"
        initial={{ opacity: 0, y: 48, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link to="/checkout?product=iat-pyq-book" className="book-shape b-one" data-parallax="-0.22" aria-label="IAT book — Buy now">
          IAT
          <span className="book-hover-label">Buy IAT · ₹499</span>
        </Link>
        <Link to="/checkout?product=nest-pyq-book" className="book-shape b-two" data-parallax="0.14" aria-label="NEST book — Buy now">
          NEST
          <span className="book-hover-label">Buy NEST · ₹499</span>
        </Link>
        <Link to="/checkout?product=all-pyq-combo" className="book-shape b-three" data-parallax="0.3" aria-label="MentoraX All Combo — Buy now">
          X
          <span className="book-hover-label">Combo · ₹799</span>
        </Link>
      </motion.div>
    </section>

    <section className="faq-section section-pad">
      <div className="section-head">
        <div>
          <Eyebrow>Frequently asked questions</Eyebrow>
          <TextPop as="h2" mode="skew">Questions we hear <em>often.</em></TextPop>
        </div>
        <p>Can't find your answer? <ArrowLink to="/contact">Ask us directly</ArrowLink></p>
      </div>
      <FaqAccordion items={faqs} />
    </section>

    <section className="closing section-pad closing-with-orb">
      <DeferredHeroScene />
      <AnimateIn><span className="closing-star">✦</span><TextPop as="h2" mode="popup">There is a version of preparation that feels like <em>possibility.</em></TextPop><p>Let's find the path that makes sense for you.</p><ArrowLink solid to="/contact">Start a conversation</ArrowLink></AnimateIn>
    </section>
  </>
}

function FeatureCard({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <article className="feature-card" data-reveal="up"><div><span className="feature-number">{number}</span><span className="feature-icon">{icon}</span></div><h3>{title}</h3><p>{text}</p><ArrowUpRight className="feature-arrow" size={19} /></article> }
function WayItem({ number, title, copy }: { number: string; title: string; copy: string }) { return <article className="way-item" data-reveal="up"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article> }

function ProductWhySection() {
  const benefits = [
    'Understand how IAT questions are actually asked',
    'Learn the concept behind every problem',
    'Develop an exam-oriented problem-solving approach',
    'Identify frequently tested topics and patterns',
  ]
  return (
    <section className="product-why section-pad">
      <div className="product-section-index">01</div>
      <div className="product-why-copy">
        <Eyebrow>Why this book?</Eyebrow>
        <h2>Don’t just solve PYQs. Understand <em>them.</em></h2>
        <p className="body-large">IAT preparation isn’t about memorizing hundreds of answers. It’s about recognizing the concepts, patterns, and problem-solving approaches hidden inside the questions.</p>
        <p>Every question becomes a learning opportunity — so you can see what the exam asks, why the answer works, and what to do next.</p>
      </div>
      <div className="product-benefits">
        {benefits.map((benefit, index) => (
          <div className="product-benefit" data-reveal="left" key={benefit}>
            <span>0{index + 1}</span><p>{benefit}</p><Check size={17} />
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductInsideSection() {
  const features = [
    ['01', 'Complete IAT PYQs', 'Questions from 2017–2024 to reveal how the examination has evolved.'],
    ['02', 'Step-by-step solutions', 'Detailed working designed to make difficult questions easier to apply.'],
    ['03', 'Concept-based explanations', 'Don’t memorize the answer. Understand why it is correct.'],
    ['04', 'All four subjects', 'Physics, Chemistry, Mathematics, and Biology in one focused resource.'],
  ]
  return (
    <section className="product-inside section-pad">
      <div className="section-head">
        <div><Eyebrow>What’s inside?</Eyebrow><h2>Everything you need to master <em>IAT PYQs.</em></h2></div>
        <p>Built to be useful while you learn, precise while you practise, and easy to return to during revision.</p>
      </div>
      <div className="product-feature-grid">
        {features.map(([number, title, copy]) => <article className="product-feature" data-reveal="up" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
      </div>
    </section>
  )
}

function ProductLoopSection() {
  return (
    <section className="way product-loop section-pad">
      <div className="way-top"><Eyebrow>Your preparation, simplified</Eyebrow><span className="tiny-kicker">From question to confidence</span></div>
      <div className="way-grid product-loop-grid">
        <WayItem number="01" title="Learn" copy="Build the concepts that make questions easier to see." />
        <WayItem number="02" title="Practice" copy="Solve authentic IAT questions from the actual examination." />
        <WayItem number="03" title="Analyze" copy="Understand mistakes, patterns, and solution approaches." />
        <WayItem number="04" title="Revise" copy="Return to important concepts and recurring topics." />
        <WayItem number="05" title="Perform" copy="Walk into the IAT knowing what to expect." />
      </div>
    </section>
  )
}

function Mentorship() {
  const comparisonRows = [
    { feature: 'Target Cohort', catalyst: 'Class 12 / Droppers', quantum: 'Class 12 / Droppers', genesis: 'Class 11 Foundation', isText: true },
    { feature: 'Program Duration', catalyst: '1 Year', quantum: '1 Year', genesis: '2 Years', isText: true },
    { feature: 'Guidance by 4 Dedicated Mentors', catalyst: true, quantum: true, genesis: true },
    { feature: 'Daily Practice Problems (DPPs)', catalyst: true, quantum: true, genesis: true },
    { feature: 'Complete IAT PYQ Solutions', catalyst: true, quantum: true, genesis: true },
    { feature: 'Google Meet Guidance Sessions', catalyst: true, quantum: true, genesis: true },
    { feature: 'Problem-Solving Teaching Lectures', catalyst: false, quantum: false, genesis: false, note: 'Pure Mentorship' },
    { feature: 'Email Daily Targets & Day Structure', catalyst: false, quantum: true, genesis: true },
    { feature: 'Regular Support (Calls, Text & GMeet)', catalyst: false, quantum: true, genesis: true },
    { feature: 'Dedicated 1-on-1 Personal Mentor', catalyst: false, quantum: true, genesis: true },
    { feature: 'Physical PYQ Solution Book Shipped', catalyst: false, quantum: true, genesis: true },
    { feature: 'Price (50% OFF)', catalyst: <><span className="comp-strike-inline">₹3,000</span> ₹1,500</>, quantum: <><span className="comp-strike-inline">₹10,000</span> ₹5,000</>, genesis: <><span className="comp-strike-inline">₹20,000</span> ₹10,000</>, isReactNode: true, isFinal: true },
  ]

  return <><PageIntro index="01" eyebrow="The MentoraX mentorship" title="A better way to be" italic="serious." copy="Pure mentorship — strategy, pacing, guidance, and structure. No problem-solving teaching lectures. Google Meet interactive sessions apply across all 3 tiers." side="For students who care deeply about what comes next." />

  {/* ─── BATCH POSTER BANNERS ─── */}
  <section className="batch-banners section-pad">
    <AnimateIn><div className="section-head"><div><Eyebrow>IAT 2027 Mentorship Programs</Eyebrow><h2>Same Mentors. Same Vision. <em>Bigger You.</em></h2></div></div></AnimateIn>
    <div className="batch-banner-grid">
      {plans.map((plan, i) => <AnimateIn key={plan.name} delay={i * .08}>
        <Link to={`/checkout?product=${'productId' in plan ? plan.productId : 'catalyst'}`} className={`batch-banner-card batch-banner-${plan.accent}`}>
          {'banner' in plan && <img src={plan.banner as string} alt={`${plan.name} batch poster`} className="batch-banner-img" loading="lazy" />}
          <div className="batch-banner-overlay">
            <span className="batch-banner-tag">50% OFF</span>
            <h3>{plan.name}</h3>
            <div className="batch-banner-price">
              <span className="batch-price-strike">{plan.originalPrice}</span>
              <strong>{plan.price}</strong>
            </div>
            <span className="batch-banner-cohort">{'cohort' in plan ? (plan.cohort as string) : ''} · {'duration' in plan ? (plan.duration as string) : ''}</span>
          </div>
        </Link>
      </AnimateIn>)}
    </div>
  </section>

  <section className="section-pad program-design"><div className="section-head"><div><Eyebrow>The programme in practice</Eyebrow><h2>One system, <em>four dimensions.</em></h2></div></div><div className="dimension-grid" data-skew=""><Dimension number="01" title="Direction" copy="A preparation map with a particular answer to the question: what should I do next?" /><Dimension number="02" title="Dialogue" copy="Mentoring conversations that turn uncertainty into a sensible decision." /><Dimension number="03" title="Deliberate practice" copy="DPPs and revision sets built around learning, not just finishing." /><Dimension number="04" title="Reflection" copy="Regular recalibration so your plan grows with your understanding." /></div></section>

  <section className="pricing-area section-pad"><div className="section-head"><div><Eyebrow>Programme editions</Eyebrow><h2>Pick the pressure you <em>need.</em></h2></div><p>Three focused tiers — each designed to match where you are in your preparation journey.</p></div><div className="pricing-cards">{plans.map((plan, index) => <AnimateIn key={plan.name} delay={index * .06}><article className={`edition-card ${plan.featured ? 'edition-card-primary' : ''}`}><span className="edition-index">{plan.index}</span>{plan.featured && <span className="edition-label">Most Popular</span>}<h3>{plan.name}</h3><div className="price-tba"><span>{plan.price}</span><span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.65em', marginLeft: '8px' }}>{plan.originalPrice}</span></div><p>{plan.note}</p><ul>{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><ArrowLink solid={!!plan.featured} to={`/checkout?product=${'productId' in plan ? plan.productId : 'catalyst'}`}>Enroll in {plan.name}</ArrowLink></article></AnimateIn>)}</div></section>

  {/* ─── COMPARISON GRID ─── */}
  <section className="comparison-section section-pad">
    <AnimateIn><div className="section-head"><div><Eyebrow>Program Comparison</Eyebrow><h2>What's included in <em>each tier.</em></h2></div></div></AnimateIn>
    <AnimateIn delay={.1}>
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th className="comp-feature-col">Features / Deliverables</th>
            <th className="comp-tier-col comp-catalyst"><span>Catalyst</span><em>₹1,500</em></th>
            <th className="comp-tier-col comp-quantum"><span>Quantum</span><em>₹5,000</em></th>
            <th className="comp-tier-col comp-genesis"><span>Genesis</span><em>₹10,000</em></th>
          </tr>
        </thead>
        <tbody>
          {comparisonRows.map((row, idx) => (
            <tr key={idx} className={row.isFinal ? 'comp-final-row' : ''}>
              <td className="comp-feature-name">{row.feature}</td>
              {(['catalyst', 'quantum', 'genesis'] as const).map(tier => {
                const val = row[tier]
                return <td key={tier} className="comp-cell">
                  {row.isReactNode ? (
                    <span className={`comp-text-val ${row.isFinal ? 'comp-final-price' : ''}`}>{val as React.ReactNode}</span>
                  ) : row.isText ? (
                    <span className={`comp-text-val ${row.isFinal ? 'comp-final-price' : ''}`}>{val as string}</span>
                  ) : val === true ? (
                    <span className="comp-check"><Check size={16} /></span>
                  ) : (
                    <span className="comp-cross">{row.note ? <span className="comp-note">{row.note}</span> : <Minus size={16} />}</span>
                  )}
                </td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </AnimateIn>
  </section>

  <section className="section-pad"><div className="cta-panel" data-reveal="scale"><Sparkles /><div><span className="tiny-kicker">The first step</span><h2>Tell us a little<br />about your <em>ambition.</em></h2></div><ArrowLink solid to="/contact">Start your enquiry</ArrowLink></div></section></> }
function Dimension({ number, title, copy }: { number: string; title: string; copy: string }) { return <article className="dimension" data-reveal="up"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article> }

function BooksHero() {
  return (
    <section className="books-hero">
      <div className="books-hero-grid">
        <div className="books-hero-copy">
          <motion.div className="books-launch-pill" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <span /> IAT MENTORAX · BOOK 01
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .08 }}>
            <Eyebrow>For serious IAT aspirants</Eyebrow>
            <h1>Master the past.<br />Ace the <em>future.</em></h1>
          </motion.div>
          <motion.p className="books-hero-lede" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .16 }}>
            IAT PYQ&apos;s Solution is the complete solved question bank for the IISER Aptitude Test — built to help you understand the exam, not just finish it.
          </motion.p>
          <motion.div className="books-hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .24 }}>
            <Link className="arrow-link solid" to="/checkout?product=iat-pyq-book">Buy the book · ₹499 <ArrowUpRight size={17} /></Link>
            <span className="books-hero-note">Physical Paperback<br />Free shipping · Delivered to your door</span>
          </motion.div>
          <motion.div className="books-subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7, delay: .4 }}>
            <span>Physics</span><span>Chemistry</span><span>Mathematics</span><span>Biology</span>
          </motion.div>
        </div>
        <div className="books-hero-art" aria-label="IAT PYQ's Solution book">
          <div className="books-hero-orbit books-hero-orbit-one" data-drift="80" />
          <div className="books-hero-orbit books-hero-orbit-two" data-drift="-55" />
          <motion.div className="books-hero-card" initial={{ opacity: 0, y: 42, rotate: 9 }} animate={{ opacity: 1, y: 0, rotate: 5 }} transition={{ duration: .9, delay: .15, ease: [0.22, 1, 0.36, 1] }}>
            <span className="books-card-kicker">IAT Mentorax</span>
            <strong>IAT<br /><em>PYQ&apos;s</em></strong>
            <span className="books-card-solution">Solution</span>
            <span className="books-card-years">2017—2024</span>
            <span className="books-card-subjects">PHYSICS · CHEMISTRY<br />MATHEMATICS · BIOLOGY</span>
            <b>₹499</b>
          </motion.div>
          <motion.div className="books-floating-tag books-floating-tag-top" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .55, delay: .65 }}>
            <span className="floating-tag-dot" /> 8 years of real questions
          </motion.div>
          <motion.div className="books-floating-tag books-floating-tag-bottom" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .55, delay: .8 }}>
            Question <i>→</i> Concept <i>→</i> Solution
          </motion.div>
        </div>
      </div>
      <div className="books-hero-footer"><span>2017–2024 PYQs</span><i /><span>4 subjects</span><i /><span>Physical paperback</span><i /><span>₹499 · Free delivery</span></div>
    </section>
  )
}

function Books() { return <><BooksHero /><section className="book-showcase section-pad"><BookProduct type="IAT" subtitle="IAT PYQ's Solution · 2017–2024" description="Practice real IAT questions, understand the concepts behind them, and learn how the exam actually asks questions." tone="plum" productId="iat-pyq-book" /><BookProduct type="NEST" subtitle="NEST PYQ's Solution · 2017–2024" description="A focused NEST edition for practising authentic questions, understanding recurring concepts, and revising with confidence." tone="teal" productId="nest-pyq-book" /></section><section className="library-note" data-reveal="up"><BookOpen /><div><Eyebrow>What makes it different?</Eyebrow><h2>Question → Concept → Approach → Solution.</h2><p>Instead of simply telling you the answer, the book helps you understand how to arrive at it. That makes PYQ practice more useful, more deliberate, and easier to revise.</p></div></section><section className="section-pad"><div className="cta-panel dark-cta" data-reveal="scale"><div><span className="tiny-kicker">Mega Bundle · Save ₹199</span><h2>Master both IAT &amp; NEST in one <em>bundle.</em></h2></div><Link className="arrow-link solid" to="/checkout?product=all-pyq-combo">Get 2-in-1 Combo · ₹799 <ArrowUpRight size={17} /></Link></div></section></> }
function BookProduct({ type, subtitle, description, tone, productId = 'iat-pyq-book' }: { type: string; subtitle: string; description: string; tone: string; productId?: string }) { return <AnimateIn><article className={`book-product ${tone}`}><div className="book-object"><div className="book-cover"><span>IAT Mentorax<br />book 01</span><strong>{type}</strong><i>{subtitle}</i><b>2017–24</b></div><div className="book-pages" /></div><div className="book-product-copy"><span className="tiny-kicker">{subtitle}</span><h2>{type} <em>edition.</em></h2><p>{description}</p><div className="product-meta"><span>Price <b>₹499</b></span><span>Format <b>Paperback</b></span><span>Delivery <b>Free · All India</b></span></div><Link className="arrow-link solid" to={`/checkout?product=${productId}`}>Order the book · ₹499 <ArrowUpRight size={17} /></Link></div></article></AnimateIn> }
function PlanCardContent({ plan }: { plan: (typeof plans)[number] }) { return <><div className="plan-top"><span>{plan.index}</span>{plan.featured && <span className="plan-badge">Most Popular</span>}</div><h3>{plan.name}</h3>{'price' in plan && <div className="price-tba"><span>{plan.price}</span>{'originalPrice' in plan && <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.7em', marginLeft: '8px' }}>{plan.originalPrice}</span>}</div>}<p>{plan.note}</p><ul>{plan.features.slice(0, 3).map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul><Link to={`/checkout?product=${'productId' in plan ? plan.productId : 'catalyst'}`} className="plan-link">Enroll Now <ArrowRight size={16} /></Link></> }

function MentorProfileCard({ person, index }: { person: MentorCard; index: number }) {
  return <AnimateIn key={person.name} delay={index * .05}><article className={`mentor-card ${person.tone}`}><div className="mentor-portrait-wrap">{person.portrait ? <Suspense fallback={<div className="mentor-portrait mentor-halftone"><img className="halftone-fallback" src={person.portrait} alt="" /></div>}><HalftoneReveal className="mentor-portrait mentor-halftone" src={person.portrait} alt={person.portraitAlt ?? `${person.name}, MentoraX mentor`} inkColor={person.tone === 'sage' ? '#27463c' : '#2b214d'} paperColor={person.tone === 'sage' ? '#e8f1df' : '#eee8ff'} /></Suspense> : <div className="mentor-portrait"><span>{person.initials}</span><i>MentoraX</i><div className="portrait-badge">Profile image<br />coming soon</div></div>}</div><div className="mentor-info"><div className="mentor-info-top"><span className="tiny-kicker">{person.role}</span><h2>{person.name}</h2><p>{person.detail}</p></div><div className="mentor-info-bottom"><div className="mentor-chips">{person.subjects.map(subject => <span key={subject}>{subject}</span>)}</div><Link className="mentor-cta" to="/contact">Book a conversation <ArrowRight size={14} /></Link></div></div></article></AnimateIn>
}

function Mentors() { return <><div className="page-intro-compact"><PageIntro index="03" eyebrow="Your dedicated mentorship team" title="Four personal mentors. One clear way" italic="forward." copy="Every MentoraX student receives academic, subject, strategy, and career guidance throughout the IAT and NEST preparation journey." side="Individual attention, fast doubt resolution, weekly progress reviews, and direct mentor support." /></div><section className="mentor-grid section-pad">{mentors.map((person, index) => <MentorProfileCard key={person.name} person={person} index={index} />)}</section><section className="mentor-manifesto section-pad"><div><Eyebrow>Our approach to mentorship</Eyebrow><h2>The best mentors leave you with better <em>questions.</em></h2></div><div className="manifesto-points"><p><span>01</span>A personalised study roadmap and weekly progress review keep preparation on track.</p><p><span>02</span>Dedicated subject support makes doubts, concepts, and chapter strategy easier to solve.</p><p><span>03</span>Strategy and career guidance help turn preparation into a confident admission plan.</p></div></section></> }

// Add `image: '/images/team/<filename>.jpg'` to each entry when portrait photos are available
const hoverTeamMembers: HoverMemberItem[] = [
  { name: 'Raj', role: 'CEO', initials: 'R', image: '/mentors/raj.png' },
  { name: 'Dipti', role: 'CMO', initials: 'D', image: '/mentors/dipti.png' },
  { name: 'Bhavesha', role: 'Physics Mentor', initials: 'B', image: '/mentors/bhavesha.png' },
  { name: 'Aditya Thakur', role: 'Chemistry Mentor', initials: 'AT', image: '/mentors/aditya-thakur.png' },
  { name: 'Sparsh Bansal', role: 'Biology Mentor', initials: 'SB' },
]

function Team() {
  return (
    <>
      <HoverMember
        teamMembers={hoverTeamMembers}
        defaultText="MENTORAX"
        backgroundColor="#fbfaf6"
        textColor="#181722"
        hoverTextColor="#181722"
        scrollTarget="#team-contact"
      />
      <section id="team-contact" className="section-pad">
        <div className="cta-panel" data-reveal="scale">
          <Crown />
          <div>
            <span className="tiny-kicker">Want to work with us?</span>
            <h2>Let's build something<br />worth <em>returning to.</em></h2>
          </div>
          <ArrowLink solid to="/contact">Contact MentoraX</ArrowLink>
        </div>
      </section>
    </>
  )
}

function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const fields = Object.fromEntries(new FormData(form).entries())
    setPending(true)
    setError('')
    try {
      // Our serverless endpoint (Vercel + Resend). Falls back to Netlify
      // Forms below when the API isn't reachable, so the form always works.
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      setSubmitted(true)
    } catch {
      try {
        const body = new URLSearchParams(fields as Record<string, string>).toString()
        const fallback = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })
        if (!fallback.ok) throw new Error('fallback failed')
        setSubmitted(true)
      } catch {
        setError('That didn\'t go through — please email support@mentorax.in and we\'ll reply quickly.')
      }
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageIntro
        index="05"
        eyebrow="A good place to begin"
        title="Let's talk about what comes"
        italic="next."
        copy="Tell us a little about where you are, where you want to go, and what kind of support would feel most useful."
        side="For mentorship, purchase, privacy, or refund questions, email support@mentorax.in."
      />
      <section className="contact-layout section-pad">
        <div className="contact-aside" data-reveal="left">
          <span className="tiny-kicker">Start a conversation</span>
          <h2>Good questions<br />are a good <em>start.</em></h2>
          <p>If you are unsure which edition of MentoraX is right for you, that is exactly the kind of conversation we are here for.</p>
           <div className="contact-method"><Mail size={17} /><span><strong>Official email</strong><br /><a href="mailto:support@mentorax.in">support@mentorax.in</a></span></div>
           <div className="contact-method"><MessageCircle size={17} /><span><strong>Policy questions</strong><br />For privacy, payment, or refund support, email us directly.</span></div>
        </div>
        <form className="contact-form" data-reveal="right" name="mentorax-enquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit}>
          <input type="hidden" name="form-name" value="mentorax-enquiry" />
          <p className="hidden-field"><label>Do not fill this out <input name="bot-field" /></label></p>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                className="form-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="success-icon"><Check size={32} /></div>
                <h3>Thank you for reaching out.</h3>
                <p>Your enquiry has been staged. The MentoraX team will respond through the official contact channel once it is live.</p>
                <button type="button" onClick={() => setSubmitted(false)} className="success-reset">Send another enquiry <ArrowRight size={15} /></button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="form-head"><span>01</span><p>All fields marked * are required.</p></div>
                <label>Your name*<input required name="name" autoComplete="name" placeholder="How should we address you?" /></label>
                <div className="form-two">
                  <label>Email address*<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label>
                  <label>Mobile number<input name="phone" type="tel" autoComplete="tel" placeholder="Your number" /></label>
                </div>
                <label>I am preparing for<select name="exam" defaultValue=""><option value="" disabled>Select an option</option><option value="IAT">IAT</option><option value="NEST">NEST</option><option value="IAT and NEST">IAT and NEST</option><option value="Not sure yet">Not sure yet</option></select></label>
                <label>I'm interested in<select name="interest" defaultValue=""><option value="" disabled>Select an option</option><option>Mentorship programme</option><option>Study materials</option><option>MentoraX books</option><option>General enquiry</option></select></label>
                <label>Tell us what you are working toward*<textarea required name="message" placeholder="Share your class, goals, or the question you would like help with." /></label>
                <div className="form-submit">
                  <p>{error ? <span className="form-error">{error}</span> : <>Please do not include passwords, payment card details, or other highly sensitive information. By submitting, you agree to our <Link to="/privacy-policy">Privacy Policy</Link>.</>}</p>
                  <button type="submit" disabled={pending}>{pending ? 'Sending…' : <>Send enquiry <ArrowRight size={17} /></>}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </section>

      <section className="faq-section section-pad">
        <div className="section-head">
          <div>
            <Eyebrow>Common questions</Eyebrow>
            <h2>Before you <em>ask.</em></h2>
          </div>
        </div>
        <FaqAccordion items={faqs} />
      </section>
    </>
  )
}

type PolicySection = { title: string; text?: string; items?: string[] }

const refundSections: PolicySection[] = [
  { title: 'General policy', text: 'Because most MentoraX products are digital, refunds are limited. Please read carefully before purchasing.' },
  { title: 'Eligible refunds', items: ['Duplicate payment occurred.', 'Payment was deducted but the order was not created.', 'MentoraX cancels a scheduled paid mentorship session and cannot provide a suitable alternative.', 'Verified technical issues on our side permanently prevent access to the purchased service.'] },
  { title: 'Non-refundable items', items: ['Digital Books', 'PDF Notes', 'Flashcards', 'Mock Tests', 'Downloaded Study Materials', 'Recorded Classes', 'Completed Mentorship Sessions', 'Community Membership', 'Promotional or discounted purchases, unless required by law.'] },
  { title: 'Session rescheduling', text: 'Students should inform us at least 24 hours before a scheduled 1-to-1 mentorship session to request a reschedule. Missed sessions without prior notice may be treated as completed.' },
  { title: 'Cancellation by MentoraX', text: 'If MentoraX cancels a session, students may choose a new session date or a refund where appropriate.' },
  { title: 'Refund processing', text: 'Approved refunds will generally be processed to the original payment method within 7–10 business days, although bank processing times may vary.' },
  { title: 'Contact', text: 'For a refund review, email support@mentorax.in with the name used for the order, order reference, date of purchase, and a concise explanation.' },
]
const privacySections: PolicySection[] = [
  { title: 'Information we collect', text: 'When using our services we may collect your name, email, mobile number, city, educational details, and payment-related information. Payment details are processed securely through third-party payment gateways; MentoraX does not store debit or credit card information.' },
  { title: 'Usage information', items: ['Browser', 'Device', 'IP address', 'Website analytics', 'Cookies'] },
  { title: 'How we use your information', items: ['Deliver mentorship and study materials.', 'Send session links.', 'Process payments.', 'Improve website performance.', 'Provide customer support.', 'Notify you about updates.'] },
  { title: 'Cookies', text: 'We use cookies to improve user experience, remember login sessions, and analyse traffic. Users may disable cookies from their browser settings.' },
  { title: 'Third-party services', text: 'We may use Google Analytics, Razorpay, PhonePe, Google Meet, WhatsApp, and Gmail. Each service follows its own privacy policy.' },
  { title: 'Data security', text: 'We implement reasonable security measures to protect user information. However, no online system is 100% secure.' },
  { title: 'Children’s privacy', text: 'Students under 13 should not use the platform without parental supervision.' },
  { title: 'Your rights', text: 'You may request to update personal information, correct inaccurate information, or delete your account, subject to legal and business retention needs.' },
  { title: 'Data retention', text: 'Information is retained only as long as necessary for providing services, resolving disputes, complying with applicable laws, and maintaining educational records where appropriate.' },
  { title: 'Contact', text: 'For privacy questions or requests, email support@mentorax.in.' },
]
const termsSections: PolicySection[] = [
  { title: 'Welcome to MentoraX', text: 'These Terms & Conditions govern your use of our website, services, mentorship programs, study materials, mock tests, digital books, and all products offered through our platform. By accessing this website or purchasing any service, you agree to these Terms. If you do not agree, please do not use our website.' },
  { title: 'About MentoraX', text: 'MentoraX is an educational mentorship platform created to guide students preparing for competitive examinations such as IAT, IISER Admission, NEST, CUET, and other Science Entrance Exams. We provide personal mentorship, study material, mock tests, GMeet sessions, digital books, recorded sessions, strategy sessions, and community support.' },
  { title: 'Eligibility', text: 'You must be at least 13 years old to use this website. Students below 18 years should obtain permission from a parent or guardian before purchasing any paid service.' },
  { title: 'User responsibilities', items: ['Provide accurate information.', 'Maintain confidentiality of your account.', 'Not share your login with others.', 'Not misuse our platform.', 'Not distribute paid materials.'] },
  { title: 'Intellectual property', text: 'All content available on MentoraX, including PDFs, books, mock tests, videos, notes, flashcards, website design, logos, and graphics, is owned by MentoraX. You may not copy, sell, upload, reproduce, or redistribute it without written permission. Violation may result in legal action.' },
  { title: 'Payments', text: 'Payments are processed through secure payment gateways. Prices may change without prior notice. GST, if applicable, will be added during checkout.' },
  { title: 'Digital products', items: ['Digital products are licensed for personal educational use only.', 'You cannot upload them publicly, share them on Telegram, sell them, or print them for commercial use.'] },
  { title: 'Mentorship services', text: 'MentoraX provides academic guidance only. Admission, ranks, cutoffs, scholarships, placements, or career outcomes cannot be guaranteed. Students are responsible for their own preparation and performance.' },
  { title: 'Community guidelines', text: 'Students must maintain respectful behaviour. Harassment, abusive language, spam, hate speech, or inappropriate conduct may result in permanent removal without refund.' },
  { title: 'Account suspension', text: 'MentoraX reserves the right to suspend or terminate any account that shares paid content, uses fake payment proofs, violates community rules, or engages in fraudulent activities.' },
  { title: 'Limitation of liability', text: 'MentoraX shall not be liable for internet failures, device incompatibility, exam postponement, government policy changes, admission decisions, or personal academic performance.' },
  { title: 'Changes', text: 'We may modify these Terms at any time. Updated versions will be posted on this page.' },
  { title: 'Governing law', text: 'These Terms shall be governed by the laws of India.' },
  { title: 'Contact', text: 'For questions about these Terms, email support@mentorax.in.' },
]

function Policy({ kind, intro, sections }: { kind: string; intro: string; sections: PolicySection[] }) {
  return <><PageIntro index="Legal" eyebrow="MentoraX legal information" title={kind} copy={intro} side="Effective August 2026 · Please read this page carefully." /><section className="policy-layout section-pad"><aside data-lenis-prevent><span className="tiny-kicker">On this page</span>{sections.map(({ title }, index) => <a href={`#policy-${index}`} key={title}>{title}</a>)}</aside><article><div className="policy-notice"><strong>Effective August 2026</strong><br />These policies explain how MentoraX handles access, purchases, personal information, and participation. If you have a question, contact <a href="mailto:support@mentorax.in">support@mentorax.in</a>.</div>{sections.map(({ title, text, items }, index) => <section id={`policy-${index}`} key={title} data-reveal="up"><span>{String(index + 1).padStart(2, '0')}</span><h2>{title}</h2>{text && <p>{text}</p>}{items && <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}</article></section></> }


function NotFound() { return <section className="not-found"><span>404</span><h1>This page took a different path.</h1><ArrowLink solid to="/">Return home</ArrowLink></section> }

function TileGrid() {
  const [grid, setGrid] = useState({ rows: 0, cols: 0 })
  
  useEffect(() => {
    const size = window.innerWidth > 768 ? 100 : 70
    setGrid({
      cols: Math.ceil(window.innerWidth / size),
      rows: Math.ceil(window.innerHeight / size)
    })
  }, [])

  if (!grid.cols) return <div style={{ position: 'absolute', inset: 0, background: '#08070d' }} />

  const tiles = []
  const cx = grid.cols / 2
  const cy = grid.rows / 2
  const maxDist = Math.sqrt(cx*cx + cy*cy)

  // MentoraX palette accents
  const accents = ['#d8ff6a', '#9b8aff', '#e8f1df', '#27463c']

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const dist = Math.sqrt(Math.pow(c - cx, 2) + Math.pow(r - cy, 2))
      const normalizedDist = dist / maxDist
      // Stagger from center out (circular wave)
      const delay = 0.2 + (normalizedDist * 0.9)
      const accent = accents[Math.floor(Math.random() * accents.length)]

      tiles.push(
        <motion.div
          key={`${r}-${c}`}
          initial={{ opacity: 1, scale: 1, backgroundColor: '#08070d' }}
          exit={{ 
            backgroundColor: ['#08070d', accent, 'transparent'],
            scale: [1, 0.9, 0],
            opacity: [1, 1, 0],
            transition: { duration: 0.65, times: [0, 0.3, 1], ease: [0.76, 0, 0.24, 1], delay } 
          }}
          style={{
            border: '0.5px solid rgba(255,255,255,0.02)' // subtle grid lines
          }}
        />
      )
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid',
      gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
      gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
      zIndex: 0
    }}>
      {tiles}
    </div>
  )
}

function InitialReveal() {
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('mentorax-revealed')
  })

  useEffect(() => {
    if (active) {
      sessionStorage.setItem('mentorax-revealed', 'true')
      // Wait long enough for the tile radial wave to finish (0.2 + 0.9 + 0.65 = 1.75s)
      const t = setTimeout(() => setActive(false), 2600)
      return () => clearTimeout(t)
    }
  }, [active])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="initial-reveal-wrapper"
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', pointerEvents: 'auto' }}
        >
          {/* The Square Tile Grid */}
          <TileGrid />
          
          {/* Centered Logo & Glow */}
          <motion.div 
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.15, filter: 'blur(10px)', transition: { duration: 0.4, ease: "easeIn" } }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(155,138,255,0.15) 0%, transparent 70%)', mixBlendMode: 'screen' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 2 }}>
              <img src="/logo.png" style={{ width: '48px', height: '48px', filter: 'brightness(1.5) drop-shadow(0 0 12px rgba(216,255,106,0.3))' }} alt="" />
              <span className="wordmark" style={{ fontSize: '3rem', color: '#fff', letterSpacing: '0.02em', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                mentora<span className="wordmark-x" style={{ color: '#d8ff6a' }}>x</span>
              </span>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
              style={{ color: '#a8a3bb', fontSize: '0.85rem', marginTop: '16px', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              The Science of a Clear Path
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() { return <><InitialReveal /><Routes><Route element={<Layout />}><Route path="/" element={<Home />} /><Route path="/mentorship" element={<Mentorship />} /><Route path="/books" element={<Books />} /><Route path="/checkout" element={<Suspense fallback={null}><CheckoutPage /></Suspense>} /><Route path="/mentors" element={<Mentors />} /><Route path="/team" element={<Team />} /><Route path="/contact" element={<Contact />} /><Route path="/refund-policy" element={<Policy kind="Refund policy" intro="A clear and considerate framework for purchase and refund conversations with MentoraX." sections={refundSections} />} /><Route path="/privacy-policy" element={<Policy kind="Privacy policy" intro="How MentoraX intends to treat the information you share with care and clarity." sections={privacySections} />} /><Route path="/terms" element={<Policy kind="Terms & conditions" intro="The shared understanding that protects the MentoraX learning environment." sections={termsSections} />} /><Route path="*" element={<NotFound />} /></Route></Routes></> }
