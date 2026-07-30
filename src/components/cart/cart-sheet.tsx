"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "./cart-provider";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";

export function CartSheet() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, finalTotal, coupon } =
    useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t("title")}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-muted">
              <Image
                src="/images/cart-empty.jpg"
                alt="Sad dog"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-semibold">{t("empty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">Your furry friend is waiting for treats!</p>
            </div>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("continueShopping")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const name = getLocalizedField(item, "name", locale);
                  return (
                    <div key={item.id} className="flex gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={name}
                          className="h-16 w-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {name}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(item.price)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-6 w-6 text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-4 py-4">
              {coupon && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              )}
              {coupon && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>{coupon.code}</span>
                  <span>-{formatPrice(coupon.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>{t("total")}</span>
                <span>{formatPrice(coupon ? finalTotal : totalPrice)}</span>
              </div>

              <Link href="/cart" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">
                  {t("title")}
                </Button>
              </Link>
              <Link href="/checkout" onClick={() => setIsOpen(false)}>
                <Button className="w-full mt-2">{t("checkout")}</Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
