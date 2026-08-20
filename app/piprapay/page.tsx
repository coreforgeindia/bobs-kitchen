'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, UPI_CONFIG } from '@/lib/supabase'
import QRCode from 'qrcode'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import {
  Home, QrCode, MessageSquare, CreditCard,
  Settings, Store, Plus, Copy, Check, RefreshCw,
  Trash2, AlertCircle, CheckCircle2, Clock, Smartphone,
  Activity, ArrowUpRight, Filter, Search, User, ShieldCheck,
  Zap, ChevronDown, ExternalLink, Send, ArrowLeft
} from 'lucide-react'

type TabType = 'dashboard' | 'devices' | 'sms-data' | 'transactions' | 'gateways' | 'simulator'

export default function PipraPayDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [baseUrl, setBaseUrl] = useState('')
  const [currentOtp, setCurrentOtp] = useState('BOB789')
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [connectQrUrl, setConnectQrUrl] = useState('')
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const [loading, setLoading] = useState(true)

  // Live state
  const [orders, setOrders] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [smsList, setSmsList] = useState<any[]>([])

  // Simulator state
  const [simSender, setSimSender] = useState('AX-HDFCBK')
  const [simOrderId, setSimOrderId] = useState('')
  const [simAmount, setSimAmount] = useState('240.00')
  const [simSimSlot, setSimSimSlot] = useState('1')
  const [simulating, setSimulating] = useState(false)

  // Initialize Base URL on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.protocol}//${window.location.host}`
      setBaseUrl(url)
    }
  }, [])

  // Fetch orders, devices, and SMS logs
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Supabase Orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (orderData) {
        setOrders(orderData)
        if (orderData.length > 0 && !simOrderId) {
          const pending = orderData.find(o => o.status === 'PENDING')
          if (pending) {
            setSimOrderId(pending.order_id)
            setSimAmount(Number(pending.amount).toFixed(2))
          } else {
            setSimOrderId(orderData[0].order_id)
          }
        }
      }

      // 2. Fetch Companion devices & SMS directly from Supabase
      try {
        const { data: dbDevs } = await supabase
          .from('pp_devices')
          .select('*')
          .order('created_at', { ascending: false })
        if (dbDevs && dbDevs.length > 0) setDevices(dbDevs)

        const { data: dbSms } = await supabase
          .from('pp_sms_data')
          .select('*')
          .order('created_at', { ascending: false })
        if (dbSms && dbSms.length > 0) setSmsList(dbSms)
      } catch (e) {
        // Silent catch for local mode
      }

    } catch (err) {
      console.error('Error loading PipraPay data:', err)
    } finally {
      setLoading(false)
    }
  }, [simOrderId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Generate pairing QR code when modal opens or OTP changes
  const updateConnectQr = useCallback(async (url: string, otp: string) => {
    if (!url || !otp) return
    const qrPayload = `${url}----${otp}`
    try {
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 220,
        margin: 1,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      setConnectQrUrl(dataUrl)
    } catch (err) {
      console.error('QR generation error:', err)
    }
  }, [])

  const handleOpenConnectModal = async () => {
    try {
      const res = await fetch('/api/piprapay-companion?action=new-otp')
      const data = await res.json()
      const otp = data.otp || currentOtp
      setCurrentOtp(otp)
      updateConnectQr(baseUrl, otp)
    } catch {
      updateConnectQr(baseUrl, currentOtp)
    }
    setConnectModalOpen(true)
  }

  const handleRegenerateOtp = async () => {
    try {
      const res = await fetch('/api/piprapay-companion?action=new-otp')
      const data = await res.json()
      if (data.otp) {
        setCurrentOtp(data.otp)
        updateConnectQr(baseUrl, data.otp)
        toast.success(`New One-Time Password generated: ${data.otp}`)
      }
    } catch {
      const newOtp = Math.random().toString(36).substring(2, 8).toUpperCase()
      setCurrentOtp(newOtp)
      updateConnectQr(baseUrl, newOtp)
      toast.success(`Generated: ${newOtp}`)
    }
  }

  const handleCopy = (text: string, type: 'url' | 'otp') => {
    navigator.clipboard?.writeText?.(text)
    if (type === 'url') {
      setCopiedBaseUrl(true)
      setTimeout(() => setCopiedBaseUrl(false), 2000)
      toast.success('Base URL copied to clipboard!')
    } else {
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 2000)
      toast.success('One-Time Password copied!')
    }
  }

  // Simulate incoming SMS payment from companion app
  const handleSimulateSms = async () => {
    if (!simOrderId) return toast.error('Please enter an Order ID')
    setSimulating(true)

    const utr = `${Math.floor(100000000000 + Math.random() * 900000000000)}`
    const fakeMessage = `Dear Customer, your A/c has been credited with INR ${simAmount} on ${new Date().toLocaleDateString('en-GB')} via UPI from 9876543210 for Order ${simOrderId} (UPI Ref: ${utr}).`

    try {
      const res = await fetch('/api/piprapay-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'action-companion': 'sms-transmit-bulk',
          token: currentOtp,
          sms_list: [
            {
              id: `${Date.now()}`,
              sender: simSender,
              message: fakeMessage,
              simSlot: simSimSlot,
              timestamp: new Date().toISOString(),
            }
          ]
        })
      })

      const data = await res.json()
      if (data.status === 'true' || data.status === 'success' || data.matched) {
        toast.success(`✅ Payment verified for ${simOrderId}! Order marked as PAID.`)
        fetchData()
      } else {
        toast.success('SMS transmitted to PipraPay log.')
        fetchData()
      }
    } catch {
      toast.error('Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  // Stats calculation
  const totalPayments = orders.length
  const paidOrders = orders.filter(o => o.status === 'PAID')
  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0)

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#1e293b] font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. PIPRAPAY HEADER NAVBAR                                                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/piprapay" className="flex items-center gap-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-8Cr2WCcP9wuThinpGdLL4Uy5dCY9Ri.png"
                alt="Bob's Satellite Logo"
                className="size-10 rounded-2xl object-cover ring-2 ring-orange-500/40 shadow-sm"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                  BOB&apos;S <span className="text-orange-600">SATELLITE KITCHEN</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                  Automated UPI Payment Engine · PipraPay
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Companion Server Online</span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenConnectModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Smartphone size={15} />
              <span>Connect Device</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              <Store size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Bob&apos;s Kitchen Front</span>
            </Link>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                BK
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">Bob&apos;s Satellite</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Admin Portal</p>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN LAYOUT (SIDEBAR + CONTENT)                                        */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="md:col-span-3 lg:col-span-3 space-y-4">
          
          {/* Active Brand Selector Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black text-sm">
                🍔
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">Bob&apos;s Satellite</p>
                <p className="text-[10px] text-emerald-600 font-bold">● Active brand</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xs space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'devices', label: 'Devices (Android)', icon: Smartphone, badge: devices.filter(d => d.status === 'used').length },
              { id: 'sms-data', label: 'SMS Data Feed', icon: MessageSquare, badge: smsList.length },
              { id: 'transactions', label: 'Transactions', icon: CreditCard, badge: orders.length },
              { id: 'gateways', label: 'Gateways (UPI)', icon: Zap },
              { id: 'simulator', label: 'SMS Simulator Tool', icon: Send },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Android Companion App Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
              <Smartphone size={16} />
              <span>PipraPay Companion App</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Install the companion APK on an Android phone with your bank SIM to automate UPI payments.
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=com.qubeplug.billpax_tools"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
            >
              <span>Download on Google Play</span>
              <ExternalLink size={12} />
            </a>
          </div>

        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="md:col-span-9 lg:col-span-9 space-y-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Dashboard</h1>
                  <p className="text-xs text-slate-500">Live payment metrics and automated SMS transaction reconciliation</p>
                </div>
                <button
                  onClick={fetchData}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Stats 4-Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Payments</span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalPayments}</p>
                  <p className="text-[11px] text-slate-500">All customer orders</p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Paid / Verified</span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600">{paidOrders.length}</p>
                  <p className="text-[11px] text-emerald-700">₹{totalRevenue.toLocaleString('en-IN')} collected</p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pending Orders</span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-600">{pendingOrders.length}</p>
                  <p className="text-[11px] text-amber-700">Awaiting UPI SMS</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Connected Devices</span>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-600">
                    {devices.filter(d => d.status === 'used').length}
                  </p>
                  <p className="text-[11px] text-slate-500">Active listeners</p>
                </div>
              </div>

              {/* Connected Device & Quick Info Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="text-indigo-600" size={18} />
                    <h3 className="font-extrabold text-sm text-slate-900">Companion Device Status</h3>
                  </div>
                  <button
                    onClick={handleOpenConnectModal}
                    className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Connect New Phone
                  </button>
                </div>

                {devices.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No phone connected yet. Click &quot;Connect Device&quot; to pair your Android device.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {devices.map((d) => (
                      <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{d.name}</p>
                          <p className="text-[11px] text-slate-500">{d.model} · {d.android_level}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Last Sync: {d.last_sync !== '--' ? new Date(d.last_sync).toLocaleTimeString() : 'Never'}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          d.status === 'used'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {d.status === 'used' ? '● Paired' : '● Awaiting'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">Recent Customer Transactions</h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No orders recorded in Supabase yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3">UPI Reference / UTR</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {orders.slice(0, 6).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.order_id}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800">{o.customer_name || 'Foodie'}</p>
                              <p className="text-[10px] text-slate-400">{o.customer_phone || '-'}</p>
                            </td>
                            <td className="py-3 px-3 font-black text-slate-900">₹{Number(o.amount).toFixed(2)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                o.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : o.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {o.status === 'PAID' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500">{o.upi_transaction_id || '—'}</td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DEVICES (AUTHENTIC PIPRAPAY DEVICE MANAGER) */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">Devices</h1>
                  <p className="text-xs text-slate-500">Manage Android companion devices running PipraPay SMS listener</p>
                </div>
                <button
                  onClick={handleOpenConnectModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Connect Device</span>
                </button>
              </div>

              {/* Devices Table Card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Device Name</th>
                        <th className="py-3 px-4">Model</th>
                        <th className="py-3 px-4">Android Level</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4">Last Sync</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {devices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No devices registered yet. Click <strong>Connect Device</strong> to pair your Android device.
                          </td>
                        </tr>
                      ) : (
                        devices.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{d.name}</td>
                            <td className="py-3.5 px-4 text-slate-600">{d.model}</td>
                            <td className="py-3.5 px-4 text-slate-600">{d.android_level}</td>
                            <td className="py-3.5 px-4 text-slate-500">{new Date(d.created_date).toLocaleDateString()}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">{d.last_sync !== '--' ? new Date(d.last_sync).toLocaleTimeString() : 'Never'}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                d.status === 'used' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {d.status === 'used' ? 'Connected' : 'Processing'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions on pairing */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900">How to Pair Your Android Phone:</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 font-medium">
                  <li>Install the <strong>PipraPay Companion App</strong> on an Android phone containing the SIM card that receives bank payment SMS.</li>
                  <li>Open the PipraPay Companion App and tap <strong>Connect Account</strong>.</li>
                  <li>Click <strong>Connect Device</strong> above and either scan the QR Code or enter the <strong>Base URL</strong> and <strong>One-Time Password</strong>.</li>
                  <li>The app will automatically begin listening for bank SMS and transmit them securely to Bob&apos;s Kitchen to verify customer orders!</li>
                </ol>
              </div>

            </div>
          )}

          {/* TAB 3: SMS DATA FEED */}
          {activeTab === 'sms-data' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">SMS Data Feed</h1>
                  <p className="text-xs text-slate-500">Live stream of incoming bank SMS parsed by the PipraPay companion engine</p>
                </div>
                <button
                  onClick={() => setActiveTab('simulator')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send Test SMS</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Sender</th>
                        <th className="py-3 px-4">SIM</th>
                        <th className="py-3 px-4">Message Body</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {smsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No SMS messages captured yet. Use the <strong>SMS Simulator Tool</strong> or pair an Android device.
                          </td>
                        </tr>
                      ) : (
                        smsList.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{s.sender}</td>
                            <td className="py-3.5 px-4 text-slate-500">SIM {s.simslot || 1}</td>
                            <td className="py-3.5 px-4 text-slate-800 max-w-xs sm:max-w-md truncate" title={s.message}>
                              {s.message}
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900">
                              {s.amount ? `₹${Number(s.amount).toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                s.status === 'used' || s.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {new Date(s.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Transactions</h1>
                <p className="text-xs text-slate-500">All customer food orders and live UPI payment verification status</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Order Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">UPI UTR</th>
                        <th className="py-3 px-4">Paid Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No orders found in database.
                          </td>
                        </tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{o.order_id}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{o.customer_name || 'Guest'}</p>
                              <p className="text-[10px] text-slate-400">{o.customer_phone || '-'}</p>
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900">₹{Number(o.amount).toFixed(2)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                o.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : o.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">{o.upi_transaction_id || '—'}</td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {o.paid_at ? new Date(o.paid_at).toLocaleTimeString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {o.status === 'PENDING' && (
                                <button
                                  onClick={async () => {
                                    await supabase.from('orders').update({ status: 'PAID', paid_at: new Date().toISOString() }).eq('order_id', o.order_id)
                                    toast.success(`Marked ${o.order_id} as PAID`)
                                    fetchData()
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 cursor-pointer"
                                >
                                  Mark Paid ✓
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GATEWAYS */}
          {activeTab === 'gateways' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Gateways</h1>
                <p className="text-xs text-slate-500">Configured payment channels and dynamic UPI routing parameters</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black text-sm">
                      UPI
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">UPI Instant Dynamic Gateway (India)</h3>
                      <p className="text-xs text-slate-400">GPay, PhonePe, Paytm, BHIM, Cred</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase">
                    Active
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Merchant VPA</span>
                    <p className="font-mono font-bold text-slate-900 mt-1">{UPI_CONFIG.vpa}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payee Name</span>
                    <p className="font-bold text-slate-900 mt-1">{UPI_CONFIG.merchantName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Currency</span>
                    <p className="font-bold text-slate-900 mt-1">{UPI_CONFIG.currency}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Automation Method</span>
                    <p className="font-bold text-indigo-600 mt-1">SMS Verification Engine (PipraPay Companion)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SMS SIMULATOR TOOL */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">SMS Simulator Tool</h1>
                <p className="text-xs text-slate-500">Test the PipraPay webhook automation engine by simulating an incoming bank SMS</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Order ID</label>
                    <input
                      value={simOrderId}
                      onChange={(e) => setSimOrderId(e.target.value)}
                      placeholder="e.g. BSK-123456"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹)</label>
                    <input
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="e.g. 240.00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sender Bank ID</label>
                    <input
                      value={simSender}
                      onChange={(e) => setSimSender(e.target.value)}
                      placeholder="e.g. AX-HDFCBK"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">SIM Slot</label>
                    <select
                      value={simSimSlot}
                      onChange={(e) => setSimSimSlot(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="1">SIM 1</option>
                      <option value="2">SIM 2</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSimulateSms}
                    disabled={simulating}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 py-3.5 text-xs font-black text-white shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    <span>{simulating ? 'Transmitting SMS...' : 'Transmit Simulated Bank Payment SMS →'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. EXACT PIPRAPAY "CONNECT DEVICE" MODAL (AS IN PIPRAPAY REPO)           */}
      {/* ========================================================================= */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <h3 className="font-black text-base text-slate-900">Connect Device</h3>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Info Alert Box (exact PipraPay style) */}
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 space-y-1">
              <p className="font-semibold">
                Download the <strong className="font-bold">PipraPay Companion App</strong> (
                <a
                  href="https://play.google.com/store/apps/details?id=com.qubeplug.billpax_tools"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-indigo-600 hover:text-indigo-800"
                >
                  Android
                </a>
                ) on your mobile device to connect it with your account.
              </p>
            </div>

            {/* QR Code Section */}
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-600 font-medium">
                Scan this QR code in your PipraPay Companion app to connect your device automatically:
              </p>

              <div className="inline-block rounded-2xl border-2 border-indigo-100 bg-white p-3 shadow-xs">
                {connectQrUrl ? (
                  <img src={connectQrUrl} alt="Connect Device QR" className="size-44 mx-auto object-contain" />
                ) : (
                  <div className="size-44 flex items-center justify-center text-xs text-slate-400 animate-pulse">
                    Generating Pairing QR...
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 font-semibold text-center">
              Or connect manually using your credentials:
            </p>

            {/* Base URL with Copy Button */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">
                Base URL <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={baseUrl}
                  readOnly
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(baseUrl, 'url')}
                  className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedBaseUrl ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedBaseUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* One-Time Password / OTP with Copy Button */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  One-Time Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateOtp}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Generate New
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={currentOtp}
                  readOnly
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-black text-indigo-600 tracking-wider focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(currentOtp, 'otp')}
                  className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedOtp ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
