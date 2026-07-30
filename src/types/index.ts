export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Product = {
  id: string;
  slug: string;
  category_id: string;
  name_en: string;
  name_lt: string;
  description_en: string | null;
  description_lt: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  weight: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_lt: string;
  description_en: string | null;
  description_lt: string | null;
  sort_order: number;
};

export type Order = {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  total: number;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponType = "percentage" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
