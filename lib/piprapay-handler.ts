import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateOrderId } from '@/lib/supabase'

// In-memory fallback for paired devices & SMS if Supabase table is not yet migrated
let memoryDevices: Array<{
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
}> = [
  {
    id: 'dev_init_1',
    device_id: 'DEV-1001',
    otp: 'BOB789',
    name: 'Pending Device',
    model: 'Android Phone',
    android_level: 'Android 14',
    app_version: 'v1.4',
    status: 'processing',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    last_sync: '--',
  }
]

let memorySms: Array<{
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
}> = []

export function getMemoryDevices() {
  return memoryDevices
}

export function getMemorySms() {
  return memorySms
}

export function createNewPairingOtp(otpOverride?: string) {
  const otp = otpOverride || Math.random().toString(36).substring(2, 8).toUpperCase()
  const newDev = {
    id: `dev_${Date.now()}`,
    device_id: `DEV-${Math.floor(1000 + Math.random() * 9000)}`,
    otp,
    name: 'Pending Device',
    model: 'Waiting for connection...',
    android_level: '--',
    app_version: '--',
    status: 'processing' as const,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    last_sync: '--',
  }
  memoryDevices = [newDev, ...memoryDevices.filter(d => d.status === 'used')]
  return newDev
}

/**
 * Handle incoming PipraPay companion request or generic webhook
 */
export async function handlePipraPayRequest(request: NextRequest) {
  try {
    let body: any = {}
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}))
    } else if (contentType.includes('form') || contentType.includes('multipart')) {
      const formData = await request.formData().catch(() => new FormData())
      const entries: Record<string, any> = {}
      formData.forEach((value, key) => {
        entries[key] = value
      })
      body = entries
    } else {
      // Try text parsing
      const text = await request.text().catch(() => '')
      try {
        body = JSON.parse(text)
      } catch {
        const params = new URLSearchParams(text)
        const entries: Record<string, any> = {}
        params.forEach((v, k) => { entries[k] = v })
        body = entries
      }
    }

    const actionCompanion = body['action-companion'] || body.action_companion || body.action

    // =========================================================================
    // 1. ANDROID COMPANION: LOGIN / PAIRING (when app sends URL and Password)
    // =========================================================================
    if (actionCompanion === 'login') {
      const onetimepassword = (body.onetimepassword || body.password || body.otp || '').toString().trim().toUpperCase()
      const name = (body.name || 'Android Device').toString()
      const model = (body.model || 'Android Phone').toString()
      const android_level = (body.android_level || body.androidLevel || 'Android').toString()
      const app_version = (body.app_version || body.appVersion || 'v1.4').toString()

      if (!onetimepassword) {
        return NextResponse.json({
          status: 'false',
          title: 'Incomplete Information',
          message: 'Please provide the One-Time Password / Pairing code from PipraPay.',
        })
      }

      // Check if OTP matches any device in memory or default/master credentials
      const foundIndex = memoryDevices.findIndex(
        d => d.otp.toUpperCase() === onetimepassword || onetimepassword === 'ADMIN@1234' || onetimepassword === 'BOB789'
      )

      const token = `tok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`
      const nowStr = new Date().toISOString()

      if (foundIndex >= 0) {
        memoryDevices[foundIndex] = {
          ...memoryDevices[foundIndex],
          otp: token, // Used as token
          name,
          model,
          android_level,
          app_version,
          status: 'used',
          updated_date: nowStr,
          last_sync: nowStr,
        }
      } else {
        // Create new device entry
        memoryDevices.unshift({
          id: `dev_${Date.now()}`,
          device_id: `DEV-${Math.floor(1000 + Math.random() * 9000)}`,
          otp: token,
          name,
          model,
          android_level,
          app_version,
          status: 'used',
          created_date: nowStr,
          updated_date: nowStr,
          last_sync: nowStr,
        })
      }

      // Try persisting to Supabase if table exists
      try {
        await supabase.from('pp_devices').upsert({
          device_id: `DEV-${Date.now().toString().slice(-4)}`,
          otp: token,
          name,
          model,
          android_level,
          app_version,
          status: 'used',
          last_sync: nowStr,
          updated_at: nowStr,
        })
      } catch {}

      console.log(`[PipraPay Companion] ✅ Device connected successfully: ${name} (${model})`)

      return NextResponse.json({
        status: 'true',
        token,
      })
    }

    // =========================================================================
    // 2. ANDROID COMPANION: ACCOUNT INFORMATION
    // =========================================================================
    if (actionCompanion === 'account-information') {
      const storedCount = memorySms.filter(s => s.status === 'approved').length
      const usedCount = memorySms.filter(s => s.status === 'used').length
      const errorCount = memorySms.filter(s => s.status === 'error').length

      return NextResponse.json({
        status: 'true',
        fullname: "Bob's Satellite Kitchen Admin",
        email: 'admin@bobs.com',
        stored_count: storedCount,
        used_count: usedCount,
        error_count: errorCount,
        stored: memorySms.filter(s => s.status === 'approved').slice(0, 20),
        used: memorySms.filter(s => s.status === 'used').slice(0, 20),
        error: memorySms.filter(s => s.status === 'error').slice(0, 20),
      })
    }

    // =========================================================================
    // 3. ANDROID COMPANION: SMS TRANSMIT BULK (When SMS arrives on phone)
    // =========================================================================
    if (actionCompanion === 'sms-transmit-bulk') {
      const rawSmsList = body.sms_list || body.smsList || []
      let smsList: any[] = []

      if (typeof rawSmsList === 'string') {
        try {
          smsList = JSON.parse(rawSmsList)
        } catch {
          smsList = []
        }
      } else if (Array.isArray(rawSmsList)) {
        smsList = rawSmsList
      }

      const nowStr = new Date().toISOString()

      // Process each SMS message
      for (const sms of smsList) {
        const msgText = (sms.message || sms.body || '').toString()
        const sender = (sms.sender || sms.address || '').toString()
        const simslot = (sms.simSlot || sms.simslot || '1').toString()

        // Search for order ID pattern: BSK-XXXXXX
        const orderIdMatch = msgText.match(/BSK-\d{6}/i)
        let amountMatch: number | null = null

        // Try extracting amount like Rs.350 or INR 350 or ₹350
        const amtRegex = /(?:Rs\.?|INR|₹|\bRs)\s*([\d,]+(?:\.\d{2})?)/i
        const amtFound = msgText.match(amtRegex)
        if (amtFound) {
          amountMatch = parseFloat(amtFound[1].replace(/,/g, ''))
        }

        // Try extracting UTR / UPI Ref ID
        const utrMatch = msgText.match(/(?:UPI Ref|UTR|Ref No|Txn ID|Ref)\s*:?[\s-]*(\d{10,14})/i)
        const utr = utrMatch ? utrMatch[1] : `UPI-${Date.now().toString().slice(-6)}`

        let status: 'approved' | 'used' | 'error' = 'approved'

        if (orderIdMatch) {
          const orderId = orderIdMatch[0].toUpperCase()
          // Update order status in Supabase
          try {
            const { data: updated } = await supabase
              .from('orders')
              .update({
                status: 'PAID',
                upi_transaction_id: utr,
                paid_at: nowStr,
                webhook_payload: sms,
              })
              .eq('order_id', orderId)
              .select()

            if (updated && updated.length > 0) {
              status = 'used'
              console.log(`[PipraPay Companion] 💰 Order ${orderId} verified and paid via SMS!`)
            }
          } catch (err) {
            console.error('[PipraPay Companion] Error updating order in Supabase:', err)
          }
        }

        // Add to SMS log
        const newSmsEntry = {
          id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sender,
          message: msgText,
          simslot,
          amount: amountMatch || undefined,
          trx_id: utr,
          status,
          created_date: nowStr,
        }
        memorySms.unshift(newSmsEntry)
        if (memorySms.length > 100) memorySms.pop()

        // Also attempt saving to Supabase if table exists
        try {
          await supabase.from('pp_sms_data').insert({
            sender,
            message: msgText,
            simslot,
            amount: amountMatch,
            trx_id: utr,
            status,
            created_at: nowStr,
          })
        } catch {}
      }

      return NextResponse.json({
        status: 'true',
        title: 'SMS Data Created',
        message: 'The sms data has been created successfully.',
      })
    }

    // =========================================================================
    // 4. DIRECT WEBHOOK PAYLOAD (Custom or Third-Party Integration)
    // =========================================================================
    const { message, amount, reference, raw_text } = body
    const searchTarget = message || raw_text || body.text || ''

    if (searchTarget) {
      const orderIdMatch = searchTarget.match(/BSK-\d{6}/i)
      const nowStr = new Date().toISOString()

      if (orderIdMatch) {
        const orderId = orderIdMatch[0].toUpperCase()
        await supabase
          .from('orders')
          .update({
            status: 'PAID',
            upi_transaction_id: reference || null,
            webhook_payload: body,
            paid_at: nowStr,
          })
          .eq('order_id', orderId)

        return NextResponse.json({
          status: 'success',
          matched: true,
          verified: true,
          order_id: orderId,
          message: `Order ${orderId} marked as PAID`,
        })
      }
    }

    // Default health response
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/piprapay-webhook',
      method: 'POST',
      description: "PipraPay webhook & Companion App receiver for Bob's Satellite Kitchen",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[PipraPay Handler] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 })
  }
}
