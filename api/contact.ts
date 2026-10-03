import type { ApiRequest, ApiResponse } from './_types.js'
import {
  SUPPORT_EMAIL,
  fromCandidates,
  renderContactAckEmail,
  renderContactAdminEmail,
  sendEmail,
} from './_email.js'

/**
 * POST /api/contact — website enquiry form.
 *
 * Sends the owner a branded notification (reply-to the student) and the student
 * a branded acknowledgement. Delivery problems are logged and reported in the
 * response instead of silently disappearing.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.setHeader(name, value)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as {
      name?: string
      email?: string
      phone?: string
      exam?: string
      interest?: string
      message?: string
    }

    const { name, email, message } = body
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' })
    }

    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || SUPPORT_EMAIL
    const senders = fromCandidates(process.env.CONTACT_FROM_EMAIL || process.env.FROM_EMAIL)
    const dateStr = `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`

    if (!apiKey) {
      console.error('[contact] RESEND_API_KEY missing — enquiry stored in logs only:', {
        name,
        email,
        phone: body.phone,
        exam: body.exam,
        interest: body.interest,
        message,
        dispatchedTo: adminEmail,
      })
      return res.status(200).json({
        success: true,
        emailDelivered: false,
        message: 'Enquiry received. Email delivery is not configured, so our team will follow up manually.',
      })
    }

    const owner = await sendEmail({
      apiKey,
      senders,
      to: [adminEmail],
      subject: `[MentoraX enquiry] ${body.interest || 'General'} — ${name}`,
      html: renderContactAdminEmail({
        name,
        email,
        phone: body.phone,
        exam: body.exam,
        interest: body.interest,
        message,
        dateStr,
      }),
      replyTo: email,
    })

    const student = await sendEmail({
      apiKey,
      senders,
      to: [email],
      subject: "We've received your enquiry · MentoraX",
      html: renderContactAckEmail({ name, interest: body.interest, exam: body.exam }),
      replyTo: adminEmail,
    })

    if (!owner.ok) console.error('[contact] owner notification failed:', owner.failures)

    return res.status(200).json({
      success: true,
      emailDelivered: student.ok,
      adminNotified: owner.ok,
      message: 'Enquiry submitted successfully. We will get back to you shortly.',
    })
  } catch (err) {
    console.error('[contact] failed:', err)
    return res.status(500).json({
      error: `Failed to process enquiry. Please write directly to ${SUPPORT_EMAIL}`,
    })
  }
}
