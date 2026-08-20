import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Check Payment Status Endpoint
 * 
 * The frontend polls this endpoint every 4 seconds to check
 * if PipraPay's webhook has confirmed the payment.
 * 
 * GET /api/check-payment-status?order_id=BSK-123456
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('order_id')

  if (!orderId) {
    return NextResponse.json(
      { error: 'order_id query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('status, upi_transaction_id, paid_at, amount')
      .eq('order_id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { status: 'NOT_FOUND', order_id: orderId },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: order.status,
      order_id: orderId,
      upi_transaction_id: order.upi_transaction_id || null,
      paid_at: order.paid_at || null,
      amount: order.amount,
    })
  } catch (error) {
    console.error('[Check Payment Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
