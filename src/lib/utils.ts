import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency,
  }).format(price);
}

export function getLocalizedField(
  item: Record<string, unknown>,
  field: string,
  locale: string
): string {
  return (
    (item[`${field}_${locale}`] as string) ||
    (item[`${field}_en`] as string) ||
    ""
  );
}
