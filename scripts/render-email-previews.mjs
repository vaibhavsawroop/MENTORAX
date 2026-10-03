/**
 * Renders the transactional email templates to plain .html files so the design
 * can be reviewed in a browser (open them, or serve `npm run preview`).
 *
 *   npm run email:preview        → writes .email-previews/*.html
 *
 * Node 24 can import the TypeScript module directly; no build step needed.
 * Output is git-ignored — these files are only a design aid.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '..', '.email-previews')
// pathToFileURL keeps this working on Windows, where a bare "C:\..." specifier
// is not a valid ESM URL.
const mail = await import(pathToFileURL(resolve(here, '..', 'api', '_email.ts')).href)

const order = {
  studentName: 'Priyanshu Sharma',
  studentEmail: 'priyanshu@example.com',
  studentPhone: '+91 98765 43210',
  productName: 'IAT 2027: Master Question Bank (Paperback)',
  productType: 'book',
  priceINR: 999,
  receiptNo: 'REC-2026-48213',
  transactionId: 'pay_QK72hd91LaPz0x',
  orderId: 'order_QK72hd91LaPz0x',
  dateStr: '4 October 2026, 11:42 am IST',
  shippingAddress: {
    street: '42, MG Road, Near City Mall',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
  },
  supportEmail: 'managementrajiiserit@gmail.com',
}

const files = {
  'book-receipt.html': mail.renderBookReceiptEmail(order),
  'batch-receipt.html': mail.renderBatchReceiptEmail({
    ...order,
    productName: 'MentoraX Quantum — Class 12 + Droppers (1 Year)',
    productType: 'batch',
    priceINR: 5000,
    shippingAddress: undefined,
    whatsappLink: 'https://chat.whatsapp.com/LWhJ5KeWxl5GkwY0FKs66j',
  }),
  'admin-order.html': mail.renderAdminOrderEmail(order),
  'enquiry.html': mail.renderContactAdminEmail({
    name: 'Priyanshu Sharma',
    email: 'priyanshu@example.com',
    phone: '+91 98765 43210',
    exam: 'IAT / NEST 2027',
    interest: 'MentoraX books',
    message:
      'I want to know whether the Master Question Bank covers the full Class 12 syllabus.\n\nAlso, can I get both books together?',
    dateStr: '4 October 2026, 11:42 am IST',
  }),
  'enquiry-ack.html': mail.renderContactAckEmail({
    name: 'Priyanshu Sharma',
    interest: 'MentoraX books',
    exam: 'IAT / NEST 2027',
  }),
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, html] of Object.entries(files)) {
  const path = resolve(OUT_DIR, name)
  writeFileSync(path, html)
  console.log(`wrote ${path} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`)
}
