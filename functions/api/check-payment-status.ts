import { supabase } from '../../apps/website/lib/supabase'

export async function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId')

  if (!orderId) {
    return new Response(JSON.stringify({ status: 'ERROR', message: 'order_id parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_id, amount, status, payment_method, upi_transaction_id, paid_at')
      .eq('order_id', orderId)
      .single()

    if (error || !order) {
      return new Response(JSON.stringify({ status: 'NOT_FOUND', order_id: orderId }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({
      status: order.status,
      order_id: order.order_id,
      amount: order.amount,
      payment_method: order.payment_method,
      upi_transaction_id: order.upi_transaction_id,
      paid_at: order.paid_at,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'ERROR', message: err?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
