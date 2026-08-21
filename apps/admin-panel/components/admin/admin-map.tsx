'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Navigation, Phone, User, Package, CheckCircle2, Clock, Truck, ShieldAlert } from 'lucide-react'
import { Order, useAppStore } from '@/lib/store'
import { formatPrice } from '@/lib/menu-data'

const KITCHEN_LOCATION: [number, number] = [12.953542087360153, 77.69335637484109] // 1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru

function createCustomIcon(type: 'kitchen' | 'delivery' | 'delivered', status?: string) {
  const bgColor = type === 'kitchen' ? '#0f766e' : status === 'Delivered' ? '#15803d' : '#ea580c'
  const size = type === 'kitchen' ? 16 : 12
  const html = `<div style="width:${size}px;height:${size}px;background:${bgColor};border:2px solid #ffffff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`

  return L.divIcon({
    html,
    className: 'custom-leaflet-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

export function AdminMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const linesRef = useRef<L.Polyline[]>([])

  const orders = useAppStore((s) => s.orders)
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus)

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('All')

  // Filter delivery orders that have coordinates
  const activeDeliveryOrders = orders.filter((o) => {
    if (filterStatus !== 'All' && o.status !== filterStatus) return false
    return o.lat && o.lng
  })

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Inject Leaflet CSS dynamically if missing
    if (!document.getElementById('leaflet-css-style')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css-style'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const bounds = L.latLngBounds(
      L.latLng(12.910, 77.640),
      L.latLng(12.995, 77.750)
    )

    // Initialize Map with dark tiles & strict bounds lock around Marathahalli 3km radius
    const map = L.map(mapContainerRef.current, {
      center: KITCHEN_LOCATION,
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    })

    // CartoDB Voyager tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Render markers and route lines
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear previous markers and polylines
    markersRef.current.forEach((m) => m.remove())
    linesRef.current.forEach((l) => l.remove())
    markersRef.current = []
    linesRef.current = []

    // 0. 3km Delivery Radius Zone Circle
    L.circle(KITCHEN_LOCATION, {
      radius: 3000,
      color: '#0284c7',
      fillColor: '#0284c7',
      fillOpacity: 0.10,
      weight: 2,
      dashArray: '6, 6',
    }).addTo(map)

    // 1. Kitchen Central Hub Marker
    const kitchenMarker = L.marker(KITCHEN_LOCATION, {
      icon: createCustomIcon('kitchen'),
      title: "Bob's Central Kitchen Hub",
    }).addTo(map)

    kitchenMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 6px; color: #18181b;">
        <strong style="font-size: 15px; color: #0284c7; display: flex; align-items: center; gap: 4px;">
          🏪 Bob's Satellite Kitchen Hub
        </strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #52525b;">
          1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Marathahalli, Bengaluru, Karnataka 560037
        </p>
        <span style="display: inline-block; margin-top: 6px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: bold;">
          🟢 Central Hub · 3 km Zone Active
        </span>
      </div>
    `)

    markersRef.current.push(kitchenMarker)

    // 2. Active Delivery Markers & Route Polylines
    activeDeliveryOrders.forEach((order) => {
      if (!order.lat || !order.lng) return

      const isSelected = order.id === selectedOrderId
      const markerPos: [number, number] = [order.lat, order.lng]

      const marker = L.marker(markerPos, {
        icon: createCustomIcon('delivery', order.status),
      }).addTo(map)

      // Polyline route from Kitchen Hub to User Location
      const polyline = L.polyline([KITCHEN_LOCATION, markerPos], {
        color: order.status === 'Out For Delivery' ? '#f97316' : '#94a3b8',
        weight: isSelected ? 4 : 2,
        dashArray: order.status === 'Out For Delivery' ? '8, 8' : undefined,
        opacity: isSelected ? 0.9 : 0.6,
      }).addTo(map)

      linesRef.current.push(polyline)

      // Custom Popup
      const itemsSummary = order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; width: 230px; padding: 4px; color: #18181b;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">
            <strong style="font-size: 14px; font-weight: 800; color: #18181b;">Order #${order.id}</strong>
            <span style="background: ${order.mode === 'Takeaway' ? '#cffafe' : '#ffedd5'}; color: ${order.mode === 'Takeaway' ? '#0e7490' : '#c2410c'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
              ${order.mode}
            </span>
          </div>
          <div style="margin-top: 8px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: 600; color: #3f3f46;">
              👤 ${order.customerName || 'Customer'} (${order.customerPhone || 'N/A'})
            </div>
            <p style="margin: 4px 0; color: #71717a; font-size: 11px; line-height: 1.3;">
              📍 ${order.deliveryAddress || 'Address specified'}
            </p>
            <div style="background: #f4f4f5; padding: 6px; border-radius: 6px; margin-top: 6px; font-size: 11px; color: #27272a;">
              <strong>Items:</strong> ${itemsSummary}
            </div>
            <div style="display: flex; justify-content: space-between; items: center; margin-top: 8px;">
              <span style="font-weight: 900; font-size: 13px; color: #000;">Total: ${formatPrice(order.total)}</span>
              <span style="font-size: 11px; font-weight: 700; color: #ea580c;">Status: ${order.status}</span>
            </div>
          </div>
        </div>
      `)

      marker.on('click', () => {
        setSelectedOrderId(order.id)
      })

      markersRef.current.push(marker)
    })
  }, [activeDeliveryOrders, selectedOrderId, orders])

  // Center map on selected order
  const focusOnOrder = (order: Order) => {
    setSelectedOrderId(order.id)
    if (mapRef.current && order.lat && order.lng) {
      mapRef.current.flyTo([order.lat, order.lng], 15, { duration: 1.2 })
    }
  }

  const resetView = () => {
    setSelectedOrderId(null)
    if (mapRef.current) {
      mapRef.current.flyTo(KITCHEN_LOCATION, 14, { duration: 1 })
    }
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId)

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-xl">
      {/* Top Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-900/90 px-4 py-3 backdrop-blur-xl border border-white/10 shadow-lg font-outfit">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
            <Truck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide">Live GPS Delivery Radar</h3>
            <p className="text-[11px] text-zinc-400">Real-time dispatch tracking for Bob's Kitchen</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['All', 'Order Received', 'Accept Order', 'Preparing', 'Packed', 'Ready for Pickup', 'Out For Delivery', 'Delivered'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
          <button
            onClick={resetView}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <Navigation size={14} className="text-cyan-400" /> Center Hub
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-10" />

      {/* Floating Order Dispatch Drawer / List Overlay */}
      <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full space-y-2">
        {/* Selected Order Detail Card */}
        {selectedOrder ? (
          <div className="rounded-2xl border border-orange-500/40 bg-zinc-900/95 p-4 backdrop-blur-xl shadow-2xl text-white transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-black tracking-wider text-orange-400 uppercase">
                Order #{selectedOrder.id}
              </span>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <User size={15} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white">{selectedOrder.customerName || 'Customer'}</p>
                  <p className="text-zinc-400 text-[11px]">{selectedOrder.customerPhone || 'No contact provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-cyan-400 mt-0.5 shrink-0" />
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {selectedOrder.deliveryAddress || 'Pick-up / Table'}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950/80 p-2.5 border border-zinc-800 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                  <span>Ordered Dishes</span>
                  {selectedOrder.transactionId && (
                    <span className="text-emerald-400 font-mono">UPI Ref: #{selectedOrder.transactionId}</span>
                  )}
                </div>
                <p className="text-zinc-200 text-xs">
                  {selectedOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-serif text-lg font-black text-white">
                  {formatPrice(selectedOrder.total)}
                </span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                  className="rounded-xl border border-orange-500/50 bg-zinc-950 px-3 py-1.5 text-xs font-extrabold text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {[
                    'Order Received',
                    'Preparing',
                    'Packed',
                    'Out For Delivery',
                    'Delivered',
                  ].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Active Deliveries Quick List */
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/90 p-3 backdrop-blur-xl shadow-2xl text-white scrollbar-thin scrollbar-thumb-zinc-700">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs font-black uppercase text-zinc-400 tracking-wider">
              <span>📍 Live Active Destinations</span>
              <span className="text-orange-400">{activeDeliveryOrders.length} Pins</span>
            </div>

            {activeDeliveryOrders.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-2 text-center">No active delivery pins for selected status filter.</p>
            ) : (
              <div className="space-y-1.5">
                {activeDeliveryOrders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => focusOnOrder(ord)}
                    className="w-full text-left rounded-xl bg-zinc-800/60 p-2 hover:bg-zinc-800 border border-transparent hover:border-orange-500/30 transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">#{ord.id} · {ord.customerName || 'Customer'}</p>
                      <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{ord.deliveryAddress}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      ord.status === 'Out For Delivery' ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {ord.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
