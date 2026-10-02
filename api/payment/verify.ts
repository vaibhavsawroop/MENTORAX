import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { Resend } from 'resend'

/**
 * Server-side product catalog — duplicated here for price verification.
 * Must stay in sync with create-order.ts.
 */
const SERVER_PRODUCTS: Record<string, { name: string; priceINR: number; type: 'book' | 'batch' }> = {
  'iat-pyq-book':   { name: "IAT PYQ's Solution Book (Paperback)", priceINR: 499,   type: 'book' },
  'nest-pyq-book':  { name: "NEST PYQ's Solution Book (Paperback)", priceINR: 499,  type: 'book' },
  'all-pyq-combo':  { name: 'IAT + NEST Mega Book Combo (Paperback)', priceINR: 799, type: 'book' },
  'genesis':        { name: 'MentoraX Genesis — Class 11 Foundation (2 Years)', priceINR: 10000, type: 'batch' },
  'quantum':        { name: 'MentoraX Quantum — Class 12 + Droppers (1 Year)', priceINR: 5000,  type: 'batch' },
  'catalyst':       { name: 'MentoraX Catalyst — Class 12 + Droppers',          priceINR: 1500,  type: 'batch' },
}

/**
 * WhatsApp group invite links for each batch.
 * Update these when you create or rotate your WhatsApp groups.
 */
const BATCH_WHATSAPP_LINKS: Record<string, string> = {
  'genesis':  process.env.WA_LINK_GENESIS  || 'https://chat.whatsapp.com/PLACEHOLDER_GENESIS',
  'quantum':  process.env.WA_LINK_QUANTUM  || 'https://chat.whatsapp.com/PLACEHOLDER_QUANTUM',
  'catalyst': process.env.WA_LINK_CATALYST || 'https://chat.whatsapp.com/PLACEHOLDER_CATALYST',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentName,
      studentEmail,
      studentPhone,
      productId,
      amount,
      shippingAddress,
    } = req.body || {}

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || 'managementrajiiserit@gmail.com'
    const fromEmail = process.env.FROM_EMAIL || 'MentoraX Orders <orders@mentoraxs.com>'

    // ── STEP 1: Verify payment signature (CRITICAL SECURITY) ──
    let verified = false

    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (generated_signature === razorpay_signature) {
        verified = true
      } else {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' })
      }
    } else if (!keySecret) {
      // Mock/test mode only when no secrets configured
      verified = true
    } else {
      return res.status(400).json({ error: 'Missing payment verification parameters.' })
    }

    // ── STEP 2: Determine product type and verify amount ──
    const product = SERVER_PRODUCTS[productId]
    const productName = product?.name || 'MentoraX Product'
    const productType = product?.type || 'book'
    const serverPrice = product?.priceINR || amount || 499

    // Verify amount matches server catalog (prevents under-payment)
    if (product && Number(amount) !== product.priceINR) {
      console.error(`Amount mismatch: client sent ₹${amount}, server expects ₹${product.priceINR} for ${productId}`)
      return res.status(400).json({ error: 'Payment amount does not match product price.' })
    }

    const transactionId = razorpay_payment_id || `MTX-${Date.now().toString().slice(-6)}`
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const whatsappLink = productType === 'batch' ? (BATCH_WHATSAPP_LINKS[productId] || '') : ''
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    // ── STEP 3: Send emails via Resend ──
    if (apiKey && studentEmail) {
      const resend = new Resend(apiKey)

      // ──── EMAIL TO STUDENT ────
      if (productType === 'book') {
        // BOOK PURCHASE: Receipt + "Your book will be shipped" message
        await resend.emails.send({
          from: fromEmail,
          to: [studentEmail],
          subject: `Payment Confirmed: ${productName} — Receipt #${receiptNo}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #0c0b16; color: #f4f1ec; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed rgba(255,255,255,0.2);">
                <h1 style="color: #d8ff6a; margin: 0; font-size: 26px;">MENTORAX</h1>
                <p style="color: #a8a3bb; margin: 4px 0 0; font-size: 13px;">Official Payment Receipt &amp; Order Confirmation</p>
              </div>

              <div style="margin: 20px 0; background: rgba(255,255,255,0.03); padding: 18px; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Receipt No:</td><td style="text-align: right; font-weight: bold; color: #f4f1ec;">${receiptNo}</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Transaction ID:</td><td style="text-align: right; font-family: monospace; color: #9b8aff;">${transactionId}</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Date &amp; Time:</td><td style="text-align: right; color: #f4f1ec;">${dateStr} IST</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Billed To:</td><td style="text-align: right; color: #f4f1ec;">${studentName} (${studentEmail})</td></tr>
                </table>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px 0; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 15px;">
                  <tr>
                    <td style="color: #f4f1ec;"><strong>${productName}</strong></td>
                    <td style="text-align: right; color: #d8ff6a; font-weight: bold;">₹${serverPrice}</td>
                  </tr>
                </table>
              </div>

              <div style="background: rgba(216,255,106,0.1); border: 1px solid rgba(216,255,106,0.3); border-radius: 8px; padding: 18px; margin: 24px 0;">
                <h3 style="color: #d8ff6a; margin: 0 0 8px;">📦 Your Book Will Be Shipped!</h3>
                <p style="color: #f4f1ec; font-size: 14px; margin: 0 0 8px;">Your physical paperback copy will be dispatched to your shipping address within 3–5 business days.</p>
                ${shippingAddress ? `<p style="color: #a8a3bb; font-size: 13px; margin: 0;"><strong>Shipping to:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} — ${shippingAddress.pincode}</p>` : ''}
                <p style="color: #a8a3bb; font-size: 12px; margin: 8px 0 0;">You'll receive a tracking update once dispatched.</p>
              </div>

              <div style="color: #a8a3bb; font-size: 12px; text-align: center; line-height: 1.5;">
                For any queries, please reply directly to this email or write to <a href="mailto:managementrajiiserit@gmail.com" style="color: #9b8aff;">managementrajiiserit@gmail.com</a>.<br>
                MentoraX · Science of a clear path.
              </div>
            </div>
          `,
        })
      } else {
        // BATCH PURCHASE: Receipt + WhatsApp group invite link
        await resend.emails.send({
          from: fromEmail,
          to: [studentEmail],
          subject: `Welcome to ${productName} — Receipt #${receiptNo}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #0c0b16; color: #f4f1ec; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed rgba(255,255,255,0.2);">
                <h1 style="color: #d8ff6a; margin: 0; font-size: 26px;">MENTORAX</h1>
                <p style="color: #a8a3bb; margin: 4px 0 0; font-size: 13px;">Official Payment Receipt &amp; Batch Access</p>
              </div>

              <div style="margin: 20px 0; background: rgba(255,255,255,0.03); padding: 18px; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Receipt No:</td><td style="text-align: right; font-weight: bold; color: #f4f1ec;">${receiptNo}</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Transaction ID:</td><td style="text-align: right; font-family: monospace; color: #9b8aff;">${transactionId}</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Date &amp; Time:</td><td style="text-align: right; color: #f4f1ec;">${dateStr} IST</td></tr>
                  <tr><td style="color: #a8a3bb; padding: 6px 0;">Student:</td><td style="text-align: right; color: #f4f1ec;">${studentName} (${studentEmail})</td></tr>
                </table>
              </div>

              <div style="border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px 0; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 15px;">
                  <tr>
                    <td style="color: #f4f1ec;"><strong>${productName}</strong></td>
                    <td style="text-align: right; color: #d8ff6a; font-weight: bold;">₹${serverPrice}</td>
                  </tr>
                </table>
              </div>

              <div style="background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.35); border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                <h3 style="color: #25d366; margin: 0 0 8px;">🎓 Join Your Batch Now!</h3>
                <p style="color: #f4f1ec; font-size: 14px; margin: 0 0 14px;">Click below to join the official WhatsApp group for your batch. This is where all mentorship sessions, DPPs, and guidance will happen.</p>
                <a href="${whatsappLink}" style="background: #25d366; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: bold; font-size: 14px; display: inline-block;">Join WhatsApp Group →</a>
                <p style="color: #a8a3bb; font-size: 12px; margin: 12px 0 0;">This link is personal to you. Please do not share it publicly.</p>
              </div>

              <div style="color: #a8a3bb; font-size: 12px; text-align: center; line-height: 1.5;">
                For any queries, please write to <a href="mailto:managementrajiiserit@gmail.com" style="color: #9b8aff;">managementrajiiserit@gmail.com</a>.<br>
                MentoraX · Science of a clear path.
              </div>
            </div>
          `,
        })
      }

      // ──── EMAIL TO OWNER (ADMIN) ────
      const addressBlock = (productType === 'book' && shippingAddress)
        ? `<p><strong>📦 Shipping Address:</strong><br>${shippingAddress.street}<br>${shippingAddress.city}, ${shippingAddress.state} — ${shippingAddress.pincode}</p>`
        : ''

      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `[Payment Received] ₹${serverPrice} — ${studentName} (${productName})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0c0b16; color: #fff; border-radius: 12px;">
            <h2 style="color: #d8ff6a;">New Payment Verified ✓</h2>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Type:</strong> ${productType === 'book' ? '📚 Physical Book Order' : '🎓 Batch Enrollment'}</p>
            <p><strong>Amount:</strong> ₹${serverPrice}</p>
            <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
            <p><strong>Phone:</strong> ${studentPhone || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> <code>${transactionId}</code></p>
            <p><strong>Receipt No:</strong> ${receiptNo}</p>
            <p><strong>Time:</strong> ${dateStr} IST</p>
            ${addressBlock}
            ${productType === 'batch' ? `<p><strong>WhatsApp Link Sent:</strong> <a href="${whatsappLink}" style="color: #25d366;">${whatsappLink}</a></p>` : ''}
            <hr style="border-color: rgba(255,255,255,0.1); margin: 20px 0;" />
            <p style="color: #a8a3bb; font-size: 12px;">${productType === 'book' ? '⚡ ACTION REQUIRED: Ship the book to the address above.' : '✅ Student has received the WhatsApp group link via email.'}</p>
          </div>
        `,
      })
    }

    return res.status(200).json({
      success: true,
      verified,
      receiptNo,
      transactionId,
      productType,
      whatsappLink: productType === 'batch' ? whatsappLink : undefined,
      timestamp: new Date().toISOString(),
      message: productType === 'book'
        ? 'Payment verified. Your book will be shipped within 3–5 business days.'
        : 'Payment verified. Join your batch WhatsApp group to get started!',
    })
  } catch (err: unknown) {
    console.error('Verify Payment API Error:', err)
    return res.status(500).json({ error: 'Failed to verify payment.' })
  }
}
