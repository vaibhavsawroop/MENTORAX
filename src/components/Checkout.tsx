import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Printer,
  Download,
  CreditCard,
  QrCode,
  Smartphone,
  Sparkles,
  BookOpen,
  Mail,
  X,
  RefreshCw,
  MapPin,
  Package,
  MessageCircle,
  TriangleAlert,
  CircleCheck,
  Copy,
  ScanLine,
  Wifi,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import gsap from 'gsap'
import { Link, useSearchParams } from 'react-router-dom'

export type ProductItem = {
  id: string
  name: string
  subtitle: string
  price: number
  originalPrice?: number
  type: 'book' | 'batch'
  tag?: string
  features: string[]
  forWhom?: string
  duration?: string
}

/** Ids that appear in links shared before the catalogue changed. */
export const PRODUCT_ALIASES: Record<string, string> = {
  'nest-pyq-book': 'iat-qb-2027',
}

export const PRODUCTS: Record<string, ProductItem> = {
  'iat-pyq-book': {
    id: 'iat-pyq-book',
    name: "IAT PYQ's Solution Book",
    subtitle: 'Complete Solved Question Bank · 2017–2024 · Paperback',
    price: 499,
    originalPrice: 999,
    type: 'book',
    tag: 'Bestseller',
    features: [
      '8 Years of Authentic IAT Papers (2017–2024)',
      'Physics, Chemistry, Maths & Biology all included',
      'Step-by-step concept & approach breakdown',
      'Physical paperback shipped to your address',
    ],
  },
  'iat-qb-2027': {
    id: 'iat-qb-2027',
    name: 'IAT 2027: Master Question Bank',
    subtitle: '3,450 Chapter-Wise Questions · 463 Pages · Paperback',
    price: 999,
    originalPrice: 1499,
    type: 'book',
    tag: 'New · 2026 Edition',
    features: [
      '3,450 chapter-wise questions · Physics, Chemistry, Maths & Biology',
      '10-Year Empirical Trend Analysis (2017–2026)',
      'Diagnostic master answer keys after every chapter',
      'Balanced PCMB format · 463-page physical paperback',
    ],
  },
  'all-pyq-combo': {
    id: 'all-pyq-combo',
    name: 'IAT PYQ + IAT 2027 Question Bank Combo',
    subtitle: 'Both IAT paperbacks · Complete 2-in-1 practice library',
    price: 1199,
    originalPrice: 1498,
    type: 'book',
    tag: 'Save ₹299',
    features: [
      'Both IAT paperbacks — PYQ Solutions + 2027 Master Question Bank',
      '3,450 chapter-wise questions plus fully solved past papers',
      'Trend analysis, answer keys and concept-building approach',
      'Both physical paperbacks shipped to your address',
    ],
  },
  'genesis': {
    id: 'genesis',
    name: 'MentoraX Genesis',
    subtitle: 'IAT 2027 · Class 11 Foundation · Long-Term Scientist Pathway',
    price: 10000,
    originalPrice: 20000,
    type: 'batch',
    tag: '50% OFF',
    forWhom: 'Class 11 Students (Aspiring for IISERs, IISc, NISER)',
    duration: '2 Years (Class 11 + 12)',
    features: [
      '1-on-1 Personalised Mentorship with dedicated mentor',
      'Planned Day Structure & Email Targets delivered daily',
      'Comprehensive Foundation Planning & milestone tracking',
      'Regular Google Meet guidance sessions with all 4 mentors',
      'Continuous Support — calls, DMs & personalised check-ins',
      'Physical IAT MentoraX PYQ Book shipped to your doorstep',
    ],
  },
  'quantum': {
    id: 'quantum',
    name: 'MentoraX Quantum',
    subtitle: 'IAT 2027 · Class 12 + Droppers · Intensive 1-on-1 Guidance',
    price: 5000,
    originalPrice: 10000,
    type: 'batch',
    tag: '50% OFF',
    forWhom: 'Class 12 Students, 1st & 2nd Droppers',
    duration: '1 Year (365 days)',
    features: [
      'Dedicated 1-on-1 personal mentor for 1 full year (365 days)',
      'Daily Targets via Email — fully planned schedules to your inbox',
      'Structured Day Architecture — exact daily study plan & milestones',
      'Continuous Support — calls, DMs & 1-on-1 Google Meet sessions',
      'Physical IAT MentoraX PYQ Book shipped to your doorstep',
      'All Core Resources — DPPs, Complete IAT PYQs, 4-subject guidance',
    ],
  },
  'catalyst': {
    id: 'catalyst',
    name: 'MentoraX Catalyst',
    subtitle: 'IAT 2027 · Class 12 + Droppers · Build Momentum, Crack IAT',
    price: 1500,
    originalPrice: 3000,
    type: 'batch',
    tag: 'Limited Offer · 50% OFF',
    forWhom: 'Class 12 Students, 1st Droppers, 2nd Droppers',
    features: [
      'Guidance from 4 dedicated mentors (Raj, Aditya, Bhavesha, Sparsh)',
      'Interactive cohort Google Meet guidance sessions',
      'Curated Daily Practice Problems (DPP) sets',
      'Complete IAT Previous Year Questions (PYQs) Solutions',
      'Progress Tracking & Strategy Guidance',
      'Personalised Study Plan & Doubt Support (WhatsApp Group)',
    ],
  },
}

type RazorpayCheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void
    }
  }
}

/** Tagged error so the UI can react differently to gateway vs verification problems. */
class CheckoutError extends Error {
  kind: 'gateway' | 'verify'
  paymentId?: string

  constructor(message: string, kind: 'gateway' | 'verify' = 'gateway', paymentId?: string) {
    super(message)
    this.name = 'CheckoutError'
    this.kind = kind
    this.paymentId = paymentId
  }
}

/**
 * The receipt's printable lines — each one "inks in" as the strip passes the
 * print head. Group wrappers (meta grid, items table, totals) are excluded so
 * their children print individually: the texture comes from many small lines,
 * not three large blocks.
 */
const RECEIPT_LINES =
  ':scope > *:not(.receipt-meta-grid):not(.receipt-items-table):not(.receipt-totals-calc), .meta-row, .item-row, .tot-row'

function receiptTimestamp(): string {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Loads Razorpay's checkout script on demand.
 *
 * It used to be a blocking <script> in index.html, so every visitor — including
 * people who never open the checkout — paid for a third-party download and its
 * main-thread parse. The script is now fetched when a checkout page mounts (and
 * awaited before opening the modal), which keeps every other route lighter.
 */
let razorpayScriptPromise: Promise<void> | null = null

function loadRazorpayScript(): Promise<void> {
  if (typeof window.Razorpay === 'function') return Promise.resolve()
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]')
    const script = existing ?? document.createElement('script')

    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => {
        razorpayScriptPromise = null
        reject(
          new CheckoutError(
            'The secure payment window could not load. Check your connection, then try again.'
          )
        )
      },
      { once: true }
    )

    if (!existing) {
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.dataset.razorpayCheckout = 'true'
      document.head.appendChild(script)
    }
  })

  return razorpayScriptPromise
}

export function resolveProductId(candidate?: string | null, fallback: string = 'iat-pyq-book'): string {
  if (!candidate) return fallback
  if (PRODUCTS[candidate]) return candidate
  const aliased = PRODUCT_ALIASES[candidate]
  if (aliased && PRODUCTS[aliased]) return aliased
  return fallback
}

export function CheckoutModal({
  isOpen,
  onClose,
  initialProductId = 'iat-pyq-book',
}: {
  isOpen: boolean
  onClose: () => void
  initialProductId?: string
}) {
  if (!isOpen) return null
  return (
    <AnimatePresence>
      <div className="checkout-overlay" onClick={onClose}>
        <motion.div
          className="checkout-modal-container"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="checkout-modal-close" onClick={onClose} aria-label="Close checkout">
            <X size={20} />
          </button>
          <CheckoutContent initialProductId={initialProductId} isModal onClose={onClose} />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function CheckoutContent({
  initialProductId = 'iat-pyq-book',
  isModal = false,
  onClose,
}: {
  initialProductId?: string
  isModal?: boolean
  onClose?: () => void
}) {
  const [searchParams] = useSearchParams()
  const queryProduct = searchParams.get('product') || initialProductId
  const [selectedProductId, setSelectedProductId] = useState<string>(resolveProductId(queryProduct))

  const product = PRODUCTS[selectedProductId] || PRODUCTS['iat-pyq-book']
  const isBookOrder = product.type === 'book'

  const [step, setStep] = useState<'form' | 'processing' | 'verifying' | 'receipt'>('form')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    examYear: '2026',
    paymentMethod: 'upi',
    // Shipping address (books only)
    street: '',
    city: '',
    state: '',
    pincode: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [receiptData, setReceiptData] = useState<{
    receiptNo: string
    transactionId: string
    date: string
    whatsappLink?: string
    productType: string
    /** True only for the opt-in offline simulation (ALLOW_MOCK_PAYMENTS=true). */
    demo?: boolean
    /** Batch paid, but access still needs a manual check by the team. */
    pendingManualReview?: boolean
    /** Whether the receipt email actually left the server. */
    emailDelivered?: boolean
  } | null>(null)

  /**
   * Shown whenever the flow stops early. A real payment is never reported as a
   * failure: if money may have moved we surface the payment id and ask the
   * student to contact us instead of inventing a receipt.
   */
  const [flowError, setFlowError] = useState<{
    title: string
    detail: string
    paymentId?: string
    retryable?: boolean
  } | null>(null)

  const machineRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const heatRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)

  // Warm the gateway script up while the student fills the form, so submitting
  // never waits on a cold download. Failures are surfaced at submit time.
  useEffect(() => {
    void loadRazorpayScript().catch(() => undefined)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'Please enter your full name'
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number'
    }
    // Address validation for books
    if (isBookOrder) {
      if (!formData.street.trim()) errs.street = 'Please enter your street address'
      if (!formData.city.trim()) errs.city = 'Please enter your city'
      if (!formData.state.trim()) errs.state = 'Please enter your state'
      if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) {
        errs.pincode = 'Please enter a valid 6-digit pincode'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStep('processing')

    const shippingAddress = isBookOrder ? {
      street: formData.street.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    } : undefined

    try {
      // 1. Create order on backend (price is validated server-side)
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          studentName: formData.name,
          studentEmail: formData.email,
          studentPhone: formData.phone,
          shippingAddress,
        }),
      })

      const orderData = await orderRes.json().catch(() => ({}))

      if (!orderRes.ok) {
        throw new CheckoutError(
          orderData.error || 'We could not reach the payment server. Please try again in a moment.'
        )
      }

      // 2. Offline simulation — only when the deployment explicitly opted in
      //    with ALLOW_MOCK_PAYMENTS=true. Production never lands here.
      if (orderData.mock) {
        showDemoReceipt(orderData.orderId)
        return
      }

      if (!orderData.orderId || !orderData.keyId) {
        throw new CheckoutError('The payment gateway did not return a usable order. Please try again.')
      }

      // 3. Open the Razorpay checkout modal for the real payment
      const rzpOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MentoraX',
        description: product.name,
        order_id: orderData.orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#9b8aff',
          backdrop_color: 'rgba(12,11,22,0.85)',
        },
        modal: {
          ondismiss: () => {
            setStep('form')
          },
        },
        // 4. Razorpay says the money moved — confirm it server-side, then print.
        handler: (response: RazorpayCheckoutResponse) => {
          void verifyPayment(response, shippingAddress)
        },
      }

      // Fetch the gateway script only now (it is no longer on every page).
      await loadRazorpayScript()

      if (typeof window.Razorpay !== 'function') {
        throw new CheckoutError(
          'The secure payment window could not load. Please check your connection, disable any ad-blocker for this page and try again.'
        )
      }

      // Open the Razorpay modal
      const rzp = new window.Razorpay(rzpOptions)
      rzp.on('payment.failed', (resp) => {
        setStep('form')
        setFlowError({
          title: 'Payment was not completed',
          detail:
            resp?.error?.description ||
            'Your bank declined or cancelled the payment. No money has left your account — you can try again with another method.',
          retryable: true,
        })
      })
      rzp.open()
    } catch (err) {
      setStep('form')
      const failure = err instanceof CheckoutError ? err : null
      setFlowError({
        title: 'We could not start the secure payment',
        detail:
          failure?.message ||
          'The payment server did not respond. Nothing has been charged — please try again in a moment.',
        retryable: true,
      })
    }
  }

  /**
   * Called from Razorpay's success handler. The receipt animation only starts
   * once this returns `verified: true` — that is the whole point: nothing is
   * printed, emailed or celebrated before the backend confirms the signature.
   */
  const verifyPayment = async (response: RazorpayCheckoutResponse, shippingAddress?: Record<string, string>) => {
    setFlowError(null)
    setStep('verifying')

    try {
      const verifyRes = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })

      const verifyData = await verifyRes.json().catch(() => ({}))

      if (!verifyRes.ok || !verifyData.success || !verifyData.verified) {
        throw new CheckoutError(
          verifyData.error || 'The payment server could not confirm this transaction.',
          'verify',
          response.razorpay_payment_id
        )
      }

      setReceiptData({
        receiptNo: verifyData.receiptNo,
        transactionId: verifyData.transactionId || response.razorpay_payment_id,
        date: receiptTimestamp(),
        whatsappLink: verifyData.whatsappLink,
        productType: verifyData.productType || product.type,
        pendingManualReview: Boolean(verifyData.pendingManualReview),
        emailDelivered: Boolean(verifyData.emailDelivered),
      })
      setStep('receipt')
    } catch (err) {
      setStep('form')
      const failure = err instanceof CheckoutError ? err : null
      // The money may already have moved, so never claim the payment failed.
      setFlowError({
        title: 'Payment received — confirmation pending',
        detail:
          (failure?.message || 'We could not confirm this transaction automatically.') +
          ' Your payment ID is shown below. Send it to us and we will complete your order manually within a few hours.',
        paymentId: failure?.paymentId || response.razorpay_payment_id,
        retryable: false,
      })
    }
  }

  /** Offline simulation used only when the server opted in via ALLOW_MOCK_PAYMENTS. */
  const showDemoReceipt = (orderId: string) => {
    setReceiptData({
      receiptNo: `DEMO-${Math.floor(10000 + Math.random() * 90000)}`,
      transactionId: orderId,
      date: receiptTimestamp(),
      productType: product.type,
      demo: true,
    })
    setStep('receipt')
  }

  const triggerConfetti = () => {
    const end = Date.now() + 2 * 1000
    const colors = ['#d8ff6a', '#9b8aff', '#ffbf8a', '#ffffff']

    ;(function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    })()
  }

  const handlePrint = () => {
    window.print()
  }

  /**
   * GSAP thermal-printer sequence.
   *
   * It only runs for `step === 'receipt'`, which is set exclusively after the
   * backend confirms a payment — the animation is a *result* of a verified
   * order, never the reaction to a click.
   *
   * How it reads like a real printer (and stays butter smooth):
   *   • the unit powers up and its status lamp warms from amber to green,
   *   • ONE eased value (`feed.pct`) drives the clip-path, the feed counter and
   *     the printed-line queue from a single clock. Nothing ticks or jumps, so
   *     the strip accelerates and eases off like a motor, and no effect can
   *     drift out of sync with the paper,
   *   • every line of the receipt is measured against the strip, and the moment
   *     the strip has fed far enough for that line to reach the print head it
   *     inks in — the receipt is *written* line by line as it emerges,
   *   • the transaction id is typed out character by character behind a blinking
   *     caret, one glyph at a time, exactly like a thermal head,
   *   • the barcode grows outwards from the head,
   *   • the motor brakes, the strip settles with a short mechanical bounce, and
   *     the LED turns green.
   */
  useEffect(() => {
    if (step !== 'receipt' || !receiptData) return

    const machine = machineRef.current
    const paper = paperRef.current
    const heat = heatRef.current
    if (!machine || !paper) return

    const setStatus = (text: string) => {
      if (statusRef.current) statusRef.current.textContent = text
    }
    const setCounter = (percent: number) => {
      if (counterRef.current) counterRef.current.textContent = `${String(Math.round(percent)).padStart(3, '0')}%`
    }
    const setFeed = (remaining: number) => {
      paper.style.clipPath = `inset(0 0 ${remaining.toFixed(2)}% 0)`
    }

    const inner = paper.querySelector<HTMLElement>('.receipt-inner')
    const lines = inner ? Array.from(inner.querySelectorAll<HTMLElement>(RECEIPT_LINES)) : []
    const typedEl = paper.querySelector<HTMLElement>('[data-print="txn"]')
    const typedText = typedEl?.textContent ?? ''

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      // Respect the OS setting: show the finished receipt, skip the theatre.
      gsap.set(machine, { opacity: 1, y: 0, x: 0, scale: 1 })
      gsap.set(paper, { x: 0, y: 0, rotate: 0, scaleY: 1 })
      if (lines.length) gsap.set(lines, { opacity: 1, y: 0 })
      if (heat) gsap.set(heat, { opacity: 0 })
      setFeed(0)
      setCounter(100)
      setStatus('DONE')
      return
    }

    /*
     * Measure once, before any transform is applied: a line is "written" when
     * the print head (the bottom edge of the revealed strip) reaches its top.
     * Store fractions of the strip's height, so the timing stays correct at any
     * screen size and however long this particular receipt happens to be.
     */
    const paperRect = paper.getBoundingClientRect()
    const stripHeight = Math.max(1, paperRect.height)
    const cues = lines
      .map((el) => ({
        el,
        at: gsap.utils.clamp(
          0,
          99,
          ((el.getBoundingClientRect().top - paperRect.top) / stripHeight) * 100
        ),
      }))
      .sort((a, b) => a.at - b.at)

    setFeed(100)
    setCounter(0)
    setStatus('WARMING UP')
    paper.style.willChange = 'clip-path, transform'

    const ctx = gsap.context(() => {
      const feed = { pct: 0 }
      const barcode = paper.querySelector<HTMLElement>('.receipt-barcode')

      // Nothing is "printed" yet: every line waits for the head to reach it.
      if (lines.length) gsap.set(lines, { opacity: 0, y: -3 })

      // One paused ink-in tween per line, played by the queue below.
      const queue = cues.map(({ el, at }) => ({
        at,
        el,
        ink: gsap.to(el, { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out', paused: true }),
      }))

      // Richer moves that fire together with the line they belong to.
      const extras: Array<{ match: Element; anim: gsap.core.Animation }> = []
      if (barcode) {
        extras.push({
          match: barcode,
          anim: gsap.fromTo(
            barcode,
            { scaleX: 0.72, opacity: 0.15 },
            {
              scaleX: 1,
              opacity: 1,
              transformOrigin: 'left center',
              duration: 0.36,
              ease: 'power2.out',
              paused: true,
            }
          ),
        })
      }
      if (typedEl && typedText) {
        // Typewriter: one glyph at a time, with a whisper of irregularity so it
        // reads as a print head laying down ink rather than a CSS reveal.
        typedEl.textContent = ''
        typedEl.classList.add('is-typing')
        const typewriter = gsap.timeline({ paused: true })
        for (let i = 1; i <= typedText.length; i++) {
          typewriter.call(
            () => {
              typedEl.textContent = typedText.slice(0, i)
            },
            undefined,
            (i - 1) * 0.032 + Math.random() * 0.02
          )
        }
        typewriter.call(() => typedEl.classList.remove('is-typing'))
        extras.push({ match: typedEl, anim: typewriter })
      }

      // Play every line whose top edge the head has already passed.
      let cursor = 0
      const drainInk = (pct: number) => {
        while (cursor < queue.length && pct >= queue[cursor].at) {
          const line = queue[cursor]
          line.ink.play()
          for (const extra of extras) {
            if (line.el.contains(extra.match)) extra.anim.play()
          }
          cursor += 1
        }
      }

      // Mechanical hum while the motor runs — killed once the brake lands.
      const paperJitter = gsap.to(paper, {
        x: 'random(-0.55, 0.55)',
        duration: 0.06,
        repeat: -1,
        yoyo: true,
        ease: 'none',
        paused: true,
      })
      const bodyRumble = gsap.to(machine, {
        y: 'random(-0.7, 0.7)',
        duration: 0.08,
        repeat: -1,
        yoyo: true,
        ease: 'none',
        paused: true,
      })

      const FEED = 3.6
      const FEED_EASE = 'sine.inOut'

      const tl = gsap.timeline({
        onComplete: () => {
          paper.style.willChange = ''
          triggerConfetti()
        },
      })

      // 1 · the unit settles onto the desk, the lamp warms up, a quick self-test
      tl.fromTo(
        machine,
        { y: 46, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.72, ease: 'power4.out' }
      )
      tl.add(() => machine.classList.add('is-powered'), 0.22)
      tl.to(machine, { x: 1.1, duration: 0.055, repeat: 4, yoyo: true, ease: 'sine.inOut' }, 0.3)
      tl.add(() => setStatus('READY'), 0.68)

      // 2 · feed — one eased value drives strip, counter, heat line and ink queue
      tl.addLabel('feed', 0.94)
      tl.to(
        feed,
        {
          pct: 100,
          duration: FEED,
          ease: FEED_EASE,
          onUpdate: () => {
            setFeed(100 - feed.pct)
            setCounter(feed.pct)
            drainInk(feed.pct)
          },
        },
        'feed'
      )
      tl.fromTo(paper, { y: -14 }, { y: 0, duration: FEED, ease: FEED_EASE }, 'feed')
      if (heat) {
        tl.fromTo(
          heat,
          { y: 0, opacity: 0.95 },
          { y: Math.max(0, stripHeight - 18), duration: FEED, ease: FEED_EASE },
          'feed'
        )
      }
      tl.add(() => {
        setStatus('PRINTING')
        machine.classList.add('is-printing')
        paperJitter.play()
        bodyRumble.play()
      }, 'feed')

      // 3 · the motor brakes, the strip settles, the run is complete
      tl.add(() => {
        paperJitter.kill()
        bodyRumble.kill()
        gsap.set(paper, { x: 0 })
        gsap.set(machine, { x: 0, y: 0 })
        machine.classList.remove('is-printing')
        machine.classList.add('is-done')
        setStatus('DONE')
        setCounter(100)
      }, `feed+=${FEED}`)
      tl.to(paper, { rotate: 0.35, duration: 0.18, ease: 'power2.out' }, `feed+=${FEED + 0.04}`)
      tl.to(paper, { rotate: 0, y: -3.5, duration: 0.36, ease: 'back.out(2.4)' }, '>-0.02')
      tl.to(paper, { y: 0, duration: 0.3, ease: 'power2.inOut' }, '>-0.06')
      if (heat) tl.to(heat, { opacity: 0, duration: 0.4 }, '<')
      tl.to(paper, { scaleY: 1.004, duration: 0.12, ease: 'power1.out' }, '<')
      tl.to(paper, { scaleY: 1, duration: 0.3, ease: 'power2.out' })
    }, machineRef)

    return () => {
      ctx.revert()
      machine.classList.remove('is-powered', 'is-printing', 'is-done')
      paper.style.clipPath = ''
      paper.style.willChange = ''
      // GSAP reverts its own tweens, but a mid-flight typewriter must not leave
      // a half-printed transaction id behind if the view unmounts.
      typedEl?.classList.remove('is-typing')
      if (typedEl) typedEl.textContent = typedText
    }
  }, [step, receiptData])

  // Split products by type for display
  const bookProducts = Object.values(PRODUCTS).filter(p => p.type === 'book')
  const batchProducts = Object.values(PRODUCTS).filter(p => p.type === 'batch')

  return (
    <div className={`checkout-wrapper ${isModal ? 'is-modal' : ''}`}>
      {step === 'form' && (
        <div className="checkout-grid">
          {/* Left: Product selection & summary */}
          <div className="checkout-left">
            <div className="checkout-section-header">
              <span className="tiny-kicker">Step 1 · Choose Product</span>
              <h2>Select your <em>material.</em></h2>
            </div>

            {/* BOOKS section */}
            <div className="checkout-category-label">📚 Physical Books (Paperback)</div>
            <div className="checkout-products-list">
              {bookProducts.map((item) => {
                const isSelected = item.id === selectedProductId
                return (
                  <div
                    key={item.id}
                    className={`checkout-product-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedProductId(item.id)}
                  >
                    <div className="checkout-card-radio">
                      <div className={`radio-circle ${isSelected ? 'checked' : ''}`} />
                    </div>
                    <div className="checkout-card-info">
                      <div className="checkout-card-title-row">
                        <h3>{item.name}</h3>
                        {item.tag && <span className="checkout-tag">{item.tag}</span>}
                      </div>
                      <p className="checkout-card-subtitle">{item.subtitle}</p>
                    </div>
                    <div className="checkout-card-pricing">
                      <strong className="checkout-current-price">₹{item.price.toLocaleString('en-IN')}</strong>
                      {item.originalPrice && (
                        <span className="checkout-original-price">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* BATCHES section */}
            <div className="checkout-category-label" style={{ marginTop: '20px' }}>🎓 Mentorship Batches</div>
            <div className="checkout-products-list">
              {batchProducts.map((item) => {
                const isSelected = item.id === selectedProductId
                return (
                  <div
                    key={item.id}
                    className={`checkout-product-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedProductId(item.id)}
                  >
                    <div className="checkout-card-radio">
                      <div className={`radio-circle ${isSelected ? 'checked' : ''}`} />
                    </div>
                    <div className="checkout-card-info">
                      <div className="checkout-card-title-row">
                        <h3>{item.name}</h3>
                        {item.tag && <span className="checkout-tag">{item.tag}</span>}
                      </div>
                      <p className="checkout-card-subtitle">{item.subtitle}</p>
                      {item.forWhom && <p className="checkout-card-subtitle" style={{ fontSize: '12px', opacity: 0.7 }}>For: {item.forWhom}</p>}
                    </div>
                    <div className="checkout-card-pricing">
                      <strong className="checkout-current-price">₹{item.price.toLocaleString('en-IN')}</strong>
                      {item.originalPrice && (
                        <span className="checkout-original-price">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected summary */}
            <div className="checkout-included-box">
              <div className="included-title">
                {isBookOrder ? <Package size={16} /> : <BookOpen size={16} />}
                <span>What's included with {product.name}:</span>
              </div>
              <ul className="included-list">
                {product.features.map((feat, idx) => (
                  <li key={idx}>
                    <Check size={14} className="check-icon" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              {product.duration && (
                <div style={{ fontSize: '13px', color: '#9b8aff', marginTop: '8px', paddingLeft: '4px' }}>
                  ⏱ Duration: {product.duration}
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment details form */}
          <div className="checkout-right">
            <div className="checkout-section-header">
              <span className="tiny-kicker">Step 2 · Student Details</span>
              <h2>{isBookOrder ? <>Ship to your <em>door.</em></> : <>Join the <em>batch.</em></>}</h2>
            </div>

            <form className="checkout-form" onSubmit={handleProceedToPayment}>
              {/* Anything that stopped the flow is explained here instead of
                  quietly printing a receipt for a payment that never happened. */}
              {flowError && (
                <div className="checkout-alert" role="alert">
                  <TriangleAlert size={18} className="checkout-alert-icon" />
                  <div className="checkout-alert-body">
                    <strong>{flowError.title}</strong>
                    <p>{flowError.detail}</p>
                    {flowError.paymentId && (
                      <button
                        type="button"
                        className="checkout-alert-copy"
                        onClick={() => {
                          void navigator.clipboard?.writeText(flowError.paymentId as string)
                        }}
                      >
                        <Copy size={13} />
                        <span>{flowError.paymentId}</span>
                      </button>
                    )}
                    <div className="checkout-alert-links">
                      <a href="mailto:managementrajiiserit@gmail.com">Email the team</a>
                      {flowError.retryable && (
                        <button type="button" onClick={() => setFlowError(null)}>
                          Dismiss and try again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>
                  Full Student Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Priyanshu Sharma"
                  className={errors.name ? 'has-error' : ''}
                />
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>
                  Email Address <span className="req">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@gmail.com (for receipt delivery)"
                  className={errors.email ? 'has-error' : ''}
                />
                {errors.email && <span className="error-msg">{errors.email}</span>}
                <span className="input-hint">
                  {isBookOrder
                    ? 'Receipt & shipping updates will be sent to this email.'
                    : 'Receipt & WhatsApp group link will be sent to this email.'}
                </span>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    WhatsApp / Mobile <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    className={errors.phone ? 'has-error' : ''}
                  />
                  {errors.phone && <span className="error-msg">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>Target Exam</label>
                  <select name="examYear" value={formData.examYear} onChange={handleInputChange}>
                    <option value="2026">IAT / NEST 2026</option>
                    <option value="2027">IAT / NEST 2027</option>
                    <option value="Dropper">Dropper / Repeat</option>
                  </select>
                </div>
              </div>

              {/* ── SHIPPING ADDRESS (only for books) ── */}
              {isBookOrder && (
                <div className="checkout-address-section">
                  <div className="address-section-header">
                    <MapPin size={16} />
                    <span>Shipping Address <span className="req">*</span></span>
                  </div>
                  <div className="form-group">
                    <label>Street Address / House No. / Landmark</label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="e.g. 42, MG Road, Near City Mall"
                      className={errors.street ? 'has-error' : ''}
                    />
                    {errors.street && <span className="error-msg">{errors.street}</span>}
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="e.g. Jaipur"
                        className={errors.city ? 'has-error' : ''}
                      />
                      {errors.city && <span className="error-msg">{errors.city}</span>}
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="e.g. Rajasthan"
                        className={errors.state ? 'has-error' : ''}
                      />
                      {errors.state && <span className="error-msg">{errors.state}</span>}
                    </div>
                  </div>
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className={errors.pincode ? 'has-error' : ''}
                    />
                    {errors.pincode && <span className="error-msg">{errors.pincode}</span>}
                  </div>
                </div>
              )}

              {/* Payment method selector */}
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-methods-grid">
                  <div
                    className={`pay-method-pill ${formData.paymentMethod === 'upi' ? 'active' : ''}`}
                    onClick={() => setFormData((p) => ({ ...p, paymentMethod: 'upi' }))}
                  >
                    <QrCode size={16} />
                    <span>UPI / QR</span>
                  </div>
                  <div
                    className={`pay-method-pill ${formData.paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setFormData((p) => ({ ...p, paymentMethod: 'card' }))}
                  >
                    <CreditCard size={16} />
                    <span>Cards</span>
                  </div>
                  <div
                    className={`pay-method-pill ${formData.paymentMethod === 'netbanking' ? 'active' : ''}`}
                    onClick={() => setFormData((p) => ({ ...p, paymentMethod: 'netbanking' }))}
                  >
                    <Smartphone size={16} />
                    <span>NetBanking</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="checkout-summary-calc">
                <div className="calc-row">
                  <span>{product.name}</span>
                  <span>₹{product.price.toLocaleString('en-IN')}</span>
                </div>
                {isBookOrder && (
                  <div className="calc-row">
                    <span>Shipping (All India)</span>
                    <span className="free-tag">FREE (₹0)</span>
                  </div>
                )}
                <div className="calc-row">
                  <span>GST</span>
                  <span className="free-tag">Included</span>
                </div>
                <div className="calc-row total">
                  <strong>Total Amount Payable</strong>
                  <strong className="total-val">₹{product.price.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <button type="submit" className="checkout-submit-btn">
                <span>Pay ₹{product.price.toLocaleString('en-IN')} &amp; {isBookOrder ? 'Place Order' : 'Join Batch'}</span>
                <ArrowRight size={18} />
              </button>

              <div className="checkout-trust-badge">
                <ShieldCheck size={16} className="trust-icon" />
                <span>256-Bit Bank Grade SSL Encrypted · Razorpay Secured · {isBookOrder ? 'Free Shipping' : 'Instant WhatsApp Access'}</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step: Processing — opening the gateway */}
      {step === 'processing' && (
        <div className="checkout-processing-view">
          <div className="processing-spinner">
            <RefreshCw className="spin-icon" size={40} />
          </div>
          <h3>Connecting to Secure Gateway…</h3>
          <p>Processing order for {formData.name || 'Aspirant'} · ₹{product.price.toLocaleString('en-IN')}</p>
          <div className="processing-bar">
            <div className="processing-progress-fill" />
          </div>
        </div>
      )}

      {/* Step: Verifying — Razorpay says paid; the server is confirming it */}
      {step === 'verifying' && (
        <div className="checkout-processing-view">
          <div className="processing-spinner verifying">
            <Lock className="spin-icon slow" size={38} />
          </div>
          <h3>Confirming your payment…</h3>
          <p>
            Verifying the transaction with Razorpay and emailing your receipt to{' '}
            <strong>{formData.email || 'your inbox'}</strong>. Please keep this tab open.
          </p>
          <div className="processing-bar">
            <div className="processing-progress-fill verifying" />
          </div>
        </div>
      )}

      {/* Step: SKEUOMORPHIC RECEIPT PRINTER ANIMATION */}
      {step === 'receipt' && receiptData && (
        <div className="receipt-view-wrapper">
          <div className="receipt-celebration-kicker">
            <div className="kicker-pill">
              <Sparkles size={16} />
              <span>{receiptData.demo ? 'Demo Mode' : 'Payment Successful'}</span>
            </div>
            <h2>{receiptData.demo ? 'Simulated receipt' : 'Order Verified & Confirmed!'}</h2>
            <p>
              {receiptData.demo
                ? 'This deployment opted into offline simulation, so no money moved and no email was sent. Nothing on this page is a real purchase.'
                : receiptData.productType === 'book'
                  ? 'Your official receipt has been generated. Your book will be shipped within 3–5 business days.'
                  : 'Your receipt has been generated. Join your batch WhatsApp group below to get started!'}
            </p>
          </div>

          {/* Honest status chips: what actually happened behind the animation */}
          <div className="receipt-status-row">
            {receiptData.demo ? (
              <span className="receipt-status-chip warn">
                <TriangleAlert size={13} /> No payment taken · no email sent
              </span>
            ) : (
              <>
                <span className="receipt-status-chip ok">
                  <CircleCheck size={13} /> Payment verified by Razorpay
                </span>
                <span className={`receipt-status-chip ${receiptData.emailDelivered ? 'ok' : 'warn'}`}>
                  {receiptData.emailDelivered ? <Mail size={13} /> : <TriangleAlert size={13} />}
                  {receiptData.emailDelivered
                    ? 'Receipt emailed to you'
                    : 'Receipt email is being retried — receipt stays available here'}
                </span>
                {receiptData.productType === 'batch' && receiptData.pendingManualReview && (
                  <span className="receipt-status-chip warn">
                    <TriangleAlert size={13} /> Batch link pending a quick manual check
                  </span>
                )}
              </>
            )}
          </div>          {/* The thermal printer machine — driven entirely by the GSAP feed timeline */}
          <div className="printer-machine" ref={machineRef}>
            <div className="printer-body">
              <div className="printer-plate">
                <span className="printer-brand">MentoraX</span>
                <span className="printer-model">Thermal 58mm · MTX-PRINT</span>
              </div>

              <div className="printer-display" role="status" aria-live="polite">
                <span className="printer-led" />
                <span className="printer-status" ref={statusRef}>READY</span>
                <span className="printer-feed-count" ref={counterRef}>000%</span>
              </div>

              {/* Slot the strip feeds through */}
              <div className="printer-slot">
                <span className="printer-slot-glow" aria-hidden="true" />
              </div>
            </div>

            {/* Output bay: the paper and the heat line that trails the print edge */}
            <div className="printer-output">
              <div className="receipt-paper" ref={paperRef}>
              {/* Serrated top edge */}
              <div className="receipt-serrated-edge top" />

              <div className="receipt-inner">
                {/* Header */}
                <div className="receipt-header">
                  <div className="receipt-logo">
                    <span className="logo-m">MENTORA</span>
                    <span className="logo-x">X</span>
                  </div>
                  <p className="receipt-sub">Science of a Clear Path</p>
                  <p className="receipt-tax-title">OFFICIAL PAYMENT RECEIPT</p>
                </div>

                <div className="receipt-divider-dash" />

                {/* Metadata */}
                <div className="receipt-meta-grid">
                  <div className="meta-row">
                    <span className="label">RECEIPT NO:</span>
                    <span className="val">{receiptData.receiptNo}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">TXN ID:</span>
                    <span className="val mono" data-print="txn">{receiptData.transactionId}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">DATE:</span>
                    <span className="val">{receiptData.date}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">BILLED TO:</span>
                    <span className="val highlight">{formData.name}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">EMAIL:</span>
                    <span className="val">{formData.email}</span>
                  </div>
                  {isBookOrder && formData.street && (
                    <div className="meta-row">
                      <span className="label">SHIP TO:</span>
                      <span className="val">{formData.street}, {formData.city}, {formData.state} — {formData.pincode}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-divider-solid" />

                {/* Line Items */}
                <div className="receipt-items-table">
                  <div className="item-head">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>AMOUNT</span>
                  </div>
                  <div className="item-row">
                    <span className="item-name">{product.name}</span>
                    <span className="item-qty">1</span>
                    <span className="item-price">₹{product.price.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>

                <div className="receipt-divider-dash" />

                {/* Totals */}
                <div className="receipt-totals-calc">
                  <div className="tot-row">
                    <span>SUBTOTAL:</span>
                    <span>₹{product.price.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="tot-row">
                    <span>GST / TAX:</span>
                    <span>₹0.00 (INCL)</span>
                  </div>
                  {isBookOrder && (
                    <div className="tot-row">
                      <span>SHIPPING:</span>
                      <span>₹0.00 (FREE)</span>
                    </div>
                  )}
                  <div className="tot-row grand-total">
                    <strong>TOTAL PAID:</strong>
                    <strong>₹{product.price.toLocaleString('en-IN')}.00</strong>
                  </div>
                </div>

                <div className="receipt-divider-solid" />

                {/* Post-purchase action: Book shipping vs Batch WhatsApp */}
                {receiptData.productType === 'book' ? (
                  <div className="receipt-pin-box">
                    <span className="pin-title">📦 SHIPPING STATUS</span>
                    <strong className="pin-code" style={{ fontSize: '14px' }}>Your book will be shipped within 3–5 business days</strong>
                    <span className="pin-note">You will receive tracking details via email once dispatched</span>
                  </div>
                ) : (
                  <div className="receipt-pin-box" style={{ borderColor: 'rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.06)' }}>
                    <span className="pin-title" style={{ color: '#25d366' }}>🎓 YOUR BATCH ACCESS</span>
                    <strong className="pin-code" style={{ fontSize: '14px' }}>Join the WhatsApp group to start your journey</strong>
                    <span className="pin-note">A link has also been sent to {formData.email}</span>
                  </div>
                )}

                {/* Simulated Barcode */}
                <div className="receipt-barcode-wrap">
                  <div className="receipt-barcode" />
                  <span className="barcode-num">||||| 890429402941 |||||</span>
                </div>

                <div className="receipt-footer-note">
                  <p>Thank you for placing your trust in MentoraX.</p>
                  <p>
                    {receiptData.demo
                      ? 'Demo mode · no payment was taken and no email was sent'
                      : receiptData.emailDelivered
                        ? <>A receipt copy has been emailed to <b>{formData.email}</b></>
                        : <>Keep or print this copy — our team is re-sending the email receipt now</>}
                  </p>
                </div>
              </div>

                {/* Serrated bottom edge — revealed at tear-off */}
                <div className="receipt-serrated-edge bottom" />
              </div>

              <div className="printer-heat-line" ref={heatRef} aria-hidden="true" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="receipt-actions-bar">
            <button className="receipt-action-btn primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print / Save Receipt</span>
            </button>

            {receiptData.productType === 'batch' && receiptData.whatsappLink && (
              <a href={receiptData.whatsappLink} target="_blank" rel="noopener noreferrer" className="receipt-action-btn primary" style={{ background: '#25d366' }}>
                <MessageCircle size={16} />
                <span>Join WhatsApp Group</span>
              </a>
            )}

            {receiptData.productType === 'book' && (
              <Link to="/books" className="receipt-action-btn secondary">
                <Download size={16} />
                <span>Back to Books</span>
              </Link>
            )}

            <button
              className="receipt-action-btn tertiary"
              onClick={() => {
                setStep('form')
                if (onClose) onClose()
              }}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CheckoutPage() {
  return (
    <div className="checkout-page-container">
      <div className="checkout-page-inner section-pad">
        <CheckoutContent />
      </div>
    </div>
  )
}
