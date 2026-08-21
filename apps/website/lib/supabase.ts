import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mswhhjfkunhumhkuwjqg.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_31uPBy2Ty7VzgkOC7GIT3Q_xxxVRaP8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// UPI Payment Configuration
export const UPI_CONFIG = {
  vpa: '7899857996-3@ybl',
  merchantName: 'Bobs Satellite kitchen',
  currency: 'INR',
} as const

// Generate UPI deep link URI
export function generateUpiUri(amount: number, orderId: string): string {
  const params = new URLSearchParams({
    pa: UPI_CONFIG.vpa,
    pn: UPI_CONFIG.merchantName,
    am: amount.toFixed(2),
    cu: UPI_CONFIG.currency,
    tr: orderId,
    tn: `Order ${orderId}`,
  })
  return `upi://pay?${params.toString()}`
}

// Generate app-specific and generic UPI deep links
export function generateAppUpiUris(amount: number, orderId: string) {
  const params = new URLSearchParams({
    pa: UPI_CONFIG.vpa,
    pn: UPI_CONFIG.merchantName,
    am: amount.toFixed(2),
    cu: UPI_CONFIG.currency,
    tn: `Order ${orderId}`,
    tr: orderId,
  }).toString()

  return {
    gpay: `gpay://upi/pay?${params}`,
    phonepe: `phonepe://pay?${params}`,
    paytm: `paytmmp://pay?${params}`,
    generic: `upi://pay?${params}`,
  }
}

// Reserve the next order code centrally so both apps see one sequence (BSK001, BSK002, ...)
export async function reserveOrderId(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('next_order_code')
    if (!error && data && typeof data === 'string') {
      return data
    }
  } catch (err) {
    console.warn('RPC next_order_code missing or failed, using fallback sequence:', err)
  }

  try {
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const nextNum = (count || 0) + 1
    return `BSK${String(nextNum).padStart(3, '0')}`
  } catch {
    const fallbackSeq = String(Math.floor(1 + Math.random() * 99)).padStart(3, '0')
    return `BSK${fallbackSeq}`
  }
}

// Payment timer duration (3 minutes in seconds)
export const PAYMENT_TIMEOUT_SECONDS = 180

// Polling interval (4 seconds in milliseconds)
export const PAYMENT_POLL_INTERVAL_MS = 4000
