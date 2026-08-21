'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Bike, MapPin, ExternalLink, RefreshCw } from 'lucide-react'

export const KITCHEN_COORDS: [number, number] = [12.95371983601378, 77.6959312938781] // 1067, 8th Main Rd, Kaveri Layout, Marathahalli

interface LiveRoadTrackerProps {
  destLat?: number
  destLng?: number
  mode?: 'Delivery' | 'Takeaway'
  deliveryAddress?: string
  status?: string
  estimatedMins?: number
}

export function LiveRoadTracker({
  destLat = 12.9582,
  destLng = 77.6990,
  mode = 'Delivery',
  deliveryAddress = 'Marathahalli Village, Bengaluru',
  status = 'Out For Delivery',
  estimatedMins = 15,
}: LiveRoadTrackerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const riderMarkerRef = useRef<L.Marker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [routeDistanceKm, setRouteDistanceKm] = useState<string>('1.2')
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(true)

  const isTakeaway = mode === 'Takeaway'

  // Fetch actual shortest road route from OSRM
  useEffect(() => {
    let isCancelled = false
    setIsLoadingRoute(true)

    const start = `${KITCHEN_COORDS[1]},${KITCHEN_COORDS[0]}`
    const end = `${destLng},${destLat}`

    fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return
        if (data && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number])
          setRouteCoordinates(coords)
          setRouteDistanceKm((data.routes[0].distance / 1000).toFixed(1))
        } else {
          // Fallback smooth waypoints
          const waypoints: [number, number][] = [
            KITCHEN_COORDS,
            [12.9542, 77.6945],
            [12.9555, 77.6962],
            [12.9570, 77.6978],
            [destLat, destLng],
          ]
          setRouteCoordinates(waypoints)
        }
        setIsLoadingRoute(false)
      })
      .catch(() => {
        if (isCancelled) return
        const waypoints: [number, number][] = [
          KITCHEN_COORDS,
          [12.9542, 77.6945],
          [12.9555, 77.6962],
          [12.9570, 77.6978],
          [destLat, destLng],
        ]
        setRouteCoordinates(waypoints)
        setIsLoadingRoute(false)
      })

    return () => {
      isCancelled = true
    }
  }, [destLat, destLng])

  // Initialize high-contrast black & white map and markers
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: KITCHEN_COORDS,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    // High-Contrast Monochrome / Positron Map Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Kitchen Icon
    const kitchenIcon = L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          background: #f97316;
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(249,115,22,0.45);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
            <path d="M7 2v20"/>
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
          </svg>
          <div style="
            position: absolute;
            top: -24px;
            white-space: nowrap;
            background: #1e293b;
            color: #ffffff;
            padding: 2px 8px;
            border-radius: 99px;
            font-size: 10px;
            font-weight: 800;
            font-family: sans-serif;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            Bob's Kitchen (Kaveri Layout)
          </div>
        </div>
      `,
      className: 'kitchen-pin',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    L.marker(KITCHEN_COORDS, { icon: kitchenIcon }).addTo(map)

    // Destination Icon (if not takeaway)
    if (!isTakeaway) {
      const destIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            background: #0f172a;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <div style="
              position: absolute;
              top: -22px;
              white-space: nowrap;
              background: #0f172a;
              color: #ffffff;
              padding: 2px 8px;
              border-radius: 99px;
              font-size: 10px;
              font-weight: 800;
              font-family: sans-serif;
            ">
              Delivery Location
            </div>
          </div>
        `,
        className: 'dest-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map)
    }

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [destLat, destLng, isTakeaway])

  // Draw road path & animate vehicle movement
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || routeCoordinates.length < 2) return

    // Draw high-contrast road polyline
    const routeLine = L.polyline(routeCoordinates, {
      color: '#f97316',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '1, 8',
    }).addTo(map)

    // Base dark outline
    const baseLine = L.polyline(routeCoordinates, {
      color: '#334155',
      weight: 7,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })

    // Animated Delivery Vehicle Marker
    if (!isTakeaway) {
      const bikeIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 42px;
            height: 42px;
            background: #ffffff;
            border: 3px solid #f97316;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(249,115,22,0.6);
            transform: scale(1.05);
          ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
            <div style="
              position: absolute;
              top: -20px;
              white-space: nowrap;
              background: #ea580c;
              color: #ffffff;
              padding: 1px 6px;
              border-radius: 99px;
              font-size: 9px;
              font-weight: 900;
              font-family: sans-serif;
              animation: pulse 1.5s infinite;
            ">
              LIVE RIDER
            </div>
          </div>
        `,
        className: 'animated-bike-pin',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      })

      const riderMarker = L.marker(routeCoordinates[0], { icon: bikeIcon, zIndexOffset: 1000 }).addTo(map)
      riderMarkerRef.current = riderMarker

      let step = 0
      const totalSteps = 400
      let animationActive = true

      const animateBike = () => {
        if (!animationActive || !riderMarkerRef.current) return
        step = (step + 1) % totalSteps
        const progress = step / totalSteps

        const exactIndex = progress * (routeCoordinates.length - 1)
        const i = Math.floor(exactIndex)
        const remainder = exactIndex - i
        const nextI = Math.min(i + 1, routeCoordinates.length - 1)

        const lat = routeCoordinates[i][0] + remainder * (routeCoordinates[nextI][0] - routeCoordinates[i][0])
        const lng = routeCoordinates[i][1] + remainder * (routeCoordinates[nextI][1] - routeCoordinates[i][1])

        riderMarkerRef.current.setLatLng([lat, lng])
        animationFrameRef.current = requestAnimationFrame(animateBike)
      }

      animationFrameRef.current = requestAnimationFrame(animateBike)

      return () => {
        animationActive = false
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (riderMarker) map.removeLayer(riderMarker)
        map.removeLayer(routeLine)
        map.removeLayer(baseLine)
      }
    }

    return () => {
      map.removeLayer(routeLine)
      map.removeLayer(baseLine)
    }
  }, [routeCoordinates, isTakeaway])

  const openGoogleMapsDirections = () => {
    const destinationQuery = `${KITCHEN_COORDS[0]},${KITCHEN_COORDS[1]}`
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&destination_place_id=Bobs+Satellite+Kitchen`, '_blank')
  }

  return (
    <div className="space-y-3 font-outfit">
      {/* Map Header Card */}
      <div className="flex items-center justify-between bg-white border border-orange-200/80 rounded-2xl p-3.5 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black">
            {isTakeaway ? <MapPin size={18} /> : <Bike size={18} />}
          </div>
          <div>
            <p className="font-extrabold text-slate-900">
              {isTakeaway ? 'Self-Pickup Outlet Route' : 'Live Express Road Route'}
            </p>
            <p className="text-[11px] text-slate-500">
              {isLoadingRoute ? 'Calculating shortest road path...' : `${routeDistanceKm} km shortest road path · ~${estimatedMins} min`}
            </p>
          </div>
        </div>

        {isTakeaway ? (
          <button
            onClick={openGoogleMapsDirections}
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all"
          >
            <span>Google Maps</span>
            <ExternalLink size={12} />
          </button>
        ) : (
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black animate-pulse">
            GPS Active
          </span>
        )}
      </div>

      {/* High-Contrast Interactive Map Container */}
      <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border-2 border-orange-200 shadow-md bg-slate-100">
        <div ref={mapContainerRef} className="size-full" />

        {isLoadingRoute && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-orange-600 z-[500]">
            <RefreshCw size={16} className="animate-spin" />
            <span>Calculating Road Trajectory...</span>
          </div>
        )}

        {/* Live Overlay Badge */}
        <div className="absolute bottom-2.5 left-2.5 z-[500] rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 border border-slate-200/80 shadow-md flex items-center gap-2 text-[11px]">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-slate-800">
            {isTakeaway ? 'Outlet: Kaveri Layout, Marathahalli' : `En Route: ${deliveryAddress}`}
          </span>
        </div>
      </div>

      {isTakeaway && (
        <button
          onClick={openGoogleMapsDirections}
          className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white py-3 text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
        >
          <Navigation size={15} />
          <span>Open Direct Road Navigation in Google Maps →</span>
        </button>
      )}
    </div>
  )
}
