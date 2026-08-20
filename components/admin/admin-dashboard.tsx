'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { categories, formatPrice, MenuItem } from '@/lib/menu-data'
import { InventoryItem, Order, useAppStore } from '@/lib/store'

// Dynamically import AdminMap to avoid SSR Leaflet issues
const AdminMap = dynamic(() => import('./admin-map').then((m) => m.AdminMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-slate-500 font-outfit">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading GPS Radar Map...</p>
      </div>
    </div>
  ),
})

const orderStatuses = [
  'Order Received',
  'Restaurant Accepted',
  'Preparing',
  'Packed',
  'Delivery Partner Assigned',
  'Picked Up',
  'Out For Delivery',
  'Delivered',
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'kds' | 'menu' | 'inventory' | 'analytics'>('map')

  // Store state
  const orders = useAppStore((s) => s.orders)
  const menuItems = useAppStore((s) => s.menuItems)
  const inventory = useAppStore((s) => s.inventory)
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus)

  const addMenuItem = useAppStore((s) => s.addMenuItem)
  const updateMenuItem = useAppStore((s) => s.updateMenuItem)
  const deleteMenuItem = useAppStore((s) => s.deleteMenuItem)
  const toggleItemAvailability = useAppStore((s) => s.toggleItemAvailability)

  const updateInventoryStock = useAppStore((s) => s.updateInventoryStock)
  const addInventoryItem = useAppStore((s) => s.addInventoryItem)

  // Filters & Search states
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('All')
  const [inventorySearch, setInventorySearch] = useState('')

  // Modals state
  const [isAddDishOpen, setIsAddDishOpen] = useState(false)
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null)

  // Form state for new/edit dish
  const [dishForm, setDishForm] = useState({
    name: '',
    category: 'Burgers',
    price: 99,
    description: '',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    veg: true,
    containsEgg: false,
    rating: 4.8,
    calories: 400,
    time: '12 min',
    bestseller: false,
    available: true,
  })

  // Form state for inventory
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: 'Bread & Buns' as InventoryItem['category'],
    stock: 50,
    unit: 'pcs',
    threshold: 20,
    costPerUnit: 15,
    supplier: 'Local Bakery',
  })

  // Calculate Key Performance Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0) + 18420
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length
  const lowStockCount = inventory.filter((item) => item.stock <= item.threshold).length
  const outOfStockCount = menuItems.filter((i) => i.available === false).length

  // Filtered menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedMenuCategory === 'All' || item.category === selectedMenuCategory
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.description.toLowerCase().includes(menuSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Filtered inventory items
  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.category.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.supplier.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dishForm.name.trim()) return toast.error('Dish name is required')

    if (editingDish) {
      updateMenuItem(editingDish.id, dishForm)
      toast.success(`Updated ${dishForm.name}`)
      setEditingDish(null)
    } else {
      addMenuItem(dishForm)
      toast.success(`Added ${dishForm.name} to menu! 🍔`)
    }
    setIsAddDishOpen(false)
  }

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inventoryForm.name.trim()) return toast.error('Ingredient name required')
    addInventoryItem(inventoryForm)
    toast.success(`Added ${inventoryForm.name} to inventory! 📦`)
    setIsAddInventoryOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-outfit pb-16 selection:bg-orange-500 selection:text-white">
      {/* Top Navigation Bar - Crisp White Theme */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-3 sm:px-6 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-8Cr2WCcP9wuThinpGdLL4Uy5dCY9Ri.png"
              alt="Bob's Satellite Logo"
              className="size-11 rounded-2xl object-cover ring-2 ring-orange-500/40 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-outfit text-lg sm:text-xl font-black text-slate-900 tracking-wide">
                  BOB&apos;S <span className="text-orange-500">SATELLITE</span>
                </span>
                <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-600">
                  Staff Admin Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Marathahalli Central Operations & Dispatch</p>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200 overflow-x-auto scrollbar-none">
              {[
                { id: 'map', label: 'GPS Delivery Radar', icon: MapPin, badge: activeOrdersCount },
                { id: 'kds', label: 'Kitchen Queue (KDS)', icon: ChefHat, badge: orders.filter(o => o.status === 'Preparing').length },
                { id: 'menu', label: 'Menu Control', icon: UtensilsCrossed },
                { id: 'inventory', label: 'Inventory Hub', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-rose-500' },
                { id: 'analytics', label: 'Revenue Analytics', icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`rounded-full ${tab.badgeColor || 'bg-orange-500/30'} text-white px-1.5 py-0.2 text-[10px] font-black`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <a
              href="/piprapay"
              className="hidden lg:flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-black shadow-sm transition-all"
            >
              <span>🐜 PipraPay Portal</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Performance Cards Header */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-orange-600">Today's Revenue</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <DollarSign size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{formatPrice(totalRevenue)}</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-bold">
              <ArrowUpRight size={14} /> +18.4% vs yesterday
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-600">Active Live Orders</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
                <ShoppingBag size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{orders.length}</p>
            <p className="mt-2 text-xs text-slate-500 font-semibold">{orders.filter(o => o.mode === 'Delivery').length} Delivery · {orders.filter(o => o.mode === 'Takeaway').length} Takeaway</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">Low Stock Warnings</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <AlertTriangle size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{lowStockCount}</p>
            <p className="mt-2 text-xs text-amber-600 font-bold">
              {lowStockCount > 0 ? 'Action required in Inventory' : 'All ingredients adequately stocked'}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-purple-600">Menu items active</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <UtensilsCrossed size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{menuItems.length}</p>
            <p className="mt-2 text-xs text-slate-500 font-semibold">
              {outOfStockCount > 0 ? `${outOfStockCount} marked as Sold Out` : '100% dishes available'}
            </p>
          </div>
        </div>

        {/* TAB 1: GPS Delivery Radar Map */}
        {activeTab === 'map' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-outfit text-2xl font-black text-slate-900">Live Delivery Map & Radar</h2>
                <p className="text-xs text-slate-500">Track customer locations, 3 km delivery zone, dispatch orders & manage routes in real-time.</p>
              </div>
            </div>
            <AdminMap />
          </div>
        )}

        {/* TAB 2: Kitchen Display System (KDS) */}
        {activeTab === 'kds' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-outfit text-2xl font-black text-slate-900">Kitchen Line Queue (KDS)</h2>
                <p className="text-xs text-slate-500">Real-time prep queue for line chefs & packing station.</p>
              </div>
              <span className="rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 px-3 py-1 text-xs font-black">
                {orders.filter(o => o.status !== 'Delivered').length} Orders Pending
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
                <ChefHat size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-900">Kitchen Queue Clear!</p>
                <p className="text-xs text-slate-500 mt-1">New customer orders will automatically appear here with timers.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => {
                  const elapsedMins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  const isLate = elapsedMins > 20

                  return (
                    <div
                      key={order.id}
                      className={`relative flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all ${
                        isLate
                          ? 'border-rose-300 bg-rose-50/50'
                          : order.status === 'Preparing'
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-outfit text-lg font-black text-slate-900">#{order.id}</span>
                            <span className="ml-2 rounded-lg bg-orange-500/10 text-orange-600 px-2 py-0.5 text-[10px] font-black uppercase">
                              {order.mode}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            isLate ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Clock size={13} /> {elapsedMins}m ago
                          </div>
                        </div>

                        {/* Customer / Location info */}
                        <div className="mt-3 text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-slate-900">👤 {order.customerName || 'Customer'} ({order.customerPhone || 'N/A'})</p>
                            {order.transactionId && (
                              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                UPI: #{order.transactionId}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{order.deliveryAddress}</p>
                        </div>

                        {/* Items Checklist */}
                        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kitchen Checklist</p>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span><span className="text-orange-600 font-black">{item.quantity}x</span> {item.name}</span>
                              <span className="text-[10px] text-slate-500">{item.veg ? '🟢 Veg' : '🔴 Non-Veg'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Selector / Bump button */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Status:</span>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="rounded-xl border border-orange-500/40 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs cursor-pointer"
                        >
                          {orderStatuses.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Menu Management */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-outfit text-2xl font-black text-slate-900">Menu Item Controls</h2>
                <p className="text-xs text-slate-500">Add dishes, update prices, and toggle live item availability.</p>
              </div>
              <button
                onClick={() => {
                  setEditingDish(null)
                  setDishForm({
                    name: '',
                    category: 'Burgers',
                    price: 99,
                    description: '',
                    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
                    veg: true,
                    containsEgg: false,
                    rating: 4.8,
                    calories: 400,
                    time: '12 min',
                    bestseller: false,
                    available: true,
                  })
                  setIsAddDishOpen(true)
                }}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Plus size={16} /> Add New Dish
              </button>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search dishes by name or ingredient..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedMenuCategory(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedMenuCategory === cat
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMenuItems.map((dish) => {
                const isAvailable = dish.available !== false

                return (
                  <div
                    key={dish.id}
                    className={`group relative flex flex-col justify-between rounded-3xl border p-4 shadow-sm transition-all ${
                      isAvailable ? 'border-slate-200 bg-white' : 'border-rose-200 bg-slate-50 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Image & Badges */}
                      <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100">
                        {dish.image ? (
                          <img src={dish.image} alt={dish.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">🍔</div>
                        )}

                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase text-white shadow ${
                            dish.veg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}>
                            {dish.veg ? 'Veg' : 'Non-Veg'}
                          </span>
                          {dish.bestseller && (
                            <span className="rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-900">
                              ★ Bestseller
                            </span>
                          )}
                        </div>

                        {/* Availability Toggle button over image */}
                        <button
                          type="button"
                          onClick={() => {
                            toggleItemAvailability(dish.id)
                            toast.success(`${dish.name} marked as ${!isAvailable ? 'In Stock' : 'Out of Stock'}`)
                          }}
                          className={`absolute top-2 right-2 rounded-xl px-2.5 py-1 text-[11px] font-black backdrop-blur-md transition-all cursor-pointer shadow-md flex items-center gap-1 ${
                            isAvailable
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-rose-600 text-white hover:bg-rose-700'
                          }`}
                        >
                          <span>{isAvailable ? '✓ In Stock' : '✕ Sold Out'}</span>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-outfit text-base font-extrabold text-slate-900">{dish.name}</h3>
                          <span className="font-outfit text-base font-black text-orange-600">
                            {formatPrice(dish.price)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{dish.description}</p>
                        
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-1">
                          <span>⏱️ {dish.time}</span>
                          <span>⭐ {dish.rating} ({dish.reviewCount || 320})</span>
                        </div>

                        {/* Dedicated In Stock / Out of Stock Toggle Control */}
                        <div className="flex items-center justify-between rounded-xl bg-slate-100/90 border border-slate-200/80 p-2.5">
                          <span className="text-[11px] font-extrabold text-slate-700">Stock Availability:</span>
                          <button
                            type="button"
                            onClick={() => {
                              toggleItemAvailability(dish.id)
                              toast.success(`${dish.name} is now ${!isAvailable ? 'Available' : 'Unavailable'}`)
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                              isAvailable
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-rose-500 text-white hover:bg-rose-600'
                            }`}
                          >
                            <span className={`size-2 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-white'}`} />
                            <span>{isAvailable ? 'Item Available' : 'Item Unavailable'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        onClick={() => {
                          setEditingDish(dish)
                          setDishForm({
                            name: dish.name,
                            category: dish.category,
                            price: dish.price,
                            description: dish.description,
                            image: dish.image,
                            veg: dish.veg,
                            containsEgg: dish.containsEgg || false,
                            rating: dish.rating,
                            calories: dish.calories,
                            time: dish.time,
                            bestseller: dish.bestseller || false,
                            available: dish.available !== false,
                          })
                          setIsAddDishOpen(true)
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} className="text-orange-500" /> Edit Dish
                      </button>

                      <button
                        onClick={() => {
                          deleteMenuItem(dish.id)
                          toast.success(`Removed ${dish.name}`)
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Inventory & Stock Control */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-outfit text-2xl font-black text-slate-900">Raw Ingredient & Stock Inventory</h2>
                <p className="text-xs text-slate-500">Track stock levels, monitor thresholds, and trigger instant restocks.</p>
              </div>
              <button
                onClick={() => setIsAddInventoryOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <Plus size={16} /> Add Ingredient / Stock
              </button>
            </div>

            {/* Inventory Search */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search raw ingredients, packaging, or suppliers..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Item & Category</th>
                    <th className="px-5 py-4">Current Stock</th>
                    <th className="px-5 py-4">Safety Threshold</th>
                    <th className="px-5 py-4">Cost / Unit</th>
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredInventory.map((item) => {
                    const isLowStock = item.stock <= item.threshold

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <span className="text-[10px] text-slate-400">{item.category}</span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${isLowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.stock} {item.unit}
                            </span>
                            {isLowStock && (
                              <span className="rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 text-[9px] font-black uppercase animate-pulse">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {item.threshold} {item.unit}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          ₹{item.costPerUnit} / {item.unit}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {item.supplier}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                updateInventoryStock(item.id, item.stock + 10)
                                toast.success(`Restocked +10 ${item.unit} of ${item.name}`)
                              }}
                              className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-black text-orange-600 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => {
                                updateInventoryStock(item.id, item.stock + 50)
                                toast.success(`Restocked +50 ${item.unit} of ${item.name}`)
                              }}
                              className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-black text-cyan-600 hover:bg-cyan-600 hover:text-white transition-all cursor-pointer"
                            >
                              +50
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Revenue & Business Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-outfit text-2xl font-black text-slate-900">Revenue & Sales Intelligence</h2>
              <p className="text-xs text-slate-500">Sales distribution, channel breakdown & kitchen performance metrics.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Order Mode Breakdown */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Fulfillment Channel Split</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-orange-600">Takeaway & GPS Delivery</span>
                      <span className="text-slate-900 font-black">68%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full w-[68%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-cyan-600">Dining In (Tables)</span>
                      <span className="text-slate-900 font-black">32%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-cyan-600 rounded-full w-[32%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kitchen Metrics */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Fulfillment Efficiency</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Avg Prep Time</span>
                    <span className="font-bold text-slate-900">14.2 minutes</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">On-Time Dispatch Rate</span>
                    <span className="font-bold text-emerald-600">96.4%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Customer Satisfaction Score</span>
                    <span className="font-bold text-amber-600">4.9 / 5.0 ⭐</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Items */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3 sm:col-span-2 lg:col-span-1 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Top 3 Bestselling Dishes</h3>
                <div className="space-y-2.5">
                  {[
                    { name: 'Chicken Tikka Snack Pack', sales: '142 orders today', price: '₹99' },
                    { name: 'Peri Peri French Fries', sales: '118 orders today', price: '₹69' },
                    { name: 'Chicken Burger', sales: '94 orders today', price: '₹99' },
                  ].map((top, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{top.name}</p>
                          <p className="text-[10px] text-slate-500">{top.sales}</p>
                        </div>
                      </div>
                      <span className="font-outfit text-xs font-black text-orange-600">{top.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Add/Edit Dish Modal */}
      {isAddDishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-outfit text-xl font-black text-slate-900">
                {editingDish ? 'Edit Dish Details' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setIsAddDishOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-3.5 text-xs font-outfit">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Dish Name</label>
                <input
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  placeholder="e.g. Smoky Peri Peri Chicken Wrap"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select
                    value={dishForm.category}
                    onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  placeholder="Short appetizing description..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Image URL</label>
                <input
                  value={dishForm.image}
                  onChange={(e) => setDishForm({ ...dishForm, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Prep Time (e.g. 10 min / 15 min)</label>
                  <input
                    value={dishForm.time}
                    onChange={(e) => setDishForm({ ...dishForm, time: e.target.value })}
                    placeholder="15 min"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Stock Availability</label>
                  <button
                    type="button"
                    onClick={() => setDishForm({ ...dishForm, available: !dishForm.available })}
                    className={`w-full rounded-xl py-2.5 px-3 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      dishForm.available
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-rose-500 text-white hover:bg-rose-600'
                    }`}
                  >
                    <span>{dishForm.available ? '✓ In Stock (Available)' : '✕ Out of Stock (Sold Out)'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={dishForm.veg}
                    onChange={(e) => setDishForm({ ...dishForm, veg: e.target.checked })}
                    className="h-4 w-4 rounded accent-orange-500"
                  />
                  Vegetarian Dish
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={dishForm.bestseller}
                    onChange={(e) => setDishForm({ ...dishForm, bestseller: e.target.checked })}
                    className="h-4 w-4 rounded accent-orange-500"
                  />
                  Mark as Bestseller
                </label>
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-black text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer"
              >
                {editingDish ? 'Save Dish Changes' : 'Create Dish'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Inventory Ingredient Modal */}
      {isAddInventoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-outfit text-xl font-black text-slate-900">Add Raw Ingredient / Supply</h3>
              <button onClick={() => setIsAddInventoryOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-3 text-xs font-outfit">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Ingredient / Supply Name</label>
                <input
                  value={inventoryForm.name}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                  placeholder="e.g. Gourmet Burger Buns"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={inventoryForm.stock}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, stock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Unit (kg, pcs, liters)</label>
                  <input
                    value={inventoryForm.unit}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                    placeholder="pcs"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Safety Threshold</label>
                  <input
                    type="number"
                    value={inventoryForm.threshold}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, threshold: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    value={inventoryForm.costPerUnit}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, costPerUnit: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Supplier Name</label>
                <input
                  value={inventoryForm.supplier}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, supplier: e.target.value })}
                  placeholder="e.g. Bakers Craft Co."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-black text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer"
              >
                Save Ingredient
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
