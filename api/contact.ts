import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for development and cross-origin checks
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
    const { name, email, phone, exam, interest, message } = req.body || {}

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' })
    }

    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || 'managementrajiiserit@gmail.com'
    const fromEmail = process.env.FROM_EMAIL || 'MentoraX <enquiries@mentorax.in>'

    if (apiKey) {
      const resend = new Resend(apiKey)

      // Send notification to MentoraX admin
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        replyTo: email,
        subject: `[MentoraX Enquiry] ${interest || 'General'} — ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0c0b16; color: #f4f1ec; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #d8ff6a; font-size: 24px;">New MentoraX Student Enquiry</h2>
              <p style="margin: 4px 0 0; color: #a8a3bb; font-size: 14px;">Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
            
            <div style="margin-bottom: 18px;">
              <strong style="color: #9b8aff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Student Details</strong>
              <p style="margin: 6px 0; font-size: 16px;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 6px 0; font-size: 16px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #9b8aff;">${email}</a></p>
              <p style="margin: 6px 0; font-size: 16px;"><strong>Mobile:</strong> ${phone || 'Not provided'}</p>
              <p style="margin: 6px 0; font-size: 16px;"><strong>Target Exam:</strong> ${exam || 'Not specified'}</p>
              <p style="margin: 6px 0; font-size: 16px;"><strong>Interested In:</strong> ${interest || 'General enquiry'}</p>
            </div>

            <div style="background: rgba(255,255,255,0.04); padding: 16px; border-radius: 8px; border-left: 3px solid #d8ff6a; margin-top: 20px;">
              <strong style="color: #d8ff6a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Message / Goals</strong>
              <p style="margin: 10px 0 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); color: #a8a3bb; font-size: 12px; text-align: center;">
              MentoraX · Science of a clear path · <a href="https://mentorax.in" style="color: #9b8aff;">mentorax.in</a>
            </div>
          </div>
        `,
      })

      // Send confirmation to the student
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `We've received your enquiry · MentoraX`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0c0b16; color: #f4f1ec; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="margin: 0 0 12px; color: #d8ff6a;">Hello ${name},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #f4f1ec;">Thank you for reaching out to MentoraX. We've received your enquiry regarding <strong>${interest || 'our programs'}</strong> for ${exam ? `<strong>${exam}</strong>` : 'your preparation'}.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #a8a3bb;">Our team (Raj & Dipti) reviews each message personally and will get back to you within 24 hours.</p>
            <div style="background: rgba(155,138,255,0.08); padding: 14px 18px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(155,138,255,0.2);">
              <p style="margin: 0; color: #9b8aff; font-size: 14px; font-weight: 500;">Need immediate assistance?</p>
              <p style="margin: 4px 0 0; color: #f4f1ec; font-size: 13px;">Feel free to reply directly to this email or write to <a href="mailto:support@mentorax.in" style="color: #d8ff6a;">support@mentorax.in</a>.</p>
            </div>
            <p style="margin-top: 24px; color: #a8a3bb; font-size: 13px;">Warm regards,<br><strong style="color: #f4f1ec;">The MentoraX Team</strong><br><em>Research & Development Mindset</em></p>
          </div>
        `,
      })
    } else {
      console.log('RESEND_API_KEY not configured. Mocking contact form submission:', {
        name,
        email,
        phone,
        exam,
        interest,
        message,
        dispatchedTo: adminEmail,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you shortly.',
    })
  } catch (err: unknown) {
    console.error('Contact API Error:', err)
    return res.status(500).json({
      error: 'Failed to process enquiry. Please write directly to managementrajiiserit@gmail.com or support@mentorax.in',
    })
  }
}
