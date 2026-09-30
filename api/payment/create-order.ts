import type { VercelRequest, VercelResponse } from '@vercel/node'
import Razorpay from 'razorpay'

/**
 * Server-side product catalog — the ONLY source of truth for prices.
 * Clients cannot override these. Prevents price-tampering attacks.
 */
const SERVER_PRODUCTS: Record<string, { name: string; priceINR: number; type: 'book' | 'batch' }> = {
  'iat-pyq-book':   { name: "IAT PYQ's Solution Book (Paperback)", priceINR: 499,   type: 'book' },
  'nest-pyq-book':  { name: "NEST PYQ's Solution Book (Paperback)", priceINR: 499,  type: 'book' },
  'all-pyq-combo':  { name: 'IAT + NEST Mega Book Combo (Paperback)', priceINR: 799, type: 'book' },
  'genesis':        { name: 'MentoraX Genesis — Class 11 Foundation (2 Years)', priceINR: 10000, type: 'batch' },
  'quantum':        { name: 'MentoraX Quantum — Class 12 + Droppers (1 Year)', priceINR: 5000,  type: 'batch' },
  'catalyst':       { name: 'MentoraX Catalyst — Class 12 + Droppers',          priceINR: 1500,  type: 'batch' },
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
    const { productId, studentEmail, studentName, shippingAddress } = req.body || {}

    // Validate required fields
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' })
    }

    // Look up the product server-side — prevents price tampering
    const product = SERVER_PRODUCTS[productId]
    if (!product) {
      return res.status(400).json({ error: 'Invalid product ID.' })
    }

    // For book orders, require a shipping address
    if (product.type === 'book') {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        return res.status(400).json({ error: 'Complete shipping address is required for book orders.' })
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // If Razorpay credentials are present in env, create real Razorpay order
    if (keyId && keySecret) {
      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })

      const options = {
        amount: Math.round(product.priceINR * 100), // in paise — from server catalog, NOT client
        currency: 'INR',
        receipt: `mtx_rcpt_${Date.now().toString().slice(-8)}`,
        notes: {
          productId,
          productName: product.name,
          productType: product.type,
          studentEmail: studentEmail || '',
          studentName: studentName || '',
          ...(product.type === 'book' && shippingAddress ? {
            shippingStreet: shippingAddress.street,
            shippingCity: shippingAddress.city,
            shippingState: shippingAddress.state,
            shippingPincode: shippingAddress.pincode,
          } : {}),
        },
      }

      const order = await rzp.orders.create(options)
      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        productType: product.type,
      })
    }

    // Mock response when keys are pending setup
    const mockOrderId = `order_mock_${Date.now().toString().slice(-8)}`
    return res.status(200).json({
      success: true,
      orderId: mockOrderId,
      amount: Math.round(product.priceINR * 100),
      currency: 'INR',
      keyId: 'rzp_test_mock_keys_pending',
      productType: product.type,
      mock: true,
      message: 'Razorpay keys pending. Running in interactive test simulation mode.',
    })
  } catch (err: unknown) {
    console.error('Create Order API Error:', err)
    return res.status(500).json({ error: 'Failed to create payment order.' })
  }
}
