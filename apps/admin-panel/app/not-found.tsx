'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 font-outfit select-none">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <ShieldAlert size={36} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">404 Error</p>
        <h1 className="font-serif text-3xl font-black text-slate-900">Admin Page Not Found</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested admin command link does not exist. Please return to the operations command dashboard.
        </p>

        <div className="pt-2">
          <Link 
            href="/"
            className="inline-flex w-full justify-center items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
