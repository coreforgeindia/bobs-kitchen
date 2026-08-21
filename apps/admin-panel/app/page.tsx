'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Truck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AdminDashboard } from '../components/admin/admin-dashboard'

const DEFAULT_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com'
const DEFAULT_ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin@1234'
const DEFAULT_DELIVERY_EMAIL = process.env.NEXT_PUBLIC_DELIVERY_EMAIL || 'delivery@bobs.com'
const DEFAULT_DELIVERY_PASS = process.env.NEXT_PUBLIC_DELIVERY_PASSWORD || 'delivery@1234'

export default function Page() {
  const [authed, setAuthed] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [role, setRole] = useState<'admin' | 'delivery'>('admin')
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL)
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASS)

  useEffect(() => {
    const expiresAt = Number(localStorage.getItem('bobs-admin-session-expires') || 0)
    if (expiresAt > Date.now()) setAuthed(true)
    else localStorage.removeItem('bobs-admin-session-expires')
    setSessionReady(true)
  }, [])

  if (!sessionReady) return null

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 select-none font-outfit">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-4">
            {role === 'admin' ? <ShieldCheck size={32} /> : <Truck size={32} />}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
            {role === 'admin' ? 'Restricted Staff Access' : 'Delivery Fleet Access'}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-black text-slate-900">
            {role === 'admin' ? 'Staff Command Portal' : 'Delivery Partner Portal'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Log in with staff credentials to manage satellite kitchen operations & live order dispatches.
          </p>

          <div className="mt-4 flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setRole('admin')
                setEmail(DEFAULT_ADMIN_EMAIL)
                setPassword(DEFAULT_ADMIN_PASS)
              }}
              className={`flex-1 rounded-xl py-2 transition-all ${
                role === 'admin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kitchen Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('delivery')
                setEmail(DEFAULT_DELIVERY_EMAIL)
                setPassword(DEFAULT_DELIVERY_PASS)
              }}
              className={`flex-1 rounded-xl py-2 transition-all ${
                role === 'delivery' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Delivery Partner
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const validAdmin = email.trim() === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASS
              const validDelivery = email.trim() === DEFAULT_DELIVERY_EMAIL && password === DEFAULT_DELIVERY_PASS

              if (validAdmin || validDelivery) {
                setAuthed(true);
                localStorage.setItem('bobs-admin-session-expires', String(Date.now() + 8 * 60 * 60 * 1000));
                toast.success(`Welcome back, ${role === 'admin' ? 'Admin' : 'Rider'}! 🍔`);
              } else {
                toast.error('Invalid credentials');
              }
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Email Address</label>
              <input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-slate-900 font-semibold" 
                placeholder="Email" 
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">Password</label>
              <input 
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:border-orange-500 focus:outline-none transition-all text-slate-900 font-semibold" 
                placeholder="Password" 
                required
              />
            </div>

            <button 
              type="submit"
              className="mt-2 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all cursor-pointer text-sm"
            >
              Enter {role === 'admin' ? 'Operations' : 'Delivery'} Dashboard
            </button>
          </form>
          
          <p className="mt-5 text-center text-[11px] text-slate-400">
            Default: {role === 'admin' ? `${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASS}` : `${DEFAULT_DELIVERY_EMAIL} / ${DEFAULT_DELIVERY_PASS}`}
          </p>
        </div>
      </main>
    )
  }

  return <AdminDashboard />
}
