export const VALID_LOCALES = ["en", "lt"] as const;
export const MAX_ITEM_QUANTITY = 99;

export type CheckoutItem = { quantity: unknown; [key: string]: unknown };

export type CustomerInfo = {
  email: unknown;
  name: unknown;
  address: unknown;
  city: unknown;
  postalCode: unknown;
  [key: string]: unknown;
};

export function validateCheckoutBody(body: {
  items: unknown;
  customerInfo: unknown;
}): string | null {
  const { items, customerInfo } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return "No items";
  }

  const ci = customerInfo as CustomerInfo | null | undefined;
  if (
    !ci ||
    typeof ci.email !== "string" ||
    typeof ci.name !== "string" ||
    typeof ci.address !== "string" ||
    typeof ci.city !== "string" ||
    typeof ci.postalCode !== "string"
  ) {
    return "Missing or invalid customer information";
  }

  for (const item of items as CheckoutItem[]) {
    const q = item.quantity;
    if (!Number.isInteger(q) || (q as number) < 1 || (q as number) > MAX_ITEM_QUANTITY) {
      return `Item quantity must be between 1 and ${MAX_ITEM_QUANTITY}`;
    }
  }

  return null;
}

export function normalizeLocale(locale: unknown): string {
  return VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])
    ? (locale as string)
    : "lt";
}
