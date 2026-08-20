import { processCompanionPayload, createNewPairingOtp, getMemoryDevices, getMemorySms } from '../../lib/piprapay-handler'

export async function onRequestPost({ request }: { request: Request }) {
  try {
    let payload: Record<string, any> = {}
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      payload = await request.json().catch(() => ({}))
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => new FormData())
      formData.forEach((value, key) => {
        payload[key] = value
      })
    } else {
      const text = await request.text().catch(() => '')
      try {
        payload = JSON.parse(text)
      } catch {
        const params = new URLSearchParams(text)
        params.forEach((v, k) => { payload[k] = v })
      }
    }

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
  } catch (error: any) {
    return new Response(JSON.stringify({ status: 'false', message: error?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') || ''

  if (action === 'new-otp' || action === 'generate-otp') {
    const newDevice = createNewPairingOtp()
    return new Response(JSON.stringify({
      status: 'true',
      otp: newDevice.otp,
      device_id: newDevice.device_id,
      device: newDevice,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  return new Response(JSON.stringify({
    status: 'ok',
    endpoint: '/api/piprapay-companion',
    description: "PipraPay Android Companion API for Bob's Satellite Kitchen",
    devices: getMemoryDevices(),
    sms: getMemorySms(),
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
