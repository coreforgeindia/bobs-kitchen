'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MapPin, PhoneCall, X, Bike, Flame } from 'lucide-react';
import { OrderMode } from '../types';
import { CAFE_INFO } from '../data/mockData';

interface LiveOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderMode: OrderMode;
}

export const LiveOrderTrackerModal: React.FC<LiveOrderTrackerModalProps> = ({
  isOpen,
  onClose,
  orderMode,
}) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    const t1 = setTimeout(() => setStep(2), 3000);
    const t2 = setTimeout(() => setStep(3), 7000);
    const t3 = setTimeout(() => setStep(4), 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const deliverySteps = [
    { id: 1, title: 'Order Confirmed', desc: "BOB'S Kitchen received your order" },
    { id: 2, title: 'Grill & Kitchen Prep', desc: 'Chef is preparing your fresh order' },
    { id: 3, title: 'Packed & Dispatched', desc: 'Order packed in thermal box' },
    { id: 4, title: 'Out for Delivery', desc: 'Arriving in 15 mins (Marathahalli)' },
  ];

  const pickupSteps = [
    { id: 1, title: 'Order Confirmed', desc: "BOB'S Kitchen received your order" },
    { id: 2, title: 'Cooking in Kitchen', desc: 'Preparing snack packs, burgers & sides' },
    { id: 3, title: 'Ready for Pickup', desc: 'Token #BOB-89 ready at takeaway counter' },
    { id: 4, title: 'Completed', desc: 'Thank you for ordering from BOB\'S!' },
  ];

  const activeSteps = orderMode === 'delivery' ? deliverySteps : pickupSteps;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-yellow-400 text-slate-950 p-6 relative border-b border-yellow-300">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="bg-slate-950 text-yellow-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              {orderMode === 'delivery' ? 'LIVE DELIVERY TRACKER' : 'TAKEAWAY STATUS'}
            </span>
            <h2 className="text-2xl font-black mt-2">Order #BOB-894102</h2>
            <p className="text-xs text-slate-900 font-extrabold">
              {orderMode === 'delivery' ? 'ETA: 20-25 mins (Marathahalli)' : 'Ready in: 10 mins'}
            </p>
          </div>

          {/* Animated Delivery Map Simulation */}
          <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-200">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="absolute w-full h-2 bg-slate-200 top-1/2 -translate-y-1/2" />

            {/* Kitchen Pin */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shadow-md font-black border border-yellow-300">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-900 mt-1">BOB&#39;S Kitchen</span>
            </div>

            {/* Customer Pin */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 mt-1">Destination</span>
            </div>

            {/* Animated Delivery Vehicle */}
            <motion.div
              animate={{
                left: step === 1 ? '20%' : step === 2 ? '40%' : step === 3 ? '60%' : '80%',
              }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 -mt-4 flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shadow-lg border border-yellow-300 animate-bounce">
                <Bike className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[9px] font-black text-slate-950 bg-yellow-400 px-1.5 py-0.5 rounded shadow-xs mt-1">
                BOB&#39;S Rider
              </span>
            </motion.div>
          </div>

          {/* Timeline Steps */}
          <div className="p-6 space-y-4 bg-white">
            {activeSteps.map((s) => {
              const isDone = step >= s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-start space-x-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-yellow-400 text-slate-950 font-black animate-pulse border border-yellow-300'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-black ${
                        isDone ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-slate-900">BOB&#39;S Kitchen Helpline</p>
              <p className="text-[10px] text-amber-700 font-extrabold">{CAFE_INFO.phone}</p>
            </div>

            <a
              href={`tel:${CAFE_INFO.phone}`}
              className="flex items-center space-x-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-colors shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Kitchen</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

