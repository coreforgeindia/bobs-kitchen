'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { MenuSection } from '../components/MenuSection';
import { CartDrawer } from '../components/CartDrawer';
import { SearchDrawer } from '../components/SearchDrawer';
import { StoreInfoModal } from '../components/StoreInfoModal';
import { LiveOrderTrackerModal } from '../components/LiveOrderTrackerModal';
import { DeliveryMapModal } from '../components/DeliveryMapModal';
import { Footer } from '../components/Footer';

import { MARATHAHALLI_DELIVERY_LOCATIONS } from '../data/mockData';
import { MenuItem, CartItem, OrderMode, Location } from '../types';

export default function Home() {
  const [orderMode, setOrderMode] = useState<OrderMode>('delivery');
  const [currentLocation, setCurrentLocation] = useState<Location>(MARATHAHALLI_DELIVERY_LOCATIONS[0]);

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (dish: MenuItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.item.id === dish.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { item: dish, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (dishId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.item.id === dishId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter((ci) => ci.item.id !== dishId);
      }
      return prev.map((ci) => (ci.item.id === dishId ? { ...ci, quantity: ci.quantity - 1 } : ci));
    });
  };

  const handleCheckout = () => {
    setIsTrackerModalOpen(true);
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((acc, ci) => acc + ci.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-yellow-400 selection:text-black">
      {/* Navbar */}
      <Navbar
        orderMode={orderMode}
        setOrderMode={setOrderMode}
        currentLocation={currentLocation}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        onOpenCartModal={() => setIsCartModalOpen(true)}
        cartCount={totalCartCount}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Menu Section */}
        <MenuSection
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Drawers & Modals */}
      <DeliveryMapModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
      />

      <SearchDrawer
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
      />

      <StoreInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />

      <CartDrawer
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        orderMode={orderMode}
        setOrderMode={setOrderMode}
        currentLocation={currentLocation}
        onCheckout={handleCheckout}
      />

      <LiveOrderTrackerModal
        isOpen={isTrackerModalOpen}
        onClose={() => setIsTrackerModalOpen(false)}
        orderMode={orderMode}
      />
    </div>
  );
}

