'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Home, Briefcase } from 'lucide-react';
import { Location } from '../types';
import { DEFAULT_LOCATIONS } from '../data/mockData';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: Location;
  onSelectLocation: (loc: Location) => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredLocations = DEFAULT_LOCATIONS.filter(
    (loc) =>
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-950 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-black">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-yellow-400" />
              Select Delivery Address
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-900 border border-gray-800 text-gray-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search area, street in Marathahalli..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-yellow-400 transition-all"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>

            {/* GPS Detection */}
            <button
              onClick={() => {
                onSelectLocation({
                  id: 'gps-live',
                  title: 'Current GPS Location',
                  address: 'Marathahalli Main Road, Bengaluru',
                  city: 'Bengaluru',
                  distanceKm: 1.5,
                });
                onClose();
              }}
              className="w-full flex items-center space-x-3 p-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 font-bold transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-black flex items-center justify-center font-black shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Use Current Location</p>
                <p className="text-xs text-yellow-400/80 font-semibold">Using GPS position</p>
              </div>
            </button>

            {/* Default Locations */}
            <div>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                Serving Locations in Marathahalli
              </h3>
              <div className="space-y-3">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full flex items-start space-x-3 p-4 rounded-2xl border border-gray-800 hover:border-yellow-400/40 bg-gray-900/60 hover:bg-gray-900 text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-800 text-yellow-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-white">{loc.title}</span>
                        <span className="text-[10px] bg-yellow-400 text-black font-extrabold px-1.5 py-0.5 rounded">
                          {loc.distanceKm} KM
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{loc.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
