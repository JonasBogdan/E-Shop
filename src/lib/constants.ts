export const SITE_NAME = "CanisCattus";
export const SITE_DESCRIPTION = "Premium dog and cat food delivered to your door";
export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "caniscattus.lt";
export const DEFAULT_LOCALE = "en";
export const CURRENCY = "EUR";
export const CURRENCY_SYMBOL = "\u20AC";
export const CONTACT_PHONE = "+37068794781";
export const CONTACT_EMAIL = "mesku.maistas@gmail.com";
export const WORKING_HOURS = "Mon-Fri: 9:00 - 18:00";

export const CATEGORIES = {
  DOG_FOOD: "dog-food",
  CAT_FOOD: "cat-food",
  MISC: "misc",
  SUPPLEMENTS: "supplements",
} as const;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
