import type { ApiRequest, ApiResponse } from '../_types.js'
import { isSameOriginRequest } from '../_security.js'
import Razorpay from 'razorpay'
import { hasCompleteAddress, priceInPaise, resolveProduct, type ShippingAddress } from '../_catalog.js'

/**
 * POST /api/payment/create-order
 *
 * Body: { productId, studentName?, studentEmail?, shippingAddress? }
 *
 * Creates a real Razorpay order and returns the `keyId` the browser needs to
 * open the checkout modal. The price always comes from the server catalogue
 * (`_catalog.ts`) so a tampered client cannot change what is charged.
 *
 * When Razorpay keys are missing this handler no longer pretends the order
 * succeeded: it returns 503 unless the deployment explicitly opted into local
 * simulation with ALLOW_MOCK_PAYMENTS=true. That opt-in exists because the old
 * silent mock made a broken deployment look like a working checkout.
 */

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'Cross-origin request denied.' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as {
      productId?: string
      studentName?: string
      studentEmail?: string
      studentPhone?: string
      shippingAddress?: ShippingAddress
    }

    const resolved = resolveProduct(body.productId)
    if (!resolved) return res.status(400).json({ error: 'Invalid product ID.' })

    const { id: productId, product } = resolved
    const studentName = typeof body.studentName === 'string' ? body.studentName.trim() : ''
    const studentEmail = typeof body.studentEmail === 'string' ? body.studentEmail.trim() : ''
    const studentPhone = typeof body.studentPhone === 'string' ? body.studentPhone.trim() : ''

    if (!studentName || studentName.length > 120 || /[\r\n]/.test(studentName)) {
      return res.status(400).json({ error: 'Enter a valid name.' })
    }
    if (studentEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (studentPhone && (studentPhone.length > 20 || !/^[+()\d -]{7,20}$/.test(studentPhone))) {
      return res.status(400).json({ error: 'Enter a valid phone number.' })
    }

    const address = body.shippingAddress

    if (product.type === 'book' && (
      !hasCompleteAddress(address) ||
      typeof address.street !== 'string' || !address.street.trim() || address.street.trim().length > 200 ||
      typeof address.city !== 'string' || !address.city.trim() || address.city.trim().length > 80 ||
      typeof address.state !== 'string' || !address.state.trim() || address.state.trim().length > 80 ||
      typeof address.pincode !== 'string' || !/^\d{6}$/.test(address.pincode.trim())
    )) {
      return res.status(400).json({ error: 'Complete shipping address is required for book orders.' })
    }

    const shippingAddress = product.type === 'book' && address
      ? {
          street: address.street!.trim(),
          city: address.city!.trim(),
          state: address.state!.trim(),
          pincode: address.pincode!.trim(),
        }
      : undefined

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      // Local development may explicitly opt into a simulation; production never does.
      if (
        process.env.ALLOW_MOCK_PAYMENTS === 'true' &&
        process.env.NODE_ENV !== 'production' &&
        process.env.VERCEL !== '1'
      ) {
        return res.status(200).json({
          success: true,
          mock: true,
          orderId: `order_mock_${Date.now().toString().slice(-8)}`,
          amount: priceInPaise(product),
          currency: 'INR',
          keyId: 'rzp_test_mock_keys_pending',
          productId,
          productType: product.type,
          message: 'ALLOW_MOCK_PAYMENTS=true — running an offline payment simulation. No money moves.',
        })
      }

      console.error('[create-order] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set for this deployment.')
      return res.status(503).json({
        error: 'Online payments are temporarily unavailable. Please write to managementrajiiserit@gmail.com and we will complete your order manually.',
        code: 'payments_not_configured',
      })
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })

    const order = await rzp.orders.create({
      amount: priceInPaise(product),
      currency: 'INR',
      receipt: `mtx_rcpt_${Date.now().toString().slice(-8)}`,
      // `productId` here is what verify.ts trusts later — it is written
      // server-side and cannot be altered by the browser.
      notes: {
        productId,
        productName: product.name,
        productType: product.type,
        studentEmail,
        studentName,
        studentPhone,
        ...(shippingAddress
          ? {
              shippingStreet: shippingAddress.street,
              shippingCity: shippingAddress.city,
              shippingState: shippingAddress.state,
              shippingPincode: shippingAddress.pincode,
            }
          : {}),
      },
    })

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      productId,
      productType: product.type,
    })
  } catch (err) {
    console.error('[create-order] failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({
      error: 'Could not start the payment. Please try again in a moment.',
      detail: process.env.NODE_ENV === 'production' ? undefined : message,
    })
  }
}
