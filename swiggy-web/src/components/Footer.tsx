'use client';

import React from 'react';
import { Flame, Heart, Phone, MapPin, Globe, Clock, ExternalLink } from 'lucide-react';
import { CAFE_INFO } from '../data/mockData';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-white pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-400 text-slate-950 rounded-xl flex items-center justify-center font-black shadow-md border border-yellow-300">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <span className="font-black text-2xl tracking-tight text-yellow-400">
                BOB&#39;S MENU
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              {CAFE_INFO.subtitle} • {CAFE_INFO.location}. Fresh fusion snacks, rolls, burgers, sandwiches &amp; desserts prepared hot on order.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest">
              Menu Categories
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 font-bold">
              <li><a href="#menu" className="hover:text-yellow-400 transition-colors">Fusion Snack Pack (Signature)</a></li>
              <li><a href="#menu" className="hover:text-yellow-400 transition-colors">Burgers &amp; Rolls</a></li>
              <li><a href="#menu" className="hover:text-yellow-400 transition-colors">Sandwiches &amp; Sides</a></li>
              <li><a href="#menu" className="hover:text-yellow-400 transition-colors">Tiramisu Cup &amp; Desserts</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest">
              Kitchen Location &amp; Hours
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
              <li className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>Open Everyday: 12:00 PM – 12:00 AM</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-yellow-400" />
                <span>{CAFE_INFO.phone}</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">{CAFE_INFO.address}</span>
              </li>
              <li>
                <a
                  href={CAFE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-yellow-400 hover:underline text-xs font-bold"
                >
                  <span>Google Maps Location</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Free Delivery Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest">
              Delivery Terms
            </h4>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs space-y-1 font-bold text-slate-300">
              <p className="text-yellow-400 font-black">FREE 4KM DELIVERY**</p>
              <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                **Delivered FREE within a 4 KM radius across 13 Marathahalli zones on all orders above ₹300. Store Takeaway / Pickup available anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-bold">
          <p>© 2026 {CAFE_INFO.name}. All rights reserved. Exclusively serving Marathahalli.</p>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current inline" />
            <span>for Marathahalli foodies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

