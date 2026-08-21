'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8 font-outfit select-none">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <AlertCircle size={36} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">404 Error</p>
        <h1 className="font-serif text-3xl font-black text-slate-900">Feast Not Found.</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          The page you are looking for has flown out of our 3 km satellite delivery zone or does not exist. Let's get you back to the kitchen!
        </p>

        <div className="pt-2">
          <Link 
            href="/"
            className="inline-flex w-full justify-center items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-extrabold text-white shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            ← Back to Menu
          </Link>
        </div>
      </div>
    </main>
  )
}
