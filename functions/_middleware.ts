import { processCompanionPayload } from '../lib/piprapay-handler'

export async function onRequest({ request, next }: { request: Request; next: () => Promise<Response> }) {
  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  }

  // Intercept Companion App POST requests sent to root or any path
  if (request.method === 'POST') {
    const url = new URL(request.url)
    const contentType = request.headers.get('content-type') || ''
    
    // Check if this looks like a Companion / Webhook / API request
    if (
      url.pathname === '/' ||
      url.pathname === '/index.php' ||
      url.pathname === '/dashboard' ||
      url.pathname.startsWith('/api/') ||
      contentType.includes('form') ||
      contentType.includes('json')
    ) {
      try {
        let payload: Record<string, any> = {}

        if (contentType.includes('application/json')) {
          payload = await request.clone().json().catch(() => ({}))
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
          const formData = await request.clone().formData().catch(() => new FormData())
          formData.forEach((value, key) => {
            payload[key] = value
          })
        } else {
          const text = await request.clone().text().catch(() => '')
          try {
            payload = JSON.parse(text)
          } catch {
            const params = new URLSearchParams(text)
            params.forEach((v, k) => { payload[k] = v })
          }
        }

        // If the request contains PipraPay action / companion parameters
        const action = payload.action || payload['action-companion'] || payload.action_companion
        const hasOtp = payload.onetimepassword || payload.otp
        const hasToken = payload.token
        const hasSms = payload.sms_list || payload.message

        if (action || hasOtp || hasToken || hasSms) {
          const result = await processCompanionPayload(payload)
          return new Response(JSON.stringify(result.body), {
            status: result.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': '*',
            },
          })
        }
      } catch (err) {
        console.error('Middleware companion intercept error:', err)
      }
    }
  }

  // Pass-through to normal page routing
  return next()
}
