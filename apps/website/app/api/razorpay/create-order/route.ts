import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(req: Request) {
  try {
    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
      console.error('Razorpay credentials missing in environment variables')
      return NextResponse.json(
        { success: false, message: 'Razorpay credentials missing on server' },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    })

    const { amount, receipt } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order amount' },
        { status: 400 }
      )
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: receipt || `rec_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({
      success: true,
      order,
      key_id,
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Razorpay order creation failed' },
      { status: 500 }
    )
  }
}
