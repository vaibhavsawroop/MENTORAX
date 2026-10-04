import type { ApiRequest, ApiResponse } from '../_types.js'
import { isSameOriginRequest } from '../_security.js'
import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { formatAddress, hasCompleteAddress, resolveProduct, priceInPaise, type ShippingAddress } from '../_catalog.js'
import {
  SUPPORT_EMAIL,
  fromCandidates,
  renderAdminOrderEmail,
  renderBatchReceiptEmail,
  renderBookReceiptEmail,
  sendEmail,
  type EmailStatus,
} from '../_email.js'

/**
 * POST /api/payment/verify
 *
 * Body: Razorpay's checkout response (order id, payment id, signature) plus the
 * student details collected on the checkout form.
 *
 * Security model
 * --------------
 * 1. The HMAC signature is recomputed with RAZORPAY_KEY_SECRET. A mismatch is
 *    rejected outright — no receipt, no email, no access.
 * 2. Product, price and customer details come from the server-created order,
 *    and the payment must be captured, associated with that order, and match
 *    the catalogue amount.
 * 3. If Razorpay's API is unreachable, verification fails closed. No receipt,
 *    email or batch access is issued until status can be confirmed.
 */

const BATCH_WHATSAPP_LINKS: Record<string, string> = {
  genesis: process.env.WA_LINK_GENESIS || '',
  quantum: process.env.WA_LINK_QUANTUM || '',
  catalyst: process.env.WA_LINK_CATALYST || '',
}

function indianTimestamp(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'Cross-origin request denied.' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as {
      razorpay_order_id?: string
      razorpay_payment_id?: string
      razorpay_signature?: string
    }

    const orderId = body.razorpay_order_id
    const paymentId = body.razorpay_payment_id
    const signature = body.razorpay_signature

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const resendKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || SUPPORT_EMAIL
    const senders = fromCandidates(process.env.FROM_EMAIL)

    if (
      !orderId || !paymentId || !signature ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      !/^[a-fA-F0-9]{64}$/.test(signature)
    ) {
      console.error('[verify] missing payment verification parameters')
      return res.status(400).json({ error: 'Missing payment verification parameters.' })
    }
    if (!keyId || !keySecret) {
      return res.status(503).json({ error: 'Payments are not configured for verification.' })
    }

    /* ── STEP 1 · signature ─────────────────────────────────────── */
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const signatureValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))

    if (!signatureValid) {
      console.error(`[verify] signature mismatch for order ${orderId}`)
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' })
    }

    /* ── STEP 2 · confirm the captured payment and its order ─────── */
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
    const fetched = await Promise.all([
      rzp.orders.fetch(orderId),
      rzp.payments.fetch(paymentId),
    ]).catch((err) => {
      console.error(`[verify] could not fetch Razorpay payment for order ${orderId}:`, err)
      return null
    })
    if (!fetched) {
      return res.status(503).json({ error: 'Payment status could not be confirmed. Please retry shortly.' })
    }
    const [order, payment] = fetched

    const notes = (order.notes || {}) as Record<string, string>
    const resolved = resolveProduct(notes.productId)
    if (!resolved || notes.productType !== resolved.product.type) {
      console.error(`[verify] order ${orderId} has no usable product notes`)
      return res.status(400).json({ error: 'Unknown product for this payment.' })
    }

    const { id: productId, product } = resolved
    const expectedPaise = priceInPaise(product)
    if (
      order.id !== orderId || order.currency !== 'INR' || order.status !== 'paid' ||
      order.amount !== expectedPaise || order.amount_paid !== expectedPaise || order.amount_due !== 0 ||
      payment.id !== paymentId || payment.order_id !== orderId || payment.currency !== 'INR' ||
      payment.amount !== expectedPaise || payment.status !== 'captured' || !payment.captured
    ) {
      console.error(`[verify] unpaid or mismatched order/payment rejected for ${orderId}`)
      return res.status(400).json({ error: 'Payment amount does not match the product price.' })
    }

    const productVerified = true
    const studentName = notes.studentName || 'Aspirant'
    const studentEmail = notes.studentEmail || ''
    const studentPhone = notes.studentPhone || undefined
    const shippingAddress: ShippingAddress | undefined = product.type === 'book'
      ? {
          street: notes.shippingStreet,
          city: notes.shippingCity,
          state: notes.shippingState,
          pincode: notes.shippingPincode,
        }
      : undefined
    if (product.type === 'book' && !hasCompleteAddress(shippingAddress)) {
      return res.status(400).json({ error: 'The order is missing its shipping address.' })
    }

    /* ── STEP 3 · receipt data ──────────────────────────────────── */
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const dateStr = `${indianTimestamp()} IST`
    const whatsappLink = product.type === 'batch' ? BATCH_WHATSAPP_LINKS[productId] || '' : ''
    const whatsappAllowed = product.type === 'batch' && productVerified && Boolean(whatsappLink)
    const orderEmail = {
      studentName,
      studentEmail,
      studentPhone,
      productName: product.name,
      productType: product.type,
      priceINR: product.priceINR,
      receiptNo,
      transactionId: paymentId,
      orderId,
      dateStr,
      shippingAddress,
      whatsappLink: whatsappAllowed ? whatsappLink : undefined,
      supportEmail: adminEmail,
    }

    /* ── STEP 4 · emails (never block a verified payment) ───────── */
    const emailStatuses: Record<string, EmailStatus> = {}

    if (resendKey) {
      const studentHtml = product.type === 'book'
        ? renderBookReceiptEmail(orderEmail)
        : renderBatchReceiptEmail(orderEmail)

      const studentSubject = product.type === 'book'
        ? `Payment confirmed · ${product.name} · Receipt ${receiptNo}`
        : `Welcome to ${product.name} · Receipt ${receiptNo}`

      if (studentEmail) {
        emailStatuses.student = await sendEmail({
          apiKey: resendKey,
          senders,
          to: [studentEmail],
          subject: studentSubject,
          html: studentHtml,
          replyTo: adminEmail,
        })
      }

      emailStatuses.admin = await sendEmail({
        apiKey: resendKey,
        senders,
        to: [adminEmail],
        subject: `[Payment received] ₹${product.priceINR} — ${studentName} (${product.name})`,
        html: renderAdminOrderEmail(orderEmail),
        replyTo: studentEmail || undefined,
      })

      if (!emailStatuses.student?.ok && studentEmail) {
        console.error(`[verify] student receipt email failed for ${studentEmail}`, emailStatuses.student.failures)
      }
    } else {
      console.error('[verify] RESEND_API_KEY is not configured — receipt emails were not sent.')
    }

    const emailDelivered = emailStatuses.student?.ok ?? false
    const adminNotified = emailStatuses.admin?.ok ?? false

    return res.status(200).json({
      success: true,
      verified: true,
      receiptNo,
      transactionId: paymentId,
      productId,
      productType: product.type,
      productName: product.name,
      priceINR: product.priceINR,
      productVerified,
      whatsappLink: whatsappAllowed ? whatsappLink : undefined,
      // Surfaced so the UI can tell the student "we'll email your invite after a
      // quick manual check" instead of silently leaving them without access.
      pendingManualReview: product.type === 'batch' && !whatsappAllowed,
      emailDelivered,
      adminNotified,
      emailsConfigured: Boolean(resendKey),
      timestamp: new Date().toISOString(),
      message: product.type === 'book'
        ? 'Payment verified. Your book will be shipped within 3–5 business days.'
        : whatsappAllowed
          ? 'Payment verified. Join your batch WhatsApp group to get started!'
          : 'Payment verified. Our team will confirm your batch access shortly.',
      address: formatAddress(shippingAddress) || undefined,
    })
  } catch (err) {
    console.error('[verify] failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({
      error: 'Failed to verify payment.',
      detail: process.env.NODE_ENV === 'production' ? undefined : message,
    })
  }
}
