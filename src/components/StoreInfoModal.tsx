'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Phone, Clock, QrCode, Globe, ShieldCheck, Flame, ExternalLink } from 'lucide-react';
import { CAFE_INFO } from '../data/mockData';

interface StoreInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreInfoModal: React.FC<StoreInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="p-6 bg-yellow-400 border-b border-yellow-300 flex items-center justify-between text-slate-950">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-950 text-yellow-400 rounded-xl flex items-center justify-center font-black shadow-sm">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 uppercase">{CAFE_INFO.name}</h3>
                <p className="text-xs text-slate-900 font-extrabold">{CAFE_INFO.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Direct QR Ordering info */}
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-2xl flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-400 text-slate-950 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-yellow-300">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  DIRECT QR & ONLINE ORDERS
                </h4>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Orders taken through QR code or online portal.
                </p>
              </div>
            </div>

            {/* Address & Contact */}
            <div className="space-y-3.5 text-xs font-semibold text-slate-700">
              <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900 text-sm block mb-0.5">Kitchen Location</span>
                  <p>{CAFE_INFO.address}</p>
                  <a
                    href={CAFE_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-700 font-extrabold mt-1 inline-flex items-center gap-1 hover:underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-black text-slate-900 block">Operating Hours</span>
                  <p className="text-slate-900 font-extrabold bg-yellow-200 px-2 py-0.5 rounded inline-block mt-0.5">
                    {CAFE_INFO.openingHours}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Phone className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-black text-slate-900 block">Kitchen Hotline</span>
                  <p className="text-slate-900 font-black">{CAFE_INFO.phone}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 pt-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Hygienic &amp; Sanitized Satellite Kitchen</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

