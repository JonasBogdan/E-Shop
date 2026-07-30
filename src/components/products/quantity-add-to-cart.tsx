"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_lt: string;
  price: number;
  images: string[];
  weight: string | null;
  stock: number;
};

export function QuantityAddToCart({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);

  const outOfStock = product.stock <= 0;
  const max = Math.min(product.stock, 99);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Quantity stepper */}
      {!outOfStock && (
        <div className="flex items-center rounded-md border">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 select-none text-center text-sm font-medium">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <AddToCartButton
        product={{ ...product, stock: outOfStock ? 0 : product.stock }}
        quantity={qty}
        size="lg"
        className="w-full sm:w-auto"
      />
    </div>
  );
}
