"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "./cart-provider";

type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type Props = {
  product: {
    id: string;
    slug: string;
    name_en: string;
    name_lt: string;
    price: number;
    images: string[];
    weight: string | null;
    stock: number;
  };
  variant?: Variant | null;
  quantity?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
};

export function AddToCartButton({ product, variant, quantity = 1, size = "sm", className }: Props) {
  const t = useTranslations("common");
  const { addItem } = useCart();

  const effectiveStock = variant ? variant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;

  function handleAdd() {
    const cartItem: Omit<CartItem, "quantity"> = variant
      ? {
          id: variant.id,
          productId: product.id,
          slug: product.slug,
          name_en: product.name_en,
          name_lt: product.name_lt,
          price: variant.price,
          image: product.images?.[0] || null,
          weight: product.weight,
          variantId: variant.id,
          variantName: variant.name,
        }
      : {
          id: product.id,
          productId: product.id,
          slug: product.slug,
          name_en: product.name_en,
          name_lt: product.name_lt,
          price: Number(product.price),
          image: product.images?.[0] || null,
          weight: product.weight,
          variantId: null,
          variantName: null,
        };

    addItem({ ...cartItem, quantity });
  }

  return (
    <Button
      size={size}
      className={className}
      disabled={outOfStock}
      onClick={handleAdd}
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      {outOfStock ? t("outOfStock") : t("addToCart")}
    </Button>
  );
}
