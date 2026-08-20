import { NextRequest, NextResponse } from 'next/server'
import { handlePipraPayRequest, getMemoryDevices, getMemorySms, createNewPairingOtp } from '@/lib/piprapay-handler'

export async function POST(request: NextRequest) {
  return handlePipraPayRequest(request)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'new-otp') {
    const dev = createNewPairingOtp()
    return NextResponse.json({ status: 'true', otp: dev.otp, device: dev })
  }

  return NextResponse.json({
    status: 'ok',
    devices: getMemoryDevices(),
    sms: getMemorySms(),
  })
}
