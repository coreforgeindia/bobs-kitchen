'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Utensils, Leaf, Flame, Sparkles, Egg } from 'lucide-react';
import { DishCard } from './DishCard';
import { MenuItem, CartItem, DietaryType } from '../types';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/mockData';

interface MenuSectionProps {
  cartItems: CartItem[];
  onAddToCart: (dish: MenuItem) => void;
  onRemoveFromCart: (dishId: string) => void;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  cartItems,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getItemQuantity = (dishId: string) => {
    const found = cartItems.find((ci) => ci.item.id === dishId);
    return found ? found.quantity : 0;
  };

  const filteredDishes = MENU_ITEMS.filter((dish) => {
    if (selectedCategory !== 'All' && dish.category !== selectedCategory) return false;
    if (dietaryFilter !== 'all' && dish.dietary !== dietaryFilter) return false;
    if (
      searchQuery &&
      !dish.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !dish.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-xs font-extrabold text-amber-700 uppercase tracking-wider mb-1">
            <Utensils className="w-4 h-4" />
            <span>BOB&#39;S MENU CATEGORIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Fusion Snack Packs &amp; Delicacies
          </h2>
        </div>

        {/* Search & Dietary Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search snack packs, rolls, fries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 rounded-xl px-4 py-2.5 pl-10 text-xs font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Dietary Filter pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 gap-1">
            <button
              onClick={() => setDietaryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                dietaryFilter === 'all'
                  ? 'bg-yellow-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setDietaryFilter('veg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-1 ${
                dietaryFilter === 'veg'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-200" />
              <span>Veg 🟢</span>
            </button>

            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-1 ${
                dietaryFilter === 'non-veg'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400 border border-red-200" />
              <span>Non-Veg 🔴</span>
            </button>

            <button
              onClick={() => setDietaryFilter('egg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-1 ${
                dietaryFilter === 'egg'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-orange-700 hover:bg-orange-50'
              }`}
            >
              <span className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-orange-400" />
              <span>Contains Egg 🔺</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {MENU_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border shrink-0 ${
                isActive
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-yellow-400 hover:bg-yellow-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Dish Grid */}
      {filteredDishes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="text-lg font-black text-slate-900">No dishes match your selection</h4>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Try switching categories or clearing search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              quantity={getItemQuantity(dish.id)}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
            />
          ))}
        </div>
      )}
    </section>
  );
};

