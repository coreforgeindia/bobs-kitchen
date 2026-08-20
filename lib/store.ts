'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { menuItems as defaultMenuItems, type MenuItem, calculateCoinsEarned } from './menu-data'

export type OrderMode = 'Delivery' | 'Takeaway'
export type CartLine = MenuItem & { quantity: number }

export type Order = { 
  id: string; 
  items: CartLine[]; 
  subtotal: number;
  deliveryFee: number;
  discount: number;
  coinsEarned: number;
  total: number; 
  status: string; // 'Order Received' | 'Preparing' | 'Out For Delivery' | 'Delivered' | 'Ready for Pickup'
  mode: OrderMode; 
  tableNo?: string;
  deliveryAddress?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod?: string;
  transactionId?: string; // Last 5 digits of UPI or UTR
  appliedCoupon?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  createdAt: string;
  estimatedDeliveryMins?: number;
}

export type UserProfile = { 
  name: string; 
  email: string; 
  phone: string; 
  address?: string;
  walletCoins?: number;
}

export type InventoryItem = {
  id: string
  name: string
  category: 'Bread & Buns' | 'Meat & Poultry' | 'Dairy & Cheese' | 'Produce & Veggies' | 'Packaging & Consumables' | 'Sauces & Spices' | 'Beverages'
  stock: number
  unit: string
  threshold: number
  costPerUnit: number
  supplier: string
}

const initialInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Gourmet Brioche Buns', category: 'Bread & Buns', stock: 145, unit: 'pcs', threshold: 30, costPerUnit: 12, supplier: 'Bakers Craft Co.' },
  { id: 'inv-2', name: 'Fresh Chicken Patties', category: 'Meat & Poultry', stock: 80, unit: 'pcs', threshold: 25, costPerUnit: 35, supplier: 'Fresh Farms Meat Ltd' },
  { id: 'inv-3', name: 'Premium Paneer Blocks', category: 'Dairy & Cheese', stock: 4, unit: 'kg', threshold: 8, costPerUnit: 280, supplier: 'Amul Dairy Hub' },
  { id: 'inv-4', name: 'Peri Peri Spice Dust', category: 'Sauces & Spices', stock: 3.5, unit: 'kg', threshold: 2, costPerUnit: 450, supplier: 'SpiceCraft India' },
  { id: 'inv-5', name: 'Frozen Cut Potatoes (Fries)', category: 'Produce & Veggies', stock: 65, unit: 'kg', threshold: 15, costPerUnit: 90, supplier: 'McCain Foods' },
  { id: 'inv-6', name: 'Cheddar Cheese Slices', category: 'Dairy & Cheese', stock: 210, unit: 'slices', threshold: 50, costPerUnit: 8, supplier: 'Amul Dairy Hub' },
  { id: 'inv-7', name: 'Eco-friendly Takeaway Boxes', category: 'Packaging & Consumables', stock: 350, unit: 'boxes', threshold: 100, costPerUnit: 6, supplier: 'GreenPack Solutions' },
  { id: 'inv-8', name: 'Thums Up 250ml Cans', category: 'Beverages', stock: 120, unit: 'cans', threshold: 30, costPerUnit: 14, supplier: 'Coca-Cola Bottlers' },
  { id: 'inv-9', name: 'House Secret Garlic Mayo', category: 'Sauces & Spices', stock: 8, unit: 'liters', threshold: 3, costPerUnit: 180, supplier: 'In-House Prep' },
]

const initialOrders: Order[] = []

export type PlaceOrderOptions = {
  mode?: OrderMode
  tableNo?: string
  deliveryAddress?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  paymentMethod?: string
  transactionId?: string
  discount?: number
  appliedCoupon?: string
  coinsEarned?: number
  lat?: number
  lng?: number
  distanceKm?: number
}

type AppState = {
  cart: CartLine[]
  favorites: string[]
  orders: Order[]
  user: UserProfile | null
  orderMode: OrderMode
  menuItems: MenuItem[]
  inventory: InventoryItem[]
  activeTrackingOrderId: string | null
  addToCart: (item: MenuItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  toggleFavorite: (id: string) => void
  setOrderMode: (mode: OrderMode) => void
  setActiveTrackingOrderId: (id: string | null) => void
  placeOrder: (optionsOrTableNo?: PlaceOrderOptions | string, deliveryAddress?: string, lat?: number, lng?: number) => string
  login: (name: string, email: string, phone?: string, address?: string) => void
  logout: () => void
  updateUser: (data: Partial<UserProfile>) => void
  updateOrderStatus: (id: string, status: string) => void
  // Admin Menu Actions
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void
  deleteMenuItem: (id: string) => void
  toggleItemAvailability: (id: string) => void
  // Admin Inventory Actions
  updateInventoryStock: (id: string, newStock: number) => void
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  cart: [],
  favorites: [],
  orders: initialOrders,
  user: null,
  orderMode: 'Delivery',
  menuItems: defaultMenuItems,
  inventory: initialInventory,
  activeTrackingOrderId: initialOrders[0]?.id || null,

  addToCart: (item) => set((state) => {
    const exists = state.cart.find((line) => line.id === item.id)
    return {
      cart: exists 
        ? state.cart.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) 
        : [...state.cart, { ...item, quantity: 1 }]
    }
  }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((line) => line.id !== id) })),
  updateQuantity: (id, quantity) => set((state) => ({
    cart: quantity <= 0 
      ? state.cart.filter((line) => line.id !== id) 
      : state.cart.map((line) => line.id === id ? { ...line, quantity } : line)
  })),
  toggleFavorite: (id) => set((state) => ({
    favorites: state.favorites.includes(id) 
      ? state.favorites.filter((item) => item !== id) 
      : [...state.favorites, id]
  })),
  setOrderMode: (mode) => set({ orderMode: mode }),
  setActiveTrackingOrderId: (id) => set({ activeTrackingOrderId: id }),

  placeOrder: (optionsOrTableNo, deliveryAddress, lat, lng) => {
    const id = `BSK-${Math.floor(100000 + Math.random() * 900000)}`
    const state = get()
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    let opts: PlaceOrderOptions = {}
    if (typeof optionsOrTableNo === 'object' && optionsOrTableNo !== null) {
      opts = optionsOrTableNo
    } else {
      opts = {
        tableNo: typeof optionsOrTableNo === 'string' ? optionsOrTableNo : undefined,
        deliveryAddress: deliveryAddress,
        lat: lat,
        lng: lng,
      }
    }

    const effectiveMode = opts.mode || state.orderMode || 'Delivery'
    const deliveryFee = effectiveMode !== 'Delivery' || subtotal >= 300 || subtotal === 0 ? 0 : 35
    const discount = opts.discount || 0
    const platformFee = state.cart.length > 0 ? 10 : 0
    const taxes = Math.round(subtotal * 0.05)
    const total = Math.max(0, subtotal + deliveryFee + platformFee + taxes - discount)

    // Calculate coins earned
    const coinCalc = calculateCoinsEarned(subtotal)
    const coinsEarned = opts.coinsEarned ?? coinCalc.coins

    // Default coordinates near Marathahalli kitchen if not provided
    const defaultLat = 12.953542087360153 + (Math.random() * 0.01 - 0.005)
    const defaultLng = 77.69335637484109 + (Math.random() * 0.01 - 0.005)

    const newOrder: Order = {
      id,
      items: [...state.cart],
      subtotal,
      deliveryFee,
      discount,
      coinsEarned,
      total,
      status: 'Order Received',
      mode: effectiveMode,
      deliveryAddress: effectiveMode === 'Takeaway' 
        ? 'Takeaway Pickup · Bob\'s Satellite Kitchen (1067, 8th Main Rd, Kaveri Layout, Marathahalli)'
        : (opts.deliveryAddress || state.user?.address || '1067, 8th Main Rd, Kaveri Layout, Marathahalli, Bengaluru'),
      customerName: opts.customerName || state.user?.name || 'Gourmet Foodie',
      customerPhone: opts.customerPhone || state.user?.phone || '9550764604',
      customerEmail: opts.customerEmail || state.user?.email || 'foodie@bobs.com',
      paymentMethod: opts.paymentMethod || 'UPI',
      transactionId: opts.transactionId || undefined,
      appliedCoupon: opts.appliedCoupon || undefined,
      lat: opts.lat || defaultLat,
      lng: opts.lng || defaultLng,
      distanceKm: opts.distanceKm || (effectiveMode === 'Delivery' ? 1.2 : 0.1),
      estimatedDeliveryMins: effectiveMode === 'Delivery' ? 20 : 15,
      createdAt: new Date().toISOString(),
    }

    // Update user wallet coins if logged in
    let updatedUser = state.user
    if (updatedUser && coinsEarned > 0) {
      updatedUser = {
        ...updatedUser,
        walletCoins: (updatedUser.walletCoins || 0) + coinsEarned,
      }
    }

    set({
      orders: [newOrder, ...state.orders],
      cart: [],
      activeTrackingOrderId: id,
      user: updatedUser,
    })

    return id
  },

  login: (name, email, phone, address) => set((state) => ({
    user: {
      name,
      email,
      phone: phone || state.user?.phone || '',
      address: address || state.user?.address || '',
      walletCoins: state.user?.walletCoins || 100,
    }
  })),

  logout: () => set({ user: null }),

  updateUser: (data) => set((state) => ({
    user: state.user ? { ...state.user, ...data } : { name: 'Foodie', email: 'foodie@bobs.com', phone: '9550764604', ...data }
  })),

  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map((order) => order.id === id ? { ...order, status } : order)
  })),

  // Menu Management
  addMenuItem: (item) => set((state) => ({
    menuItems: [
      ...state.menuItems,
      { ...item, id: `dish-${Date.now()}`, available: item.available ?? true }
    ]
  })),
  updateMenuItem: (id, updatedFields) => set((state) => ({
    menuItems: state.menuItems.map((item) => item.id === id ? { ...item, ...updatedFields } : item)
  })),
  deleteMenuItem: (id) => set((state) => ({
    menuItems: state.menuItems.filter((item) => item.id !== id)
  })),
  toggleItemAvailability: (id) => set((state) => ({
    menuItems: state.menuItems.map((item) => 
      item.id === id ? { ...item, available: item.available === false ? true : false } : item
    )
  })),

  // Inventory Management
  updateInventoryStock: (id, newStock) => set((state) => ({
    inventory: state.inventory.map((item) => item.id === id ? { ...item, stock: Math.max(0, newStock) } : item)
  })),
  addInventoryItem: (item) => set((state) => ({
    inventory: [...state.inventory, { ...item, id: `inv-${Date.now()}` }]
  }))
}), { name: 'bobs-satellite-kitchen-store' }))

export const cartCount = (cart: CartLine[]) => cart.reduce((sum, item) => sum + item.quantity, 0)
