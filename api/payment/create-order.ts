import type { VercelRequest, VercelResponse } from '@vercel/node'
import Razorpay from 'razorpay'

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
    const { amount, productId, productName, studentEmail, studentName } = req.body || {}

    if (!amount || !productId) {
      return res.status(400).json({ error: 'Amount and Product ID are required.' })
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
        amount: Math.round(Number(amount) * 100), // in paise
        currency: 'INR',
        receipt: `mtx_rcpt_${Date.now().toString().slice(-8)}`,
        notes: {
          productId,
          productName: productName || 'MentoraX Product',
          studentEmail: studentEmail || '',
          studentName: studentName || '',
        },
      }

      const order = await rzp.orders.create(options)
      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      })
    }

    // Mock response when keys are pending setup
    const mockOrderId = `order_mock_${Date.now().toString().slice(-8)}`
    return res.status(200).json({
      success: true,
      orderId: mockOrderId,
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      keyId: 'rzp_test_mock_keys_pending',
      mock: true,
      message: 'Razorpay keys pending. Running in interactive test simulation mode.',
    })
  } catch (err: unknown) {
    console.error('Create Order API Error:', err)
    return res.status(500).json({ error: 'Failed to create payment order.' })
  }
}
