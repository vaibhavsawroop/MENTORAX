/**
 * Server-side product catalogue — the ONLY source of truth for names and prices.
 *
 * Both `payment/create-order.ts` (creates the Razorpay order) and
 * `payment/verify.ts` (confirms what was actually bought) import from here, so the
 * two can never drift apart — the previous copy-pasted catalogues could disagree
 * after an edit, which would mis-price a real order.
 *
 * Clients cannot override anything in this file: the browser only ever sends a
 * `productId`, the price is always read from here.
 */

export type ProductType = 'book' | 'batch'

export type Product = {
  /** Customer-facing name, used in Razorpay, receipts and emails. */
  name: string
  /** Selling price in whole rupees (converted to paise when talking to Razorpay). */
  priceINR: number
  type: ProductType
}

export const PRODUCTS: Record<string, Product> = {
  // ── Physical books ──────────────────────────────────────────────
  'iat-pyq-book': {
    name: "IAT PYQ's Solution Book (Paperback)",
    priceINR: 499,
    type: 'book',
  },
  'iat-qb-2027': {
    name: 'IAT 2027: Master Question Bank (Paperback)',
    priceINR: 999,
    type: 'book',
  },
  'all-pyq-combo': {
    name: 'IAT PYQ + IAT 2027 Question Bank Combo (Paperback)',
    priceINR: 1199,
    type: 'book',
  },

  // ── Mentorship batches ──────────────────────────────────────────
  genesis: {
    name: 'MentoraX Genesis — Class 11 Foundation (2 Years)',
    priceINR: 10000,
    type: 'batch',
  },
  quantum: {
    name: 'MentoraX Quantum — Class 12 + Droppers (1 Year)',
    priceINR: 5000,
    type: 'batch',
  },
  catalyst: {
    name: 'MentoraX Catalyst — Class 12 + Droppers',
    priceINR: 1500,
    type: 'batch',
  },
}

/**
 * Legacy product ids that may still live in links people shared, saved carts or
 * bookmarks. They resolve to the current catalogue entry so an old link fails
 * gracefully instead of showing "Invalid product ID".
 */
export const PRODUCT_ALIASES: Record<string, string> = {
  // The NEST edition was replaced by the IAT 2027 Master Question Bank.
  'nest-pyq-book': 'iat-qb-2027',
}

export type ResolvedProduct = {
  /** Canonical catalogue id (after alias resolution). */
  id: string
  product: Product
}

/** Resolve a client-supplied product id (alias-aware). Returns null when unknown. */
export function resolveProduct(rawId: unknown): ResolvedProduct | null {
  if (typeof rawId !== 'string' || !rawId) return null
  const canonical = Object.prototype.hasOwnProperty.call(PRODUCT_ALIASES, rawId)
    ? PRODUCT_ALIASES[rawId]
    : rawId
  if (!Object.prototype.hasOwnProperty.call(PRODUCTS, canonical)) return null
  const product = PRODUCTS[canonical]
  return { id: canonical, product }
}

/** Price in paise, as Razorpay expects. */
export function priceInPaise(product: Product): number {
  return Math.round(product.priceINR * 100)
}

export type ShippingAddress = {
  street?: string
  city?: string
  state?: string
  pincode?: string
}

/**
 * True when every required shipping field for a physical book order is present.
 * Written as a type predicate so callers get narrowed access to the fields.
 */
export function hasCompleteAddress(
  address: ShippingAddress | undefined
): address is Required<ShippingAddress> {
  if (!address) return false
  return Boolean(address.street && address.city && address.state && address.pincode)
}

/** One-line postal address for receipts and emails. */
export function formatAddress(address: ShippingAddress | undefined): string {
  if (!hasCompleteAddress(address)) return ''
  return `${address.street}, ${address.city}, ${address.state} — ${address.pincode}`
}
