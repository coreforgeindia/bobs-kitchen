import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mswhhjfkunhumhkuwjqg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_31uPBy2Ty7VzgkOC7GIT3Q_xxxVRaP8'

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

// Generate a unique order ID
export function generateOrderId(): string {
  return `BSK-${Math.floor(100000 + Math.random() * 900000)}`
}

// Payment timer duration (3 minutes in seconds)
export const PAYMENT_TIMEOUT_SECONDS = 180

// Polling interval (4 seconds in milliseconds)
export const PAYMENT_POLL_INTERVAL_MS = 4000

// Generate random OTP for PipraPay device pairing (6 uppercase chars/digits)
export function generateDeviceOtp(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export type PipraDevice = {
  id: string
  device_id: string
  otp: string
  name: string
  model: string
  android_level: string
  app_version: string
  status: 'processing' | 'used'
  created_date: string
  updated_date: string
  last_sync: string
}

export type PipraSms = {
  id: string
  device_id?: string
  sender: string
  message: string
  simslot?: string
  amount?: number
  trx_id?: string
  status: 'approved' | 'used' | 'error' | 'awaiting-review'
  reason?: string
  created_date: string
}

