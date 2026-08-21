'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  History,
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
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { assets } from '@repo/assets'
import { categories, formatPrice, menuItems as defaultMenuItems, MenuItem } from '@/lib/menu-data'
import { InventoryItem, Order, useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'

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
  'Accept Order',
  'Preparing',
  'Ready for Pickup',
]

function normalizeOrderStatus(status: unknown) {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized === 'paid' || normalized === 'pending' || normalized === 'order received') return 'Order Received'
  if (normalized === 'restaurant accepted' || normalized === 'accepted' || normalized === 'confirmed') return 'Accept Order'
  if (normalized === 'preparing food' || normalized === 'preparing') return 'Preparing'
  if (normalized === 'ready for pickup' || normalized === 'ready to pick up') return 'Ready for Pickup'
  if (normalized === 'out for delivery' || normalized === 'out_for_delivery') return 'Out For Delivery'
  if (normalized === 'delivery partner assigned' || normalized === 'assigned') return 'Delivery Partner Assigned'
  if (normalized === 'picked up' || normalized === 'picked_up') return 'Picked Up'
  if (normalized === 'packed') return 'Packed'
  if (normalized === 'delivered') return 'Delivered'
  return String(status || 'Order Received')
}

function statusValue(label: string) {
  return label === 'Accept Order' ? 'Restaurant Accepted' : label
}

function fallbackCoordinates(address: string, index: number) {
  let hash = index + 17
  for (const character of address) hash = (hash * 31 + character.charCodeAt(0)) % 100000
  const angle = ((hash % 360) * Math.PI) / 180
  const radius = 0.006 + ((hash % 22) / 22) * 0.018
  return {
    lat: 12.953542087360153 + Math.cos(angle) * radius,
    lng: 77.69335637484109 + Math.sin(angle) * radius,
  }
}

function inferVeg(item: any) {
  if (typeof item.veg === 'boolean') return item.veg
  const knownItem = defaultMenuItems.find((menuItem) => menuItem.id === item.id || menuItem.name.toLowerCase() === String(item.name || '').toLowerCase())
  if (knownItem) return knownItem.veg
  return !/(chicken|meat|egg|tikka|jalfrezi)/i.test(String(item.name || ''))
}

function menuItemFromRow(row: any): MenuItem {
  const localMenuItem = defaultMenuItems.find((item) => item.id === row.id || item.name.toLowerCase() === String(row.name || '').toLowerCase())
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price || 0),
    originalPrice: row.original_price == null ? undefined : Number(row.original_price),
    description: row.description || '',
    image: localMenuItem?.image || row.image || '',
    veg: row.veg ?? true,
    containsEgg: row.contains_egg ?? false,
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    calories: Number(row.calories || 0),
    time: row.prep_time || '10 min',
    bestseller: row.bestseller ?? false,
    available: row.available ?? true,
    specialOfferBadge: row.special_offer_badge || undefined,
  }
}

function menuItemToRow(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    original_price: item.originalPrice ?? null,
    description: item.description,
    image: item.image,
    veg: item.veg,
    contains_egg: item.containsEgg ?? false,
    rating: item.rating,
    review_count: item.reviewCount ?? 0,
    calories: item.calories,
    prep_time: item.time,
    bestseller: item.bestseller ?? false,
    available: item.available ?? true,
    special_offer_badge: item.specialOfferBadge ?? null,
  }
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'kds' | 'menu' | 'customers' | 'analytics' | 'history' | 'delivery'>('map')
  const [kdsStatus, setKdsStatus] = useState('All')
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | 'week' | 'month' | 'year'>('24h')
  const [historyRange, setHistoryRange] = useState<'day' | 'week' | 'month'>('day')

  // Store state
  const orders = useAppStore((s) => s.orders)
  const menuItems = useAppStore((s) => s.menuItems)
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus)

  const addMenuItem = useAppStore((s) => s.addMenuItem)
  const updateMenuItem = useAppStore((s) => s.updateMenuItem)
  const deleteMenuItem = useAppStore((s) => s.deleteMenuItem)
  const toggleItemAvailability = useAppStore((s) => s.toggleItemAvailability)

  // Filters & Search states
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('All')
  
  // Customer & Loyalty states
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerPage, setCustomerPage] = useState(1)
  const [dbProfiles, setDbProfiles] = useState<any[]>([])
  const [isAwardOpen, setIsAwardOpen] = useState(false)
  const [selectedCustPhone, setSelectedCustPhone] = useState('')
  const [awardCoinsAmount, setAwardCoinsAmount] = useState(50)
  const [promoMessage, setPromoMessage] = useState('')

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase.from('customer_profiles').select('*')
      if (data) setDbProfiles(data)
    } catch (e) {
      console.error('Error fetching customer profiles:', e)
    }
  }

  const fetchDbMenu = async () => {
    const { data, error } = await supabase.from('menu_items').select('*').order('category').order('name')
    if (error) {
      console.error('Error fetching menu catalog:', error)
      return
    }
    if (data?.length) {
      useAppStore.setState({ menuItems: data.map(menuItemFromRow) })
      return
    }
    const { error: seedError } = await supabase.from('menu_items').upsert(defaultMenuItems.map(menuItemToRow))
    if (seedError) console.error('Error seeding menu catalog:', seedError)
  }

  const persistMenuItem = async (item: MenuItem) => {
    const { error } = await supabase.from('menu_items').upsert(menuItemToRow(item))
    if (error) toast.error(`Menu sync failed: ${error.message}`)
  }

  const removeMenuItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) toast.error(`Menu sync failed: ${error.message}`)
  }

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    updateOrderStatus(id, status)
    const { error } = await supabase.from('orders').update({ status }).eq('order_id', id)
    if (error) {
      toast.error(`Order sync failed: ${error.message}`)
      return
    }
    toast.success(`Order marked ${normalizeOrderStatus(status)}`)
  }

  const fetchDbOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        const mappedOrders: Order[] = data.map((row: any, index: number) => {
          const address = row.delivery_address || 'Marathahalli, Bengaluru'
          const hasCoordinates = row.lat !== null && row.lat !== undefined && row.lat !== '' && row.lng !== null && row.lng !== undefined && row.lng !== '' && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng))
          const coordinates = hasCoordinates ? { lat: Number(row.lat), lng: Number(row.lng) } : fallbackCoordinates(address, index)
          return ({
          id: row.order_id || row.id,
          items: Array.isArray(row.items)
            ? row.items.map((i: any) => ({
                id: i.id || `item-${row.order_id || row.id}-${index}`,
                name: i.name || 'Gourmet Dish',
                price: Number(i.price || 0),
                quantity: Number(i.qty || i.quantity || 1),
                veg: inferVeg(i),
                category: i.category || 'Burgers',
              }))
            : [],
          subtotal: Number(row.subtotal || row.amount || 0),
          deliveryFee: Number(row.delivery_fee || 0),
          discount: Number(row.discount || 0),
          coinsEarned: row.coins_earned || 0,
          total: Number(row.amount || 0),
          status: normalizeOrderStatus(row.status),
          mode: row.order_mode || 'Delivery',
          deliveryAddress: address,
          customerName: row.customer_name || '',
          customerPhone: row.customer_phone || '',
          customerEmail: row.customer_email || '',
          paymentMethod: row.payment_method || 'UPI',
          transactionId: row.upi_transaction_id || row.transaction_ref,
          lat: coordinates.lat,
          lng: coordinates.lng,
          distanceKm: Number(row.distance_km || 1.2),
          createdAt: row.created_at || new Date().toISOString(),
          estimatedDeliveryMins: 20,
          })
        })

        useAppStore.setState({ orders: mappedOrders })
      }
    } catch (dbErr) {
      console.error('Error fetching orders from Supabase:', dbErr)
    }
  }

  // Fetch orders & customer profiles on mount and subscribe to Supabase Realtime channel
  useEffect(() => {
    fetchDbOrders()
    fetchProfiles()
    fetchDbMenu()

    const channel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDbOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profiles' }, () => {
        fetchProfiles()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchDbMenu()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Modals state
  const [isAddDishOpen, setIsAddDishOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null)

  // Form state for new/edit dish
  const [dishForm, setDishForm] = useState({
    name: '',
    category: 'Burgers',
    price: 99,
    description: '',
    image: assets.vegBurger,
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
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length
  const outOfStockCount = menuItems.filter((i) => i.available === false).length
  const deliveryOrders = orders.filter((o) => o.mode === 'Delivery')
  const takeawayOrders = orders.filter((o) => o.mode === 'Takeaway')
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered')
  const deliveryPercent = orders.length ? Math.round((deliveryOrders.length / orders.length) * 100) : 0
  const takeawayPercent = orders.length ? Math.round((takeawayOrders.length / orders.length) * 100) : 0
  const fulfillmentEfficiency = orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0
  const onTimeDispatchRate = deliveredOrders.length
    ? Math.round((deliveredOrders.filter((o) => Date.now() - new Date(o.createdAt).getTime() <= 45 * 60 * 1000).length / deliveredOrders.length) * 100)
    : 0
  const averageOrderAge = orders.length
    ? Math.round(orders.reduce((sum, order) => sum + Math.max(0, Date.now() - new Date(order.createdAt).getTime()) / 60000, 0) / orders.length)
    : 0
  const kdsOrders = kdsStatus === 'All' ? orders : orders.filter((order) => normalizeOrderStatus(order.status) === kdsStatus)
  const analyticsCutoff = {
    '24h': 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  }[analyticsRange]
  const analyticsOrders = orders.filter((order) => Date.now() - new Date(order.createdAt).getTime() <= analyticsCutoff)
  const analyticsDeliveryOrders = analyticsOrders.filter((order) => order.mode === 'Delivery')
  const analyticsTakeawayOrders = analyticsOrders.filter((order) => order.mode === 'Takeaway')
  const analyticsDeliveredOrders = analyticsOrders.filter((order) => normalizeOrderStatus(order.status) === 'Delivered')
  const analyticsDeliveryPercent = analyticsOrders.length ? Math.round((analyticsDeliveryOrders.length / analyticsOrders.length) * 100) : 0
  const analyticsTakeawayPercent = analyticsOrders.length ? Math.round((analyticsTakeawayOrders.length / analyticsOrders.length) * 100) : 0
  const analyticsFulfillment = analyticsOrders.length ? Math.round((analyticsDeliveredOrders.length / analyticsOrders.length) * 100) : 0
  const analyticsAverageOrderAge = analyticsOrders.length
    ? Math.round(analyticsOrders.reduce((sum, order) => sum + Math.max(0, Date.now() - new Date(order.createdAt).getTime()) / 60000, 0) / analyticsOrders.length)
    : 0
  const analyticsOnTimeDispatchRate = analyticsDeliveredOrders.length
    ? Math.round((analyticsDeliveredOrders.filter((order) => Date.now() - new Date(order.createdAt).getTime() <= 45 * 60 * 1000).length / analyticsDeliveredOrders.length) * 100)
    : 0
  const historyCutoff = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 }[historyRange]
  const historyOrders = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status)
    return (status === 'Delivered' || status === 'Picked Up') && Date.now() - new Date(order.createdAt).getTime() <= historyCutoff
  })

  // Filtered menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedMenuCategory === 'All' || item.category === selectedMenuCategory
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.description.toLowerCase().includes(menuSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Derive unique customers from placed orders
  const uniqueCustomers = Array.from(
    new Map(
      orders
        .filter(o => o.customerPhone)
        .map(o => {
          const phone = o.customerPhone as string
          return [
            phone,
            {
              name: o.customerName || 'Loyal Foodie',
              phone: phone,
              address: o.deliveryAddress || 'Takeaway Pickup',
              orderCount: orders.filter(ord => ord.customerPhone === phone).length,
              totalSpend: orders.filter(ord => ord.customerPhone === phone).reduce((sum, ord) => sum + ord.total, 0),
              coins: dbProfiles.find(p => p.phone === phone)?.wallet_coins || 0
            }
          ] as const
        })
    ).values()
  )

  const filteredCustomers = uniqueCustomers.filter(cust => 
    cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    cust.phone.includes(customerSearch) ||
    cust.address.toLowerCase().includes(customerSearch.toLowerCase())
  )

  // 20 customers per page pagination
  const CUSTOMERS_PER_PAGE = 20
  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE) || 1
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE)

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dishForm.name.trim()) return toast.error('Dish name is required')

    if (editingDish) {
      updateMenuItem(editingDish.id, dishForm)
      await persistMenuItem({ ...editingDish, ...dishForm })
      toast.success(`Updated ${dishForm.name}`)
      setEditingDish(null)
    } else {
      const newDish = { ...dishForm, id: `dish-${Date.now()}` }
      addMenuItem(dishForm)
      await persistMenuItem(newDish)
      toast.success(`Added ${dishForm.name} to menu! 🍔`)
    }
    setIsAddDishOpen(false)
  }

  const handleToggleAvailability = async (dish: MenuItem) => {
    const updatedDish = { ...dish, available: dish.available === false }
    toggleItemAvailability(dish.id)
    await persistMenuItem(updatedDish)
  }

  const handleDeleteDish = async (dish: MenuItem) => {
    deleteMenuItem(dish.id)
    await removeMenuItem(dish.id)
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
                { id: 'customers', label: 'Customer Base & Offers', icon: Users },
                { id: 'analytics', label: 'Revenue Analytics', icon: TrendingUp },
                { id: 'history', label: 'Order History', icon: History },
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
                      <span className="rounded-full bg-orange-500/30 text-white px-1.5 py-0.2 text-[10px] font-black">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
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
            <p className="mt-2 text-xs text-slate-500 font-semibold">
              {orders.length ? `${deliveredOrders.length} fulfilled orders` : 'No orders recorded yet'}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-600">Active Live Orders</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
                <ShoppingBag size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{orders.length}</p>
            <p className="mt-2 text-xs text-slate-500 font-semibold">{deliveryOrders.length} Delivery · {takeawayOrders.length} Takeaway</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">Customer Base</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Users size={20} />
              </div>
            </div>
            <p className="mt-3 font-outfit text-3xl font-black text-slate-900">{uniqueCustomers.length}</p>
            <p className="mt-2 text-xs text-amber-600 font-bold">
              Unique phone numbers tracked
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

            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
              {['All', ...orderStatuses].map((status) => (
                <button
                  key={status}
                  onClick={() => setKdsStatus(status)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black ${kdsStatus === status ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {status} ({status === 'All' ? orders.length : orders.filter((order) => normalizeOrderStatus(order.status) === status).length})
                </button>
              ))}
            </div>

            {kdsOrders.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
                <ChefHat size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-base font-bold text-slate-900">Kitchen Queue Clear!</p>
                <p className="text-xs text-slate-500 mt-1">New customer orders will automatically appear here with timers.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {kdsOrders.map((order) => {
                  const elapsedMins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  const isLate = elapsedMins > 20

                  return (
                    <div
                      key={order.id}
                      className={`relative flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all ${
                        order.mode === 'Takeaway'
                          ? 'border-2 border-cyan-400 bg-cyan-100/70'
                          : 'border-2 border-orange-300 bg-orange-50/60'
                      } ${isLate ? 'ring-2 ring-rose-300/60' : ''}`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-outfit text-lg font-black text-slate-900">#{order.id}</span>
                            <span className={`ml-2 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                              order.mode === 'Takeaway'
                                ? 'bg-cyan-500/15 text-cyan-700'
                                : 'bg-orange-500/10 text-orange-600'
                            }`}>
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
                          value={normalizeOrderStatus(order.status)}
                          onChange={(e) => handleUpdateOrderStatus(order.id, statusValue(e.target.value))}
                          className="rounded-xl border border-orange-500/40 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs cursor-pointer"
                        >
                          {orderStatuses.map((st) => (
                            <option key={st} value={statusValue(st)}>{st}</option>
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
                    image: assets.vegBurger,
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
                          <img
                            src={dish.image}
                            alt={dish.name}
                            onError={(event) => {
                              const localImage = defaultMenuItems.find((item) => item.id === dish.id || item.name.toLowerCase() === dish.name.toLowerCase())?.image
                              if (localImage && event.currentTarget.src !== new URL(localImage, window.location.origin).href) event.currentTarget.src = localImage
                            }}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
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
                            handleToggleAvailability(dish)
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
                              handleToggleAvailability(dish)
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
                          handleDeleteDish(dish)
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

        {/* TAB 4: Customer Base & Offers */}
        {activeTab === 'customers' && (
          <div className="space-y-4 animate-in fade-in font-outfit">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-serif">Customer Base & Loyalty Hub</h2>
                <p className="text-xs text-slate-500">Track customer spending, award Cafe Coins, and manage active discount offers by phone number.</p>
              </div>
            </div>

            {/* Customer Search & Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers by name, phone number, or address..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Customer Base</p>
                  <p className="text-2xl font-black text-slate-900">{uniqueCustomers.length}</p>
                </div>
                <Users className="text-orange-500 h-8 w-8 bg-orange-50 p-1.5 rounded-2xl" />
              </div>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Customer Details</th>
                    <th className="px-5 py-4">Phone Number</th>
                    <th className="px-5 py-4">Default Address</th>
                    <th className="px-5 py-4 text-center">Orders Count</th>
                    <th className="px-5 py-4">Total Value</th>
                    <th className="px-5 py-4">Loyalty Coins</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        No customer transactions matching filter
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((cust, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{cust.name}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-900 font-bold">
                          {cust.phone}
                        </td>
                        <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate" title={cust.address}>
                          {cust.address}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 text-center">
                          {cust.orderCount}
                        </td>
                        <td className="px-5 py-4 font-black text-slate-900">
                          {formatPrice(cust.totalSpend)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-orange-500/10 text-orange-600 px-2.5 py-1 text-xs font-black">
                            🪙 {cust.coins} Coins
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedCustPhone(cust.phone);
                              setAwardCoinsAmount(50);
                              setIsAwardOpen(true);
                            }}
                            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-xs font-black shadow-xs cursor-pointer transition-all"
                          >
                            Award Offer / Coins
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 20 items per page Pagination Controls */}
              {filteredCustomers.length > 0 && (
                <div className="flex flex-wrap items-center justify-between p-4 border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 gap-3 font-outfit">
                  <div>
                    Showing {Math.min(filteredCustomers.length, (customerPage - 1) * CUSTOMERS_PER_PAGE + 1)} to {Math.min(filteredCustomers.length, customerPage * CUSTOMERS_PER_PAGE)} of {filteredCustomers.length} Customers
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={customerPage === 1}
                      onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <span className="px-3 py-1 bg-orange-500 text-white rounded-xl font-black">
                      Page {customerPage} of {totalCustomerPages}
                    </span>
                    <button
                      disabled={customerPage >= totalCustomerPages}
                      onClick={() => setCustomerPage(p => Math.min(totalCustomerPages, p + 1))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
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

            <div className="flex flex-wrap gap-2">
              {([
                ['24h', 'Last 24 Hours'],
                ['week', 'This Week'],
                ['month', 'This Month'],
                ['year', 'This Year'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setAnalyticsRange(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-black ${analyticsRange === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
              <span className="self-center text-xs font-bold text-slate-500">{analyticsOrders.length} orders in range</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Order Mode Breakdown */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Fulfillment Channel Split</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-orange-600">Delivery</span>
                      <span className="text-slate-900 font-black">{analyticsDeliveryPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${analyticsDeliveryPercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-cyan-600">Takeaway</span>
                      <span className="text-slate-900 font-black">{analyticsTakeawayPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${analyticsTakeawayPercent}%` }} />
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
                    <span className="font-bold text-slate-900">{analyticsOrders.length ? `${analyticsAverageOrderAge} minutes` : 'No data'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">On-Time Dispatch Rate</span>
                    <span className="font-bold text-emerald-600">{analyticsOnTimeDispatchRate}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Customer Satisfaction Score</span>
                    <span className="font-bold text-amber-600">{analyticsFulfillment}% fulfilled</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Items */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3 sm:col-span-2 lg:col-span-1 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Live Bestselling Dishes</h3>
                <div className="space-y-2.5">
                  {analyticsOrders.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      <p>No orders recorded yet.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Live order metrics will populate automatically.</p>
                    </div>
                  ) : (
                    analyticsOrders.slice(0, 3).map((ord, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 font-black text-xs">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {ord.items?.[0]?.name || 'Gourmet Meal'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">Order #{ord.id} · {ord.mode || 'Delivery'}</p>
                          </div>
                        </div>
                        <span className="font-outfit text-xs font-black text-orange-600">{formatPrice(ord.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-outfit text-2xl font-black text-slate-900">Order History</h2>
              <p className="text-xs text-slate-500">Completed pickup and delivery orders.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([['day', 'Today'], ['week', 'This Week'], ['month', 'This Month']] as const).map(([value, label]) => (
                <button key={value} onClick={() => setHistoryRange(value)} className={`rounded-lg px-3 py-2 text-xs font-black ${historyRange === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
                  {label}
                </button>
              ))}
              <span className="text-xs font-bold text-slate-500">{historyOrders.length} fulfilled orders</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {historyOrders.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">No fulfilled orders in this period.</div>
              ) : historyOrders.map((order) => (
                <div key={order.id} className={`rounded-2xl border p-4 ${order.mode === 'Takeaway' ? 'border-cyan-200 bg-cyan-50/40' : 'border-orange-200 bg-orange-50/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-mono text-sm text-slate-900">#{order.id}</strong>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${order.mode === 'Takeaway' ? 'bg-cyan-500/15 text-cyan-700' : 'bg-orange-500/15 text-orange-700'}`}>{order.mode}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-700">{order.customerName} · {order.customerPhone}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs font-black">
                    <span className="text-emerald-700">{normalizeOrderStatus(order.status)}</span>
                    <span className="text-orange-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))}
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

      {/* MODAL 2: Award Offer / Coins Modal */}
      {isAwardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in font-outfit">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-black text-slate-900 font-serif">Award Coins / Offers</h3>
              <button onClick={() => setIsAwardOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-orange-50 p-4 border border-orange-200 text-slate-700">
                <p className="font-bold">Target Customer Phone:</p>
                <p className="text-base font-black text-orange-600 mt-0.5">{selectedCustPhone}</p>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Select Award Value (Cafe Coins)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAwardCoinsAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        awardCoinsAmount === amt
                          ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      +{amt} 🪙
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Custom Coins Amount</label>
                <input
                  type="number"
                  value={awardCoinsAmount}
                  onChange={(e) => setAwardCoinsAmount(Number(e.target.value))}
                  placeholder="Enter custom amount"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Attach Promo Offer / Message (Optional)</label>
                <input
                  value={promoMessage}
                  onChange={(e) => setPromoMessage(e.target.value)}
                  placeholder="e.g. Free Dessert on next order!"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    const ordersWithPhone = orders.filter(o => o.customerPhone === selectedCustPhone);
                    const name = ordersWithPhone[0]?.customerName || 'Loyal Foodie';
                    const address = ordersWithPhone[0]?.deliveryAddress || 'Takeaway Pickup';

                    const { error } = await supabase
                      .from('customer_profiles')
                      .upsert({
                        phone: selectedCustPhone,
                        full_name: name,
                        saved_address: address,
                        wallet_coins: awardCoinsAmount
                      }, { onConflict: 'phone' })
                    
                    if (error) {
                      throw new Error(error.message)
                    }

                    toast.success(`Successfully awarded ${awardCoinsAmount} Cafe Coins to ${selectedCustPhone}! 🪙`);
                    setIsAwardOpen(false);
                    setPromoMessage('');
                    fetchProfiles(); // Refresh local list
                  } catch (err: any) {
                    toast.error(`Failed to update coins: ${err.message || err}`);
                  }
                }}
                className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-extrabold text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer text-sm"
              >
                Award Loyalty Offer →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
