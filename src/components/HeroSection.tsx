'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bike, Sparkles, MapPin, CheckCircle, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { CAFE_INFO } from '../data/mockData';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-yellow-50 via-white to-slate-50 py-8 sm:py-12 border-b border-slate-200">
      {/* Subtle Ambient Graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text Banner */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-yellow-400 text-slate-950 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
              <Sparkles className="w-4 h-4 fill-current" />
              <span>BOB&#39;S MENU • MARATHAHALLI KITCHEN</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight">
              FUSION SNACK PACKS &amp; MORE <br />
              <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 inline-block rounded-lg mt-1 shadow-sm">
                FREE DELIVERY OVER ₹300
              </span>
            </h1>

            <p className="text-slate-700 font-bold text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Order signature Paneer &amp; Chicken Tikka Snack Packs, Burgers, Rolls, Sandwiches &amp; Desserts. 
              Delivering across Marathahalli &amp; surrounding areas everyday from <span className="font-extrabold text-slate-950 bg-yellow-200 px-1 py-0.5 rounded">12:00 PM – 12:00 AM</span>.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1 text-xs font-extrabold text-slate-800">
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 shadow-xs px-3.5 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Open 12:00 PM – 12:00 AM</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 shadow-xs px-3.5 py-2 rounded-xl">
                <Bike className="w-4 h-4 text-amber-600" />
                <span>Express Hot Delivery</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 shadow-xs px-3.5 py-2 rounded-xl">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>13 Marathahalli Zones Covered</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Card */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-sm bg-white p-6 rounded-3xl border-2 border-yellow-400 shadow-xl text-center space-y-4"
            >
              {/* Badge Header */}
              <div className="w-20 h-20 bg-yellow-400 text-slate-950 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-md border-2 border-yellow-300">
                BOB&#39;S
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                  BOB&#39;S MENU &amp; KITCHEN
                </h3>
                <p className="text-xs text-amber-700 font-extrabold mt-0.5">
                  Marathahalli • Bengaluru
                </p>
              </div>

              <div className="bg-slate-950 text-yellow-400 p-3.5 rounded-2xl font-extrabold text-xs space-y-1 shadow-md">
                <p className="uppercase tracking-widest text-[10px] text-yellow-300">OPERATING HOURS</p>
                <p className="text-base text-white">12:00 PM – 12:00 AM</p>
                <p className="text-[11px] text-yellow-400 font-bold">Free 4KM Delivery on Orders Above ₹300</p>
              </div>

              <a
                href={CAFE_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-slate-900 hover:text-amber-600 underline transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>View Google Maps Location</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

