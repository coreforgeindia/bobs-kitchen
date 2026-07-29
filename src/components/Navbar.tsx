'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Search,
  ShoppingBag,
  Info,
  Bike,
  Store,
  ChevronDown,
  Flame,
  Clock,
} from 'lucide-react';
import { OrderMode, Location } from '../types';
import { CAFE_INFO } from '../data/mockData';

interface NavbarProps {
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  currentLocation: Location;
  onOpenLocationModal: () => void;
  onOpenSearchModal: () => void;
  onOpenInfoModal: () => void;
  onOpenCartModal: () => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  orderMode,
  setOrderMode,
  currentLocation,
  onOpenLocationModal,
  onOpenSearchModal,
  onOpenInfoModal,
  onOpenCartModal,
  cartCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      {/* Top Hours Ribbon */}
      <div className="bg-slate-950 text-white text-[11px] font-bold px-4 py-1 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open Everyday: <span className="text-yellow-400">12:00 PM – 12:00 AM</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-300">
            <span>Marathahalli & Surrounding Area Express Delivery</span>
            <a 
              href={CAFE_INFO.googleMapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-400 hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              View Location Map
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="#"
              className="flex items-center space-x-3 group"
            >
              {/* Chef Icon Badge */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 text-slate-950 rounded-2xl flex flex-col items-center justify-center font-black shadow-md border-2 border-yellow-300">
                <Flame className="w-6 h-6 text-slate-950 fill-current" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                  <span className="font-black text-2xl tracking-tighter text-slate-950 leading-none">
                    BOB&#39;S
                  </span>
                  <span className="text-[10px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                    MENU
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">
                  SNACK PACKS • BURGERS • ROLLS
                </span>
              </div>
            </motion.a>

            {/* Location Pill */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenLocationModal}
              className="hidden lg:flex items-center space-x-2 text-xs text-slate-800 bg-slate-100 hover:bg-yellow-50 py-2 px-3 rounded-xl border border-slate-200 hover:border-yellow-400 transition-all shadow-xs"
            >
              <MapPin className="w-4 h-4 text-amber-600" />
              <span className="font-extrabold text-slate-900 truncate max-w-[170px]">
                {currentLocation.title}
              </span>
              <span className="text-[10px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded">
                Map Zone
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </motion.button>
          </div>

          {/* Delivery vs Pickup Switcher */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setOrderMode('delivery')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                orderMode === 'delivery'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>DELIVERY</span>
            </button>

            <button
              onClick={() => setOrderMode('pickup')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                orderMode === 'pickup'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>TAKEAWAY</span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSearchModal}
              className="p-2.5 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all border border-slate-200"
              title="Search Menu Items"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenInfoModal}
              className="p-2.5 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all hidden sm:flex items-center gap-1.5 text-xs font-extrabold border border-slate-200"
            >
              <Info className="w-4 h-4 text-amber-600" />
              <span>Store Info</span>
            </button>

            {/* Cart Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenCartModal}
              className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-4 py-2.5 rounded-xl font-extrabold shadow-md transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline">CART</span>
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                  className="bg-slate-950 text-yellow-400 text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Location & Mode Switcher */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 gap-2">
        <button
          onClick={onOpenLocationModal}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span className="truncate max-w-[110px]">{currentLocation.title}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg flex-1">
          <button
            onClick={() => setOrderMode('delivery')}
            className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-xs font-bold ${
              orderMode === 'delivery' ? 'bg-yellow-400 text-slate-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery</span>
          </button>
          <button
            onClick={() => setOrderMode('pickup')}
            className={`flex-1 flex items-center justify-center space-x-1 py-1 rounded-md text-xs font-bold ${
              orderMode === 'pickup' ? 'bg-yellow-400 text-slate-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Takeaway</span>
          </button>
        </div>
      </div>
    </header>
  );
};

