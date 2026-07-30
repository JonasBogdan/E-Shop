"use client";

import { useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const inStock = searchParams.get("inStock") === "1";

  function buildParams(overrides: Record<string, string | null> = {}) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page"); // reset pagination on filter change
    return params;
  }

  function applyPriceFilter() {
    const params = buildParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleInStock() {
    const params = buildParams({ inStock: inStock ? null : "1" });
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setMinPrice("");
    setMaxPrice("");
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = minPrice || maxPrice || inStock;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Price (€)
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
            className="h-8 text-sm"
          />
          <span className="text-muted-foreground text-xs shrink-0">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full h-7 text-xs"
          onClick={applyPriceFilter}
        >
          Apply price
        </Button>
      </div>

      {/* In stock only */}
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inStock}
            onChange={toggleInStock}
            className="h-4 w-4 rounded border-gray-300 accent-primary"
          />
          <span className="text-sm">In stock only</span>
        </label>
      </div>
    </div>
  );
}
