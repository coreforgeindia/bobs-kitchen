'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { 
  ArrowRight, Check, ChevronDown, ChevronUp, ChevronLeft, CreditCard, Heart, Menu as MenuIcon, 
  Minus, Plus, Search, ShoppingCart, Star, Truck, X, Utensils, Bike, 
  Copy, MapPin, Phone, User, Zap, LogOut, Lock, CheckCircle2, Package, 
  Settings, Wallet, Grid, List, LayoutGrid, AlignJustify, Navigation, 
  Bell, Globe, Compass, Home, Sparkles, HelpCircle, Tag, Info, Flame,
  QrCode, ExternalLink, MessageCircle, AlertTriangle, Clock, ArrowUpRight, Award, RefreshCw, ShieldCheck
} from 'lucide-react'
import { 
  categories, menuCategories, formatPrice, galleryImages, menuItems, specialOffers, 
  customerReviews, faqItems, calculateCoinsEarned, restaurantStats, type MenuItem 
} from '@/lib/menu-data'
import { supabase, generateUpiUri, generateOrderId, PAYMENT_TIMEOUT_SECONDS, PAYMENT_POLL_INTERVAL_MS, UPI_CONFIG } from '@/lib/supabase'
import QRCode from 'qrcode'
import { cartCount, useAppStore, type Order, type OrderMode } from '@/lib/store'
import dynamic from 'next/dynamic'

const UserMapPicker = dynamic(() => import('./user-map-picker').then((m) => m.UserMapPicker), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-3xl border border-border bg-secondary/30 text-xs font-bold text-muted-foreground animate-pulse font-outfit">
      Loading Delivery Zone Map...
    </div>
  ),
})

const LiveRoadTracker = dynamic(() => import('./live-road-tracker').then((m) => m.LiveRoadTracker), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border-2 border-orange-200 bg-orange-50/50 text-xs font-bold text-orange-600 animate-pulse font-outfit">
      Loading Live Road Route Map...
    </div>
  ),
})

const logo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-8Cr2WCcP9wuThinpGdLL4Uy5dCY9Ri.png'

type ViewType = 'home' | 'menu' | 'offers' | 'specials' | 'story' | 'reviews' | 'contact' | 'faq' | 'checkout'
type MenuLayoutMode = 'grid' | 'list'

const KITCHEN_LAT = 12.953542087360153
const KITCHEN_LNG = 77.69335637484109

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

const BENGALURU_HOTSPOTS = [
  { name: 'Kaveri Layout Marathahalli', area: '1067 8th Main Rd (Our Base Kitchen)', distKm: 0.1, tag: 'Base Hub' },
  { name: 'Kalamandir Marathahalli', area: 'Marathahalli Outer Ring Rd', distKm: 0.8, tag: 'Within 3 km' },
  { name: 'Multiplex Bridge Bus Stop', area: 'Marathahalli Junction', distKm: 1.2, tag: 'Within 3 km' },
  { name: 'Munnekolala Marathahalli', area: 'Spice Garden / Varthur Main Rd', distKm: 1.8, tag: 'Within 3 km' },
  { name: 'Kundalahalli Gate', area: 'ITPL Main Road', distKm: 2.1, tag: 'Within 3 km' },
  { name: 'HAL 3rd Stage / Jeevan Bhima Nagar', area: 'Old Airport Road', distKm: 3.5, tag: 'Takeaway Recommended' },
]

/* ==================== RESPONSIVE BRAND LOGO ==================== */
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 cursor-pointer group select-none shrink-0">
      <img 
        src={logo} 
        alt="Bob's Satellite Logo" 
        className={compact 
          ? 'size-7 sm:size-8 rounded-full object-cover ring-2 ring-orange-500/40' 
          : 'size-8 sm:size-9 md:size-10 lg:size-11 rounded-full object-cover ring-2 ring-orange-500/40 shadow-xs group-hover:scale-105 transition-transform shrink-0'
        } 
      />
      <div className="leading-tight">
        <p className="font-outfit text-xs sm:text-sm md:text-base lg:text-lg font-black leading-none tracking-tight text-foreground group-hover:text-orange-500 transition-colors">
          BOB&apos;S <span className="text-orange-500">SATELLITE</span>
        </p>
        <p className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[9.5px] font-extrabold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-muted-foreground font-outfit mt-0.5 whitespace-nowrap">
          MARATHAHALLI · BENGALURU
        </p>
      </div>
    </div>
  )
}

/* ==================== ADDRESS SELECTION & MAP MODAL ==================== */
function AddressSelectionModal({
  open,
  onClose,
  currentAddress,
  onSelectAddress,
}: {
  open: boolean
  onClose: () => void
  currentAddress: string
  onSelectAddress: (address: string, distanceKm: number) => void
}) {
  const [detecting, setDetecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [currentPinnedAddress, setCurrentPinnedAddress] = useState(currentAddress)
  const [currentDist, setCurrentDist] = useState(0.8)

  useEffect(() => {
    if (searchQuery.trim().length <= 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Bengaluru')}&countrycodes=in`)
        const data = await res.json()
        setSearchResults(data || [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  if (!open) return null

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const dist = calculateDistanceKm(KITCHEN_LAT, KITCHEN_LNG, lat, lng)

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          const data = await res.json()
          const readable = data.display_name || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`
          onSelectAddress(readable, dist)
          toast.success(`Location updated! ${dist} km from Marathahalli Kitchen 📍`)
        } catch {
          const fallback = `1067, 8th Main Rd, Kaveri Layout, Marathahalli (${dist} km)`
          onSelectAddress(fallback, dist)
        } finally {
          setDetecting(false)
          onClose()
        }
      },
      () => {
        setDetecting(false)
        toast.error('Unable to retrieve GPS. Please select location from list or map.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }} 
        className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-4 sm:p-6 text-foreground font-outfit shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 font-bold">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-outfit text-base sm:text-lg font-black text-foreground">Select Delivery Location</h3>
              <p className="text-xs text-muted-foreground">We deliver strictly within 3 km of Marathahalli outlet · Takeaway for other areas</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Live GPS Detection Button */}
        <button
          onClick={handleDetectGPS}
          disabled={detecting}
          className="w-full flex items-center justify-between rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3.5 text-xs font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <Navigation size={16} className={detecting ? 'animate-spin' : ''} />
            <span>{detecting ? 'Detecting your GPS position...' : 'Use Current Live GPS Location'}</span>
          </span>
          <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">Auto Detect</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search building, area, landmark in Bengaluru..."
            className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-semibold text-foreground focus:border-orange-500 focus:outline-none"
          />
          {isSearching && <span className="absolute right-3.5 top-2.5 text-[10px] text-orange-500 font-bold animate-pulse">Searching...</span>}
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-border bg-background p-2 space-y-1 text-xs">
            {searchResults.map((r, idx) => {
              const d = calculateDistanceKm(KITCHEN_LAT, KITCHEN_LNG, parseFloat(r.lat), parseFloat(r.lon))
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentPinnedAddress(r.display_name)
                    setCurrentDist(d)
                    onSelectAddress(r.display_name, d)
                    onClose()
                    toast.success(`Selected: ${r.display_name.split(',')[0]} (${d} km)`)
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-secondary flex items-center justify-between text-xs"
                >
                  <span className="truncate pr-2">{r.display_name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${d <= 3.0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {d} km
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Interactive Leaflet Pin Map */}
        <div className="rounded-2xl border border-border/80 overflow-hidden bg-background p-2 space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <Compass size={14} className="text-orange-500" /> Interactive Map: Drag the pin to your exact delivery location
          </p>
          <UserMapPicker
            initialLat={KITCHEN_LAT}
            initialLng={KITCHEN_LNG}
            onConfirmLocation={(addr, dist) => {
              onSelectAddress(addr, dist)
              toast.success(`Pinned location confirmed: ${dist} km from Kitchen 📍`)
              onClose()
            }}
            onAddressChange={(addr, dist) => {
              setCurrentPinnedAddress(addr)
              setCurrentDist(dist)
            }}
          />
        </div>

        {/* Hotspots Quick Select */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Marathahalli Popular Locations</p>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {BENGALURU_HOTSPOTS.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  const full = `${h.name}, ${h.area}`
                  onSelectAddress(full, h.distKm)
                  toast.success(`Selected ${h.name}!`)
                  onClose()
                }}
                className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 text-left hover:border-orange-500/60 hover:bg-orange-500/5 transition-all text-xs cursor-pointer"
              >
                <div>
                  <p className="font-bold text-foreground">{h.name}</p>
                  <p className="text-[10px] text-muted-foreground">{h.area}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${h.distKm <= 3.0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {h.distKm} km
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ==================== RESPONSIVE HEADER ==================== */
function FormattedHeader({ 
  activeView, 
  setView, 
  onCart, 
  onMenu, 
  onAccount, 
  onOpenPermissions, 
  currentAddress 
}: { 
  activeView: ViewType
  setView: (v: ViewType) => void
  onCart: () => void
  onMenu: () => void
  onAccount: () => void
  onOpenPermissions: () => void
  currentAddress: string 
}) {
  const cart = useAppStore((s) => s.cart)
  const user = useAppStore((s) => s.user)
  const count = cartCount(cart)

  const primaryNavItems: { id: ViewType; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'offers', label: 'Orbit Deals' },
    { id: 'specials', label: 'Specials' },
    { id: 'contact', label: 'Contact Us' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'story', label: 'Our Story' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 shadow-xs backdrop-blur-md transition-all text-foreground font-sans">
      <div className="mx-auto flex h-14 sm:h-16 md:h-20 max-w-7xl items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        
        {/* LEFT CLUSTER: HAMBURGER (MOBILE) + LOGO + LOCATION PILL */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-3 lg:gap-4 min-w-0 shrink-0">
          <button 
            onClick={onMenu} 
            className="rounded-xl p-2 text-foreground hover:bg-secondary active:scale-95 lg:hidden cursor-pointer shrink-0 border border-border/60"
            aria-label="Toggle navigation drawer"
          >
            <MenuIcon size={18} />
          </button>

          <button onClick={() => setView('home')} className="text-left focus:outline-none cursor-pointer shrink-0">
            <Logo />
          </button>

          {/* LOCATION BADGE ON IPAD LANDSCAPE & DESKTOP */}
          <button
            onClick={onOpenPermissions}
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-orange-500/20 transition-all cursor-pointer max-w-[180px] xl:max-w-[240px] truncate shadow-xs ml-2"
            title="Change Delivery Address"
          >
            <MapPin size={13} className="text-orange-500 shrink-0" />
            <span className="truncate text-[10.5px] lg:text-[11px] font-outfit text-foreground font-extrabold">
              {currentAddress || '1067 Kaveri Layout, Marathahalli'}
            </span>
            <ChevronDown size={12} className="text-orange-500 shrink-0" />
          </button>
        </div>

        {/* CENTER CLUSTER: NAVIGATION LINKS */}
        <nav className="hidden lg:flex items-center gap-1.5 lg:gap-2 text-xs font-bold font-outfit">
          {primaryNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`py-1.5 px-2.5 lg:px-3 rounded-full transition-all relative cursor-pointer text-xs ${
                activeView === item.id 
                  ? 'text-orange-500 font-extrabold bg-orange-500/10' 
                  : 'text-foreground/80 hover:text-orange-500 hover:bg-secondary/60'
              }`}
            >
              {item.label}
              {activeView === item.id && (
                <motion.div layoutId="activePill" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </nav>

        {/* RIGHT CLUSTER: MY CART + PROFILE PILL */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* IPAD GPS BUTTON */}
          <button
            onClick={onOpenPermissions}
            className="hidden md:flex lg:hidden items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-extrabold text-orange-600 hover:bg-orange-500 hover:text-white transition-all cursor-pointer shrink-0 max-w-[160px] truncate"
          >
            <MapPin size={13} className="text-orange-500 shrink-0" />
            <span className="truncate text-[10.5px] font-outfit">{currentAddress.split(',')[0]}</span>
          </button>

          {/* MY CART BUTTON - SWIGGY ORANGE */}
          <button 
            onClick={onCart} 
            className="relative flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 size-8 sm:size-auto sm:px-4 sm:py-2.5 text-xs font-black text-white shadow-md transition-all cursor-pointer shrink-0" 
            aria-label="Open cart"
          >
            <ShoppingCart size={15} />
            <span className="hidden sm:inline font-outfit font-black ml-1.5 uppercase tracking-wider">Cart</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 sm:static sm:ml-1.5 flex size-4 sm:size-5 items-center justify-center rounded-full bg-orange-500 text-[9px] sm:text-[11px] font-extrabold text-white animate-pulse">
                {count}
              </span>
            )}
          </button>

          {/* USER PROFILE BUTTON */}
          <button 
            onClick={onAccount} 
            className="flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 p-0.5 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 text-xs font-extrabold text-foreground group cursor-pointer shrink-0 hover:bg-orange-500/20"
            aria-label="User Profile"
          >
            <div className="flex size-7 sm:size-7.5 items-center justify-center rounded-full bg-orange-500 text-white font-black text-xs shadow-xs shrink-0">
              {user ? user.name.charAt(0).toUpperCase() : <User size={13} />}
            </div>
            <span className="hidden sm:inline truncate max-w-[75px] md:max-w-[85px] font-outfit font-bold ml-1">
              {user ? user.name.split(' ')[0] : 'Sign In'}
            </span>
            <ChevronDown size={12} className="hidden sm:block text-orange-500 shrink-0" />
          </button>
        </div>

      </div>

      {/* MOBILE LOCATION BAR */}
      <div className="md:hidden border-t border-border/40 bg-orange-500/5 px-3 py-1.5 flex items-center justify-between font-outfit">
        <button
          onClick={onOpenPermissions}
          className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate flex-1 cursor-pointer"
        >
          <MapPin size={12} className="text-orange-500 shrink-0" />
          <span className="truncate text-[11px]">{currentAddress}</span>
        </button>
        <button onClick={onOpenPermissions} className="text-[10px] text-orange-600 font-extrabold uppercase shrink-0 pl-2">
          Change
        </button>
      </div>
    </header>
  )
}

/* ==================== FLOATING CART WIDGET ==================== */
function FloatingCartWidget({ onOpen }: { onOpen: () => void }) {
  const cart = useAppStore((s) => s.cart)
  const count = cartCount(cart)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const freeDeliveryDiff = Math.max(0, 300 - total)

  if (count === 0) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed bottom-16 sm:bottom-20 right-3 sm:right-6 z-40 flex flex-col items-end gap-1.5">
        <div className="rounded-full bg-neutral-900/95 px-3 py-1 text-[9px] sm:text-[11px] font-extrabold text-orange-400 shadow-xl border border-orange-500/30 backdrop-blur flex items-center gap-1 font-outfit animate-pulse max-w-xs truncate">
          <Truck size={11} className="text-orange-400 shrink-0" />
          {freeDeliveryDiff > 0 ? (
            <span className="truncate">Add {formatPrice(freeDeliveryDiff)} more for FREE 3km Delivery! 🚚</span>
          ) : (
            <span className="text-emerald-400 font-bold">🎉 FREE 3km Delivery Unlocked!</span>
          )}
        </div>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpen} className="group relative flex items-center gap-2.5 sm:gap-4 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 px-4 sm:px-6 py-2.5 sm:py-3.5 text-white shadow-2xl shadow-orange-500/50 ring-2 sm:ring-4 ring-orange-500/20 backdrop-blur-md transition-all cursor-pointer">
          <div className="relative flex items-center justify-center">
            <div className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-white">
              <ShoppingCart size={17} className="sm:hidden" />
              <ShoppingCart size={20} className="hidden sm:block group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 sm:-right-2 flex size-5 sm:size-6 items-center justify-center rounded-full bg-white text-[11px] sm:text-[12px] font-black text-orange-600 shadow-md ring-2 ring-orange-500">
              {count}
            </span>
          </div>

          <div className="flex flex-col items-start leading-tight text-left">
            <span className="font-outfit text-[11px] sm:text-sm font-black uppercase tracking-wider text-white">VIEW CART</span>
            <span className="font-outfit text-xs sm:text-base font-black text-white/95">{formatPrice(total)}</span>
          </div>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==================== LIVE ORDER TRACKING BOTTOM BAR ==================== */
function LiveTrackingBottomBar({ onOpenTracking }: { onOpenTracking: (orderId: string) => void }) {
  const orders = useAppStore((s) => s.orders)
  const activeOrder = orders[0]

  if (!activeOrder) return null

  const isDelivered = activeOrder.status === 'Delivered'

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-orange-200 bg-white/95 text-slate-900 backdrop-blur-md px-3 sm:px-6 py-2.5 shadow-xl font-outfit"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 font-bold shrink-0 animate-pulse">
            <Bike size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black truncate text-slate-900">
              Order <span className="text-orange-600 font-mono font-bold">#{activeOrder.id}</span> · <span className="text-emerald-700 font-bold">{activeOrder.status}</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {activeOrder.mode} · {activeOrder.items.length} items · ETA: {activeOrder.estimatedDeliveryMins || 20} mins
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenTracking(activeOrder.id)}
          className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 px-3.5 sm:px-4 py-1.5 text-xs font-black text-white hover:scale-105 transition-all shadow-md shrink-0 cursor-pointer"
        >
          <span>Track Live</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  )
}

/* ==================== LIVE ORDER TRACKING MODAL ==================== */
function OrderTrackingModal({ 
  orderId, 
  onClose 
}: { 
  orderId: string | null; 
  onClose: () => void 
}) {
  const orders = useAppStore((s) => s.orders)
  const order = orders.find((o) => o.id === orderId) || orders[0]

  if (!orderId || !order) return null

  const steps = [
    { title: 'Order Received', desc: 'Sent to Bob\'s Kitchen Line' },
    { title: 'Preparing Food', desc: 'Flame grilling & packing fresh' },
    { title: order.mode === 'Takeaway' ? 'Ready for Pickup' : 'Out For Delivery', desc: order.mode === 'Takeaway' ? 'Pick up at Kaveri Layout Outlet' : 'Express rider on the way' },
    { title: order.mode === 'Takeaway' ? 'Collected' : 'Delivered', desc: 'Enjoy your meal!' },
  ]

  let currentStepIdx = 0
  if (order.status === 'Preparing') currentStepIdx = 1
  else if (order.status === 'Out For Delivery' || order.status === 'Ready for Pickup' || order.status === 'Packed') currentStepIdx = 2
  else if (order.status === 'Delivered') currentStepIdx = 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }} 
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border-2 border-orange-200 bg-white text-slate-900 font-outfit shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto p-5 sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase">
                Live Road Tracker
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">#{order.id}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black mt-0.5 text-slate-900">Tracking Your Order</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Live Stepper */}
        <div className="rounded-2xl bg-orange-50/60 p-4 border border-orange-200/80 space-y-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Estimated Arrival: <strong className="text-orange-600 font-extrabold">{order.estimatedDeliveryMins || 20} mins</strong></span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black">{order.status}</span>
          </div>

          <div className="relative space-y-3 pl-6 border-l-2 border-orange-400 ml-2">
            {steps.map((st, idx) => {
              const isPassed = idx <= currentStepIdx
              const isCurrent = idx === currentStepIdx
              return (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full text-[10px] font-black ${
                    isPassed ? 'bg-orange-500 text-white ring-4 ring-orange-500/20' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isCurrent ? 'text-orange-600 text-sm font-black' : isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                      {st.title} {isCurrent && '⚡'}
                    </p>
                    <p className="text-[11px] text-slate-500">{st.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* EMBEDDED HIGH-CONTRAST ROAD TRACKER MAP */}
        <div className="space-y-1.5">
          <LiveRoadTracker 
            destLat={order.lat || 12.9582} 
            destLng={order.lng || 77.6990} 
            mode={order.mode} 
            deliveryAddress={order.deliveryAddress} 
            status={order.status}
            estimatedMins={order.estimatedDeliveryMins || 15}
          />
        </div>

        {/* Order Details & Payment Metadata */}
        <div className="space-y-2 text-xs">
          <div className="rounded-2xl bg-slate-50 p-3.5 space-y-2 border border-slate-200/80">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-bold flex items-center gap-1"><Package size={13} className="text-orange-500" /> Fulfillment Mode:</span>
              <span className="text-orange-600 font-extrabold">{order.mode}</span>
            </div>
            <div className="flex justify-between items-start text-slate-700">
              <span className="font-bold shrink-0 flex items-center gap-1"><MapPin size={13} className="text-orange-500" /> Destination:</span>
              <span className="text-right text-slate-800 text-[11px] max-w-[260px] truncate">{order.deliveryAddress}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-bold flex items-center gap-1"><CreditCard size={13} className="text-orange-500" /> Payment:</span>
              <span className="text-slate-900 font-extrabold">{order.paymentMethod || 'UPI Instant'}</span>
            </div>
            {order.transactionId && (
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> UPI Ref / Txn ID:</span>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  #{order.transactionId}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1.5 border border-slate-200/80">
            <p className="font-bold text-slate-400 text-[10px] uppercase">Dishes in Order</p>
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-slate-700">
                <span>{it.quantity}x {it.name}</span>
                <span className="font-bold text-slate-900">{formatPrice(it.price * it.quantity)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total Paid</span>
              <span className="text-orange-600 text-sm font-black">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Contact Restaurant Button */}
        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${restaurantStats.phone}`}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-center text-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Phone size={14} className="text-orange-500" /> Call Kitchen
          </a>
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-orange-500 py-3 text-xs font-black text-center text-white hover:bg-orange-600 transition-all cursor-pointer shadow-md"
          >
            Close Tracker
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ==================== USER PROFILE DRAWER ==================== */
function UserProfileDrawer({ 
  open, 
  onClose, 
  onSignInClick, 
  onOpenPermissions,
  onOpenTracking
}: { 
  open: boolean; 
  onClose: () => void; 
  onSignInClick: () => void; 
  onOpenPermissions: () => void;
  onOpenTracking: (orderId: string) => void;
}) {
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const orders = useAppStore((s) => s.orders)
  const favorites = useAppStore((s) => s.favorites)
  const addToCart = useAppStore((s) => s.addToCart)
  const updateUser = useAppStore((s) => s.updateUser)

  const [tab, setTab] = useState<'orders' | 'tracking' | 'addresses' | 'wallet' | 'settings'>('orders')
  const [editName, setEditName] = useState(user?.name || '')
  const [editPhone, setEditPhone] = useState(user?.phone || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editAddress, setEditAddress] = useState(user?.address || '')

  useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditPhone(user.phone || '')
      setEditEmail(user.email || '')
      setEditAddress(user.address || '')
    }
  }, [user])

  if (!open) return null

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPhone.trim()) {
      toast.error('Phone number is required!')
      return
    }
    updateUser({ name: editName, phone: editPhone, email: editEmail, address: editAddress })
    toast.success('Profile & details saved! ✨')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />

      <aside className="absolute right-0 top-0 flex h-full w-full sm:max-w-md md:max-w-lg flex-col bg-background text-foreground shadow-2xl border-l border-border/80 font-outfit">
        <div className="relative border-b border-border/80 bg-gradient-to-br from-neutral-900 via-neutral-950 to-orange-950 p-4 sm:p-6 text-white">
          <button onClick={onClose} className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>

          {user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex size-12 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 font-outfit text-xl sm:text-3xl font-black text-white shadow-2xl ring-4 ring-orange-500/30 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-orange-400 border border-orange-500/30 font-outfit">
                  ⭐ Verified Gourmet Foodie
                </span>
                <h3 className="font-outfit text-lg sm:text-2xl font-bold truncate text-white mt-0.5">{user.name}</h3>
                <p className="text-[11px] sm:text-xs text-white/75 truncate">{user.phone ? `📱 ${user.phone}` : ''} {user.email ? `· ${user.email}` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-orange-400 font-outfit">Customer Account</span>
                <h3 className="font-outfit text-lg sm:text-2xl font-bold text-white">Welcome Foodie 👋</h3>
                <p className="text-xs text-white/70">Sign in to save your phone & address for 1-click checkout</p>
              </div>
              <button onClick={() => { onClose(); onSignInClick(); }} className="rounded-full bg-orange-500 px-4 sm:px-5 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-all shadow-md shrink-0 cursor-pointer font-outfit">
                Sign In / Register
              </button>
            </div>
          )}

          {user && (
            <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/10 p-2.5 sm:p-3 text-center text-xs backdrop-blur font-outfit">
              <div>
                <p className="font-outfit font-black text-base sm:text-lg text-orange-400">{orders.length}</p>
                <p className="text-[9px] sm:text-[10px] text-white/80 font-bold uppercase tracking-wider">Orders</p>
              </div>
              <div className="border-x border-white/15">
                <p className="font-outfit font-black text-base sm:text-lg text-orange-400">₹{user.walletCoins || 100}</p>
                <p className="text-[9px] sm:text-[10px] text-white/80 font-bold uppercase tracking-wider">Cafe Coins</p>
              </div>
              <div>
                <p className="font-outfit font-black text-base sm:text-lg text-emerald-400">3 km</p>
                <p className="text-[9px] sm:text-[10px] text-white/80 font-bold uppercase tracking-wider">Delivery Zone</p>
              </div>
            </div>
          )}
        </div>

        {user ? (
          <>
            <div className="flex border-b border-border bg-slate-50/80 overflow-x-auto no-scrollbar font-outfit text-[11px] sm:text-xs font-bold p-1 gap-1">
              {[
                { id: 'orders', label: 'Orders', icon: Package },
                { id: 'tracking', label: 'Live Tracking', icon: Bike },
                { id: 'addresses', label: 'Addresses', icon: MapPin },
                { id: 'wallet', label: 'Offers', icon: Tag },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((t) => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button 
                    key={t.id} 
                    onClick={() => setTab(t.id as any)} 
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      active ? 'bg-orange-500 text-white font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 font-outfit">
              {/* ORDERS TAB (HISTORY) */}
              {tab === 'orders' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-outfit text-sm sm:text-base font-bold text-slate-900">Order History</h4>
                    <span className="text-[11px] text-muted-foreground">{orders.length} total</span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                      <Package size={32} className="mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="font-outfit text-xs sm:text-sm font-bold text-slate-700">No orders placed yet</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Explore our menu and place your first delicious dish!</p>
                    </div>
                  ) : (
                    orders.map((o) => {
                      const isDelivered = o.status === 'Delivered'
                      return (
                        <div key={o.id} className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs space-y-2.5">
                          <div className="flex items-start justify-between border-b pb-2">
                            <div>
                              <span className="font-outfit font-black text-xs sm:text-sm text-foreground">Order #{o.id}</span>
                              <p className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              isDelivered ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border border-orange-500/30 animate-pulse'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            {o.items.map((i) => (
                              <div key={i.id} className="flex justify-between text-muted-foreground">
                                <span>{i.quantity} × {i.name}</span>
                                <span className="font-semibold text-foreground">{formatPrice(i.price * i.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          {o.transactionId && (
                            <p className="text-[10px] font-mono text-emerald-600 font-bold">UPI Ref: #{o.transactionId}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="font-outfit font-black text-sm text-foreground">{formatPrice(o.total)}</span>
                            <div className="flex gap-2">
                              {!isDelivered && (
                                <button 
                                  onClick={() => { onClose(); onOpenTracking(o.id); }} 
                                  className="rounded-full bg-orange-500 hover:bg-orange-600 px-3.5 py-1 text-xs font-black text-white cursor-pointer shadow-xs flex items-center gap-1"
                                >
                                  <Bike size={12} /> Track Live
                                </button>
                              )}
                              <button 
                                onClick={() => { o.items.forEach((item) => addToCart(item)); toast.success('Dishes added to cart!'); }} 
                                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 text-xs font-bold cursor-pointer"
                              >
                                Reorder
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* TRACKING TAB (ACTIVE LIVE DELIVERIES ONLY) */}
              {tab === 'tracking' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">Active Live Deliveries</h4>
                    <span className="text-[11px] text-orange-600 font-bold">
                      {orders.filter(o => o.status !== 'Delivered').length} in transit
                    </span>
                  </div>

                  {orders.filter(o => o.status !== 'Delivered').length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center space-y-2">
                      <Bike size={32} className="mx-auto text-orange-400 mb-1" />
                      <p className="text-xs sm:text-sm font-black text-slate-800">No active deliveries in progress</p>
                      <p className="text-[11px] text-slate-500">
                        Live GPS tracking activates automatically when you place an order!
                      </p>
                    </div>
                  ) : (
                    orders.filter(o => o.status !== 'Delivered').map((o) => (
                      <div key={o.id} className="rounded-2xl border-2 border-orange-200 p-4 bg-white space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-sm text-slate-900">Order #{o.id}</span>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black">{o.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 truncate flex items-center gap-1">
                          <MapPin size={12} className="text-orange-500 shrink-0" /> {o.deliveryAddress}
                        </p>
                        {o.transactionId && <p className="text-[11px] text-emerald-600 font-mono font-bold">UPI Ref: #{o.transactionId}</p>}
                        <button
                          onClick={() => { onClose(); onOpenTracking(o.id); }}
                          className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-black text-white hover:bg-orange-600 cursor-pointer shadow-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Navigation size={13} />
                          <span>Open Live GPS Road Route →</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ADDRESSES TAB */}
              {tab === 'addresses' && (
                <div className="space-y-3 font-outfit">
                  <div className="rounded-2xl border p-4 bg-card space-y-3 text-xs shadow-xs">
                    <p className="font-bold flex items-center gap-1.5 text-slate-900 text-sm">
                      <Home size={15} className="text-orange-500" /> Current Saved Address
                    </p>
                    <textarea 
                      value={editAddress} 
                      onChange={(e) => setEditAddress(e.target.value)} 
                      rows={2} 
                      placeholder="Enter flat / house / street in Marathahalli..." 
                      className="w-full rounded-xl border bg-background p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleSaveProfile} 
                        className="flex-1 rounded-xl bg-orange-500 py-2 text-xs font-black text-white hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                      >
                        Save Address
                      </button>
                      <button 
                        type="button" 
                        onClick={onOpenPermissions} 
                        className="flex-1 rounded-xl border border-orange-500/40 bg-orange-50 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Compass size={13} /> Pick on Map
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OFFERS & DISCOUNTS TAB */}
              {tab === 'wallet' && (
                <div className="space-y-3 font-outfit">
                  <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white space-y-2 border border-orange-400 shadow-md">
                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-100">EXCLUSIVE ACTIVE OFFER</p>
                    <h2 className="text-3xl font-black text-white">10% FLAT OFF</h2>
                    <p className="text-[11px] text-white/90">Apply coupon code <strong className="underline">BOB10</strong> at checkout on every order!</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2 text-xs">
                    <p className="font-bold text-foreground">Available Coupons:</p>
                    <div className="flex justify-between items-center text-[11px] py-1.5 border-b border-border/40">
                      <div>
                        <span className="font-mono font-bold text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded mr-2">BOB10</span>
                        <span className="text-muted-foreground">Flat 10% instant discount</span>
                      </div>
                      <span className="text-emerald-600 font-black">Active</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS / EDIT PROFILE TAB */}
              {tab === 'settings' && (
                <form onSubmit={handleSaveProfile} className="space-y-3 text-xs font-outfit">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Full Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border bg-background px-3.5 py-2 font-semibold focus:outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Phone Number (Mandatory for Delivery & SMS)</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="9550764604" className="w-full rounded-xl border bg-background px-3.5 py-2 font-semibold focus:outline-none" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Email Address</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="foodie@example.com" className="w-full rounded-xl border bg-background px-3.5 py-2 font-semibold focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Default Address in Marathahalli</label>
                    <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} rows={2} className="w-full rounded-xl border bg-background px-3.5 py-2 font-semibold focus:outline-none" />
                  </div>
                  <button type="button" onClick={onOpenPermissions} className="w-full rounded-xl border border-orange-500/40 bg-orange-500/10 py-2 font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Compass size={14} /> Update Pin Location on Map
                  </button>
                  <button type="submit" className="w-full rounded-full bg-orange-500 py-2.5 font-bold text-white hover:bg-orange-600 transition-all cursor-pointer shadow-md">Save Changes</button>
                  <button type="button" onClick={() => { logout(); onClose(); toast.success('Logged out'); }} className="w-full rounded-full border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold text-red-600 hover:bg-red-500 hover:text-white cursor-pointer">Sign Out</button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 text-center font-outfit space-y-3 my-auto">
            <User size={40} className="mx-auto text-orange-500" />
            <h4 className="font-outfit text-lg font-bold">Please Sign In / Register</h4>
            <p className="text-xs text-muted-foreground">Save your Phone and Email so checkout is 1-click every time!</p>
            <button onClick={() => { onClose(); onSignInClick(); }} className="w-full rounded-full bg-orange-500 py-3 text-xs font-bold text-white cursor-pointer font-outfit shadow-md hover:bg-orange-600">Open Sign In Modal →</button>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ==================== AUTH MODAL (EMAIL OTP & PASSWORD) ==================== */
function AuthModal({ open, onClose, onAuthSuccess }: { open: boolean; onClose: () => void; onAuthSuccess?: () => void }) {
  const login = useAppStore((s) => s.login)
  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  
  // Sign up flow steps: 'email' -> 'otp' -> 'password'
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'password'>('email')
  
  // Form fields
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  
  // Status state
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (!open) return null

  // 1. Send OTP to Email via Resend SMTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        toast.error(`OTP Error: ${error.message}`)
      } else {
        toast.success(`6-digit verification code sent to ${email.trim()}!`)
        setSignupStep('otp')
        setResendCooldown(60)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // 2. Verify Email OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      toast.error('Please enter the 6-digit OTP from your email!')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      })

      if (error) {
        toast.error(`Invalid OTP: ${error.message}`)
      } else {
        toast.success('Email verified successfully! Now set your account password.')
        setSignupStep('password')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  // 3. Set Account Password & Name
  const handleCompleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || password.length < 6) {
      toast.error('Password must be at least 6 characters!')
      return
    }
    if (!name.trim()) {
      toast.error('Please enter your full name!')
      return
    }

    setLoading(true)
    try {
      // Update password and user metadata in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      })

      if (error) {
        toast.error(`Error saving account: ${error.message}`)
      } else {
        // Save to customer_profiles table in Supabase
        await supabase.from('customer_profiles').upsert({
          email: email.trim().toLowerCase(),
          full_name: name.trim(),
          phone: phone.trim(),
          saved_address: address.trim() || '1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru',
        }, { onConflict: 'email' })

        login(
          name.trim(),
          email.trim(),
          phone.trim() || '9550764604',
          address.trim() || '1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru'
        )

        toast.success(`Welcome to Bob's Kitchen, ${name.trim()}! Account created successfully. 🎉`)
        onClose()
        if (onAuthSuccess) onAuthSuccess()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  // 4. Sign In with Email & Password
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both Email and Password!')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        toast.error(`Sign In Failed: ${error.message}`)
      } else {
        // Fetch customer profile from Supabase
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .single()

        const displayName = profile?.full_name || data.user?.user_metadata?.full_name || email.split('@')[0]
        const displayPhone = profile?.phone || data.user?.user_metadata?.phone || ''
        const displayAddr = profile?.saved_address || data.user?.user_metadata?.address || '1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru'

        login(displayName, email.trim(), displayPhone, displayAddr)
        toast.success(`Welcome back, ${displayName}! 🎉`)
        onClose()
        if (onAuthSuccess) onAuthSuccess()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sign in error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-orange-200 bg-white p-5 sm:p-7 text-slate-900 font-outfit shadow-2xl">
        <button onClick={onClose} className="absolute right-3.5 top-3.5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all">
          <X size={18} />
        </button>

        {/* Header Badge */}
        <div className="text-center mb-4">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
            <Lock size={22} />
          </div>
          <h3 className="font-outfit text-xl sm:text-2xl font-black text-slate-900">
            {tab === 'signin' ? "Sign In to Bob's Kitchen" : 'Create Gourmet Account'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {tab === 'signin' ? 'Access your saved addresses, orders & offers' : 'Secure email verification powered by Resend SMTP'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setTab('signup'); setSignupStep('email'); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'signup' ? 'bg-orange-500 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'signin' ? 'bg-orange-500 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* ================= TAB 1: CREATE ACCOUNT VIA EMAIL OTP ================= */}
        {tab === 'signup' && (
          <div className="space-y-4">
            {/* Step Progress Indicators */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 mb-2">
              <span className={`flex items-center gap-1 ${signupStep === 'email' ? 'text-orange-600 font-black' : 'text-emerald-600'}`}>
                1. Email {signupStep !== 'email' && '✓'}
              </span>
              <span>→</span>
              <span className={`flex items-center gap-1 ${signupStep === 'otp' ? 'text-orange-600 font-black' : signupStep === 'password' ? 'text-emerald-600' : 'text-slate-400'}`}>
                2. Enter OTP {signupStep === 'password' && '✓'}
              </span>
              <span>→</span>
              <span className={`flex items-center gap-1 ${signupStep === 'password' ? 'text-orange-600 font-black' : 'text-slate-400'}`}>
                3. Set Password
              </span>
            </div>

            {/* STEP 1: ENTER EMAIL */}
            {signupStep === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[11px] block mb-1 text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="foodie@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    We will send a 6-digit one-time passcode from <strong>noreply@bobskitchen.shop</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-orange-500 py-3 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  <span>{loading ? 'Sending Verification Code...' : 'Send Verification OTP →'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: ENTER OTP */}
            {signupStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="rounded-2xl bg-orange-50 p-3 border border-orange-200 text-slate-700 text-center space-y-1">
                  <p className="text-[11px] font-bold">Check your inbox for OTP</p>
                  <p className="text-xs font-black text-orange-600">{email}</p>
                </div>

                <div>
                  <label className="font-bold text-[11px] block mb-1 text-slate-700">Enter 6-Digit Email OTP Code *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-widest text-lg font-mono font-black rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSignupStep('email')}
                    className="text-slate-500 hover:text-slate-800 font-bold"
                  >
                    ← Change Email
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => handleSendOtp()}
                    className="text-orange-600 font-bold hover:underline disabled:text-slate-400"
                  >
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-orange-500 py-3 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Continue →'}</span>
                </button>
              </form>
            )}

            {/* STEP 3: SET PASSWORD & FULL NAME */}
            {signupStep === 'password' && (
              <form onSubmit={handleCompleteAccount} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[11px] block mb-1 text-slate-700">Full Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[11px] block mb-1 text-slate-700">Create Account Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[11px] block mb-1 text-slate-700">Phone Number (Optional here, mandatory at checkout)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9550764604"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-orange-500 py-3 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{loading ? 'Creating Account...' : 'Complete Registration & Sign In →'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= TAB 2: SIGN IN WITH PASSWORD OR OTP ================= */}
        {tab === 'signin' && (
          <form onSubmit={handlePasswordSignIn} className="space-y-3 text-xs font-outfit">
            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="foodie@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your account password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => { setTab('signup'); setSignupStep('email'); }}
                className="text-orange-600 font-bold hover:underline"
              >
                Sign in with Email OTP instead
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-500 py-3 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              <span>{loading ? 'Authenticating...' : 'Sign In to My Account →'}</span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

/* ==================== QUANTITY STEPPER (SWIGGY STYLE) ==================== */
function QuantityStepper({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const add = useAppStore((s) => s.addToCart)
  const update = useAppStore((s) => s.updateQuantity)
  const cartItem = useAppStore((s) => s.cart.find((line) => line.id === item.id))
  const qty = cartItem?.quantity || 0

  if (compact && qty === 0) {
    return (
      <button 
        onClick={() => { add(item); toast.success(`${item.name} added to cart`); }} 
        className="rounded-xl border-2 border-orange-500 bg-white hover:bg-orange-500 text-orange-600 hover:text-white px-3 py-1 text-[11px] font-black shadow-xs transition-all cursor-pointer font-outfit uppercase tracking-wider shrink-0"
      >
        ADD +
      </button>
    )
  }

  return (
    <div className="inline-flex items-center rounded-xl border border-orange-500 bg-orange-500 text-white p-0.5 shadow-xs shrink-0 w-fit font-outfit">
      <button onClick={() => update(item.id, qty - 1)} disabled={!qty} className="flex size-5.5 sm:size-6 items-center justify-center rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-40 cursor-pointer shrink-0 transition-colors">
        <Minus size={11} />
      </button>
      <span className="w-5 text-center text-xs font-black px-0.5">{qty}</span>
      <button onClick={() => { add(item); toast.success(`${item.name} added`); }} className="flex size-5.5 sm:size-6 items-center justify-center rounded-lg bg-orange-600 hover:bg-orange-700 cursor-pointer shrink-0 transition-colors">
        <Plus size={11} />
      </button>
    </div>
  )
}

/* ==================== FOOD CARD GRID ==================== */
function FoodCardGrid({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const toggle = useAppStore((s) => s.toggleFavorite)
  const favorite = useAppStore((s) => s.favorites.includes(item.id))
  const isSoldOut = item.available === false

  return (
    <motion.article initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }} className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs hover:shadow-md transition-all font-outfit ${isSoldOut ? 'opacity-65' : ''}`}>
      <div className="relative aspect-[1.55] sm:aspect-[1.5] overflow-hidden bg-secondary">
        <img src={item.image} alt={item.name} className="size-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        {item.bestseller && !isSoldOut && <span className="absolute left-1.5 top-1.5 rounded-full bg-orange-500 px-2 py-0.5 text-[7.5px] sm:text-[9px] font-black uppercase text-white shadow-sm font-outfit">Bestseller</span>}
        {isSoldOut && <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase text-white shadow-sm">Sold Out</span>}
        <button onClick={() => { toggle(item.id); toast(favorite ? 'Removed from favorites' : 'Saved to favorites'); }} className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 text-foreground backdrop-blur shadow-xs cursor-pointer">
          <Heart size={11} fill={favorite ? 'rgb(249, 115, 22)' : 'none'} className={favorite ? 'text-orange-500' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-outfit text-xs sm:text-sm font-bold leading-tight group-hover:text-orange-500 transition-colors line-clamp-1">{item.name}</h3>
            <div className="flex items-center gap-0.5 rounded bg-orange-500/10 px-1 py-0.5 text-[8.5px] sm:text-[10px] font-bold text-orange-600 shrink-0 font-outfit">
              <Star size={8} className="fill-orange-500 text-orange-500" />
              {item.rating}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[8.5px] sm:text-[10px] font-bold font-outfit">
            {item.veg ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-black"><span className="size-1.5 rounded-full bg-emerald-500" />Pure Veg</span>
            ) : item.containsEgg ? (
              <span className="inline-flex items-center gap-1 text-amber-600 font-black">▲ Contains Egg</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-500 font-black"><span className="size-1.5 rounded-full bg-red-500" />Non-Veg</span>
            )}
            {item.specialOfferBadge && (
              <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-orange-600">
                {item.specialOfferBadge}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-[9.5px] sm:text-[10.5px] leading-tight text-muted-foreground">{item.description}</p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-border/50 font-outfit">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1">
              <span className="font-outfit text-xs sm:text-base font-black text-foreground truncate">{formatPrice(item.price)}</span>
              {item.originalPrice && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through font-medium">
                  {formatPrice(item.originalPrice)}
                </span>
              )}
            </div>
            {isSoldOut ? (
              <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">Unavailable</span>
            ) : (
              <QuantityStepper item={item} compact />
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

/* ==================== FOOD CARD LIST ==================== */
function FoodCardList({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const isSoldOut = item.available === false
  return (
    <motion.article initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }} className={`flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs font-outfit ${isSoldOut ? 'opacity-65' : ''}`}>
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <div className="relative shrink-0">
          <img src={item.image} alt={item.name} className="size-14 sm:size-16 md:size-20 rounded-xl object-cover bg-secondary" />
          {isSoldOut && <span className="absolute left-1 top-1 rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-xs">Sold Out</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {item.veg ? <span className="size-2 rounded-full bg-emerald-500" /> : item.containsEgg ? <span className="text-amber-500 text-[10px]">▲</span> : <span className="size-2 rounded-full bg-red-500" />}
            <h4 className="font-outfit text-xs sm:text-sm md:text-base font-bold truncate text-foreground">{item.name}</h4>
          </div>
          <p className="text-[9.5px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
          <span className="text-[10px] font-bold text-orange-600 mt-1 block">★ {item.rating} ({item.time})</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-outfit font-black text-xs sm:text-base text-foreground">{formatPrice(item.price)}</span>
        {isSoldOut ? (
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">Unavailable</span>
        ) : (
          <QuantityStepper item={item} compact />
        )}
      </div>
    </motion.article>
  )
}

/* ==================== FILTER TOGGLES ==================== */
function FilterToggles({
  vegOnly,
  setVegOnly,
  nonVegOnly,
  setNonVegOnly,
  bestsellersOnly,
  setBestsellersOnly,
}: {
  vegOnly: boolean
  setVegOnly: (v: boolean) => void
  nonVegOnly: boolean
  setNonVegOnly: (v: boolean) => void
  bestsellersOnly: boolean
  setBestsellersOnly: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 font-outfit text-xs">
      <button
        onClick={() => { setVegOnly(!vegOnly); if (!vegOnly) setNonVegOnly(false); }}
        className={`rounded-full px-3 py-1 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
          vegOnly ? 'bg-emerald-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        <span className="size-2 rounded-full bg-emerald-500 inline-block" />
        <span>Pure Veg</span>
      </button>

      <button
        onClick={() => { setNonVegOnly(!nonVegOnly); if (!nonVegOnly) setVegOnly(false); }}
        className={`rounded-full px-3 py-1 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
          nonVegOnly ? 'bg-rose-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        <span className="size-2 rounded-full bg-red-500 inline-block" />
        <span>Non-Veg</span>
      </button>

      <button
        onClick={() => setBestsellersOnly(!bestsellersOnly)}
        className={`rounded-full px-3 py-1 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
          bestsellersOnly ? 'bg-orange-500 text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        <span>🔥 Bestsellers</span>
      </button>
    </div>
  )
}

/* ==================== HOME VIEW ==================== */
function HomeView({ setView, onSelectCategory, onOpenPermissions }: { setView: (v: ViewType) => void; onSelectCategory: (cat: string) => void; onOpenPermissions: () => void }) {
  const fusionDishes = menuItems.filter((i) => i.category === 'Fusion Snack Pack')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#FAF8F5] min-h-screen pb-16">
      {/* HERO BANNER */}
      <section className="relative min-h-[70vh] sm:min-h-[80vh] md:min-h-[85vh] lg:min-h-[90vh] w-full overflow-hidden flex flex-col justify-between bg-black">
        <video src="/Burger_ingredients.mp4" autoPlay loop muted playsInline preload="auto" className="absolute inset-0 size-full object-cover pointer-events-none opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/75 z-10 pointer-events-none" />

        <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center px-3 pt-6 pb-6 sm:pt-12 sm:pb-14 md:pt-16 md:pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 sm:px-5 py-1 text-[8.5px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-orange-400 mb-2 sm:mb-6 backdrop-blur font-outfit">
            <Zap size={11} className="text-orange-400 shrink-0" />
            <span>SATELLITE KITCHEN · MARATHAHALLI BENGALURU</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="font-outfit text-2xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-[8.5rem] font-black leading-[0.92] tracking-tighter uppercase text-[#FDF4E3] drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] max-w-full px-1 break-words">
            BOB&apos;S SATELLITE
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-1.5 sm:mt-4 font-outfit text-[9.5px] sm:text-sm md:text-base font-extrabold uppercase tracking-[0.1em] sm:tracking-[0.25em] text-white/90">
            FLAME-GRILLED POWER · ZERO GRAVITY FLAVOR
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-1.5 max-w-xs sm:max-w-md md:max-w-lg text-[9.5px] sm:text-xs md:text-sm font-medium text-white/75 leading-relaxed">
            Patties from <span className="font-bold text-white font-outfit">₹89</span>, rolls from <span className="font-bold text-white font-outfit">₹110</span>. Strict <span className="text-orange-400 font-extrabold font-outfit">3 km Radius</span> in Marathahalli with <span className="text-emerald-400 font-extrabold font-outfit">FREE Delivery</span> above ₹300!
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-4 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button onClick={() => setView('menu')} className="rounded-full border border-white/80 bg-black/30 backdrop-blur-md px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-3.5 text-[9.5px] sm:text-xs font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.25em] text-white shadow-2xl hover:bg-white hover:text-black font-outfit cursor-pointer">
              EXPLORE OUR MENU
            </button>

            <button onClick={onOpenPermissions} className="rounded-full border border-orange-500 bg-orange-500/20 backdrop-blur-md px-3.5 sm:px-5 md:px-6 py-2 sm:py-3 md:py-3.5 text-[9.5px] sm:text-xs font-extrabold uppercase tracking-wider text-orange-400 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1.5 font-outfit cursor-pointer">
              <Navigation size={12} /> Pin Address (3km Radius)
            </button>
          </motion.div>
        </div>
      </section>

      {/* RESTAURANT INFO SUMMARY */}
      <section className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-30 font-outfit">
        <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-outfit text-xl sm:text-3xl font-black text-foreground">Bob&apos;s Satellite Kitchen</h2>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-600">
                  Open Now
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">{restaurantStats.cuisines}</p>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={13} className="text-orange-500 shrink-0" />
                <span>{restaurantStats.address}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-orange-600">
                🚚 Delivery exclusively for Marathahalli (Within 3 km) · Takeaway for all locations
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 10% FLAT DISCOUNT OFFER BANNER */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-8 font-outfit">
        <div className="relative overflow-hidden rounded-3xl border border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/5 p-5 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="rounded-full bg-orange-500/20 text-orange-600 border border-orange-500/40 px-3 py-1 text-xs font-black uppercase">
              🔥 Limited Time Offer
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-foreground">10% Flat Discount on Every Order!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Use coupon code <strong className="text-orange-600">BOB10</strong> at checkout to get a flat 10% instant discount on your entire order. No minimum order value!
            </p>
          </div>
          <button 
            onClick={() => setView('offers')} 
            className="rounded-full bg-orange-500 px-6 py-3 text-xs font-black text-white hover:bg-orange-600 shadow-lg cursor-pointer transition-all shrink-0"
          >
            View Offer Details →
          </button>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-8 sm:mt-12 font-outfit">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-outfit text-xl sm:text-2xl font-black text-foreground">Explore Categories</h2>
            <p className="text-xs text-muted-foreground">Freshly prepared gourmet dishes & refreshing beverages</p>
          </div>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-orange-500 hover:underline">
            View All Dishes →
          </button>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-card p-3 shadow-xs hover:border-orange-500/60 hover:shadow-md transition-all text-center group cursor-pointer"
            >
              <img src={cat.image} alt={cat.name} className="size-14 sm:size-16 rounded-xl object-cover shadow group-hover:scale-105 transition-transform" />
              <p className="font-bold text-xs text-foreground mt-2 group-hover:text-orange-500 line-clamp-1">{cat.name}</p>
              <p className="text-[10px] text-muted-foreground">{cat.itemCount} items · from ₹{cat.priceStart}</p>
            </button>
          ))}
        </div>
      </section>

      {/* FUSION SNACK PACK FEATURED SECTION */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-10 font-outfit">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Our Signature</span>
            <h2 className="font-outfit text-xl sm:text-2xl font-black text-foreground">Fusion Snack Packs</h2>
          </div>
          <button onClick={() => setView('menu')} className="text-xs font-bold text-orange-500 hover:underline">
            See Menu →
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fusionDishes.map((dish, i) => (
            <FoodCardGrid key={dish.id} item={dish} index={i} />
          ))}
        </div>
      </section>
    </motion.div>
  )
}

/* ==================== MENU VIEW ==================== */
function MenuView({ onBack, initialCategory = 'All' }: { onBack: () => void; initialCategory?: string }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [search, setSearch] = useState('')
  const [layoutMode, setLayoutMode] = useState<MenuLayoutMode>('grid')
  const [vegOnly, setVegOnly] = useState(false)
  const [nonVegOnly, setNonVegOnly] = useState(false)
  const [bestsellersOnly, setBestsellersOnly] = useState(false)

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'Fusion Snack Pack': true,
    'Rolls': true,
    'Burgers': true,
    'Fries & Sides': true,
    'Sandwiches': true,
    'Desserts': true,
    'Beverages': true,
  })

  const toggleAccordion = (cat: string) => {
    setOpenAccordions((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const itemsForCategory = (catName: string) => {
    return menuItems.filter((dish) => {
      if (dish.category !== catName) return false
      if (search && !dish.name.toLowerCase().includes(search.toLowerCase()) && !dish.description.toLowerCase().includes(search.toLowerCase())) return false
      if (vegOnly && !dish.veg) return false
      if (nonVegOnly && dish.veg) return false
      if (bestsellersOnly && !dish.bestseller) return false
      return true
    })
  }

  const activeCategories = useMemo(() => {
    if (selectedCategory !== 'All') return [selectedCategory]
    return categories.filter((c) => c !== 'All')
  }, [selectedCategory])

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 md:py-8 font-outfit">
      <button onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-[10px] sm:text-xs font-extrabold uppercase text-orange-500 hover:underline cursor-pointer">
        ← Back to home
      </button>

      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-5 shadow-xs space-y-3 font-outfit mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
          <div>
            <h1 className="font-outfit text-lg sm:text-2xl md:text-3xl font-black text-foreground">Official BOB&apos;S Menu</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Burgers from ₹89 · Rolls from ₹110 · Free 3 km Delivery above ₹300 in Marathahalli</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes..." className="w-full rounded-full border bg-background py-1.5 pl-8 pr-3 text-xs font-semibold focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-xs text-muted-foreground">✕</button>}
            </div>

            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-full border border-orange-500/40 bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none cursor-pointer">
              <option value="All">All Categories ({categories.length - 1})</option>
              {categories.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterToggles vegOnly={vegOnly} setVegOnly={setVegOnly} nonVegOnly={nonVegOnly} setNonVegOnly={setNonVegOnly} bestsellersOnly={bestsellersOnly} setBestsellersOnly={setBestsellersOnly} />

          <div className="flex items-center gap-1 rounded-full border bg-secondary/80 p-1 text-xs font-bold">
            <button onClick={() => setLayoutMode('grid')} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold transition-all cursor-pointer ${layoutMode === 'grid' ? 'bg-orange-500 text-white shadow-xs' : 'text-muted-foreground'}`}><Grid size={12} /><span>Grid</span></button>
            <button onClick={() => setLayoutMode('list')} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold transition-all cursor-pointer ${layoutMode === 'list' ? 'bg-orange-500 text-white shadow-xs' : 'text-muted-foreground'}`}><List size={12} /><span>List</span></button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pt-1 no-scrollbar border-t border-border/40">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${selectedCategory === cat ? 'bg-orange-500 text-white font-black shadow-xs' : 'bg-secondary text-muted-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3.5 sm:space-y-6">
        {activeCategories.map((catName) => {
          const catItems = itemsForCategory(catName)
          const isOpen = openAccordions[catName] ?? true
          const catMeta = menuCategories.find((c) => c.name === catName)

          if (catItems.length === 0 && (search || vegOnly || nonVegOnly || bestsellersOnly)) return null

          return (
            <motion.section key={catName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/90 bg-card shadow-xs">
              <div onClick={() => toggleAccordion(catName)} className="w-full flex items-center justify-between p-3 sm:p-4 md:p-5 cursor-pointer select-none group border-l-4 border-l-orange-500 gap-2">
                <div className="flex items-center gap-2.5 sm:gap-4">
                  {catMeta && <img src={catMeta.image} alt={catName} className="size-10 sm:size-14 md:size-16 rounded-xl object-cover shadow shrink-0" />}
                  <div>
                    <h2 className="font-outfit text-sm sm:text-xl md:text-2xl font-black text-foreground group-hover:text-orange-500 transition-colors">{catName}</h2>
                    <p className="text-[9.5px] sm:text-xs text-muted-foreground">{catItems.length} options available</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-orange-600 hidden sm:inline">{isOpen ? 'Hide Items' : 'View Items'}</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden bg-background/50">
                    <div className="p-2 sm:p-4 md:p-6 border-t">
                      {layoutMode === 'grid' && (
                        <div className="grid gap-2 sm:gap-4 md:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                          {catItems.map((item, index) => <FoodCardGrid key={item.id} item={item} index={index} />)}
                        </div>
                      )}

                      {layoutMode === 'list' && (
                        <div className="space-y-2">
                          {catItems.map((item, index) => <FoodCardList key={item.id} item={item} index={index} />)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )
        })}
      </div>
    </motion.main>
  )
}

/* ==================== OFFERS / DEAL ORBIT VIEW ==================== */
function OffersView({ setView }: { setView: (v: ViewType) => void }) {
  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 font-outfit space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <span className="rounded-full bg-orange-500/15 text-orange-600 px-3.5 py-1 text-xs font-black uppercase border border-orange-500/30">
          🔥 ACTIVE OFFERS
        </span>
        <h1 className="font-outfit text-2xl sm:text-4xl md:text-5xl font-black mt-2">10% Flat Discount</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Apply coupon code <strong className="text-orange-600">BOB10</strong> at checkout for a flat 10% instant discount on every order!
        </p>
      </div>

      {/* 10% FLAT DISCOUNT HERO - WARM CLEAN THEME */}
      <section className="rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-white p-5 sm:p-8 text-slate-900 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-200/60 pb-4">
          <div>
            <span className="rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/30 px-3 py-0.5 text-[11px] font-black uppercase inline-block mb-1.5">
              Active Offer
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">10% Flat Discount — On Every Order</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">No minimum order value. Valid on all flame-grilled burgers, rolls & snack packs. Apply coupon BOB10!</p>
          </div>
          <span className="rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 px-3 py-1 text-xs font-black uppercase self-start sm:self-auto shadow-2xs">
            ● Active Now
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/90 border border-orange-200/70 p-5 text-center space-y-1.5 shadow-2xs">
            <p className="text-3xl font-black text-orange-600">10%</p>
            <p className="text-xs text-slate-700 font-bold">Flat Instant Discount</p>
          </div>
          <div className="rounded-2xl bg-white/90 border border-orange-200/70 p-5 text-center space-y-1.5 shadow-2xs">
            <p className="text-3xl font-black text-emerald-600">₹0</p>
            <p className="text-xs text-slate-700 font-bold">No Minimum Order</p>
          </div>
          <div className="rounded-2xl bg-white/90 border border-orange-200/70 p-5 text-center space-y-1.5 shadow-2xs">
            <p className="text-3xl font-black text-amber-600">∞</p>
            <p className="text-xs text-slate-700 font-bold">Unlimited Usage</p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-orange-200/60">
          <p className="text-xs text-slate-600 font-medium">Use coupon code <strong className="text-orange-600 font-black">BOB10</strong> at checkout to claim your 10% discount.</p>
          <button onClick={() => setView('menu')} className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-xs font-black text-white hover:opacity-95 cursor-pointer shadow-md transition-all shrink-0">
            Order Now & Save 10% →
          </button>
        </div>
      </section>

      {/* PROMO CODE CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialOffers.map((offer) => (
          <div key={offer.id} className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <span className="rounded-md bg-orange-500/10 text-orange-600 px-2 py-0.5 text-[10px] font-black uppercase">
                {offer.badge}
              </span>
              <h3 className="font-bold text-base sm:text-lg mt-2">{offer.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{offer.desc}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="font-mono font-black text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-lg text-xs">{offer.code}</span>
              <button 
                onClick={() => { 
                  navigator.clipboard?.writeText?.(offer.code); 
                  toast.success(`Coupon code ${offer.code} copied! 🎉`); 
                }} 
                className="text-xs font-bold text-orange-500 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Copy size={13} /> Copy Code
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.main>
  )
}

/* ==================== CONTACT VIEW (EMBEDDED GOOGLE MAP & INFO) ==================== */
function ContactView({ setView }: { setView: (v: ViewType) => void }) {
  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 font-outfit space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <span className="rounded-full bg-orange-500/15 text-orange-600 px-3.5 py-1 text-xs font-black uppercase border border-orange-500/30">
          📍 BOB'S SATELLITE BASE STATION
        </span>
        <h1 className="font-outfit text-2xl sm:text-4xl md:text-5xl font-black mt-2">Contact & Visit Us</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Gourmet flame-grilled kitchen located in Marathahalli, Bengaluru.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: GOOGLE MAP EMBED */}
        <div className="lg:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border shadow-xl bg-card">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.2860005195657!2d77.69335637484109!3d12.953542087360153!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae13aa9b75ca81%3A0x93c183b2cb1a5db3!2sBob%E2%80%99s%20Satellite%20Kitchen!5e0!3m2!1sen!2sin!4v1787136176658!5m2!1sen!2sin" 
              width="100%" 
              height="450" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-80 sm:h-[450px]"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>📍 Pinned: Bob's Satellite Kitchen, Marathahalli Village</span>
            <a 
              href="https://maps.app.goo.gl/yTfF3f9E1sQzJ" 
              target="_blank" 
              rel="noreferrer" 
              className="text-orange-500 font-bold hover:underline flex items-center gap-1"
            >
              Open in Google Maps <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT CARDS & ACTIONS */}
        <div className="lg:col-span-5 space-y-4">
          {/* Address card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 font-bold">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-outfit text-base sm:text-lg font-black text-foreground">Kitchen Address</h3>
                <p className="text-xs text-muted-foreground">Main Outlet & Takeaway Counter</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
              1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Marathahalli, Bengaluru, Karnataka 560037
            </p>
            <div className="rounded-2xl bg-orange-500/10 p-3 border border-orange-500/20 text-xs font-bold text-orange-600">
              ⚡ Delivery Zone: Exclusively within 3 km radius of Marathahalli. Takeaway available for everyone!
            </div>
          </div>

          {/* Contact number card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="font-outfit text-base sm:text-lg font-black text-foreground">Contact & Support</h3>
                <p className="text-xs text-muted-foreground">Order inquiries & feedback</p>
              </div>
            </div>
            <p className="font-outfit text-xl font-black text-foreground">
              +91 95507 64604
            </p>
            <div className="flex gap-2">
              <a
                href="tel:9550764604"
                className="flex-1 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white text-center hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Phone size={14} /> Call Now
              </a>
              <a
                href="https://wa.me/919550764604"
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 py-2.5 text-xs font-black text-center hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>
          </div>

          {/* FSSAI Registration Card */}
          <div className="rounded-3xl border border-orange-200 bg-orange-50/60 p-5 sm:p-6 shadow-sm space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-500 text-white font-bold">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-outfit text-base sm:text-lg font-black text-slate-900">FSSAI Certified Kitchen</h3>
                <p className="text-xs text-slate-500">Government of Karnataka Food Safety Authority</p>
              </div>
            </div>
            <p className="font-mono text-sm font-black text-orange-600">
              Registration No: 21226188004151
            </p>
            <p className="text-xs text-slate-600">
              1067, 8th Main Rd, Kaveri Layout, Mahadevapura, B.B.M.P East, Karnataka - 560037 (Near LAGNAM designer studio)
            </p>
            <p className="text-[11px] text-emerald-700 font-bold">
              ✓ 100% Food Safety Compliant · Valid up to 18-08-2027
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  )
}

/* ==================== SPECIALS VIEW ==================== */
function SpecialsView({ setView }: { setView: (v: ViewType) => void }) {
  const fusionSnackPackItems = menuItems.filter((i) => i.category === 'Fusion Snack Pack')
  const addToCart = useAppStore((s) => s.addToCart)

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 font-outfit space-y-8">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-orange-950 p-6 sm:p-10 text-white shadow-2xl border border-orange-500/30">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-400 border border-orange-500/30">
            🔥 SIGNATURE RECIPES
          </span>
          <h1 className="font-outfit text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
            Fusion Snack Packs & Artisanal Rolls
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            Paneer & Chicken Tikka snack packs with golden fries, plus tawa grilled rolls folded in warm wraps. Strictly delivered within 3 km in Marathahalli.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button onClick={() => setView('menu')} className="rounded-full bg-orange-500 px-5 sm:px-6 py-2.5 text-xs font-black text-white hover:bg-orange-600 shadow-lg cursor-pointer transition-all">
              Order Now From Menu →
            </button>
            <button onClick={() => setView('offers')} className="rounded-full border border-white/20 bg-white/10 px-5 sm:px-6 py-2.5 text-xs font-bold text-white hover:bg-white/20 cursor-pointer transition-all">
              View Cafe Coins Deals
            </button>
          </div>
        </div>
      </div>

      {/* FUSION SNACK PACK GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fusionSnackPackItems.map((item) => (
          <div key={item.id} className="relative flex flex-col justify-between rounded-3xl border border-border bg-card p-4 shadow-sm hover:border-orange-500/60 transition-all">
            <div>
              <img src={item.image} alt={item.name} className="h-44 w-full rounded-2xl object-cover mb-3" />
              <div className="flex items-center justify-between">
                <span className={`rounded-md px-2 py-0.5 text-[9.5px] font-black uppercase text-white ${item.veg ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                  {item.veg ? 'Pure Veg' : 'Non-Veg'}
                </span>
                <span className="rounded-md bg-orange-500/20 text-orange-600 px-2 py-0.5 text-[9.5px] font-black uppercase">
                  {item.specialOfferBadge || 'SIGNATURE'}
                </span>
              </div>
              <h3 className="font-outfit text-base font-extrabold text-foreground mt-2">{item.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="font-outfit text-lg font-black text-orange-600">{formatPrice(item.price)}</span>
              <button
                onClick={() => {
                  addToCart(item)
                  toast.success(`Added ${item.name} to cart! 🍔`)
                }}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 shadow transition-all cursor-pointer"
              >
                + Add to Basket
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.main>
  )
}

/* ==================== STORY & REVIEWS & FAQ VIEWS ==================== */
function StoryView() {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl px-3 sm:px-6 py-10 font-outfit space-y-6 text-center">
      <h1 className="font-outfit text-3xl sm:text-5xl font-black text-foreground">Born in Marathahalli, Bengaluru.</h1>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
        Crafted at 1067, 8th Main Rd, Kaveri Layout, Marathahalli. Serving 100% flame-grilled patties, artisanal roomali rolls, and 12-spice Peri Peri fries to Bengaluru food lovers with an express 3 km radius.
      </p>
      <div className="grid gap-3 sm:grid-cols-3 pt-6 text-left">
        <div className="rounded-2xl border p-4 bg-card">
          <p className="font-black text-orange-500 text-lg">01</p>
          <h4 className="font-bold text-sm mt-1">Lava-Stone Grilling</h4>
          <p className="text-xs text-muted-foreground mt-1">Patties grilled on 400°C open flames locking in rich juices.</p>
        </div>
        <div className="rounded-2xl border p-4 bg-card">
          <p className="font-black text-orange-500 text-lg">02</p>
          <h4 className="font-bold text-sm mt-1">3 KM Strict Radius</h4>
          <p className="text-xs text-muted-foreground mt-1">Hot and crispy delivery under 20-25 minutes in Marathahalli.</p>
        </div>
        <div className="rounded-2xl border p-4 bg-card">
          <p className="font-black text-orange-500 text-lg">03</p>
          <h4 className="font-bold text-sm mt-1">FSSAI Certified</h4>
          <p className="text-xs text-muted-foreground mt-1 font-mono">Lic. 21226188004151 · 100% compliant food safety hygiene.</p>
        </div>
      </div>
    </motion.main>
  )
}

function ReviewsView() {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-10 font-outfit">
      <h1 className="font-outfit text-xl sm:text-3xl md:text-4xl font-black text-center mb-6">What Foodies Say</h1>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {customerReviews.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-1 text-orange-500 font-black text-xs">
              {'★'.repeat(r.rating)}
            </div>
            <p className="text-xs italic text-foreground">"{r.comment}"</p>
            <div className="pt-2 border-t text-[11px]">
              <p className="font-bold text-foreground">{r.name}</p>
              <p className="text-muted-foreground">{r.location}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.main>
  )
}

function FaqView() {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl px-3 sm:px-4 py-8 font-outfit space-y-4">
      <h1 className="font-outfit text-2xl font-black text-center mb-4">Frequently Asked Questions</h1>
      <div className="space-y-2.5">
        {faqItems.map((faq, index) => (
          <div key={index} className="rounded-2xl border bg-card p-4 text-xs space-y-1">
            <h4 className="font-bold text-foreground text-sm">{faq.question}</h4>
            <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </motion.main>
  )
}

/* ==================== COMPLETE CHECKOUT WITH UPI QR SCANNER & 5-DIGIT TXN ID ==================== */
function Checkout({ 
  selectedAddress, 
  onBack, 
  onOpenPermissions,
  onOpenTracking
}: { 
  selectedAddress?: string; 
  onBack: () => void; 
  onOpenPermissions: () => void;
  onOpenTracking: (id: string) => void;
}) {
  const cart = useAppStore((s) => s.cart)
  const user = useAppStore((s) => s.user)
  const placeOrder = useAppStore((s) => s.placeOrder)
  const login = useAppStore((s) => s.login)
  const updateQuantity = useAppStore((s) => s.updateQuantity)

  // Order mode state
  const [orderMode, setOrderModeState] = useState<OrderMode>('Delivery')
  const [selectedTable, setSelectedTable] = useState('Table 1')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi')
  const [upiTransactionId, setUpiTransactionId] = useState('')
  const [noContact, setNoContact] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(0)
  const [chefNote, setChefNote] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [placedId, setPlacedId] = useState('')

  // Dynamic QR Payment State
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrOrderId, setQrOrderId] = useState<string>('')
  const [qrUpiUri, setQrUpiUri] = useState<string>('')
  const [timerSeconds, setTimerSeconds] = useState(PAYMENT_TIMEOUT_SECONDS)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'paid' | 'expired'>('idle')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Guest input state if not logged in
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [saveAccount, setSaveAccount] = useState(true)

  // Subtotal and Fee calculations
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const deliveryFee = orderMode !== 'Delivery' || subtotal >= 300 || subtotal === 0 ? 0 : 35
  const platformFee = cart.length > 0 ? 10 : 0
  const taxes = Math.round(subtotal * 0.05)
  const total = Math.max(0, subtotal + deliveryFee + platformFee + taxes - discount)

  // Calculate Cafe Coins earned on this order
  const { coins: earnedCoins } = calculateCoinsEarned(subtotal)

  // Active address
  const activeAddr = selectedAddress || user?.address || '1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru 560037'

  // Distance estimation
  const estimatedDist = 1.2 // defaults near Marathahalli
  const isOutside3km = orderMode === 'Delivery' && estimatedDist > 3.0

  // Generate dynamic QR code
  const generatePaymentQR = useCallback(async () => {
    if (total <= 0) return
    const orderId = generateOrderId()
    setQrOrderId(orderId)
    const upiUri = generateUpiUri(total, orderId)
    setQrUpiUri(upiUri)
    
    try {
      const dataUrl = await QRCode.toDataURL(upiUri, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(dataUrl)

      // Create order in Supabase as PENDING
      await supabase.from('orders').insert({
        order_id: orderId,
        amount: total,
        status: 'PENDING',
        customer_name: user?.name || guestName || 'Guest',
        customer_phone: user?.phone || guestPhone || '',
        customer_email: user?.email || guestEmail || '',
        delivery_address: activeAddr,
        order_mode: orderMode,
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
        expires_at: new Date(Date.now() + PAYMENT_TIMEOUT_SECONDS * 1000).toISOString(),
      })

      // Start 3-minute countdown timer
      setTimerSeconds(PAYMENT_TIMEOUT_SECONDS)
      setIsTimerActive(true)
      setPaymentStatus('waiting')

    } catch (err) {
      console.error('QR generation error:', err)
      toast.error('Failed to generate QR code')
    }
  }, [total, user, guestName, guestPhone, guestEmail, activeAddr, orderMode, cart])

  // Timer countdown
  useEffect(() => {
    if (!isTimerActive) return
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setIsTimerActive(false)
          setPaymentStatus('expired')
          if (pollingRef.current) clearInterval(pollingRef.current)
          // Mark order as expired in Supabase
          if (qrOrderId) {
            supabase.from('orders').update({ status: 'EXPIRED' }).eq('order_id', qrOrderId)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isTimerActive, qrOrderId])

  // Poll payment status every 4 seconds
  useEffect(() => {
    if (paymentStatus !== 'waiting' || !qrOrderId) return
    pollingRef.current = setInterval(async () => {
      try {
        // Direct Supabase lookup (instant, universal, zero server dependency)
        const { data: orderData } = await supabase
          .from('orders')
          .select('status, upi_transaction_id')
          .eq('order_id', qrOrderId)
          .single()

        if (orderData?.status === 'PAID') {
          setPaymentStatus('paid')
          setIsTimerActive(false)
          if (pollingRef.current) clearInterval(pollingRef.current)
          if (timerRef.current) clearInterval(timerRef.current)
          setUpiTransactionId(orderData.upi_transaction_id || qrOrderId)
          toast.success('Payment verified! Confirming your order...')
          setTimeout(() => {
            handleConfirmOrder(qrOrderId, orderData.upi_transaction_id || '')
          }, 1000)
          return
        }

        // Fallback to API route if present
        const res = await fetch(`/api/check-payment-status?order_id=${qrOrderId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'PAID') {
            setPaymentStatus('paid')
            setIsTimerActive(false)
            if (pollingRef.current) clearInterval(pollingRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
            setUpiTransactionId(data.upi_transaction_id || qrOrderId)
            toast.success('Payment verified! Confirming your order...')
            setTimeout(() => {
              handleConfirmOrder(qrOrderId, data.upi_transaction_id || '')
            }, 1000)
          }
        }
      } catch {
        // Polling error - ignore and retry
      }
    }, PAYMENT_POLL_INTERVAL_MS)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [paymentStatus, qrOrderId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Regenerate QR when payment method is UPI and total changes
  useEffect(() => {
    if (paymentMethod === 'upi' && total > 0 && paymentStatus === 'idle') {
      generatePaymentQR()
    }
  }, [paymentMethod, total])

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || coupon).trim().toUpperCase()
    if (code === 'BOB10') {
      const disc = Math.round(subtotal * 0.1)
      setDiscount(disc)
      toast.success(`Coupon BOB10 applied! Saved ₹${disc} (10% off) 🎉`)
    } else {
      toast.error('Invalid coupon code. Try "BOB10" for 10% flat discount')
    }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleConfirmOrder = (overrideOrderId?: string, overrideTxnId?: string) => {
    if (cart.length === 0) return toast.error('Your basket is empty!')

    // Validate phone number
    const finalPhone = user?.phone || guestPhone.trim()
    if (!finalPhone) {
      return toast.error('Please enter a valid Phone Number!')
    }

    // If delivery, validate name & email
    const finalName = user?.name || guestName.trim() || 'Foodie'
    const finalEmail = user?.email || guestEmail.trim() || 'foodie@bobs.com'

    if (orderMode === 'Delivery' && !user && !guestEmail.trim()) {
      return toast.error('Email ID is required for delivery receipts!')
    }

    // For UPI: auto-detected via PipraPay or default generated reference
    const finalTxnId = overrideTxnId || upiTransactionId.trim() || qrOrderId || `BSK-UPI-${Date.now().toString().slice(-6)}`

    // Auto-register user if not logged in
    if (!user && saveAccount && finalPhone) {
      login(finalName, finalEmail, finalPhone, activeAddr)
    }

    const targetAddress = orderMode === 'Dining in' 
      ? selectedTable 
      : orderMode === 'Takeaway' 
      ? 'Takeaway Pickup (Kaveri Layout Outlet, Marathahalli)' 
      : activeAddr

    const id = placeOrder({
      mode: orderMode,
      deliveryAddress: targetAddress,
      tableNo: selectedTable,
      customerName: finalName,
      customerPhone: finalPhone,
      customerEmail: finalEmail,
      paymentMethod: paymentMethod === 'upi' ? 'UPI QR Instant (PipraPay)' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery',
      transactionId: finalTxnId || (overrideOrderId || undefined),
      discount,
      appliedCoupon: coupon,
      coinsEarned: earnedCoins,
      distanceKm: estimatedDist,
    })

    // Update Supabase order status
    if (overrideOrderId || qrOrderId) {
      supabase.from('orders').update({ status: 'PAID' }).eq('order_id', overrideOrderId || qrOrderId)
    }

    // Cleanup timers
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    setPlacedId(id)
    setIsCompleted(true)
    toast.success(`Order #${id} Confirmed! 🎉`)
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] py-8 sm:py-12 px-3 sm:px-4 font-outfit flex flex-col items-center justify-center text-slate-900">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-3xl">
            ✓
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-600 uppercase">
            Order Placed Successfully
          </span>
          <h2 className="font-outfit text-2xl font-black text-slate-900">Order #{placedId}</h2>
          <p className="text-xs text-slate-500">
            Thank you! Your order has been dispatched to Bob's Kitchen line. You can track live progress below.
          </p>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-left text-xs space-y-2 font-outfit">
            <p className="font-bold text-slate-700">Mode: <span className="text-orange-600 font-extrabold">{orderMode}</span></p>
            <p className="font-bold text-slate-700 truncate">Address: <span className="text-slate-900 font-bold">{orderMode === 'Takeaway' ? 'Takeaway Pickup · Kaveri Layout Outlet' : activeAddr}</span></p>
            <p className="font-bold text-slate-700">Payment Method: <span className="uppercase text-slate-900 font-extrabold">{paymentMethod}</span></p>
            {upiTransactionId && (
              <p className="font-bold text-slate-700">UPI Ref / UTR: <span className="font-mono text-emerald-600 font-bold">{upiTransactionId}</span></p>
            )}
            <p className="font-bold text-slate-700 pt-1 border-t border-slate-200">Total Paid: <span className="font-black text-slate-900 text-sm">{formatPrice(total)}</span></p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => onOpenTracking(placedId)}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-black text-white shadow-lg cursor-pointer hover:scale-105 transition-all font-outfit"
            >
              Track Live Order ➔
            </button>
            <button
              onClick={onBack}
              className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all font-outfit"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-slate-900 font-outfit pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 sm:px-8 shadow-xs font-outfit">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-outfit text-base sm:text-xl font-black text-slate-900">SECURE CHECKOUT</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">
                🔒 256-Bit SSL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 font-outfit">
            <span className="flex items-center gap-1 text-slate-900 font-black">
              <User size={15} className="text-orange-500" /> {user?.name || 'Guest Foodie'}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CHECKOUT BODY */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 font-outfit">
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN: 1. ACCOUNT, 2. FULFILLMENT, 3. PAYMENT (UPI QR) */}
          <div className="lg:col-span-7 space-y-4 font-outfit">
            
            {/* STEP 1: ACCOUNT DETAILS MECHANISM */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-outfit text-base sm:text-lg font-black text-slate-900">1. Customer Contact & Account</h3>
                    <p className="text-xs text-slate-500">
                      {user ? 'Logged in · Details automatically fetched from your account' : 'Enter your contact details (Phone number is mandatory)'}
                    </p>
                  </div>
                </div>
                {user && (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase">
                    Auto-Fetched ✓
                  </span>
                )}
              </div>

              {user ? (
                /* Auto-fetched logged-in view */
                <div className="rounded-2xl bg-orange-50/50 p-4 border border-orange-200 text-xs font-outfit space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <User size={15} className="text-orange-500" />
                      <span>{user.name}</span>
                    </p>
                    <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-100/80 px-2 py-0.5 rounded-md">Verified Account</span>
                  </div>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone size={13} className="text-orange-500" />
                    <span>Phone: <strong className="text-slate-900 font-mono">{user.phone || '9550764604'}</strong></span>
                  </p>
                  {user.email && (
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <span className="text-orange-500 font-bold">@</span>
                      <span>Email: <strong className="text-slate-900">{user.email}</strong></span>
                    </p>
                  )}
                </div>
              ) : (
                /* Guest form if not logged in */
                <div className="space-y-3 pt-1">
                  {orderMode === 'Delivery' ? (
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Your Full Name</label>
                        <input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Phone Number (Mandatory *)</label>
                        <input
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="e.g. 9550764604"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-none font-bold"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block mb-1">Email ID (for live SMS & bill receipt)</label>
                        <input
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="e.g. rahul@example.com"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    /* Takeaway guest form: Only phone number and optional name */
                    <div className="space-y-2 text-xs">
                      <div className="rounded-xl bg-orange-500/10 p-2.5 border border-orange-500/20 text-orange-700 text-xs font-bold flex items-center gap-2">
                        <Package size={15} className="shrink-0 text-orange-600" />
                        <span>Takeaway selected: You only need to provide your Phone Number for pickup!</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Phone Number (Mandatory *)</label>
                          <input
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="e.g. 9550764604"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-none font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Name (Optional)</label>
                          <input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. Rahul"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAccount}
                      onChange={(e) => setSaveAccount(e.target.checked)}
                      className="accent-orange-500"
                    />
                    <span>Save my details so I don&apos;t have to enter them next time</span>
                  </label>
                </div>
              )}
            </div>

            {/* STEP 2: FULFILLMENT MODE & MARATHAHALLI 3KM RADIUS CHECK */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 font-outfit">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-xs">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-outfit text-base sm:text-lg font-black text-slate-900">2. Fulfillment & Delivery Radius</h3>
                  <p className="text-xs text-slate-500">We only deliver for Marathahalli within 3 km radius</p>
                </div>
              </div>

              {/* Mode Switcher - Delivery or Takeaway only */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200 font-outfit">
                <button
                  type="button"
                  onClick={() => setOrderModeState('Delivery')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
                    orderMode === 'Delivery'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bike size={16} />
                  <span>Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModeState('Takeaway')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
                    orderMode === 'Takeaway'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package size={16} />
                  <span>Takeaway</span>
                </button>
              </div>

              {orderMode === 'Delivery' && (
                <div className="space-y-3 font-outfit">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider font-outfit">Selected Delivery Address</span>
                      <button onClick={onOpenPermissions} className="text-orange-600 font-bold hover:underline cursor-pointer">Change Pin</button>
                    </div>
                    <p className="font-bold text-slate-900 leading-relaxed text-xs sm:text-sm font-outfit">
                      {activeAddr}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                      <span>Marathahalli Central Kitchen Dispatch</span>
                      <span className="text-emerald-600 font-bold">Within 3 km Radius ✓</span>
                    </div>
                  </div>

                  {/* No-contact Delivery Checkbox */}
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 cursor-pointer hover:border-orange-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={noContact}
                      onChange={(e) => setNoContact(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-orange-500"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900">Opt in for No-contact Delivery</p>
                      <p className="text-slate-500 text-[11px]">Partner will safely place food outside your door in Marathahalli.</p>
                    </div>
                  </label>
                </div>
              )}

              {orderMode === 'Takeaway' && (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-xs space-y-1.5 font-outfit">
                  <p className="font-bold text-orange-700 text-sm">Self Pickup at Base Outlet</p>
                  <p className="text-slate-600">
                    <strong>1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru (560037)</strong>
                  </p>
                  <p className="text-slate-500 text-[11px]">Your meal will be packed piping hot in 15 mins. No delivery fee charged!</p>
                </div>
              )}
            </div>

            {/* STEP 3: PAYMENT METHOD */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 font-outfit">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-outfit text-base sm:text-lg font-black text-slate-900">3. Payment Option</h3>
                  <p className="text-xs text-slate-500">Scan dynamic UPI QR or choose Pay on Delivery</p>
                </div>
              </div>

              {/* Payment Selector */}
              <div className="space-y-2.5">
                {[
                  { id: 'upi', title: 'UPI Instant Scan & Pay (GPay / PhonePe / Paytm)', desc: 'Scan dynamic QR code · Auto-verified via PipraPay', badge: 'Recommended' },
                  { id: 'card', title: 'Credit & Debit Cards', desc: 'Visa, Mastercard, RuPay & Diners Club' },
                  { id: 'cod', title: 'Cash on Delivery (COD) / Pay on Pickup', desc: 'Pay after receiving your order' },
                ].map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
                      paymentMethod === pm.id
                        ? 'border-orange-500 bg-orange-500/5 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === pm.id}
                        onChange={() => setPaymentMethod(pm.id as any)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{pm.title}</p>
                        <p className="text-[11px] text-slate-500">{pm.desc}</p>
                      </div>
                    </div>
                    {pm.badge && (
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase">
                        {pm.badge}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* ENHANCED WARM DYNAMIC UPI QR PAYMENT CARD */}
              {paymentMethod === 'upi' && (
                <div className="rounded-3xl border-2 border-orange-200/90 bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-white p-5 sm:p-6 text-slate-900 shadow-md space-y-5 animate-in fade-in">
                  
                  {/* Timer Bar */}
                  {paymentStatus === 'waiting' && (
                    <div className="rounded-2xl bg-white/90 border border-orange-200/80 p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-orange-600 font-extrabold">
                          <Clock size={14} className="animate-pulse text-orange-500" />
                          <span>Payment Window Active</span>
                        </span>
                        <span className={`font-mono font-black text-base px-2.5 py-0.5 rounded-lg ${
                          timerSeconds <= 30
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : timerSeconds <= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {formatTimer(timerSeconds)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            timerSeconds <= 30 ? 'bg-rose-500' : timerSeconds <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${(timerSeconds / PAYMENT_TIMEOUT_SECONDS) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Status Badges */}
                  {paymentStatus === 'paid' && (
                    <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 flex items-center gap-3 text-emerald-900 shadow-xs">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-emerald-800">Payment Successfully Verified! 🎉</p>
                        <p className="text-xs text-emerald-700">PipraPay detected your UPI transaction. Confirming order...</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'expired' && (
                    <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 space-y-3 text-rose-900">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={24} className="text-rose-600 shrink-0" />
                        <div>
                          <p className="text-sm font-black text-rose-800">QR Code Expired</p>
                          <p className="text-xs text-rose-600">The 3-minute payment window elapsed. Generate a fresh QR code to proceed.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPaymentStatus('idle'); generatePaymentQR(); }}
                        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-2.5 text-xs font-black text-white shadow-sm cursor-pointer transition-all"
                      >
                        Generate Fresh QR Code →
                      </button>
                    </div>
                  )}

                  {/* QR Code Presentation Box */}
                  {paymentStatus !== 'expired' && (
                    <div className="rounded-2xl bg-white border border-orange-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center gap-5">
                      
                      {/* DYNAMIC QR CODE WITH WARM ACCENT FRAME OR BLURRED PLACEHOLDER */}
                      <div className="relative size-44 sm:size-48 rounded-2xl bg-white p-2.5 shrink-0 shadow-md border-2 border-orange-400 flex items-center justify-center overflow-hidden">
                        {paymentStatus === 'waiting' && qrDataUrl ? (
                          <>
                            <img 
                              src={qrDataUrl} 
                              alt={`UPI QR for ${qrOrderId}`} 
                              className="size-full object-contain"
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[9px] font-black text-white shadow-sm whitespace-nowrap flex items-center gap-1 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                              <span>Live Auto-Detection</span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Blurred QR Placeholder Mockup */}
                            <div className="size-full flex items-center justify-center filter blur-[5px] opacity-60 select-none">
                              <QrCode size={130} className="text-slate-800" />
                            </div>
                            {/* Interactive Overlay Button */}
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] p-2 flex flex-col items-center justify-center text-center gap-1.5 z-10">
                              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wide">
                                Dynamic UPI QR
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!user?.phone && !guestPhone.trim()) {
                                    toast.error('Please enter your phone number first!')
                                    return
                                  }
                                  generatePaymentQR()
                                }}
                                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                              >
                                <Zap size={13} className="fill-white" />
                                <span>Generate QR</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Payee Info & Quick Actions */}
                      <div className="space-y-2.5 text-center sm:text-left flex-1">
                        <div>
                          <span className="rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase inline-block">
                            Scan with Any UPI App
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-1">Bob&apos;s Satellite Kitchen</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Payable Amount: <strong className="text-orange-600 text-base font-black">{formatPrice(total)}</strong>
                          </p>
                          {qrOrderId ? (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Order ID: <span className="font-bold text-slate-700">{qrOrderId}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Click <strong className="text-orange-600">Generate QR</strong> to create an instant dynamic UPI code.
                            </p>
                          )}
                        </div>

                        {/* UPI ID with 1-click Copy */}
                        <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs">
                          <span className="font-mono text-slate-700 font-bold text-[11px]">{UPI_CONFIG.vpa}</span>
                          <button 
                            type="button" 
                            onClick={() => { navigator.clipboard?.writeText?.(UPI_CONFIG.vpa); toast.success('UPI ID copied!'); }} 
                            className="text-orange-600 hover:text-orange-700 font-extrabold text-[11px] ml-1 cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>

                        {/* Deep link button to launch UPI app on mobile */}
                        {qrUpiUri && (
                          <div>
                            <a 
                              href={qrUpiUri}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white hover:opacity-95 shadow-sm transition-all cursor-pointer"
                            >
                              <Zap size={13} />
                              <span>Open GPay / PhonePe / Paytm →</span>
                            </a>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 font-medium leading-tight">
                          ✨ Just scan &amp; complete payment. PipraPay will automatically verify and confirm your meal!
                        </p>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* CONFIRM ORDER BUTTON */}
              <button
                onClick={() => handleConfirmOrder()}
                disabled={cart.length === 0 || (paymentMethod === 'upi' && paymentStatus === 'expired')}
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {paymentStatus === 'paid' ? '✅ PAYMENT VERIFIED — CONFIRM ORDER' : `PAY ${formatPrice(total)} & CONFIRM ORDER →`}
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY & OFFERS */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 font-outfit">
              
              {/* Restaurant Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
                  🍔
                </div>
                <div>
                  <h4 className="font-outfit font-black text-sm text-slate-900">Bob's Satellite Kitchen</h4>
                  <p className="text-[11px] text-slate-500">1067, 8th Main Rd, Kaveri Layout, Marathahalli</p>
                </div>
              </div>

              {/* Items List */}
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold text-xs">
                  Your basket is empty. Add dishes from menu!
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 border-b border-slate-100 pb-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${item.veg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-slate-600 font-bold hover:text-orange-500 cursor-pointer">-</button>
                          <span className="font-black text-slate-900 text-[11px]">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-slate-600 font-bold hover:text-orange-500 cursor-pointer">+</button>
                        </div>
                        <span className="font-black text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CAFE COINS CASHBACK NOTIFICATION */}

              {/* Coupon Box */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Enter Coupon (e.g. BOB10)"
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs uppercase font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 shadow-xs transition-all cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick Offer Tags */}
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <button onClick={() => handleApplyCoupon('BOB10')} className="rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-1 hover:bg-orange-500/20 cursor-pointer">
                    🔥 BOB10 (10% FLAT OFF)
                  </button>
                </div>
              </div>

              {/* Detailed Bill Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="text-slate-900 font-bold">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee | Marathahalli 3km</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-900 font-bold'}>
                    {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Packaging & Platform Fee</span>
                  <span className="text-slate-900 font-bold">{formatPrice(platformFee)}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST & Govt Taxes (5%)</span>
                  <span className="text-slate-900 font-bold">{formatPrice(taxes)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Extra Offer Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-outfit text-slate-900">
                  <span className="text-sm font-black uppercase">TO PAY</span>
                  <span className="text-xl font-black text-orange-600">{formatPrice(total)}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

/* ==================== MAIN RESTAURANT APP EXPORT ==================== */
export function RestaurantApp({ onAccount }: { onAccount: () => void }) {
  const [view, setView] = useState<ViewType>('home')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [trackingModalOrderId, setTrackingModalOrderId] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState('1067, 8th Main Rd, Kaveri Layout, Marathahalli')

  const user = useAppStore((s) => s.user)
  const updateUser = useAppStore((s) => s.updateUser)

  /* Geolocation prompt on first load */
  useEffect(() => {
    try {
      const hasPrompted = localStorage.getItem('bobs_first_visit_prompted')
      if (!hasPrompted) {
        localStorage.setItem('bobs_first_visit_prompted', 'true')

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude
              const lng = pos.coords.longitude
              const dist = calculateDistanceKm(KITCHEN_LAT, KITCHEN_LNG, lat, lng)
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                const data = await res.json()
                const readable = data.display_name || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`
                setSelectedLocation(readable)
                updateUser({ address: readable })
                toast.success(`Current location: ${dist} km from Marathahalli Kitchen 📍`)
              } catch {
                const fallback = `1067, 8th Main Rd, Kaveri Layout, Marathahalli (${dist} km)`
                setSelectedLocation(fallback)
                updateUser({ address: fallback })
              }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
          )
        }
      }
    } catch {}
  }, [])

  const handleSetView = (v: ViewType) => {
    setView(v)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategorySelectFromHome = (catName: string) => {
    setSelectedCategory(catName)
    handleSetView('menu')
  }

  const handleProfileClick = () => {
    if (!user) setAuthModalOpen(true)
    else setProfileDrawerOpen(true)
  }

  const handleOpenTracking = (orderId: string) => {
    setTrackingModalOrderId(orderId)
  }

  const navDrawerLinks: { id: ViewType; label: string; icon: any }[] = [
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'offers', label: 'Orbit Deals & Cashback', icon: Tag },
    { id: 'specials', label: 'Our Specials', icon: Flame },
    { id: 'contact', label: 'Contact Us & Map', icon: Phone },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'story', label: 'Our Story', icon: Info },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ]

  const renderCurrentView = () => {
    switch (view) {
      case 'home':
        return <HomeView setView={handleSetView} onSelectCategory={handleCategorySelectFromHome} onOpenPermissions={() => setAddressModalOpen(true)} />
      case 'menu':
        return <MenuView onBack={() => handleSetView('home')} initialCategory={selectedCategory} />
      case 'offers':
        return <OffersView setView={handleSetView} />
      case 'specials':
        return <SpecialsView setView={handleSetView} />
      case 'story':
        return <StoryView />
      case 'reviews':
        return <ReviewsView />
      case 'contact':
        return <ContactView setView={handleSetView} />
      case 'faq':
        return <FaqView />
      case 'checkout':
        return (
          <Checkout 
            selectedAddress={selectedLocation} 
            onBack={() => handleSetView('home')} 
            onOpenPermissions={() => setAddressModalOpen(true)} 
            onOpenTracking={handleOpenTracking}
          />
        )
      default:
        return <HomeView setView={handleSetView} onSelectCategory={handleCategorySelectFromHome} onOpenPermissions={() => setAddressModalOpen(true)} />
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-foreground flex flex-col justify-between font-sans">
      <div>
        {/* HEADER */}
        <FormattedHeader 
          activeView={view} 
          setView={handleSetView} 
          onCart={() => handleSetView('checkout')} 
          onMenu={() => setMobileOpen(true)} 
          onAccount={handleProfileClick} 
          onOpenPermissions={() => setAddressModalOpen(true)} 
          currentAddress={selectedLocation}
        />

        {/* MOBILE DRAWER */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              key="mobile-drawer-overlay"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-hidden lg:hidden font-sans bg-black/65 backdrop-blur-md" 
              onClick={() => setMobileOpen(false)}
            >
              <motion.aside 
                key="mobile-drawer-panel"
                initial={{ opacity: 0, x: '-100%' }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: '-100%' }} 
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-0 flex h-full w-[80vw] sm:w-[60vw] md:w-[45vw] max-w-sm flex-col bg-background text-foreground shadow-2xl border-r border-border font-outfit justify-between"
              >
                <div>
                  <div className="relative border-b border-orange-200 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-4 text-white">
                    <button 
                      onClick={() => setMobileOpen(false)} 
                      className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>

                    <div className="pr-6">
                      <Logo compact />
                      <p className="mt-2 text-[10px] text-white/70">Flame-Grilled Gourmet Feast · Marathahalli</p>
                    </div>

                    <button
                      onClick={() => { setMobileOpen(false); setAddressModalOpen(true); }}
                      className="mt-3.5 flex w-full items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/15 p-2 text-xs font-bold text-orange-300 backdrop-blur cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-orange-400 shrink-0" />
                        <span className="truncate">{selectedLocation}</span>
                      </span>
                      <span className="text-[9px] bg-orange-500 text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">Change</span>
                    </button>
                  </div>

                  <nav className="p-3 space-y-1 font-outfit text-sm font-bold">
                    {navDrawerLinks.map((item) => {
                      const Icon = item.icon
                      const isActive = view === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSetView(item.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-orange-500 text-white font-extrabold shadow-sm' 
                              : 'text-foreground hover:bg-secondary hover:text-orange-500'
                          }`}
                        >
                          <Icon size={16} className={isActive ? 'text-white' : 'text-orange-500'} />
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>

                <div className="p-4 border-t border-border space-y-2 bg-secondary/30">
                  <button 
                    onClick={() => { setMobileOpen(false); handleProfileClick(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-card py-2.5 text-xs font-extrabold text-foreground hover:bg-orange-500 hover:text-white transition-all cursor-pointer shadow-xs"
                  >
                    <User size={15} className="text-orange-500" />
                    <span>{user ? `Account (${user.name.split(' ')[0]})` : 'Sign In / Register'}</span>
                  </button>

                  <button 
                    onClick={() => handleSetView('menu')}
                    className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-extrabold text-white text-center shadow-md hover:bg-orange-600 transition-all cursor-pointer"
                  >
                    Explore Food Menu →
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {renderCurrentView()}
        </AnimatePresence>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card px-4 sm:px-8 py-8 sm:py-12 mt-12 font-outfit pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pb-8 border-b border-border/60">
          <div>
            <Logo />
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-xs">
              BOB'S Satellite Kitchen delivers flame-grilled patties, wraps, and gourmet snack packs within 3 km from Kaveri Layout, Marathahalli, Bengaluru.
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground mb-2.5">Quick Links</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <li><button onClick={() => handleSetView('menu')} className="hover:text-orange-500 cursor-pointer">Food Menu</button></li>
              <li><button onClick={() => handleSetView('offers')} className="hover:text-orange-500 cursor-pointer">Orbit Deals & Cafe Coins</button></li>
              <li><button onClick={() => handleSetView('specials')} className="hover:text-orange-500 cursor-pointer">Our Specials</button></li>
              <li><button onClick={() => handleSetView('story')} className="hover:text-orange-500 cursor-pointer">Our Story</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground mb-2.5">Customer Care & Map</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-muted-foreground">
              <li><button onClick={() => handleSetView('contact')} className="hover:text-orange-500 cursor-pointer">Contact Us & Google Map</button></li>
              <li><button onClick={() => handleSetView('reviews')} className="hover:text-orange-500 cursor-pointer">Customer Reviews</button></li>
              <li><button onClick={() => handleSetView('faq')} className="hover:text-orange-500 cursor-pointer">FAQs</button></li>
              <li><button onClick={handleProfileClick} className="hover:text-orange-500 cursor-pointer">My Account & Orders</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground mb-2.5">Food Safety & Compliance</h4>
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-orange-600 font-extrabold">
                <ShieldCheck size={16} />
                <span>fssai Certified FBO</span>
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-900">Lic. No: 21226188004151</p>
              <p className="text-[10px] text-muted-foreground">Govt of Karnataka · Valid up to 18-08-2027</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru 560037</p>
            <p className="text-xs text-muted-foreground mt-1">Phone: <strong>+91 95507 64604</strong></p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 text-center">
          <p>© 2026 BOB'S Satellite Kitchen · All Rights Reserved · FSSAI Reg. 21226188004151</p>
          <p className="font-bold">Marathahalli · Bengaluru · Flame-Grilled Gourmet Kitchen</p>
        </div>
      </footer>

      {/* FLOATING CART BUTTON */}
      <FloatingCartWidget onOpen={() => handleSetView('checkout')} />

      {/* STICKY LIVE TRACKING BOTTOM BAR */}
      <LiveTrackingBottomBar onOpenTracking={handleOpenTracking} />

      {/* DRAWERS & MODALS */}
      <UserProfileDrawer 
        open={profileDrawerOpen} 
        onClose={() => setProfileDrawerOpen(false)} 
        onSignInClick={() => setAuthModalOpen(true)} 
        onOpenPermissions={() => setAddressModalOpen(true)} 
        onOpenTracking={handleOpenTracking}
      />
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onAuthSuccess={() => setProfileDrawerOpen(true)} 
      />
      <AddressSelectionModal 
        open={addressModalOpen} 
        onClose={() => setAddressModalOpen(false)} 
        currentAddress={selectedLocation}
        onSelectAddress={(addr, dist) => {
          setSelectedLocation(addr)
          updateUser({ address: addr })
        }}
      />
      <OrderTrackingModal 
        orderId={trackingModalOrderId} 
        onClose={() => setTrackingModalOrderId(null)} 
      />
    </div>
  )
}
