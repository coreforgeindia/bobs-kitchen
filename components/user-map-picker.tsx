'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Navigation, MapPin, CheckCircle2, AlertTriangle, Sparkles, LocateFixed, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

const KITCHEN_LOCATION: [number, number] = [12.953542087360153, 77.69335637484109] // 1067, 8th Main Rd, Kaveri Layout, Marathahalli Village, Bengaluru

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

function createKitchenIcon() {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: #0284c7;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <div style="
          position: absolute;
          top: -22px;
          white-space: nowrap;
          background: #0369a1;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">
          Bob's Kitchen Hub
        </div>
      </div>
    `,
    className: 'kitchen-hub-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function createUserPinIcon(withinZone: boolean) {
  const bg = withinZone ? '#ea580c' : '#d97706'
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        background: ${bg};
        border: 3px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
        cursor: grab;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${bg};
        "></div>
      </div>
    `,
    className: 'user-delivery-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 44],
  })
}

type UserMapPickerProps = {
  initialLat?: number
  initialLng?: number
  onConfirmLocation: (address: string, distKm: number, lat: number, lng: number) => void
  onAddressChange?: (address: string, distKm: number, lat: number, lng: number) => void
}

export function UserMapPicker({ 
  initialLat = 12.9540, 
  initialLng = 77.6960, 
  onConfirmLocation,
  onAddressChange 
}: UserMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  const [currentLat, setCurrentLat] = useState(initialLat)
  const [currentLng, setCurrentLng] = useState(initialLng)
  const [addressText, setAddressText] = useState('Fetching pinned address...')
  const [distanceKm, setDistanceKm] = useState(calculateDistanceKm(KITCHEN_LOCATION[0], KITCHEN_LOCATION[1], initialLat, initialLng))
  const [isReverseLoading, setIsReverseLoading] = useState(false)

  const isWithin3km = distanceKm <= 3.0

  // Reverse geocode lat/lng to readable address
  const fetchAddress = async (lat: number, lng: number) => {
    setIsReverseLoading(true)
    const dist = calculateDistanceKm(KITCHEN_LOCATION[0], KITCHEN_LOCATION[1], lat, lng)
    let finalAddr = ''

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim())
        finalAddr = parts.length > 5 ? parts.slice(0, 5).join(', ') : data.display_name
      } else {
        finalAddr = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      }
    } catch {
      try {
        const fallbackRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
        const fallbackData = await fallbackRes.json()
        if (fallbackData && (fallbackData.locality || fallbackData.city)) {
          finalAddr = `${fallbackData.locality || fallbackData.city}, ${fallbackData.principalSubdivision || 'Bengaluru'}`
        } else {
          finalAddr = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        }
      } catch {
        finalAddr = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      }
    } finally {
      setIsReverseLoading(false)
      setAddressText(finalAddr)
      if (onAddressChange) {
        onAddressChange(finalAddr, dist, lat, lng)
      }
    }
  }

  // Initialize Map & 3km Radius Circle
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

    const map = L.map(mapContainerRef.current, {
      center: KITCHEN_LOCATION,
      zoom: 13,
      zoomControl: false,
    })

    // CartoDB Voyager tiles for modern crisp UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // 1. Kitchen Central Hub Pin
    L.marker(KITCHEN_LOCATION, { icon: createKitchenIcon() }).addTo(map)

    // 2. Shaded 3km Delivery Radius Zone Circle
    L.circle(KITCHEN_LOCATION, {
      radius: 3000, // 3000 meters = 3 km
      color: '#f97316',
      fillColor: '#f97316',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 6',
    }).addTo(map)

    // 3. Draggable User Delivery Pin
    const dist = calculateDistanceKm(KITCHEN_LOCATION[0], KITCHEN_LOCATION[1], initialLat, initialLng)
    const userMarker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: createUserPinIcon(dist <= 3.0),
    }).addTo(map)

    userMarkerRef.current = userMarker

    // Fetch address for initial position immediately
    fetchAddress(initialLat, initialLng)

    // Handle marker dragend
    userMarker.on('dragend', () => {
      const pos = userMarker.getLatLng()
      updatePosition(pos.lat, pos.lng)
    })

    // Handle map click to move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      userMarker.setLatLng(e.latlng)
      updatePosition(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Helper to update state on pin movement
  const updatePosition = (lat: number, lng: number) => {
    setCurrentLat(lat)
    setCurrentLng(lng)

    const dist = calculateDistanceKm(KITCHEN_LOCATION[0], KITCHEN_LOCATION[1], lat, lng)
    setDistanceKm(dist)

    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createUserPinIcon(dist <= 3.0))
    }

    fetchAddress(lat, lng)
  }

  // Trigger GPS auto-detect
  const handleAutoGPS = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser')
    }

    toast.loading('Locating your GPS position...', { id: 'gps-toast' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('gps-toast')
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (mapRef.current && userMarkerRef.current) {
          mapRef.current.flyTo([lat, lng], 15, { duration: 1.2 })
          userMarkerRef.current.setLatLng([lat, lng])
          updatePosition(lat, lng)
          toast.success('Located your exact GPS position! 📍')
        }
      },
      (err) => {
        toast.dismiss('gps-toast')
        toast.error('Unable to retrieve location. Please drag the pin on map manually.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="space-y-3 font-outfit">
      {/* Top Banner Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary/80 p-3 border border-border/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 font-black">
            📍
          </div>
          <div>
            <p className="font-extrabold text-foreground text-xs">Drag Pin or Click Map to Select</p>
            <p className="text-[10px] text-muted-foreground">Kitchen Hub 3 km Free Delivery Zone Circle highlighted</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAutoGPS}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-black text-white shadow-md hover:scale-105 transition-all cursor-pointer"
        >
          <LocateFixed size={14} /> Auto GPS Locate
        </button>
      </div>

      {/* Leaflet Map Frame */}
      <div className="relative h-[320px] sm:h-[380px] w-full overflow-hidden rounded-3xl border border-border bg-neutral-900 shadow-xl">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Floating 3km Zone Badge */}
        <div className="absolute top-3 left-3 z-20">
          <span className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-black shadow-lg backdrop-blur-md border ${
            isWithin3km
              ? 'bg-emerald-600/90 text-white border-emerald-400/30'
              : 'bg-amber-600/90 text-white border-amber-400/30'
          }`}>
            {isWithin3km ? (
              <>
                <CheckCircle2 size={15} /> Within 3 km Delivery Zone ({distanceKm} km)
              </>
            ) : (
              <>
                <AlertTriangle size={15} /> Outside 3 km Radius ({distanceKm} km)
              </>
            )}
          </span>
        </div>
      </div>

      {/* Selected Location Card & Action */}
      <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-500">Pinned Delivery Address</p>
            <p className="font-bold text-sm text-foreground leading-snug mt-0.5">
              {isReverseLoading ? 'Fetching address details...' : addressText}
            </p>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
            isWithin3km ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
          }`}>
            {isWithin3km ? '20-25 Min Delivery ⚡' : 'Extended Zone ⚠️'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onConfirmLocation(addressText, distanceKm, currentLat, currentLng)}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          Confirm & Pin This Location ({distanceKm} km from Kitchen)
        </button>
      </div>
    </div>
  )
}
