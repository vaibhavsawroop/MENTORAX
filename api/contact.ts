import type { ApiRequest, ApiResponse } from './_types.js'
import { isSameOriginRequest } from './_security.js'
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSameOriginRequest(req)) return res.status(403).json({ error: 'Cross-origin request denied.' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as {
      name?: string
      email?: string
      phone?: string
      exam?: string
      interest?: string
      message?: string
      'bot-field'?: string
    }

    if (typeof body['bot-field'] === 'string' && body['bot-field'].trim()) {
      return res.status(200).json({ success: true })
    }

    const { name, email, message } = body
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ error: 'Name, email, and message are required.' })
    }
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanMessage = message.trim()
    if (
      !cleanName || cleanName.length > 120 || /[\r\n]/.test(cleanName) ||
      !cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      !cleanMessage || cleanMessage.length > 4000 ||
      (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.length > 30)) ||
      (body.exam !== undefined && (typeof body.exam !== 'string' || body.exam.length > 60)) ||
      (body.interest !== undefined && (
        typeof body.interest !== 'string' || body.interest.length > 80 || /[\r\n]/.test(body.interest)
      ))
    ) {
      return res.status(400).json({ error: 'Please check the enquiry details and try again.' })
    }

    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || SUPPORT_EMAIL
    const senders = fromCandidates(process.env.CONTACT_FROM_EMAIL || process.env.FROM_EMAIL)
    const dateStr = `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`

    if (!apiKey) {
      console.error('[contact] RESEND_API_KEY is not configured; enquiry was not delivered.')
      return res.status(503).json({ error: 'Enquiry email is temporarily unavailable. Please email us directly.' })
    }

    const owner = await sendEmail({
      apiKey,
      senders,
      to: [adminEmail],
      subject: `[MentoraX enquiry] ${body.interest || 'General'} — ${cleanName}`,
      html: renderContactAdminEmail({
        name: cleanName,
        email: cleanEmail,
        phone: body.phone,
        exam: body.exam,
        interest: body.interest,
        message: cleanMessage,
        dateStr,
      }),
      replyTo: cleanEmail,
    })

    const student = await sendEmail({
      apiKey,
      senders,
      to: [cleanEmail],
      subject: "We've received your enquiry · MentoraX",
      html: renderContactAckEmail({ name: cleanName, interest: body.interest, exam: body.exam }),
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
