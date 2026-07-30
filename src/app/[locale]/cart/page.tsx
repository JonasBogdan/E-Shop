"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag, X } from "lucide-react";

export default function CartPage() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const tNav = useTranslations("nav");
  const {
    items,
    removeItem,
    updateQuantity,
    totalPrice,
    finalTotal,
    coupon,
    setCoupon,
    clearCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), total: totalPrice }),
      });
      const data = await res.json();

      if (res.ok) {
        setCoupon({
          code: data.code,
          type: data.type,
          value: data.value,
          discount: data.discount,
        });
        setCouponInput("");
      } else {
        setCouponError(data.error || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{t("title")}</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <ShoppingBag className="h-20 w-20 text-muted-foreground/30" />
          <p className="text-xl text-muted-foreground">{t("empty")}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("continueShopping")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => {
              const name = getLocalizedField(item, "name", locale);
              return (
                <Card key={item.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={name}
                        className="h-20 w-20 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="line-clamp-1 font-semibold transition-colors hover:text-primary">
                          {name}
                        </h3>
                      </Link>
                      {item.weight && (
                        <p className="text-xs text-muted-foreground">
                          {item.weight}
                        </p>
                      )}
                      <p className="mt-1 text-lg font-bold text-primary">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {t("remove")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold">{t("total")}</h2>
                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>

                  {coupon && (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <Tag className="h-3 w-3" />
                        {coupon.code}
                        {coupon.type === "percentage"
                          ? ` (${coupon.value}% off)`
                          : ""}
                      </span>
                      <span className="font-medium text-green-600">
                        -{formatPrice(coupon.discount)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-bold">
                  <span>{t("total")}</span>
                  <span>{formatPrice(coupon ? finalTotal : totalPrice)}</span>
                </div>

                {/* Coupon section */}
                <div className="mt-4">
                  {coupon ? (
                    <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm dark:bg-green-950/20">
                      <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                        <Tag className="h-3.5 w-3.5" />
                        {coupon.code} applied
                      </span>
                      <button
                        onClick={clearCoupon}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove coupon"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="Coupon code"
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                        >
                          {couponLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-destructive">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                <Link href="/checkout">
                  <Button size="lg" className="mt-6 w-full">
                    {t("checkout")}
                  </Button>
                </Link>

                <Link href="/">
                  <Button variant="ghost" size="sm" className="mt-2 w-full">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {t("continueShopping")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
