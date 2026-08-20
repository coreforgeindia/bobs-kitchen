import { NextRequest, NextResponse } from 'next/server'
import { handlePipraPayRequest } from '@/lib/piprapay-handler'

export async function POST(request: NextRequest) {
  return handlePipraPayRequest(request)
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/piprapay-webhook',
    method: 'POST',
    description: "PipraPay webhook & Companion App receiver for Bob's Satellite Kitchen",
    timestamp: new Date().toISOString(),
  })
}

