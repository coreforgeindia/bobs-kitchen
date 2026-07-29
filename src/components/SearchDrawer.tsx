'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, Flame } from 'lucide-react';
import { MenuItem, CartItem } from '../types';
import { MENU_ITEMS } from '../data/mockData';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onAddToCart: (dish: MenuItem) => void;
  onRemoveFromCart: (dishId: string) => void;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const popularSearches = ['Paneer Tikka', 'Chicken Roll', 'Burger', 'Peri Peri Fries', 'Tiramisu'];

  const results = MENU_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  const getItemQuantity = (dishId: string) => {
    const found = cartItems.find((ci) => ci.item.id === dishId);
    return found ? found.quantity : 0;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh] border border-slate-200"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-yellow-400 text-slate-950">
            <Search className="w-5 h-5 text-slate-950 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search BOB'S rolls, burgers, fries, desserts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-base font-extrabold text-slate-950 focus:outline-none placeholder:text-slate-800/60"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs font-black text-slate-950 hover:underline mr-2"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-950/10 flex items-center justify-center text-slate-950 hover:bg-slate-950/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {!query ? (
              <div>
                <div className="flex items-center space-x-2 text-xs font-black text-amber-700 uppercase tracking-wider mb-3">
                  <Flame className="w-4 h-4 text-amber-600 fill-current" />
                  <span>Popular Cravings</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="bg-slate-100 border border-slate-200 hover:border-yellow-400 text-slate-800 hover:bg-yellow-50 font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-xs"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
                  Matching Dishes ({results.length})
                </h4>
                {results.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8 font-semibold">
                    No dishes found for &#34;{query}&#34;.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {results.map((dish) => {
                      const qty = getItemQuantity(dish.id);
                      return (
                        <div
                          key={dish.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="w-14 h-14 rounded-xl object-cover"
                            />
                            <div>
                              <h5 className="font-black text-slate-900">{dish.name}</h5>
                              <p className="text-xs font-extrabold text-slate-800">₹{dish.price}</p>
                            </div>
                          </div>

                          {qty === 0 ? (
                            <button
                              onClick={() => onAddToCart(dish)}
                              className="bg-yellow-400 text-slate-950 px-4 py-1.5 rounded-xl font-extrabold text-xs hover:bg-yellow-500 shadow-xs border border-yellow-300"
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="bg-yellow-400 text-slate-950 rounded-xl flex items-center space-x-2 px-2.5 py-1 text-xs font-extrabold border border-yellow-300">
                              <button onClick={() => onRemoveFromCart(dish.id)}>
                                <Minus className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                              <span className="w-4 text-center font-black">{qty}</span>
                              <button onClick={() => onAddToCart(dish)}>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

