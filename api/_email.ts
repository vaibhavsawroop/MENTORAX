/**
 * Branded transactional email rendering + resilient delivery.
 *
 * Design notes
 * ------------
 * • One shared shell so every MentoraX email (receipts, batch access, enquiry
 *   notifications, enquiry acknowledgements) looks like the same product.
 * • The header pairs the official logo with the MentoraX wordmark in **Syne** —
 *   the same display face used by the site's entrance sequence (`--display` in
 *   `src/styles.css`). Web fonts are blocked by many mail clients, so the font
 *   stack degrades to Plus Jakarta Sans, then the platform UI font: the wordmark
 *   still reads as a logotype everywhere.
 * • Layout is table-based with inline styles (no flexbox/grid) so Gmail,
 *   Outlook, Apple Mail and mobile clients all render it correctly.
 * • Every user-supplied value is HTML-escaped before interpolation.
 * • `sendEmail()` never throws: it reports `{ ok, error }` so a delivery problem
 *   degrades into a logged warning plus an admin notification instead of a
 *   failed (already-paid) checkout.
 */

import { Resend } from 'resend'

export const SUPPORT_EMAIL = 'managementrajiiserit@gmail.com'

export const BRAND = {
  name: 'MentoraX',
  tagline: 'Science of a clear path',
  site: 'https://mentoraxs.com',
  logo: 'https://mentoraxs.com/logo.png',
  /** Mirrors `--display` from src/styles.css so email matches the site. */
  displayFont: "'Syne', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  monoFont: "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace",
  colors: {
    backdrop: '#07060f',
    card: '#0c0b16',
    panel: '#15132a',
    line: 'rgba(255,255,255,0.10)',
    text: '#f4f1ec',
    muted: '#a8a3bb',
    lime: '#d8ff6a',
    lilac: '#9b8aff',
    peach: '#ffbf8a',
    whatsapp: '#25d366',
  },
} as const

/** HTML-escape any value that came from a form, Razorpay or the environment. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
}

export type ProductType = 'book' | 'batch'

export type OrderEmailData = {
  studentName: string
  studentEmail: string
  studentPhone?: string
  productName: string
  productType: ProductType
  priceINR: number
  receiptNo: string
  transactionId: string
  orderId?: string
  dateStr: string
  shippingAddress?: { street?: string; city?: string; state?: string; pincode?: string }
  whatsappLink?: string
  supportEmail?: string
}

/* ──────────────────────────────────────────────────────────────
   Small style helpers — keeps the markup below readable.
   ────────────────────────────────────────────────────────────── */

const COLORS = BRAND.colors

function wordmarkTag(size = 27): string {
  return `<div style="font-family:${BRAND.displayFont};font-weight:800;font-size:${size}px;line-height:1;letter-spacing:-0.03em;color:${COLORS.text};">
              MENTORA<span style="color:${COLORS.lilac};">X</span>
            </div>`
}

/** Rounded white tile holding the official logo — reads correctly on the dark card. */
function logoTile(size = 46): string {
  return `<td width="${size}" valign="middle" style="padding:0 14px 0 0;">
            <div style="width:${size}px;height:${size}px;border-radius:12px;overflow:hidden;background:#ffffff;box-shadow:0 6px 18px rgba(0,0,0,0.35);">
              <img src="${BRAND.logo}" width="${size}" height="${size}" alt="MentoraX" style="display:block;width:${size}px;height:${size}px;border:0;outline:none;text-decoration:none;" />
            </div>
          </td>`
}

function badge(label: string, color: string = COLORS.lime): string {
  return `<span style="display:inline-block;padding:6px 13px;border-radius:999px;background:${color}1f;border:1px solid ${color}59;color:${color};font-family:${BRAND.monoFont};font-size:10px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;">${esc(label)}</span>`
}

function divider(dashed = false): string {
  return `<div style="height:1px;line-height:1px;font-size:0;${dashed
    ? `border-top:1px dashed ${COLORS.line};`
    : `background:${COLORS.line};`}margin:22px 0;">&nbsp;</div>`
}

function panel(inner: string, accent: string = COLORS.lilac): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:${COLORS.panel};border:1px solid ${COLORS.line};border-radius:14px;">
            <tr><td style="padding:20px 22px;border-left:3px solid ${accent};border-radius:14px;">${inner}</td></tr>
          </table>`
}

function keyValueRows(rows: Array<[string, string]>): string {
  const body = rows
    .map(([label, value], index) => {
      const borderTop = index === 0 ? 'none' : `1px solid ${COLORS.line}`
      return `<tr>
                <td style="padding:9px 0;border-top:${borderTop};font-family:${BRAND.bodyFont};font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:${COLORS.muted};">${esc(label)}</td>
                <td align="right" style="padding:9px 0;border-top:${borderTop};font-family:${BRAND.bodyFont};font-size:14px;color:${COLORS.text};font-weight:600;">${value}</td>
              </tr>`
    })
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${body}</table>`
}

/** Bulletproof-ish button (padding lives on the anchor, which Gmail supports). */
function button(href: string, label: string, color: string = COLORS.lime, textColor: string = '#100f1c'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
            <tr>
              <td align="center" bgcolor="${color}" style="border-radius:999px;">
                <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 30px;border-radius:999px;background:${color};color:${textColor};font-family:${BRAND.bodyFont};font-size:14px;font-weight:700;text-decoration:none;">${esc(label)}</a>
              </td>
            </tr>
          </table>`
}

function totalRow(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:6px;">
            <tr>
              <td style="font-family:${BRAND.bodyFont};font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};">${esc(label)}</td>
              <td align="right" style="font-family:${BRAND.displayFont};font-size:26px;font-weight:800;color:${COLORS.lime};">₹${esc(value)}</td>
            </tr>
          </table>`
}

/* ──────────────────────────────────────────────────────────────
   The shared shell
   ────────────────────────────────────────────────────────────── */

export function emailShell({
  preheader,
  badgeLabel,
  badgeColor = COLORS.lime,
  heading,
  intro,
  content,
}: {
  preheader: string
  badgeLabel: string
  badgeColor?: string
  heading: string
  intro: string
  content: string
}): string {
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${esc(heading)}</title>
  <!-- Progressive enhancement: clients that support web fonts render the
       wordmark in Syne (the site's display face); everyone else falls back. -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet" />
  <style>
    @media (max-width:600px) {
      .mx-shell { padding:16px 12px !important; }
      .mx-card { padding:24px 20px !important; }
      .mx-h1 { font-size:23px !important; line-height:1.25 !important; }
      .mx-stack { display:block !important; width:100% !important; text-align:left !important; }
    }
    a { text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLORS.backdrop};">
  <div style="display:none;font-size:1px;color:${COLORS.backdrop};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:${COLORS.backdrop};">
    <tr>
      <td align="center" class="mx-shell" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:620px;">
          <tr>
            <td class="mx-card" style="padding:34px 34px 30px;background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.45);">
              <!-- top accent -->
              <div style="height:4px;line-height:4px;font-size:0;border-radius:999px;margin-bottom:24px;background:linear-gradient(90deg,${COLORS.lilac} 0%,${COLORS.lime} 55%,${COLORS.peach} 100%);">&nbsp;</div>

              <!-- header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  ${logoTile()}
                  <td valign="middle" class="mx-stack">
                    ${wordmarkTag()}
                    <div style="margin-top:6px;font-family:${BRAND.bodyFont};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};">${esc(BRAND.tagline)}</div>
                  </td>
                  <td valign="middle" align="right" class="mx-stack" style="padding-top:14px;">${badge(badgeLabel, badgeColor)}</td>
                </tr>
              </table>

              ${divider()}

              <h1 class="mx-h1" style="margin:0 0 10px;font-family:${BRAND.displayFont};font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;color:${COLORS.text};">${heading}</h1>
              <p style="margin:0;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.65;color:${COLORS.muted};">${intro}</p>

              ${divider()}

              ${content}

              ${divider()}

              <p style="margin:0 0 4px;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                Questions? Reply to this email or write to
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.lilac};">${SUPPORT_EMAIL}</a>.
              </p>
              <p style="margin:0;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                <a href="${BRAND.site}" style="color:${COLORS.muted};">${BRAND.site.replace('https://', '')}</a>
                &nbsp;·&nbsp; MentoraX · ${esc(BRAND.tagline)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 6px 0;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${COLORS.muted};text-align:center;">
              You received this email because a purchase or enquiry was made at ${esc(BRAND.site.replace('https://', ''))}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/* ──────────────────────────────────────────────────────────────
   Order emails
   ────────────────────────────────────────────────────────────── */

function receiptBlock(order: OrderEmailData): string {
  const shipping = order.productType === 'book' && order.shippingAddress?.street
    ? `<div style="margin-top:14px;font-family:${BRAND.bodyFont};font-size:13px;line-height:1.6;color:${COLORS.muted};">
         <span style="color:${COLORS.text};font-weight:600;">Shipping to</span><br />
         ${esc(order.shippingAddress.street)}<br />
         ${esc(order.shippingAddress.city)}, ${esc(order.shippingAddress.state)} — ${esc(order.shippingAddress.pincode)}
       </div>`
    : ''

  return `${panel(`
      <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.muted};margin-bottom:12px;">Payment receipt</div>
      ${keyValueRows([
        ['Receipt no', esc(order.receiptNo)],
        ['Transaction', `<span style="font-family:${BRAND.monoFont};font-size:13px;color:${COLORS.lilac};">${esc(order.transactionId)}</span>`],
        ['Date', esc(order.dateStr)],
        ['Billed to', `${esc(order.studentName)}${order.studentEmail ? `<br /><span style="font-weight:400;color:${COLORS.muted};">${esc(order.studentEmail)}</span>` : ''}`],
      ])}
      ${divider(true)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.5;color:${COLORS.text};font-weight:600;">${esc(order.productName)}</td>
          <td align="right" style="font-family:${BRAND.bodyFont};font-size:14px;color:${COLORS.text};font-weight:600;">₹${esc(order.priceINR)}</td>
        </tr>
        <tr>
          <td style="font-family:${BRAND.bodyFont};font-size:12px;color:${COLORS.muted};padding-top:4px;">${order.productType === 'book' ? 'Shipping' : 'GST'}</td>
          <td align="right" style="font-family:${BRAND.bodyFont};font-size:12px;color:${COLORS.lime};padding-top:4px;">${order.productType === 'book' ? 'FREE' : 'Included'}</td>
        </tr>
      </table>
      ${totalRow('Total paid', String(order.priceINR))}
      ${shipping}
    `)}`
}

export function renderBookReceiptEmail(order: OrderEmailData): string {
  const whatsappSupport = order.supportEmail ?? SUPPORT_EMAIL
  return emailShell({
    preheader: `Payment confirmed for ${order.productName}. Receipt ${order.receiptNo}.`,
    badgeLabel: 'Payment confirmed',
    heading: `Order confirmed, ${esc(order.studentName.split(' ')[0] || 'aspirant')}.`,
    intro: `Your payment of ₹${esc(order.priceINR)} for <strong style="color:${COLORS.text};">${esc(order.productName)}</strong> is verified and your paperback is queued for dispatch.`,
    content: `
      ${receiptBlock(order)}
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      ${panel(`
        <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.lime};margin-bottom:8px;">Dispatch timeline</div>
        <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.6;color:${COLORS.text};">Packed and dispatched within <strong>3–5 business days</strong>, free shipping anywhere in India.</div>
        <div style="margin-top:10px;font-family:${BRAND.bodyFont};font-size:13px;line-height:1.6;color:${COLORS.muted};">You will receive a tracking update on this email as soon as the parcel leaves our desk. Keep this receipt for your records${order.studentPhone ? `, or reach us on ${esc(order.studentPhone)}` : ''}.</div>
      `, COLORS.lime)}
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
        <tr><td>${button(`${BRAND.site}/books`, 'Explore the library')}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.6;color:${COLORS.muted};">
        Need help with this order? Write to <a href="mailto:${esc(whatsappSupport)}" style="color:${COLORS.lilac};">${esc(whatsappSupport)}</a> quoting receipt <strong style="color:${COLORS.text};">${esc(order.receiptNo)}</strong>.
      </p>
    `,
  })
}

export function renderBatchReceiptEmail(order: OrderEmailData): string {
  const link = order.whatsappLink
  return emailShell({
    preheader: `Welcome to ${order.productName}. Your receipt and batch access link are inside.`,
    badgeLabel: 'Enrolment confirmed',
    badgeColor: COLORS.whatsapp,
    heading: `Welcome aboard, ${esc(order.studentName.split(' ')[0] || 'aspirant')}.`,
    intro: `Your payment of ₹${esc(order.priceINR)} for <strong style="color:${COLORS.text};">${esc(order.productName)}</strong> is verified. Your mentor will reach out on this email within 24 hours.`,
    content: `
      ${receiptBlock(order)}
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      ${panel(`
        <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.whatsapp};margin-bottom:8px;">Step 1 · Join your cohort</div>
        <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.65;color:${COLORS.text};">All mentorship sessions, daily practice problems and guidance announcements live in the official WhatsApp group for your batch.</div>
        ${link
          ? `<div style="margin-top:16px;">
               ${button(link, 'Join the WhatsApp group', COLORS.whatsapp, '#07240f')}
               <div style="margin-top:10px;font-family:${BRAND.bodyFont};font-size:12px;color:${COLORS.muted};">This invite is personal to you — please don't share it publicly.</div>
             </div>`
          : `<div style="margin-top:14px;font-family:${BRAND.bodyFont};font-size:13px;line-height:1.6;color:${COLORS.peach};">Your group invite will be emailed to you shortly after our team completes a security check on the payment.</div>`}
      `, COLORS.whatsapp)}
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      ${panel(`
        <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.lilac};margin-bottom:8px;">What happens next</div>
        <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.7;color:${COLORS.text};">
          1. Your dedicated mentor introduces themselves on email.<br />
          2. You receive your day-wise target plan and resources.<br />
          3. Your physical IAT MentoraX book is dispatched free of cost.
        </div>
      `, COLORS.lilac)}
    `,
  })
}

/** Owner-facing notification: everything needed to ship the parcel or enrol the student. */
export function renderAdminOrderEmail(order: OrderEmailData): string {
  const addressLines = order.shippingAddress?.street
    ? [`${esc(order.shippingAddress.street)}<br />${esc(order.shippingAddress.city)}, ${esc(order.shippingAddress.state)} — ${esc(order.shippingAddress.pincode)}`]
    : []
  const rows: Array<[string, string]> = [
    ['Product', esc(order.productName)],
    ['Type', order.productType === 'book' ? 'Physical book order' : 'Batch enrolment'],
    ['Amount', `<span style="color:${COLORS.lime};">₹${esc(order.priceINR)}</span>`],
    ['Student', `${esc(order.studentName)}<br /><span style="font-weight:400;color:${COLORS.muted};">${esc(order.studentEmail)}</span>`],
    ['Phone', esc(order.studentPhone || 'Not provided')],
    ['Transaction', `<span style="font-family:${BRAND.monoFont};font-size:13px;color:${COLORS.lilac};">${esc(order.transactionId)}</span>`],
    ['Receipt no', esc(order.receiptNo)],
    ['Placed at', esc(order.dateStr)],
  ]

  return emailShell({
    preheader: `₹${order.priceINR} received from ${order.studentName} for ${order.productName}.`,
    badgeLabel: 'New payment received',
    heading: 'New verified payment',
    intro: order.productType === 'book'
      ? 'A paid book order is ready to pack. The shipping address is below.'
      : 'A student has paid for a mentorship batch. Send the WhatsApp invite if it was not automatic.',
    content: `
      ${panel(keyValueRows(rows), COLORS.lime)}
      ${addressLines.length
        ? `<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
           ${panel(`
             <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.peach};margin-bottom:8px;">Ship to</div>
             <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.65;color:${COLORS.text};">${addressLines[0]}</div>
           `, COLORS.peach)}`
        : ''}
      ${order.whatsappLink
        ? `<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
           ${panel(`
             <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.whatsapp};margin-bottom:8px;">Invite link sent to the student</div>
             <div style="font-family:${BRAND.monoFont};font-size:12px;line-height:1.6;color:${COLORS.text};word-break:break-all;">${esc(order.whatsappLink)}</div>
           `, COLORS.whatsapp)}`
        : ''}
      <p style="margin:18px 0 0;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.6;color:${COLORS.muted};">
        Reply directly to this email to reach the student.
      </p>
    `,
  })
}

/* ──────────────────────────────────────────────────────────────
   Enquiry emails (contact form)
   ────────────────────────────────────────────────────────────── */

export function renderContactAdminEmail({
  name,
  email,
  phone,
  exam,
  interest,
  message,
  dateStr,
}: {
  name: string
  email: string
  phone?: string
  exam?: string
  interest?: string
  message: string
  dateStr: string
}): string {
  return emailShell({
    preheader: `New enquiry from ${name} — ${interest || 'General'}.`,
    badgeLabel: 'New enquiry',
    badgeColor: COLORS.peach,
    heading: 'New student enquiry',
    intro: 'Someone reached out through the MentoraX website. Reply directly to this email to answer them.',
    content: `
      ${panel(keyValueRows([
        ['Name', esc(name)],
        ['Email', `<a href="mailto:${esc(email)}" style="color:${COLORS.lilac};text-decoration:none;">${esc(email)}</a>`],
        ['Mobile', esc(phone || 'Not provided')],
        ['Target exam', esc(exam || 'Not specified')],
        ['Interested in', esc(interest || 'General enquiry')],
        ['Received', esc(dateStr)],
      ]), COLORS.peach)}
      <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
      ${panel(`
        <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.lime};margin-bottom:10px;">Message</div>
        <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.7;color:${COLORS.text};white-space:pre-wrap;">${esc(message)}</div>
      `, COLORS.lime)}
    `,
  })
}

export function renderContactAckEmail({ name, interest, exam }: { name: string; interest?: string; exam?: string }): string {
  const first = name.split(' ')[0] || 'there'
  return emailShell({
    preheader: 'We have your enquiry — the MentoraX team will reply shortly.',
    badgeLabel: 'Enquiry received',
    badgeColor: COLORS.lilac,
    heading: `Thanks for reaching out, ${esc(first)}.`,
    intro: `We have received your enquiry about <strong style="color:${COLORS.text};">${esc(interest || 'MentoraX programs')}</strong>${exam ? ` for <strong style="color:${COLORS.text};">${esc(exam)}</strong>` : ''} and a mentor will personally review it.`,
    content: `
      ${panel(`
        <div style="font-family:${BRAND.monoFont};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.lilac};margin-bottom:10px;">While you wait</div>
        <div style="font-family:${BRAND.bodyFont};font-size:14px;line-height:1.7;color:${COLORS.text};">
          • Read how our mentorship programs are structured.<br />
          • Browse the IAT and IAT 2027 question bank editions.<br />
          • Reply to this email with anything else you'd like us to know.
        </div>
        <div style="margin-top:18px;">
          ${button(`${BRAND.site}/mentorship`, 'See the programs', COLORS.lilac, '#0d0b1c')}
        </div>
      `, COLORS.lilac)}
      <p style="margin:18px 0 0;font-family:${BRAND.bodyFont};font-size:13px;line-height:1.7;color:${COLORS.muted};">
        Warm regards,<br />
        <strong style="color:${COLORS.text};">The MentoraX Team</strong><br />
        <em style="color:${COLORS.muted};">Research &amp; Development mindset</em>
      </p>
    `,
  })
}

/* ──────────────────────────────────────────────────────────────
   Delivery
   ────────────────────────────────────────────────────────────── */

export type EmailStatus = {
  /** True when at least one send succeeded. */
  ok: boolean
  /** Addresses that failed, with the provider message. */
  failures: Array<{ to: string; from: string; error: string }>
  /** Sender address that actually worked. */
  sentFrom?: string
}

/**
 * Resend's free tier only permits the sandbox sender until a domain is
 * verified. If `FROM_EMAIL` points at an unverified domain every send fails, so
 * we retry from a list of fallbacks and report exactly what happened — the
 * previous code waited on `resend.emails.send()` and threw the result away,
 * which is why "no email arrived" was invisible in production.
 */
export function fromCandidates(configured?: string): string[] {
  const list = [configured, `MentoraX Orders <onboarding@resend.dev>`].filter(Boolean) as string[]
  return [...new Set(list)]
}

export async function sendEmail(opts: {
  apiKey: string
  to: string[]
  subject: string
  html: string
  replyTo?: string
  senders: string[]
}): Promise<EmailStatus> {
  const { apiKey, to, subject, html, replyTo, senders } = opts
  const status: EmailStatus = { ok: false, failures: [] }
  if (!to.length) return status

  const resend = new Resend(apiKey)

  for (const from of senders) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      })

      if (data?.id) {
        status.ok = true
        status.sentFrom = from
        return status
      }

      const message = error?.message || 'Unknown Resend error'
      status.failures.push({ to: to.join(','), from, error: message })
      console.error(`[email] Resend rejected "${subject}" from "${from}" to ${to.join(',')}: ${message}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      status.failures.push({ to: to.join(','), from, error: message })
      console.error(`[email] Resend threw for "${subject}" from "${from}": ${message}`)
    }
  }

  return status
}
