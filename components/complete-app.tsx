'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ClipboardList, LayoutDashboard, Package, ShieldCheck, Settings } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatPrice } from '@/lib/menu-data'
import { useAppStore } from '@/lib/store'
import { RestaurantApp } from './restaurant-app'

const statuses = [
  'Order Received', 
  'Restaurant Accepted', 
  'Preparing', 
  'Packed', 
  'Delivery Partner Assigned', 
  'Picked Up', 
  'Out For Delivery', 
  'Delivered'
]

function AccountPanel({ onBack }: { onBack: () => void }) {
  const orders = useAppStore((s) => s.orders)
  const favorites = useAppStore((s) => s.favorites)
  const user = useAppStore((s) => s.user)
  const login = useAppStore((s) => s.login)
  const [register, setRegister] = useState(false)

  if (!user) {
    return (
      <section className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-500">
          <ArrowLeft size={16} /> Back to Kitchen
        </button>
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
            {register ? 'Join the satellite crew' : 'Welcome Back'}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-black">
            {register ? 'Create Account.' : 'Sign In.'}
          </h1>

          <div className="mt-6 flex flex-col gap-3">
            <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" placeholder="Email address" />
            <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" placeholder="Password" type="password" />
            {register && <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" placeholder="Your Full Name" />}
          </div>

          <button 
            onClick={() => { 
              login(register ? 'Bob Fan' : 'Guest Foodie', 'guest@example.com'); 
              toast.success('Welcome to Bob’s Satellite Kitchen! 🍔') 
            }} 
            className="mt-5 w-full rounded-full bg-orange-500 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-600 transition-all"
          >
            {register ? 'Create Account' : 'Sign In'}
          </button>

          <button 
            onClick={() => setRegister(!register)} 
            className="mt-4 w-full text-xs font-semibold text-muted-foreground underline hover:text-foreground text-center"
          >
            {register ? 'Already have an account? Sign in' : 'New foodie? Create an account'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-500">
        <ArrowLeft size={16} /> Back to Kitchen
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Your Satellite Profile</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-black">Hey, {user.name}.</h1>
        </div>
        <span className="rounded-full bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-600 w-fit">
          ❤️ {favorites.length} Saved Favorites
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow">
          <ClipboardList className="text-orange-400" />
          <p className="mt-4 font-serif text-3xl font-black">{orders.length}</p>
          <p className="text-xs text-primary-foreground/60">Total Orders Placed</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <Package className="text-orange-500" />
          <p className="mt-4 font-serif text-3xl font-black">{formatPrice(orders.reduce((s, o) => s + o.total, 0))}</p>
          <p className="text-xs text-muted-foreground">Lifetime Spend</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <Settings className="text-orange-500" />
          <p className="mt-4 font-serif text-3xl font-black">1</p>
          <p className="text-xs text-muted-foreground">Default Delivery Address</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-serif text-xl sm:text-2xl font-bold">Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">Your order history will appear here once you place a feast.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col justify-between gap-3 rounded-xl bg-secondary/80 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-sm">#{order.id} · <span className="text-xs text-orange-600 font-extrabold">{order.mode}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-black text-sm">{formatPrice(order.total)}</p>
                  <span className="inline-block rounded-md bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-600 mt-1">
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

import { AdminDashboard } from './admin/admin-dashboard'

function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('admin@gmail.com')
  const [password, setPassword] = useState('admin@1234')

  if (!authed) {
    return (
      <section className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-8">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-4">
            <ShieldCheck size={32} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Restricted Staff Access</p>
          <h1 className="mt-1 font-serif text-3xl font-black">Staff Command Portal</h1>
          <p className="mt-1 text-xs text-muted-foreground">Log in with staff credentials to manage satellite kitchen operations & GPS tracking.</p>

          <div className="mt-6 space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-muted-foreground">Admin Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" placeholder="Email" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-muted-foreground">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-orange-500 focus:outline-none" type="password" placeholder="Password" />
            </div>
          </div>
          <button 
            onClick={() => email === 'admin@gmail.com' && password === 'admin@1234' ? setAuthed(true) : toast.error('Invalid admin credentials')} 
            className="mt-5 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all"
          >
            Enter Operations Dashboard
          </button>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">Authorized Bob&apos;s Kitchen staff only (Default: admin@gmail.com / admin@1234)</p>
        </div>
      </section>
    )
  }

  return <AdminDashboard />
}

function SimpleBar({ onNavigate, admin = false }: { onNavigate: (page: 'home' | 'account') => void; admin?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <button onClick={() => onNavigate('home')} className="font-serif text-lg sm:text-xl font-black">
          BOB&apos;S <span className="text-orange-500">SATELLITE</span>
        </button>
        {!admin ? (
          <button onClick={() => onNavigate('account')} className="rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-secondary">
            Sign In / Sign Up
          </button>
        ) : (
          <a href="/" className="rounded-full bg-orange-500/10 border border-orange-500/30 px-4 py-2 text-xs font-extrabold text-orange-500 hover:bg-orange-500 hover:text-white transition-all">
            ← Switch to User Menu
          </a>
        )}
      </div>
    </header>
  )
}

export function CompleteApp() {
  const [page, setPage] = useState<'home' | 'account'>('home')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(window.location.pathname === '/admin')
  }, [])

  if (isAdmin) {
    return <AdminPanel />
  }

  if (page === 'account') {
    return (
      <>
        <SimpleBar onNavigate={setPage} />
        <AccountPanel onBack={() => setPage('home')} />
      </>
    )
  }

  return <RestaurantApp onAccount={() => setPage('account')} />
}

