'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, ExternalLink, LockKeyhole, LogOut, MapPin, Phone, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type DeliveryMode = 'Delivery' | 'Takeaway'
type DeliveryOrder = {
  id: string
  mode: DeliveryMode
  status: string
  customerName: string
  customerPhone: string
  address: string
  items: { id: string; name: string; quantity: number; veg: boolean }[]
  total: number
}

const DELIVERY_EMAIL = 'delivery@bobskitchen.shop'
const DELIVERY_PASSWORD = 'delivery@1234'

function normalizeStatus(status: unknown) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'paid' || value === 'pending') return 'Order Received'
  if (value === 'restaurant accepted' || value === 'accepted' || value === 'confirmed') return 'Accept Order'
  if (value === 'preparing food') return 'Preparing'
  if (value === 'ready for pickup' || value === 'ready to pick up') return 'Ready for Pickup'
  if (value === 'out for delivery' || value === 'out_for_delivery') return 'Out For Delivery'
  if (value === 'delivery partner assigned' || value === 'assigned') return 'Delivery Partner Assigned'
  return String(status || 'Order Received')
}

function mapOrder(row: any): DeliveryOrder {
  return {
    id: row.order_id || row.id,
    mode: row.order_mode === 'Takeaway' ? 'Takeaway' : 'Delivery',
    status: normalizeStatus(row.status),
    customerName: row.customer_name || 'Customer',
    customerPhone: row.customer_phone || '',
    address: row.delivery_address || 'Address not provided',
    items: Array.isArray(row.items) ? row.items.map((item: any, index: number) => ({
      id: item.id || `${row.order_id}-${index}`,
      name: item.name || 'Menu item',
      quantity: Number(item.qty || item.quantity || 1),
      veg: typeof item.veg === 'boolean' ? item.veg : !/(chicken|meat|egg|tikka|jalfrezi)/i.test(String(item.name || '')),
    })) : [],
    total: Number(row.amount || 0),
  }
}

export function DeliveryPortal() {
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [email, setEmail] = useState(DELIVERY_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DeliveryMode>('Delivery')
  const [orders, setOrders] = useState<DeliveryOrder[]>([])

  useEffect(() => {
    const expiresAt = Number(localStorage.getItem('bobs-delivery-session-expires') || 0)
    if (expiresAt > Date.now()) setAuthenticated(true)
    else localStorage.removeItem('bobs-delivery-session-expires')
    setSessionReady(true)
  }, [])

  useEffect(() => {
    if (!authenticated) return
    const loadOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (data) setOrders(data.map(mapOrder))
    }
    loadOrders()
    const channel = supabase.channel('delivery-portal-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [authenticated])

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('order_id', orderId)
    if (error) {
      setError(`Could not update order: ${error.message}`)
      return
    }
    setOrders((currentOrders) => currentOrders.map((order) => order.id === orderId ? { ...order, status } : order))
  }

  const activeOrders = orders.filter((order) => {
    if (order.mode !== mode || ['Delivered', 'Picked Up'].includes(order.status)) return false
    return mode === 'Takeaway'
      ? order.status === 'Ready for Pickup'
      : ['Ready for Pickup', 'Delivery Partner Assigned', 'Out For Delivery'].includes(order.status)
  })

  const nextStatus = (order: DeliveryOrder) => {
    if (order.status === 'Ready for Pickup') return 'Picked Up'
    if (order.status === 'Picked Up') return 'Out For Delivery'
    return 'Delivered'
  }

  const nextStatusLabel = (order: DeliveryOrder) => {
    if (order.status === 'Ready for Pickup') return 'Mark Picked Up'
    if (order.status === 'Picked Up') return 'Start Delivery'
    return 'Mark Delivered'
  }

  if (!sessionReady) return null

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 font-outfit">
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white"><Truck size={24} /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Bob&apos;s Kitchen</p>
          <h1 className="mt-1 text-3xl font-black">Delivery Portal</h1>
          <p className="mt-2 text-xs text-slate-400">Sign in to view assigned orders.</p>
          <form onSubmit={(event) => { event.preventDefault(); if (email.trim().toLowerCase() === DELIVERY_EMAIL && password === DELIVERY_PASSWORD) { setAuthenticated(true); localStorage.setItem('bobs-delivery-session-expires', String(Date.now() + 3 * 60 * 60 * 1000)); setError('') } else setError('Invalid delivery credentials') }} className="mt-6 space-y-3">
            <label className="block text-xs font-bold text-slate-300">Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:border-orange-500" required /></label>
            <label className="block text-xs font-bold text-slate-300">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:border-orange-500" required /></label>
            {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:bg-orange-600"><LockKeyhole size={16} /> Sign In</button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-8 font-outfit text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{DELIVERY_EMAIL}</p><h1 className="text-xl font-black">Delivery Portal</h1></div>
          <button onClick={() => { setAuthenticated(false); localStorage.removeItem('bobs-delivery-session-expires') }} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black text-slate-500 hover:bg-slate-100"><LogOut size={15} /> Sign out</button>
        </div>
      </header>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 rounded-xl bg-white p-1 shadow-sm">
          {(['Delivery', 'Takeaway'] as DeliveryMode[]).map((itemMode) => <button key={itemMode} onClick={() => setMode(itemMode)} className={`rounded-lg py-3 text-xs font-black ${mode === itemMode ? itemMode === 'Delivery' ? 'bg-orange-500 text-white' : 'bg-cyan-500 text-white' : 'text-slate-600'}`}>{itemMode} ({orders.filter((order) => order.mode === itemMode && !['Delivered', 'Picked Up'].includes(order.status) && (itemMode === 'Takeaway' ? order.status === 'Ready for Pickup' : ['Ready for Pickup', 'Delivery Partner Assigned', 'Out For Delivery'].includes(order.status))).length})</button>)}
        </div>
        {activeOrders.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">No active {mode.toLowerCase()} orders.</div> : activeOrders.map((order) => <details key={order.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${mode === 'Delivery' ? 'border-orange-200' : 'border-cyan-200'}`}>
          <summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-sm font-black">#{order.id}</p><p className="mt-1 text-xs font-bold text-slate-700">{order.customerName} · {order.customerPhone || 'No phone'}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{order.status}</span></div></summary>
          <div className="mt-3 border-t border-slate-200 pt-3"><p className="flex gap-1.5 text-xs text-slate-600"><MapPin size={14} className="shrink-0 text-orange-500" />{order.address}</p><div className="mt-3 space-y-1 text-xs font-semibold">{order.items.map((item) => <p key={item.id}>{item.quantity}x {item.name} <span className={item.veg ? 'text-emerald-700' : 'text-rose-700'}>({item.veg ? 'Veg' : 'Non-Veg'})</span></p>)}</div><div className="mt-4 flex gap-2"><a href={`tel:${order.customerPhone}`} className="flex-1 rounded-lg bg-slate-900 px-3 py-3 text-center text-xs font-black text-white"><Phone size={14} className="mr-1 inline" />Call</a>{mode === 'Delivery' && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-orange-500 px-3 py-3 text-center text-xs font-black text-white"><ExternalLink size={14} className="mr-1 inline" />Directions</a>}<button onClick={() => updateOrderStatus(order.id, nextStatus(order))} className={`flex-1 rounded-lg px-3 py-3 text-center text-xs font-black text-white ${mode === 'Delivery' ? 'bg-emerald-600' : 'bg-cyan-600'}`}><CheckCircle2 size={14} className="mr-1 inline" />{nextStatusLabel(order)}</button></div></div>
        </details>)}
      </div>
    </main>
  )
}
