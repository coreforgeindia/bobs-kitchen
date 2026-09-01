export async function onRequest(context: { request: Request; env: Record<string, string> }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method Not Allowed. Use POST.' }),
      { status: 405, headers }
    )
  }

  try {
    const env = context.env || {}
    const secret = env.RAZORPAY_KEY_SECRET || 'X9Zc24Dnj3nN37VIMCdD76QG'

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await context.request.json()

    if (!secret) {
      return new Response(
        JSON.stringify({ success: false, message: 'Razorpay secret key missing on server' }),
        { status: 500, headers }
      )
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required Razorpay payment fields' }),
        { status: 400, headers }
      )
    }

    // Verify HMAC-SHA256 signature using standard Web Crypto API
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(text)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const isAuthentic = expectedSignature === razorpay_signature

    if (isAuthentic) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment signature verified successfully',
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
        }),
        { status: 200, headers }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid payment signature' }),
        { status: 400, headers }
      )
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment signature:', error)
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Signature verification failed' }),
      { status: 500, headers }
    )
  }
}
