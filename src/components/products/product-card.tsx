"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { FavoriteButton } from "@/components/products/favorite-button";
import { ShoppingCart } from "lucide-react";

type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_lt: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  weight: string | null;
  is_featured: boolean;
};

export function ProductCard({ product, isFavorited = false }: { product: Product; isFavorited?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("common");

  const name = getLocalizedField(product, "name", locale);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const outOfStock = product.stock <= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-border">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 opacity-20" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
            {hasDiscount && (
              <Badge variant="destructive" className="text-xs font-semibold shadow-sm">
                Sale
              </Badge>
            )}
            {outOfStock && (
              <Badge variant="secondary" className="text-xs">
                {t("outOfStock")}
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <FavoriteButton productId={product.id} isFavorited={isFavorited} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold leading-snug line-clamp-2 transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>

        {product.weight && (
          <p className="mt-1 text-xs text-muted-foreground">{product.weight}</p>
        )}

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(Number(product.price))}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(Number(product.compare_at_price))}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </div>
  );
}
