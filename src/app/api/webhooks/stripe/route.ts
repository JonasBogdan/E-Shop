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

      // Guard: only process sessions that were actually paid
      if (session.payment_status !== "paid") {
        console.warn(
          `[webhook] session ${session.id} completed but payment_status=${session.payment_status} — skipping`
        );
        break;
      }

      const orderId = session.metadata?.order_id;
      const couponCode = session.metadata?.coupon_code ?? null;

      if (!orderId) break;

      // ── Claim this event ────────────────────────────────────────────────
      // INSERT succeeds exactly once per stripe_event_id (PRIMARY KEY).
      // On conflict, we check the existing status:
      //   completed  → already processed, acknowledge and skip
      //   processing → concurrent delivery, skip
      //   failed     → prior attempt failed, re-claim for retry
      const { error: insertError } = await supabase
        .from("stripe_webhook_events")
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          order_id: orderId,
        });

      if (insertError) {
        if (insertError.code !== "23505") {
          // Unexpected DB error — fail so Stripe retries
          console.error("[webhook] failed to claim event:", insertError);
          return NextResponse.json({ error: "Internal error" }, { status: 500 });
        }

        // Unique constraint hit. Try to re-claim only if the previous attempt failed.
        const { data: reclaimed } = await supabase
          .from("stripe_webhook_events")
          .update({ status: "processing", error: null })
          .eq("stripe_event_id", event.id)
          .eq("status", "failed")
          .select("stripe_event_id")
          .maybeSingle();

        if (!reclaimed) {
          // Event is either 'completed' (done) or 'processing' (concurrent delivery) — skip
          console.log(
            `[webhook] event ${event.id} already claimed or completed — skipping`
          );
          break;
        }
        console.log(`[webhook] retrying previously failed event ${event.id}`);
      }

      // ── Update payment status ───────────────────────────────────────────
      const { error: paymentError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (paymentError) {
        console.error("[webhook] failed to update order payment status:", paymentError);
        await supabase
          .from("stripe_webhook_events")
          .update({ status: "failed", error: paymentError.message })
          .eq("stripe_event_id", event.id);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      // ── Atomic fulfillment (stock + coupon) ────────────────────────────
      // fulfill_order locks the order row, decrements stock for every item,
      // increments coupon usage, and marks fulfillment_status = 'fulfilled'.
      // If the order is already fulfilled it returns 'already_fulfilled' (safe).
      const { data: fulfillResult, error: fulfillError } = await supabase.rpc(
        "fulfill_order",
        {
          p_order_id: orderId,
          p_coupon_code: couponCode,
        }
      );

      if (fulfillError) {
        console.error("[webhook] fulfill_order failed:", fulfillError);
        await supabase
          .from("stripe_webhook_events")
          .update({ status: "failed", error: fulfillError.message })
          .eq("stripe_event_id", event.id);
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }

      // ── Mark event as completed ─────────────────────────────────────────
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("stripe_event_id", event.id);

      // ── Fetch order + items for emails and low-stock alerts ─────────────
      const [{ data: order }, { data: orderItems }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);

      // Low-stock alerts — only on first fulfillment to avoid repeat alerts
      if (orderItems && orderItems.length > 0 && fulfillResult === "fulfilled") {
        const regularProductIds = orderItems
          .filter(
            (item: { variant_id: string | null; product_id: string | null }) =>
              !item.variant_id && item.product_id
          )
          .map((item: { product_id: string | null }) => item.product_id as string);

        const variantIds = orderItems
          .filter(
            (item: { variant_id: string | null }) => item.variant_id
          )
          .map((item: { variant_id: string | null }) => item.variant_id as string);

        if (regularProductIds.length > 0) {
          supabase
            .from("products")
            .select("name_en, stock")
            .in("id", regularProductIds)
            .lte("stock", LOW_STOCK_THRESHOLD)
            .then(({ data: lowProducts }) => {
              if (lowProducts && lowProducts.length > 0) {
                sendLowStockAlertEmail(lowProducts).catch((err) =>
                  console.error("[email] low stock alert failed:", err)
                );
              }
            });
        }

        if (variantIds.length > 0) {
          supabase
            .from("product_variants")
            .select("name, stock, products(name_en)")
            .in("id", variantIds)
            .lte("stock", LOW_STOCK_THRESHOLD)
            .then(({ data: lowVariants }) => {
              if (lowVariants && lowVariants.length > 0) {
                const alertItems = lowVariants.map((v) => ({
                  name_en: `${
                    (v.products as unknown as { name_en: string } | null)
                      ?.name_en ?? "Product"
                  } – ${v.name}`,
                  stock: v.stock,
                }));
                sendLowStockAlertEmail(alertItems).catch((err) =>
                  console.error("[email] low variant stock alert failed:", err)
                );
              }
            });
        }
      }

      // Emails — fire-and-forget; failures are logged but do not block the webhook
      if (order && orderItems) {
        Promise.allSettled([
          sendOrderConfirmationEmail(order as Order, orderItems as OrderItem[]),
          sendAdminOrderNotificationEmail(order as Order, orderItems as OrderItem[]),
        ]).then((results) => {
          const labels = ["confirmation", "admin"];
          results.forEach((r, i) => {
            if (r.status === "rejected") {
              console.error(`[webhook] email ${labels[i]} failed:`, r.reason);
            }
          });
        });
      }

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        // Guard: only cancel if still pending — do NOT overwrite a paid order.
        // session.expired can be delivered after session.completed in rare cases.
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("status", "pending");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
