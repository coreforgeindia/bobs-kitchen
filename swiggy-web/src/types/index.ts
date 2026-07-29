export type DietaryType = 'veg' | 'non-veg' | 'egg';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  dietary: DietaryType;
  isSignature?: boolean;
  category: string;
}

export type OrderMode = 'delivery' | 'pickup';

export interface CartItem {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Coupon {
  code: string;
  discountPercentage: number;
  maxDiscount: number;
  minOrder: number;
  description: string;
}

export interface Location {
  id: string;
  title: string;
  address: string;
  city: string;
  distanceKm: number;
  lat?: number;
  lng?: number;
  isDeliverable?: boolean;
}
