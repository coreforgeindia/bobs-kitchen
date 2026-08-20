import { processCompanionRequest } from '../../lib/piprapay-handler'

export async function onRequestPost({ request }: { request: Request }) {
  try {
    let payload: Record<string, any> = {}
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      payload = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        payload[key] = value
      })
    }

    const result = await processCompanionRequest(payload)
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ status: 'false', message: error?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'ok',
    endpoint: '/api/piprapay-webhook',
    description: "PipraPay Webhook Receiver for Bob's Satellite Kitchen",
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
