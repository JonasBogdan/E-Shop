"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Tag } from "lucide-react";

export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tNav = useTranslations("nav");
  const { items, totalPrice, finalTotal, coupon } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: getLocalizedField(item, "name", locale),
            price: item.price,
            quantity: item.quantity,
          })),
          customerInfo: {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            address: formData.get("address"),
            city: formData.get("city"),
            postalCode: formData.get("postalCode"),
          },
          couponCode: coupon?.code ?? null,
          locale,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-muted-foreground">{tCart("empty")}</p>
        <Link href="/">
          <Button className="mt-4">{tCart("continueShopping")}</Button>
        </Link>
      </div>
    );
  }

  const hasCoupon = !!coupon;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/cart" className="hover:text-foreground">
          {tCart("title")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{t("title")}</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Customer Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("customerInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="checkout-name" className="text-sm font-medium">{t("fullName")}</label>
                  <Input id="checkout-name" name="name" required className="mt-1" />
                </div>
                <div>
                  <label htmlFor="checkout-email" className="text-sm font-medium">{t("email")}</label>
                  <Input id="checkout-email" name="email" type="email" required className="mt-1" />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="text-sm font-medium">{t("phone")}</label>
                  <Input id="checkout-phone" name="phone" type="tel" className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("shippingAddress")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="checkout-address" className="text-sm font-medium">{t("address")}</label>
                  <Input id="checkout-address" name="address" required className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-city" className="text-sm font-medium">{t("city")}</label>
                    <Input id="checkout-city" name="city" required className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="checkout-postal" className="text-sm font-medium">
                      {t("postalCode")}
                    </label>
                    <Input id="checkout-postal" name="postalCode" required className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{tCart("title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {getLocalizedField(item, "name", locale)} ×{item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tCart("subtotal")}</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>

                  {hasCoupon && coupon && (
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
                  <span>{tCart("total")}</span>
                  <span>{formatPrice(hasCoupon ? finalTotal : totalPrice)}</span>
                </div>

                {hasCoupon && (
                  <p className="mt-1 text-xs text-muted-foreground text-right">
                    You save {formatPrice(coupon!.discount)} with code {coupon!.code}
                  </p>
                )}

                {error && (
                  <p className="mt-4 text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={loading}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {loading ? "..." : t("payWithStripe")}
                </Button>

                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="mt-2 w-full">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {tCart("title")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
