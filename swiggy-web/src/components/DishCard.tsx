'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Sparkles, Utensils } from 'lucide-react';
import { MenuItem } from '../types';

interface DishCardProps {
  dish: MenuItem;
  quantity: number;
  onAddToCart: (dish: MenuItem) => void;
  onRemoveFromCart: (dishId: string) => void;
}

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  quantity,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border border-slate-200 hover:border-yellow-400 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-lg group"
    >
      <div className="space-y-3">
        {/* Image & Badges */}
        <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
          {!imgError ? (
            <img
              src={dish.image}
              alt={dish.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-50 text-amber-800 p-4 text-center space-y-1">
              <div className="p-3 bg-yellow-400 text-slate-950 rounded-full shadow-sm">
                <Utensils className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xs text-slate-900">{dish.name}</span>
            </div>
          )}

          {/* Dietary Indicator Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-slate-200">
            {dish.dietary === 'veg' && (
              <div className="flex items-center space-x-1.5 text-[10px] font-extrabold text-emerald-700">
                <div className="veg-icon">
                  <div className="veg-dot" />
                </div>
                <span>VEG</span>
              </div>
            )}
            {dish.dietary === 'non-veg' && (
              <div className="flex items-center space-x-1.5 text-[10px] font-extrabold text-red-600">
                <div className="nonveg-icon">
                  <div className="nonveg-dot" />
                </div>
                <span>NON-VEG</span>
              </div>
            )}
            {dish.dietary === 'egg' && (
              <div className="flex items-center space-x-1.5 text-[10px] font-extrabold text-orange-600">
                <div className="egg-icon">
                  <div className="egg-triangle" />
                </div>
                <span>CONTAINS EGG</span>
              </div>
            )}
          </div>

          {/* Signature Badge */}
          {dish.isSignature && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-slate-950 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 border border-yellow-300">
              <Sparkles className="w-3 h-3 fill-current text-slate-950" /> SIGNATURE
            </div>
          )}
        </div>

        {/* Dish Title & Description */}
        <div>
          <h3 className="text-base font-black text-slate-900 group-hover:text-amber-700 transition-colors">
            {dish.name}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2 leading-relaxed">
            {dish.description}
          </p>
        </div>
      </div>

      {/* Price & Quantity Controls */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">PRICE</span>
          <span className="text-lg font-black text-slate-950">₹{dish.price}</span>
        </div>

        {quantity === 0 ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddToCart(dish)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 px-5 py-2 rounded-xl font-extrabold text-xs shadow-md uppercase tracking-wider flex items-center space-x-1 border border-yellow-300"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ADD</span>
          </motion.button>
        ) : (
          <div className="bg-yellow-400 text-slate-950 rounded-xl flex items-center space-x-3 px-3 py-1.5 font-extrabold text-xs shadow-md border border-yellow-300">
            <button onClick={() => onRemoveFromCart(dish.id)} className="hover:opacity-75">
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>
            <span className="w-4 text-center text-sm font-black">{quantity}</span>
            <button onClick={() => onAddToCart(dish)} className="hover:opacity-75">
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};


