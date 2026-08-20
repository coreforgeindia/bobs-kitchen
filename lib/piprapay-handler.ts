import { supabase } from './supabase'

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

export type PipraSmsItem = {
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

// In-memory cache for fast local access
let memoryDevices: PipraDevice[] = [
  {
    id: 'dev_init_1',
    device_id: 'DEV-1001',
    otp: 'BOB789',
    name: 'Primary Android Companion',
    model: 'Android Phone',
    android_level: 'Android 14',
    app_version: 'v1.4',
    status: 'processing',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    last_sync: '--',
  }
]

let memorySms: PipraSmsItem[] = []

export function getMemoryDevices(): PipraDevice[] {
  return memoryDevices
}

export function getMemorySms(): PipraSmsItem[] {
  return memorySms
}

export function createNewPairingOtp(otpOverride?: string): PipraDevice {
  const otp = otpOverride || `BOB${Math.floor(100 + Math.random() * 900)}`
  const newDev: PipraDevice = {
    id: `dev_${Date.now()}`,
    device_id: `DEV-${Math.floor(1000 + Math.random() * 9000)}`,
    otp,
    name: 'Android Device',
    model: 'Waiting for connection...',
    android_level: '--',
    app_version: '--',
    status: 'processing',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    last_sync: '--',
  }
  memoryDevices = [newDev, ...memoryDevices.filter(d => d.status === 'used')]
  return newDev
}

/**
 * Universal PipraPay Companion Protocol Handler
 * Compatible with official PipraPay Companion Android App (action=login, action=account-information, action=sms-transmit-bulk, action=sms-transmit)
 */
export async function processCompanionPayload(body: Record<string, any>): Promise<{ status: number; body: Record<string, any> }> {
  try {
    const action = (body.action || body['action-companion'] || body.action_companion || '').toString().trim()

    // -------------------------------------------------------------------------
    // 1. ACTION: LOGIN (Device Pairing via OTP)
    // -------------------------------------------------------------------------
    if (action === 'login') {
      const onetimepassword = (body.onetimepassword || body.password || body.otp || '').toString().trim().toUpperCase()
      const name = (body.name || 'Android Phone').toString()
      const model = (body.model || 'Android Device').toString()
      const android_level = (body.android_level || body.androidLevel || 'Android').toString()
      const app_version = (body.app_version || body.appVersion || 'v1.4').toString()

      if (!onetimepassword) {
        return {
          status: 200,
          body: {
            status: 'false',
            title: 'Incomplete Information',
            message: 'Please provide the One-Time Password / Pairing code.',
          },
        }
      }

      // Issue companion session token
      const newToken = `tok_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`
      const nowStr = new Date().toISOString()
      const deviceId = `DEV-${Math.floor(1000 + Math.random() * 9000)}`

      const updatedDevice: PipraDevice = {
        id: `dev_${Date.now()}`,
        device_id: deviceId,
        otp: newToken,
        name: name || 'Android Phone',
        model: model || 'Android Device',
        android_level: android_level || 'Android',
        app_version: app_version || 'v1.4',
        status: 'used',
        created_date: nowStr,
        updated_date: nowStr,
        last_sync: nowStr,
      }

      memoryDevices = [updatedDevice, ...memoryDevices.filter(d => d.otp !== newToken)]

      // Save to Supabase
      try {
        await supabase.from('pp_devices').upsert({
          device_id: deviceId,
          otp: newToken,
          name: name || 'Android Phone',
          model: model || 'Android Device',
          android_level: android_level || 'Android',
          app_version: app_version || 'v1.4',
          status: 'used',
          last_sync: nowStr,
          updated_at: nowStr,
        }, { onConflict: 'device_id' })
      } catch {}

      console.log(`[PipraPay] ✅ Companion device paired successfully: ${name} (${model}) -> token: ${newToken}`)

      return {
        status: 200,
        body: {
          status: 'true',
          token: newToken,
        },
      }
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: ACCOUNT INFORMATION (Heartbeat / Sync)
    // -------------------------------------------------------------------------
    if (action === 'account-information') {
      const token = (body.token || body.otp || '').toString().trim()
      const nowStr = new Date().toISOString()

      // Update device last_sync
      if (token) {
        const d = memoryDevices.find(dev => dev.otp === token)
        if (d) {
          d.last_sync = nowStr
          try {
            await supabase.from('pp_devices').update({ last_sync: nowStr }).eq('otp', token)
          } catch {}
        }
      }

      const storedList = memorySms.filter(s => s.status === 'approved').slice(0, 20)
      const usedList = memorySms.filter(s => s.status === 'used').slice(0, 20)
      const errorList = memorySms.filter(s => s.status === 'error').slice(0, 20)

      return {
        status: 200,
        body: {
          status: 'true',
          fullname: "Bob's Satellite Kitchen",
          email: 'admin@bobskitchen.shop',
          stored_count: storedList.length,
          used_count: usedList.length,
          error_count: errorList.length,
          stored: storedList,
          used: usedList,
          error: errorList,
        },
      }
    }

    // -------------------------------------------------------------------------
    // 3. ACTION: SMS TRANSMIT BULK / SINGLE (Incoming Bank / UPI SMS from Android)
    // -------------------------------------------------------------------------
    if (action === 'sms-transmit-bulk' || action === 'sms-transmit') {
      const token = (body.token || '').toString().trim()
      let smsItems: Array<{ sender?: string; message?: string; simslot?: string; timestamp?: string }> = []

      if (body.sms_list) {
        try {
          smsItems = typeof body.sms_list === 'string' ? JSON.parse(body.sms_list) : body.sms_list
        } catch {
          smsItems = []
        }
      } else if (body.message || body.sender) {
        smsItems = [{
          sender: body.sender || 'BANK-SMS',
          message: body.message || body.text || '',
          simslot: body.simslot || '1',
          timestamp: body.timestamp || new Date().toISOString(),
        }]
      }

      const nowStr = new Date().toISOString()

      for (const item of smsItems) {
        const rawMessage = item.message || ''
        const sender = item.sender || 'UPI-NOTIF'

        // Check for Amount in SMS (e.g., "credited by Rs. 232.00" or "received INR 232")
        const amountMatch = rawMessage.match(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i) || rawMessage.match(/credited.*?([\d,]+\.?\d*)/i)
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined

        // Check for UPI Reference / UTR Number
        const utrMatch = rawMessage.match(/(?:upi\s*ref|rrn|txn|ref\s*no|utr)[:\s]*([0-9a-zA-Z]{6,16})/i)
        const trxId = utrMatch ? utrMatch[1] : `TXN${Date.now().toString().slice(-6)}`

        // Check for Order ID (BSK-XXXXXX)
        const orderIdMatch = rawMessage.match(/BSK-\d{6}/i)
        const orderId = orderIdMatch ? orderIdMatch[0].toUpperCase() : null

        // Add to memory SMS
        const smsRecord: PipraSmsItem = {
          id: `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          sender,
          message: rawMessage,
          simslot: item.simslot || '1',
          amount,
          trx_id: trxId,
          status: 'approved',
          reason: orderId ? `Matched ${orderId}` : '--',
          created_date: nowStr,
        }
        memorySms.unshift(smsRecord)

        // Persist SMS to Supabase
        try {
          await supabase.from('pp_sms_data').insert({
            sender,
            message: rawMessage,
            simslot: item.simslot || '1',
            amount,
            trx_id: trxId,
            status: 'approved',
            reason: orderId ? `Matched ${orderId}` : '--',
          })
        } catch {}

        // If matched order ID or amount matches recent pending order, mark as PAID
        try {
          if (orderId) {
            await supabase
              .from('orders')
              .update({
                status: 'PAID',
                upi_transaction_id: trxId,
                paid_at: nowStr,
              })
              .eq('order_id', orderId)
            console.log(`[PipraPay] 🎉 Auto-Reconciled Order ${orderId} as PAID via Bank SMS!`)
          } else if (amount && amount > 0) {
            // Find recent pending order with matching amount within last 10 minutes
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
            const { data: pendingOrders } = await supabase
              .from('orders')
              .select('order_id, amount')
              .eq('status', 'PENDING')
              .gte('created_at', tenMinsAgo)
              .order('created_at', { ascending: false })

            const matchedOrder = pendingOrders?.find(o => Math.abs(Number(o.amount) - amount) < 1)
            if (matchedOrder) {
              await supabase
                .from('orders')
                .update({
                  status: 'PAID',
                  upi_transaction_id: trxId,
                  paid_at: nowStr,
                })
                .eq('order_id', matchedOrder.order_id)
              console.log(`[PipraPay] 🎉 Auto-Reconciled Order ${matchedOrder.order_id} by Amount ₹${amount} as PAID!`)
            }
          }
        } catch (dbErr) {
          console.error('[PipraPay] Order reconciliation error:', dbErr)
        }
      }

      return {
        status: 200,
        body: {
          status: 'true',
          title: 'SMS Data Created',
          message: 'The sms data has been created successfully.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 4. DIRECT WEBHOOK (JSON payload with message / raw_text)
    // -------------------------------------------------------------------------
    const { message, raw_text, text } = body
    const msgText = message || raw_text || text || ''

    if (msgText) {
      const orderIdMatch = msgText.match(/BSK-\d{6}/i)
      const nowStr = new Date().toISOString()

      if (orderIdMatch) {
        const orderId = orderIdMatch[0].toUpperCase()
        try {
          await supabase
            .from('orders')
            .update({
              status: 'PAID',
              upi_transaction_id: body.reference || body.trx_id || null,
              paid_at: nowStr,
              webhook_payload: body,
            })
            .eq('order_id', orderId)
        } catch {}

        return {
          status: 200,
          body: {
            status: 'true',
            matched: true,
            order_id: orderId,
            message: `Order ${orderId} marked as PAID`,
          },
        }
      }
    }

    // Default Fallback JSON
    return {
      status: 200,
      body: {
        status: 'true',
        endpoint: '/api/piprapay-companion',
        description: "Bob's Satellite Kitchen PipraPay Receiver",
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error: any) {
    return {
      status: 500,
      body: {
        status: 'false',
        message: error?.message || 'Server error',
      },
    }
  }
}
