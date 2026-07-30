import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderConfirmationEmail,
  sendAdminOrderNotificationEmail,
  sendLowStockAlertEmail,
} from "@/lib/email";
import type { Order, OrderItem } from "@/types";

const LOW_STOCK_THRESHOLD = 5;

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      const couponCode = session.metadata?.coupon_code;

      if (orderId) {
        // Update order status to paid
        await supabase
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        // Fetch full order + items
        const [{ data: order }, { data: orderItems }] = await Promise.all([
          supabase.from("orders").select("*").eq("id", orderId).single(),
          supabase.from("order_items").select("*").eq("order_id", orderId),
        ]);

        // Decrement stock for each item
        const decrementedProductIds: string[] = [];
        if (orderItems) {
          for (const item of orderItems) {
            if (item.variant_id) {
              // Variant item — decrement variant stock
              await supabase.rpc("decrement_variant_stock", {
                p_variant_id: item.variant_id,
                p_quantity: item.quantity,
              });
            } else if (item.product_id) {
              // Regular product item — decrement product stock
              await supabase.rpc("decrement_stock", {
                p_product_id: item.product_id,
                p_quantity: item.quantity,
              });
              decrementedProductIds.push(item.product_id);
            }
          }
        }

        // Check for low stock on regular products after decrements
        if (decrementedProductIds.length > 0) {
          const { data: updatedProducts } = await supabase
            .from("products")
            .select("name_en, stock")
            .in("id", decrementedProductIds)
            .lte("stock", LOW_STOCK_THRESHOLD);

          if (updatedProducts && updatedProducts.length > 0) {
            sendLowStockAlertEmail(updatedProducts).catch((err) =>
              console.error("[email] Low stock alert failed:", err)
            );
          }
        }

        // Check for low-stock variants after decrements
        if (orderItems) {
          const variantIds = orderItems
            .map((item) => item.variant_id)
            .filter(Boolean);

          if (variantIds.length > 0) {
            const { data: lowVariants } = await supabase
              .from("product_variants")
              .select("name, stock, products(name_en)")
              .in("id", variantIds)
              .lte("stock", LOW_STOCK_THRESHOLD);

            if (lowVariants && lowVariants.length > 0) {
              const alertItems = lowVariants.map((v) => ({
                name_en: `${(v.products as unknown as { name_en: string } | null)?.name_en ?? "Product"} – ${v.name}`,
                stock: v.stock,
              }));
              sendLowStockAlertEmail(alertItems).catch((err) =>
                console.error("[email] Low variant stock alert failed:", err)
              );
            }
          }
        }

        // Increment coupon usage if a coupon was applied
        if (couponCode) {
          const { data: coupon } = await supabase
            .from("coupons")
            .select("uses_count")
            .eq("code", couponCode)
            .single();

          if (coupon) {
            await supabase
              .from("coupons")
              .update({ uses_count: coupon.uses_count + 1 })
              .eq("code", couponCode);
          }
        }

        // Send emails — failures must not break the webhook
        if (order && orderItems) {
          await Promise.allSettled([
            sendOrderConfirmationEmail(order as Order, orderItems as OrderItem[]),
            sendAdminOrderNotificationEmail(order as Order, orderItems as OrderItem[]),
          ]);
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
