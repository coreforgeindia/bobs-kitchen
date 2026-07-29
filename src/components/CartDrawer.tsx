'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Bike,
  Store,
  Sparkles,
} from 'lucide-react';
import { CartItem, Coupon, Location, OrderMode } from '../types';
import { AVAILABLE_COUPONS, CAFE_INFO } from '../data/mockData';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onAddToCart: (dish: CartItem['item']) => void;
  onRemoveFromCart: (dishId: string) => void;
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  currentLocation: Location;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  orderMode,
  setOrderMode,
  currentLocation,
  onCheckout,
}) => {
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  const itemTotal = cartItems.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);

  // Delivery Eligibility Calculations
  const isFreeDeliveryEligible =
    orderMode === 'delivery' &&
    currentLocation.distanceKm <= CAFE_INFO.maxFreeDeliveryKm &&
    itemTotal >= CAFE_INFO.freeDeliveryThreshold;

  const deliveryFee =
    orderMode === 'pickup'
      ? 0
      : isFreeDeliveryEligible
      ? 0
      : CAFE_INFO.standardDeliveryFee;

  const amountNeededForFreeDelivery = Math.max(0, CAFE_INFO.freeDeliveryThreshold - itemTotal);

  let couponDiscount = 0;
  if (appliedCoupon) {
    const rawDiscount = Math.round((itemTotal * appliedCoupon.discountPercentage) / 100);
    couponDiscount = Math.min(rawDiscount, appliedCoupon.maxDiscount);
  }

  const grandTotal = Math.max(0, itemTotal + deliveryFee - couponDiscount);

  const handleApplyCoupon = (code: string) => {
    const found = AVAILABLE_COUPONS.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!found) {
      setCouponError('Invalid promo code');
      return;
    }
    if (itemTotal < found.minOrder) {
      setCouponError(`Minimum order amount of ₹${found.minOrder} required`);
      return;
    }
    setAppliedCoupon(found);
    setCouponError('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white text-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden border-l border-slate-200"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-yellow-400 text-slate-950">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-yellow-400 flex items-center justify-center font-black shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-950 text-lg leading-tight">Your Cart</h3>
                <p className="text-xs text-slate-900 font-extrabold">{CAFE_INFO.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center text-amber-600 border border-yellow-200 shadow-inner">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <h4 className="text-xl font-black text-slate-900">Your cart is empty</h4>
              <p className="text-xs text-slate-500 max-w-xs font-semibold">
                Add delicious fusion snack packs, burgers, rolls or desserts from BOB&#39;S Satellite Kitchen menu.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Order Mode Switcher Banner */}
              <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center">
                <button
                  onClick={() => setOrderMode('delivery')}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
                    orderMode === 'delivery'
                      ? 'bg-yellow-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Home Delivery</span>
                </button>
                <button
                  onClick={() => setOrderMode('pickup')}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 ${
                    orderMode === 'pickup'
                      ? 'bg-yellow-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Store Takeaway</span>
                </button>
              </div>

              {/* Free Delivery Threshold Alert */}
              {orderMode === 'delivery' && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 fill-current" /> Free Delivery within 4KM (Orders above ₹300)
                    </span>
                  </div>

                  {amountNeededForFreeDelivery > 0 ? (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-yellow-400 h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (itemTotal / CAFE_INFO.freeDeliveryThreshold) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-700 font-semibold">
                        Add <span className="text-amber-800 font-black">₹{amountNeededForFreeDelivery}</span> more to unlock FREE Delivery!
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-black flex items-center gap-1">
                      ✓ Congratulations! You unlocked FREE Delivery!
                    </p>
                  )}
                </div>
              )}

              {/* Delivery Address Summary & Feasibility Alert */}
              {orderMode === 'delivery' && (
                <div className={`border rounded-2xl p-3.5 flex items-center space-x-3 text-xs ${
                  currentLocation.distanceKm <= CAFE_INFO.maxDeliveryRadiusKm
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}>
                  <MapPin className={`w-5 h-5 shrink-0 ${
                    currentLocation.distanceKm <= CAFE_INFO.maxDeliveryRadiusKm ? 'text-amber-600' : 'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">Delivering to {currentLocation.title}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                        currentLocation.distanceKm <= CAFE_INFO.maxDeliveryRadiusKm
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {currentLocation.distanceKm <= CAFE_INFO.maxDeliveryRadiusKm
                          ? `${currentLocation.distanceKm} KM (Within 3KM)`
                          : `❌ ${currentLocation.distanceKm} KM (Outside 3KM)`}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-semibold mt-0.5">{currentLocation.address}</p>
                    {currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm && (
                      <p className="text-red-600 text-[11px] font-black mt-1">
                        Please choose a delivery location within 3 KM of Bob&#39;s Satellite Kitchen or switch to Takeaway.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Order Items</h4>
                {cartItems.map((ci) => (
                  <div
                    key={ci.item.id}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">{ci.item.name}</p>
                      <p className="text-xs font-extrabold text-slate-700">₹{ci.item.price}</p>
                    </div>

                    <div className="bg-yellow-400 text-slate-950 rounded-xl flex items-center space-x-2 px-2.5 py-1 text-xs font-extrabold shadow-sm border border-yellow-300">
                      <button onClick={() => onRemoveFromCart(ci.item.id)}>
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <span className="w-4 text-center font-black">{ci.quantity}</span>
                      <button onClick={() => onAddToCart(ci.item)}>
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-amber-600" /> Apply Coupon
                  </span>
                  {appliedCoupon && (
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="text-[10px] text-red-600 font-extrabold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-yellow-900 font-extrabold">
                    <span>Code &#39;{appliedCoupon.code}&#39; Applied!</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Try FREEDEL or BOBS300"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-yellow-400 uppercase"
                    />
                    <button
                      onClick={() => handleApplyCoupon(couponCodeInput)}
                      className="bg-yellow-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs hover:bg-yellow-500 transition-colors shadow-xs"
                    >
                      APPLY
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[10px] text-red-600 font-bold">{couponError}</p>}
              </div>

              {/* Bill Details */}
              <div className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-200 pt-4">
                <h4 className="font-black text-slate-900 text-sm mb-2">Bill Summary</h4>
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="text-slate-900 font-bold">₹{itemTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-black">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-amber-700 font-black">
                    <span>Coupon Discount</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-950 pt-3 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span className="text-slate-950">₹{grandTotal}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-500 bg-slate-100 p-3 rounded-xl border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">BOB&#39;S Direct Kitchen Guarantee • Freshly Prepared</span>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-white">
              <motion.button
                whileHover={orderMode === 'delivery' && currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm ? {} : { scale: 1.02 }}
                whileTap={orderMode === 'delivery' && currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm ? {} : { scale: 0.98 }}
                disabled={orderMode === 'delivery' && currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm}
                onClick={() => {
                  onCheckout();
                  onClose();
                }}
                className={`w-full font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-between text-sm transition-all border ${
                  orderMode === 'delivery' && currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm
                    ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 border-yellow-300'
                }`}
              >
                <div>
                  <span className="block text-[10px] text-slate-900/80 uppercase font-extrabold">
                    {orderMode === 'delivery' ? 'PLACE DELIVERY ORDER' : 'CONFIRM TAKEAWAY PICKUP'}
                  </span>
                  <span className="text-base font-black">₹{grandTotal}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{orderMode === 'delivery' && currentLocation.distanceKm > CAFE_INFO.maxDeliveryRadiusKm ? 'Outside 3KM Radius' : 'Checkout'}</span>
                  <ArrowRight className="w-5 h-5 stroke-[3]" />
                </div>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

