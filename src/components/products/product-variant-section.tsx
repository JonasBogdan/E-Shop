"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatPrice } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

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

type Props = {
  product: Product;
  variants: Variant[];
  inStockLabel: string;
  outOfStockLabel: string;
};

export function ProductVariantSection({
  product,
  variants,
  inStockLabel,
  outOfStockLabel,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  if (!selected) return null;

  const outOfStock = selected.stock <= 0;
  const lowStock = !outOfStock && selected.stock <= 5;
  const max = Math.min(selected.stock, 99);

  // Reset qty to 1 when variant changes and new max is lower
  function handleVariantSelect(id: string) {
    setSelectedId(id);
    setQty(1);
  }

  return (
    <div>
      {/* Price for selected variant */}
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-primary">
          {formatPrice(selected.price)}
        </span>
      </div>

      {/* Stock badge */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {outOfStock ? (
          <Badge variant="secondary">{outOfStockLabel}</Badge>
        ) : (
          <Badge variant="outline" className="border-green-500 text-green-600">
            {inStockLabel}
          </Badge>
        )}
        {lowStock && (
          <span className="text-sm font-medium text-yellow-600">
            Only {selected.stock} left!
          </span>
        )}
      </div>

      {/* Variant selector */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Select size
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleVariantSelect(v.id)}
              disabled={v.stock <= 0}
              className={[
                "relative rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                v.stock <= 0
                  ? "cursor-not-allowed border-muted bg-muted/30 text-muted-foreground line-through"
                  : selectedId === v.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {v.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatPrice(selected.price)} ·{" "}
          {selected.stock > 0 ? `${selected.stock} in stock` : "Out of stock"}
        </p>
      </div>

      {/* Quantity + Add to cart */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
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
          product={product}
          variant={selected}
          quantity={qty}
          size="lg"
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
