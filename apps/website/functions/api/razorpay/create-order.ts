export async function onRequestPost(context: { request: Request; env: Record<string, string> }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }

  try {
    const env = context.env || {}
    const key_id = env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TW0Z5IqPhStlJE'
    const key_secret = env.RAZORPAY_KEY_SECRET || 'X9Zc24Dnj3nN37VIMCdD76QG'

    if (!key_id || !key_secret) {
      return new Response(
        JSON.stringify({ success: false, message: 'Razorpay credentials missing on server' }),
        { status: 500, headers }
      )
    }

    const { amount, receipt } = await context.request.json()

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid order amount' }),
        { status: 400, headers }
      )
    }

    // Call Razorpay API directly via fetch (compatible with Cloudflare Workers environment)
    const auth = btoa(`${key_id}:${key_secret}`)
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: receipt || `rec_${Date.now()}`,
      }),
    })

    const order = await razorpayRes.json()

    if (!razorpayRes.ok) {
      console.error('Razorpay API error:', order)
      return new Response(
        JSON.stringify({
          success: false,
          message: order.error?.description || 'Razorpay order creation failed',
        }),
        { status: razorpayRes.status || 500, headers }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        order,
        key_id,
      }),
      { status: 200, headers }
    )
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Razorpay order creation failed' }),
      { status: 500, headers }
    )
  }
}
