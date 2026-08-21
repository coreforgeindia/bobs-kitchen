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
  email?: string; 
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

const initialInventory: InventoryItem[] = []

const initialOrders: Order[] = []

export type PlaceOrderOptions = {
  orderId?: string
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

    const id = opts.orderId || ''
    if (!id) throw new Error('Order number was not reserved')

    const effectiveMode = opts.mode || state.orderMode || 'Delivery'
    const deliveryFee = effectiveMode !== 'Delivery' || subtotal >= 300 || subtotal === 0 ? 0 : 35
    const discount = opts.discount || 0
    const platformFee = state.cart.length > 0 ? 10 : 0
    const taxes = 0
    const total = Math.max(0, subtotal + deliveryFee + platformFee - discount)

    // Calculate coins earned
    const coinCalc = calculateCoinsEarned(subtotal)
    const coinsEarned = opts.coinsEarned ?? coinCalc.coins

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
      customerName: opts.customerName || state.user?.name || '',
      customerPhone: opts.customerPhone || state.user?.phone || '',
      customerEmail: opts.customerEmail || state.user?.email || '',
      paymentMethod: opts.paymentMethod || 'UPI',
      transactionId: opts.transactionId || undefined,
      appliedCoupon: opts.appliedCoupon || undefined,
      lat: opts.lat,
      lng: opts.lng,
      distanceKm: opts.distanceKm,
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
      walletCoins: state.user?.walletCoins || 0,
    }
  })),

  logout: () => set({ user: null }),

  updateUser: (data) => set((state) => state.user ? ({ user: { ...state.user, ...data } }) : state),

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
