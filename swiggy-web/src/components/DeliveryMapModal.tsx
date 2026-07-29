'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, Navigation, Search, ShieldCheck, Building, Crosshair, AlertTriangle } from 'lucide-react';
import { MARATHAHALLI_DELIVERY_LOCATIONS, CAFE_INFO, KITCHEN_COORDS } from '../data/mockData';
import { Location } from '../types';

interface DeliveryMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: Location;
  onSelectLocation: (location: Location) => void;
}

// Haversine fallback distance formula in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const DeliveryMapModal: React.FC<DeliveryMapModalProps> = ({
  isOpen,
  onClose,
  selectedLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<Location>(selectedLocation);
  const [houseDetail, setHouseDetail] = useState('');
  const [phoneDetail, setPhoneDetail] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const currentLat = tempSelected.lat || KITCHEN_COORDS.lat + 0.008;
  const currentLng = tempSelected.lng || KITCHEN_COORDS.lng + 0.008;

  const distanceMeters = calculateDistanceMeters(
    KITCHEN_COORDS.lat,
    KITCHEN_COORDS.lng,
    currentLat,
    currentLng
  );
  const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
  const isInside3km = distanceMeters <= CAFE_INFO.maxDeliveryRadiusMeters;

  const filteredLocations = MARATHAHALLI_DELIVERY_LOCATIONS.filter(
    (loc) =>
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamically initialize Leaflet map inside useEffect for SSR safety
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isSubscribed = true;

    // Load Leaflet CSS dynamically if not present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      // Fix Leaflet marker icon URLs
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Cleanup existing map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // 1. Create Leaflet map centered at Kitchen
      const map = L.map(mapContainerRef.current, {
        center: [KITCHEN_COORDS.lat, KITCHEN_COORDS.lng],
        zoom: 14,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // 2. Add OpenStreetMap live map tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // 3. Draw 3 KM Delivery Zone Boundary Circle (L.circle)
      const circle = L.circle([KITCHEN_COORDS.lat, KITCHEN_COORDS.lng], {
        radius: 3000,
        color: '#facc15',
        fillColor: '#facc15',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);
      circleRef.current = circle;

      // 4. Kitchen Marker (Red / Yellow Badge)
      const kitchenIcon = L.divIcon({
        className: 'custom-kitchen-marker',
        html: `<div style="background:#0f172a;color:#facc15;padding:4px 8px;border-radius:8px;border:2px solid #facc15;font-weight:900;font-size:10px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)">🔥 BOB'S Kitchen</div>`,
        iconSize: [100, 30],
        iconAnchor: [50, 15],
      });
      L.marker([KITCHEN_COORDS.lat, KITCHEN_COORDS.lng], { icon: kitchenIcon })
        .addTo(map)
        .bindPopup("<b>BOB'S Satellite Kitchen</b><br>12.953542, 77.695894<br>3 KM Delivery Center");

      // 5. Draggable Customer Pin
      const customerMarker = L.marker([currentLat, currentLng], {
        draggable: true,
      }).addTo(map);
      customerMarkerRef.current = customerMarker;

      const updateCustomerPosition = (newLat: number, newLng: number) => {
        const distM = Math.round(map.distance([KITCHEN_COORDS.lat, KITCHEN_COORDS.lng], [newLat, newLng]));
        const distK = parseFloat((distM / 1000).toFixed(2));
        const isOk = distM <= 3000;

        setTempSelected({
          id: `pin-${Date.now()}`,
          title: `Pinned Position (${distK} KM)`,
          address: `Pinned Location (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`,
          city: 'Bengaluru',
          distanceKm: distK,
          lat: newLat,
          lng: newLng,
          isDeliverable: isOk,
        });
      };

      customerMarker.on('dragend', (evt: any) => {
        const pos = evt.target.getLatLng();
        updateCustomerPosition(pos.lat, pos.lng);
      });

      // Map click moves customer pin to click position
      map.on('click', (e: any) => {
        customerMarker.setLatLng(e.latlng);
        updateCustomerPosition(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update Leaflet customer marker position if tempSelected changes via preset or GPS
  useEffect(() => {
    if (customerMarkerRef.current && tempSelected.lat && tempSelected.lng) {
      customerMarkerRef.current.setLatLng([tempSelected.lat, tempSelected.lng]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([tempSelected.lat, tempSelected.lng]);
      }
    }
  }, [tempSelected.lat, tempSelected.lng]);

  const handleUseMyLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const distM = calculateDistanceMeters(KITCHEN_COORDS.lat, KITCHEN_COORDS.lng, lat, lng);
          const distK = parseFloat((distM / 1000).toFixed(2));
          const isOk = distM <= 3000;

          setTempSelected({
            id: `gps-${Date.now()}`,
            title: 'My Current Location (GPS)',
            address: `GPS Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)} (${distK} KM from kitchen)`,
            city: 'Bengaluru',
            distanceKm: distK,
            lat,
            lng,
            isDeliverable: isOk,
          });
          setIsLocating(false);
        },
        (err) => {
          alert('Could not access device GPS. Please grant location permission or click on the Leaflet map.');
          setIsLocating(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleConfirm = () => {
    if (!isInside3km) {
      alert(`Location is ${distanceKm} KM away. BOB'S Kitchen delivers strictly within 3.0 KM of our kitchen.`);
      return;
    }

    const finalLoc: Location = {
      ...tempSelected,
      address: houseDetail
        ? `${houseDetail}, ${tempSelected.address}`
        : tempSelected.address,
      distanceKm,
      isDeliverable: true,
    };
    onSelectLocation(finalLoc);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-200"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-yellow-400 text-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 text-yellow-400 rounded-lg shadow-sm">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">OpenStreetMap + Leaflet Live Delivery Map</h2>
                <p className="text-xs font-semibold text-slate-900">
                  Kitchen Coordinates: {KITCHEN_COORDS.lat.toFixed(6)}, {KITCHEN_COORDS.lng.toFixed(6)} • 3 KM Zone
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-900/10 text-slate-950 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Leaflet Live Map Canvas */}
            <div className="lg:col-span-7 bg-slate-100 p-4 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r border-slate-200">
              {/* Leaflet Live Map Container Element */}
              <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner border border-slate-300 z-0">
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Top Badge: 3 KM Zone Indicator */}
                <div className="absolute top-3 left-3 bg-slate-950/90 text-yellow-400 px-3 py-1 rounded-lg shadow-md border border-slate-800 flex items-center gap-2 z-[400] pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-extrabold">3 KM Delivery Radius Overlay</span>
                </div>
              </div>

              {/* GPS Geolocation Button */}
              <button
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-yellow-400 font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 border border-slate-800 transition-all"
              >
                <Crosshair className={`w-4 h-4 text-yellow-400 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS Position...' : 'Use My Current Location'}</span>
              </button>

              {/* Address Form Inputs */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 space-y-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Flat / House No. &amp; Landmark</span>
                  </label>
                  <input
                    type="text"
                    value={houseDetail}
                    onChange={(e) => setHouseDetail(e.target.value)}
                    placeholder="e.g. Flat 302, Sunrise Heights, Near Spice Garden..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Real-time Feasibility Banner */}
              <div
                className={`rounded-xl p-3.5 shadow-sm border flex items-start gap-3 transition-colors ${
                  isInside3km
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isInside3km ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                  {isInside3km ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isInside3km
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {isInside3km ? '✓ Delivery Available' : '❌ Outside Delivery Area'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-700">
                      {distanceKm} km from our kitchen
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs mt-1.5">{tempSelected.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">{tempSelected.address}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Search & Preset Presets */}
            <div className="lg:col-span-5 p-5 flex flex-col h-full bg-white">
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Marathahalli Zone Preset
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Marathahalli, AECS, Brookefield..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Location Presets List */}
              <div className="flex-1 overflow-y-auto max-h-[240px] lg:max-h-[300px] space-y-2 pr-1">
                {filteredLocations.map((loc) => {
                  const isSelected = tempSelected.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setTempSelected(loc)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg mt-0.5 ${
                          isSelected ? 'bg-yellow-400 text-slate-950 font-bold' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">{loc.title}</span>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {loc.distanceKm} KM
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{loc.address}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Confirm Delivery CTA */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={!isInside3km}
                  className={`w-full py-3 px-4 font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    isInside3km
                      ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 border border-yellow-300'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>
                    {isInside3km
                      ? `Continue to Order (${distanceKm} km)`
                      : `Outside Delivery Area (${distanceKm} km)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};




