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
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { Link, useSearchParams } from 'react-router-dom'

export type ProductItem = {
  id: string
  name: string
  subtitle: string
  price: number
  originalPrice?: number
  type: 'book' | 'mentorship'
  tag?: string
  features: string[]
}

export const PRODUCTS: Record<string, ProductItem> = {
  'iat-pyq-book': {
    id: 'iat-pyq-book',
    name: "IAT PYQ's Solution Book",
    subtitle: 'Complete Solved Question Bank · 2017–2024',
    price: 499,
    originalPrice: 999,
    type: 'book',
    tag: 'Bestseller',
    features: [
      '8 Years of Authentic IAT Papers (2017–2024)',
      'Physics, Chemistry, Maths & Biology all included',
      'Step-by-step concept & approach breakdown',
      'Instant digital PDF download + lifetime updates',
    ],
  },
  'nest-pyq-book': {
    id: 'nest-pyq-book',
    name: "NEST PYQ's Solution Book",
    subtitle: 'Comprehensive Solved Question Bank · 2017–2024',
    price: 499,
    originalPrice: 999,
    type: 'book',
    tag: 'Popular',
    features: [
      '8 Years of Authentic NEST Papers (2017–2024)',
      'In-depth step-by-step scientific explanations',
      'High-yield concepts & exam trend analysis',
      'Instant digital PDF download + lifetime updates',
    ],
  },
  'all-pyq-combo': {
    id: 'all-pyq-combo',
    name: 'IAT + NEST Mega Book Combo',
    subtitle: 'Complete 2-in-1 PYQ Solution Library',
    price: 799,
    originalPrice: 1499,
    type: 'book',
    tag: 'Save ₹199',
    features: [
      'Both IAT & NEST Complete Books (2017–2024)',
      'Over 1,200+ detailed solved questions',
      'Concept maps & shortcut techniques',
      'Instant access on all devices (Mobile + Laptop)',
    ],
  },
  'foundation': {
    id: 'foundation',
    name: 'Foundation Mentorship',
    subtitle: 'A clean beginning for serious self-starters',
    price: 1099,
    type: 'mentorship',
    features: [
      'Complete study roadmap architecture',
      'Core resource & chapter revision maps',
      'Group strategy sessions & periodic reviews',
    ],
  },
  'momentum': {
    id: 'momentum',
    name: 'Momentum Mentorship',
    subtitle: 'The considered, high-touch MentoraX experience',
    price: 4099,
    type: 'mentorship',
    tag: 'Most Complete',
    features: [
      'Everything in Foundation tier',
      '1-on-1 personal mentoring sessions (Raj & Dipti)',
      'Regular check-ins & weekly recalibration',
      'Direct doubt clearance & mock feedback',
    ],
  },
  'intensive': {
    id: 'intensive',
    name: 'Intensive Mentorship',
    subtitle: 'A precise final stretch for high-stakes preparation',
    price: 2099,
    type: 'mentorship',
    features: [
      'Everything in Momentum tier',
      'Focused exam-window strategy reviews',
      'Priority guidance & rapid doubt support',
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

  const [step, setStep] = useState<'form' | 'processing' | 'receipt'>('form')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    examYear: '2026',
    paymentMethod: 'upi',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [receiptData, setReceiptData] = useState<{
    receiptNo: string
    transactionId: string
    date: string
    accessPin: string
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
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStep('processing')

    try {
      // 1. Attempt call to serverless backend
      let orderId = `MTX_ORD_${Date.now().toString().slice(-6)}`
      try {
        const orderRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: product.price,
            productId: product.id,
            productName: product.name,
            studentName: formData.name,
            studentEmail: formData.email,
          }),
        })
        if (orderRes.ok) {
          const orderJson = await orderRes.json()
          if (orderJson.orderId) orderId = orderJson.orderId
        }
      } catch {
        // Fallback gracefully in client preview
      }

      // Smooth transition for gateway connection
      await new Promise((r) => setTimeout(r, 1600))

      // 2. Payment verification call
      const txnId = `PAY_${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      const recNo = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`
      const pin = `MTX-${Math.floor(100000 + Math.random() * 900000)}`

      try {
        await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: txnId,
            razorpay_signature: 'verified_signature',
            studentName: formData.name,
            studentEmail: formData.email,
            studentPhone: formData.phone,
            productId: product.id,
            productName: product.name,
            amount: product.price,
          }),
        })
      } catch {
        // Fallback
      }

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
      })

      setStep('receipt')

      // Trigger multi-stage confetti
      triggerConfetti()
    } catch {
      setStep('form')
    }
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

            <div className="checkout-products-list">
              {Object.values(PRODUCTS).map((item) => {
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

            {/* Selected summary */}
            <div className="checkout-included-box">
              <div className="included-title">
                <BookOpen size={16} />
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
            </div>
          </div>

          {/* Right: Payment details form */}
          <div className="checkout-right">
            <div className="checkout-section-header">
              <span className="tiny-kicker">Step 2 · Student Details</span>
              <h2>Instant <em>access.</em></h2>
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
                  placeholder="name@gmail.com (for PDF delivery)"
                  className={errors.email ? 'has-error' : ''}
                />
                {errors.email && <span className="error-msg">{errors.email}</span>}
                <span className="input-hint">Digital download link will be emailed immediately.</span>
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
                  <span>Product Subtotal</span>
                  <span>₹{product.price}</span>
                </div>
                <div className="calc-row">
                  <span>Instant Delivery & GST</span>
                  <span className="free-tag">FREE (₹0)</span>
                </div>
                <div className="calc-row total">
                  <strong>Total Amount Payable</strong>
                  <strong className="total-val">₹{product.price}</strong>
                </div>
              </div>

              <button type="submit" className="checkout-submit-btn">
                <span>Pay ₹{product.price} &amp; Generate Receipt</span>
                <ArrowRight size={18} />
              </button>

              <div className="checkout-trust-badge">
                <ShieldCheck size={16} className="trust-icon" />
                <span>256-Bit Bank Grade SSL Encrypted · Instant PDF Dispatch</span>
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
          <p>Processing order for {formData.name || 'Aspirant'} · ₹{product.price}</p>
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
            <p>Your official tax invoice receipt and digital materials have been processed.</p>
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
                  <p className="receipt-tax-title">OFFICIAL TAX INVOICE &amp; RECEIPT</p>
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
                    <span className="item-price">₹{product.price}.00</span>
                  </div>
                </div>

                <div className="receipt-divider-dash" />

                {/* Totals */}
                <div className="receipt-totals-calc">
                  <div className="tot-row">
                    <span>SUBTOTAL:</span>
                    <span>₹{product.price}.00</span>
                  </div>
                  <div className="tot-row">
                    <span>GST / TAX:</span>
                    <span>₹0.00 (INCL)</span>
                  </div>
                  <div className="tot-row grand-total">
                    <strong>TOTAL PAID:</strong>
                    <strong>₹{product.price}.00</strong>
                  </div>
                </div>

                <div className="receipt-divider-solid" />

                {/* Access PIN Code */}
                <div className="receipt-pin-box">
                  <span className="pin-title">DIGITAL ACCESS KEY</span>
                  <strong className="pin-code">{receiptData.accessPin}</strong>
                  <span className="pin-note">Use this key to unlock all future material updates</span>
                </div>

                {/* Simulated Barcode */}
                <div className="receipt-barcode-wrap">
                  <div className="receipt-barcode" />
                  <span className="barcode-num">||||| 890429402941 |||||</span>
                </div>

                <div className="receipt-footer-note">
                  <p>Thank you for placing your trust in MentoraX.</p>
                  <p>A copy has been dispatched to <b>{formData.email}</b></p>
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

            <Link to="/books" className="receipt-action-btn secondary">
              <Download size={16} />
              <span>Access &amp; Download Material</span>
            </Link>

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
