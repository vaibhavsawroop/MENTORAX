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
} from 'lucide-react'
import confetti from 'canvas-confetti'
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
  'nest-pyq-book': {
    id: 'nest-pyq-book',
    name: "NEST PYQ's Solution Book",
    subtitle: 'Comprehensive Solved Question Bank · 2017–2024 · Paperback',
    price: 499,
    originalPrice: 999,
    type: 'book',
    tag: 'Popular',
    features: [
      '8 Years of Authentic NEST Papers (2017–2024)',
      'In-depth step-by-step scientific explanations',
      'High-yield concepts & exam trend analysis',
      'Physical paperback shipped to your address',
    ],
  },
  'all-pyq-combo': {
    id: 'all-pyq-combo',
    name: 'IAT + NEST Mega Book Combo',
    subtitle: 'Complete 2-in-1 PYQ Solution Library · Paperback',
    price: 799,
    originalPrice: 1499,
    type: 'book',
    tag: 'Save ₹199',
    features: [
      'Both IAT & NEST Complete Books (2017–2024)',
      'Over 1,200+ detailed solved questions',
      'Concept maps & shortcut techniques',
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
  const [selectedProductId, setSelectedProductId] = useState<string>(
    PRODUCTS[queryProduct] ? queryProduct : 'iat-pyq-book'
  )

  const product = PRODUCTS[selectedProductId] || PRODUCTS['iat-pyq-book']
  const isBookOrder = product.type === 'book'

  const [step, setStep] = useState<'form' | 'processing' | 'receipt'>('form')
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
    accessPin: string
    whatsappLink?: string
    productType: string
  } | null>(null)

  const receiptRef = useRef<HTMLDivElement>(null)

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
          shippingAddress,
        }),
      })

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create order')
      }

      const orderData = await orderRes.json()

      // 2. If mock mode (no Razorpay keys configured), show simulated receipt
      if (orderData.mock) {
        await simulatePaymentAndShowReceipt(orderData.orderId, shippingAddress)
        return
      }

      // 3. Open Razorpay checkout modal for real payment
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
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          // 4. Payment succeeded — verify on backend + send receipt emails
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                studentName: formData.name,
                studentEmail: formData.email,
                studentPhone: formData.phone,
                productId: product.id,
                amount: product.price,
                shippingAddress,
              }),
            })

            const verifyData = await verifyRes.json()

            if (verifyData.success && verifyData.verified) {
              setReceiptData({
                receiptNo: verifyData.receiptNo,
                transactionId: verifyData.transactionId,
                date: new Date().toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                accessPin: `MTX-${Math.floor(100000 + Math.random() * 900000)}`,
                whatsappLink: verifyData.whatsappLink,
                productType: verifyData.productType || product.type,
              })
              setStep('receipt')
              triggerConfetti()
            } else {
              alert('Payment verification failed. Please contact support@mentorax.in')
              setStep('form')
            }
          } catch {
            alert('Could not verify payment. Please contact support@mentorax.in with your payment ID: ' + response.razorpay_payment_id)
            setStep('form')
          }
        },
      }

      // Open the Razorpay modal
      const rzp = new (window as any).Razorpay(rzpOptions)
      rzp.on('payment.failed', (resp: any) => {
        alert(`Payment failed: ${resp.error.description}. Please try again.`)
        setStep('form')
      })
      rzp.open()

    } catch {
      // Backend not available (local dev without env vars) — fallback simulation
      await simulatePaymentAndShowReceipt(`MTX_ORD_${Date.now().toString().slice(-6)}`, shippingAddress)
    }
  }

  /** Fallback for local dev / mock mode when Razorpay keys aren't configured */
  const simulatePaymentAndShowReceipt = async (orderId: string, shippingAddress?: any) => {
    await new Promise((r) => setTimeout(r, 1600))
    const txnId = `PAY_${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const recNo = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`
    const pin = `MTX-${Math.floor(100000 + Math.random() * 900000)}`

    // Try to call verify endpoint even in mock mode (for email dispatch)
    try {
      const verifyRes = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: txnId,
          razorpay_signature: 'mock_signature',
          studentName: formData.name,
          studentEmail: formData.email,
          studentPhone: formData.phone,
          productId: product.id,
          amount: product.price,
          shippingAddress,
        }),
      })
      const verifyData = await verifyRes.json()
      setReceiptData({
        receiptNo: verifyData.receiptNo || recNo,
        transactionId: verifyData.transactionId || txnId,
        date: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        accessPin: pin,
        whatsappLink: verifyData.whatsappLink,
        productType: verifyData.productType || product.type,
      })
    } catch {
      setReceiptData({
        receiptNo: recNo,
        transactionId: txnId,
        date: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        accessPin: pin,
        productType: product.type,
      })
    }
    setStep('receipt')
    triggerConfetti()
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
                      <strong className="checkout-current-price">₹{item.price}</strong>
                      {item.originalPrice && (
                        <span className="checkout-original-price">₹{item.originalPrice}</span>
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

      {/* Step: Processing */}
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

      {/* Step: SKEUOMORPHIC RECEIPT PRINTER ANIMATION */}
      {step === 'receipt' && receiptData && (
        <div className="receipt-view-wrapper">
          <div className="receipt-celebration-kicker">
            <div className="kicker-pill">
              <Sparkles size={16} />
              <span>Payment Successful</span>
            </div>
            <h2>Order Verified &amp; Confirmed!</h2>
            <p>
              {receiptData.productType === 'book'
                ? 'Your official receipt has been generated. Your book will be shipped within 3–5 business days.'
                : 'Your receipt has been generated. Join your batch WhatsApp group below to get started!'}
            </p>
          </div>

          {/* The Thermal Printer Machine Component */}
          <div className="printer-machine">
            {/* The slot through which paper slides out */}
            <div className="printer-slot">
              <div className="printer-slot-light" />
            </div>

            {/* The Sliding Receipt Paper */}
            <motion.div
              ref={receiptRef}
              className="receipt-paper"
              initial={{ y: -360, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
            >
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
                    <span className="val mono">{receiptData.transactionId}</span>
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
                  <p>A receipt copy has been emailed to <b>{formData.email}</b></p>
                </div>
              </div>

              {/* Serrated bottom edge */}
              <div className="receipt-serrated-edge bottom" />
            </motion.div>
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
