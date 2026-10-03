import type { ApiRequest, ApiResponse } from '../_types.js'
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
 * 2. What was *actually* bought is read back from Razorpay's order (`notes.productId`
 *    was written by create-order.ts) instead of trusting the browser. Without
 *    this step a customer could pay ₹499 and then claim a ₹10,000 batch to
 *    receive its WhatsApp invite.
 * 3. The batch WhatsApp invite is only released when step 2 succeeded. If
 *    Razorpay's API is unreachable we still show the receipt, but the invite is
 *    withheld and the owner is told a manual check is needed.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
}

const BATCH_WHATSAPP_LINKS: Record<string, string> = {
  genesis: process.env.WA_LINK_GENESIS || '',
  quantum: process.env.WA_LINK_QUANTUM || '',
  catalyst: process.env.WA_LINK_CATALYST || '',
}

function indianTimestamp(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as {
      razorpay_order_id?: string
      razorpay_payment_id?: string
      razorpay_signature?: string
      studentName?: string
      studentEmail?: string
      studentPhone?: string
      productId?: string
      amount?: number | string
      shippingAddress?: ShippingAddress
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = body

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const resendKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || SUPPORT_EMAIL
    const senders = fromCandidates(process.env.FROM_EMAIL)

    if (!keySecret || !orderId || !paymentId || !signature) {
      console.error('[verify] missing payment verification parameters')
      return res.status(400).json({ error: 'Missing payment verification parameters.' })
    }

    /* ── STEP 1 · signature ─────────────────────────────────────── */
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const signatureValid = expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))

    if (!signatureValid) {
      console.error(`[verify] signature mismatch for order ${orderId}`)
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' })
    }

    /* ── STEP 2 · what was really bought ────────────────────────── */
    let resolved = resolveProduct(body.productId)
    let productVerified = false
    let amountInPaise: number | null = null

    if (keyId && keySecret) {
      try {
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
        const order = await rzp.orders.fetch(orderId)
        const notes = (order.notes || {}) as Record<string, string>
        amountInPaise = typeof order.amount === 'number' ? order.amount : null

        const fromRazorpay = resolveProduct(notes.productId)
        if (fromRazorpay) resolved = fromRazorpay
        productVerified = Boolean(fromRazorpay)

        if (!fromRazorpay) {
          console.error(`[verify] order ${orderId} has no usable productId note`, notes)
        }
      } catch (err) {
        // Network/API hiccup: fall back to the signed request, but withhold
        // anything access-granting and flag it for the owner.
        console.error(`[verify] could not fetch Razorpay order ${orderId}:`, err)
      }
    }

    if (!resolved) {
      return res.status(400).json({ error: 'Unknown product for this payment.' })
    }

    const { id: productId, product } = resolved
    const expectedPaise = priceInPaise(product)

    // When Razorpay told us the real amount, it must match the catalogue.
    if (amountInPaise !== null && amountInPaise !== expectedPaise) {
      console.error(
        `[verify] amount mismatch for order ${orderId}: Razorpay says ${amountInPaise} paise, catalogue expects ${expectedPaise} for ${productId}`
      )
      return res.status(400).json({ error: 'Payment amount does not match the product price.' })
    }

    // Secondary check against the signed client value (only used when Razorpay
    // was unreachable, where it cannot contradict a trusted amount).
    if (amountInPaise === null && body.amount !== undefined && Number(body.amount) !== product.priceINR) {
      console.error(`[verify] client amount ${body.amount} does not match catalogue ₹${product.priceINR} for ${productId}`)
      return res.status(400).json({ error: 'Payment amount does not match the product price.' })
    }

    /* ── STEP 3 · receipt data ──────────────────────────────────── */
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const dateStr = `${indianTimestamp()} IST`
    const whatsappLink = product.type === 'batch' ? BATCH_WHATSAPP_LINKS[productId] || '' : ''
    const whatsappAllowed = product.type === 'batch' && productVerified && Boolean(whatsappLink)
    const shippingAddress = hasCompleteAddress(body.shippingAddress) ? body.shippingAddress : undefined

    const orderEmail = {
      studentName: body.studentName || 'Aspirant',
      studentEmail: body.studentEmail || '',
      studentPhone: body.studentPhone,
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

      if (body.studentEmail) {
        emailStatuses.student = await sendEmail({
          apiKey: resendKey,
          senders,
          to: [body.studentEmail],
          subject: studentSubject,
          html: studentHtml,
          replyTo: adminEmail,
        })
      }

      emailStatuses.admin = await sendEmail({
        apiKey: resendKey,
        senders,
        to: [adminEmail],
        subject: `[Payment received] ₹${product.priceINR} — ${body.studentName || 'Student'} (${product.name})`,
        html: renderAdminOrderEmail(orderEmail),
        replyTo: body.studentEmail || undefined,
      })

      if (!emailStatuses.student?.ok && body.studentEmail) {
        console.error(`[verify] student receipt email failed for ${body.studentEmail}`, emailStatuses.student.failures)
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
