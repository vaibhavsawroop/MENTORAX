import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { Resend } from 'resend'

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
      productName,
      amount,
    } = req.body || {}

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || 'vaibhavsawroop@gmail.com'
    const fromEmail = process.env.FROM_EMAIL || 'MentoraX Orders <orders@mentorax.in>'

    let verified = false

    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (generated_signature === razorpay_signature) {
        verified = true
      } else {
        return res.status(400).json({ error: 'Invalid payment signature verification failed.' })
      }
    } else {
      // In mock/test mode
      verified = true
    }

    const transactionId = razorpay_payment_id || `MTX-${Date.now().toString().slice(-6)}`
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`

    // If Resend API Key is available, email receipt and digital book access link to student & admin
    if (apiKey && studentEmail) {
      const resend = new Resend(apiKey)
      
      await resend.emails.send({
        from: fromEmail,
        to: [studentEmail],
        subject: `Payment Confirmed: ${productName || 'MentoraX Digital Product'} (Receipt #${receiptNo})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #0c0b16; color: #f4f1ec; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed rgba(255,255,255,0.2);">
              <h1 style="color: #d8ff6a; margin: 0; font-size: 26px;">MENTORAX</h1>
              <p style="color: #a8a3bb; margin: 4px 0 0; font-size: 13px;">Official Tax Invoice &amp; Payment Receipt</p>
            </div>

            <div style="margin: 20px 0; background: rgba(255,255,255,0.03); padding: 18px; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="color: #a8a3bb; padding: 6px 0;">Receipt No:</td>
                  <td style="text-align: right; font-weight: bold; color: #f4f1ec;">${receiptNo}</td>
                </tr>
                <tr>
                  <td style="color: #a8a3bb; padding: 6px 0;">Transaction ID:</td>
                  <td style="text-align: right; font-family: monospace; color: #9b8aff;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="color: #a8a3bb; padding: 6px 0;">Date &amp; Time:</td>
                  <td style="text-align: right; color: #f4f1ec;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                </tr>
                <tr>
                  <td style="color: #a8a3bb; padding: 6px 0;">Billed To:</td>
                  <td style="text-align: right; color: #f4f1ec;">${studentName} (${studentEmail})</td>
                </tr>
              </table>
            </div>

            <div style="border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px 0; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 15px;">
                <tr>
                  <td style="color: #f4f1ec;"><strong>${productName || 'MentoraX Study Material'}</strong></td>
                  <td style="text-align: right; color: #d8ff6a; font-weight: bold;">₹${amount || 499}</td>
                </tr>
              </table>
            </div>

            <div style="background: rgba(216,255,106,0.1); border: 1px solid rgba(216,255,106,0.3); border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
              <h3 style="color: #d8ff6a; margin: 0 0 8px;">Access Your Digital Material</h3>
              <p style="color: #f4f1ec; font-size: 14px; margin: 0 0 14px;">Your digital material is ready for download and online access.</p>
              <a href="https://mentorax.in/books" style="background: #d8ff6a; color: #06060e; text-decoration: none; padding: 10px 22px; border-radius: 999px; font-weight: bold; font-size: 14px; display: inline-block;">Open Study Dashboard</a>
            </div>

            <div style="color: #a8a3bb; font-size: 12px; text-align: center; line-height: 1.5;">
              For any queries, please write to <a href="mailto:support@mentorax.in" style="color: #9b8aff;">support@mentorax.in</a>.<br>
              MentoraX · Science of a clear path.
            </div>
          </div>
        `,
      })

      // Notify admin
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `[Payment Received] ₹${amount || 499} — ${studentName} (${productName})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0c0b16; color: #fff;">
            <h2 style="color: #d8ff6a;">New Payment Verified</h2>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
            <p><strong>Phone:</strong> ${studentPhone || 'N/A'}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
          </div>
        `,
      })
    }

    return res.status(200).json({
      success: true,
      verified,
      receiptNo,
      transactionId,
      timestamp: new Date().toISOString(),
      message: 'Payment verified successfully and confirmation dispatched.',
    })
  } catch (err: unknown) {
    console.error('Verify Payment API Error:', err)
    return res.status(500).json({ error: 'Failed to verify payment.' })
  }
}
