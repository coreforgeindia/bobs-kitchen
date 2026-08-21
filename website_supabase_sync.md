# Bob's Kitchen — Website & Supabase Database Sync Log

This document details the transition from an email/OTP-based user account system to a **login-free, phone-based checkout flow**, and how it syncs with the Supabase schema and standalone Staff Admin Portal.

---

## 1. Customer Checkout Strategy (No Login)

### Client-Side Checkout Flow
1. **Add to Cart:** Customers browse the menu and add items to their cart.
2. **Checkout Form:** In the Cart drawer/view, the customer enters:
   - **Full Name** (mandatory)
   - **Phone Number** (mandatory · used as the unique customer identifier)
   - **Delivery Address** (mandatory if fulfillment mode is "Delivery")
3. **Local Profile Persistence:** If the user checks *"Save my details for next time"*, their name, phone, and address are saved locally in the browser's `localStorage` (via client-side Zustand store persistence).
   - No account creation form is shown.
   - No email OTP verification is required.
   - On future visits, if a local profile exists, the checkout form is pre-filled automatically. They can edit details if needed.
4. **Order Placement:** Orders are sent directly to the `orders` Supabase table containing the customer's contact details.
5. **No Email Collection:** The email input field has been completely removed from the checkout form.

---

## 2. Updated Supabase Database Schema

To align with this strategy, the `customer_profiles` table in Supabase should identify customers by their unique phone number rather than an email address.

### SQL Migration / Setup Changes
Modify the table definition to key off `phone`:

```sql
-- 1. Create or alter the customer_profiles table to be phone-centric
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,       -- Primary identifier for tracking customer base
  full_name TEXT,
  saved_address TEXT,
  wallet_coins INT DEFAULT 0,       -- Tracks loyalty/cashback coins per number
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modify orders table columns (remove email requirement or make it nullable)
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;
```

---

## 3. Standalone Admin Portal Sync (Customer Base & Offers)

With the removal of inventory tracking, the admin portal utilizes the **Customer Base** tab to manage profiles:

* **Customer Base Generation:** The dashboard compiles a database of customers by scanning the `customer_profiles` table (or deriving it from unique phone numbers in the `orders` table).
* **Loyalty & Offers Management:** Admin can view customer profiles (Name, Phone, Address, Total Orders, Coins) and directly award or deduct Cafe Coins/coupons associated with their phone number.
* **Menu Control:** Admin continues to add, edit, and toggle active/sold-out products. Changes instantly reflect on the customer website.
