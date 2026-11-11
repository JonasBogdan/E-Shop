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
// If a 'processing' event is older than this, the handler that claimed it
// is assumed to have crashed and the next delivery may reclaim it.
const EVENT_LEASE_MINUTES = 10;

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

      // Guard: only process EUR payments (this shop's only currency)
      if (session.currency !== "eur") {
        console.warn(`[webhook] unexpected currency ${session.currency} — skipping`);
        break;
      }

      const orderId = session.metadata?.order_id;
      const couponCode = session.metadata?.coupon_code ?? null;

      if (!orderId) {
        console.warn("[webhook] completed session has no order_id in metadata");
        break;
      }

      // ── Claim this event ────────────────────────────────────────────────
      // INSERT succeeds exactly once per stripe_event_id (PRIMARY KEY).
      // On conflict we try to re-claim:
      //   failed              → re-claim unconditionally (previous attempt failed)
      //   processing + stale  → re-claim (crashed handler; lease expired)
      //   processing + fresh  → skip (concurrent delivery in progress)
      //   completed           → skip (already processed)
      //
      // notificationsSentAlready: set to true when reclaiming an event whose
      // prior attempt already sent emails — prevents duplicate notifications.
      let notificationsSentAlready = false;
      const { error: insertError } = await supabase
        .from("stripe_webhook_events")
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          order_id: orderId,
        });

      if (insertError) {
        if (insertError.code !== "23505") {
          console.error("[webhook] failed to claim event:", insertError);
          return NextResponse.json({ error: "Internal error" }, { status: 500 });
        }

        // Unique violation — try to reclaim if failed OR if the processing
        // lease has expired (crash recovery).
        const leaseExpiry = new Date(
          Date.now() - EVENT_LEASE_MINUTES * 60 * 1000
        ).toISOString();

        const { data: reclaimed } = await supabase
          .from("stripe_webhook_events")
          // Refresh processing_since so the lease window restarts from now.
          // Without this, an event older than 10 min could be reclaimed on
          // every Stripe retry even while a recent reclaim is still running.
          .update({
            status: "processing",
            error: null,
            processing_since: new Date().toISOString(),
          })
          .eq("stripe_event_id", event.id)
          .or(
            `status.eq.failed,and(status.eq.processing,processing_since.lt.${leaseExpiry})`
          )
          .select("stripe_event_id, notifications_sent")
          .maybeSingle();

        if (!reclaimed) {
          console.log(
            `[webhook] event ${event.id} already claimed or completed — skipping`
          );
          break;
        }
        // On retry: were notification emails already sent in the prior attempt?
        // If so, skip them to avoid duplicates.
        notificationsSentAlready =
          (reclaimed as { stripe_event_id: string; notifications_sent: boolean | null })
            .notifications_sent ?? false;
        console.log(
          `[webhook] reclaimed event ${event.id}, notifications_sent=${notificationsSentAlready}`
        );
      }

      // ── Verify this session belongs to the claimed order ────────────────
      // Fetched here (not later) so we can validate before writing anything.
      const { data: orderForVerification } = await supabase
        .from("orders")
        .select("id, stripe_session_id, status, fulfillment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (!orderForVerification) {
        console.error(`[webhook] order ${orderId} not found`);
        await supabase
          .from("stripe_webhook_events")
          .update({ status: "failed", error: "Order not found" })
          .eq("stripe_event_id", event.id);
        return NextResponse.json({ error: "Order not found" }, { status: 500 });
      }

      // If stripe_session_id is set, it must match.  A null means the checkout
      // route's non-fatal session-link update failed; we allow that case.
      if (
        orderForVerification.stripe_session_id !== null &&
        orderForVerification.stripe_session_id !== session.id
      ) {
        console.error(
          `[webhook] session ID mismatch for order ${orderId}: ` +
          `stored=${orderForVerification.stripe_session_id}, event=${session.id}`
        );
        await supabase
          .from("stripe_webhook_events")
          .update({ status: "failed", error: "Session ID mismatch" })
          .eq("stripe_event_id", event.id);
        return NextResponse.json({ error: "Session mismatch" }, { status: 500 });
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
      // fulfill_order() locks the order row, checks stock >= quantity for every
      // item (raises an exception if insufficient — rolls back all changes),
      // decrements stock, increments coupon usage, and sets
      // fulfillment_status = 'fulfilled'.
      //
      // 'fulfilled' here means inventory has been decremented.  It does NOT
      // mean the parcel has been physically dispatched — that is tracked
      // separately by orders.status ('shipped', 'delivered').
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
        // Return 500 so Stripe retries.  If this is a genuine stock insufficiency
        // the event will stay 'failed' and an admin must resolve it manually.
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }

      // ── Fetch order + items (needed for email notifications) ───────────
      const [{ data: order }, { data: orderItems }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);

      // ── Send notification emails ─────────────────────────────────────────
      // Emails are sent BEFORE marking the event completed so that a Stripe
      // retry (triggered by returning 500 on email failure) will re-attempt
      // delivery.  notificationsSentAlready prevents duplicate emails: if a
      // prior attempt already sent them (notifications_sent=true in the event
      // row), we skip re-sending.
      //
      // On retry: fulfill_order returns 'already_fulfilled' — no double-decrement.
      if (order && orderItems && !notificationsSentAlready) {
        const emailResults = await Promise.allSettled([
          sendOrderConfirmationEmail(order as Order, orderItems as OrderItem[]),
          sendAdminOrderNotificationEmail(order as Order, orderItems as OrderItem[]),
        ]);
        const labels = ["confirmation", "admin (mesku.maistas@gmail.com)"];
        const anyFailed = emailResults.some((r) => r.status === "rejected");

        emailResults.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(`[webhook] email ${labels[i]} failed:`, r.reason);
          } else {
            console.log(`[webhook] email ${labels[i]} sent`);
          }
        });

        if (anyFailed) {
          // Mark event failed so Stripe retries the whole handler.
          // Payment and inventory are already committed — only emails failed.
          // fulfill_order will return 'already_fulfilled' on the next attempt.
          await supabase
            .from("stripe_webhook_events")
            .update({ status: "failed", error: "Email delivery failed" })
            .eq("stripe_event_id", event.id);
          return NextResponse.json(
            { error: "Notification failed" },
            { status: 500 }
          );
        }

        // Persist notifications_sent before the completion update so that if
        // the completion write fails (edge case), a future retry sees
        // notifications_sent=true and skips re-sending.
        await supabase
          .from("stripe_webhook_events")
          .update({ notifications_sent: true })
          .eq("stripe_event_id", event.id);
      }

      // ── Mark event completed ─────────────────────────────────────────────
      const { error: completeError } = await supabase
        .from("stripe_webhook_events")
        .update({
          status: "completed",
          notifications_sent: true,
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_event_id", event.id);
      if (completeError) {
        // Non-fatal: payment and stock are committed, emails are sent.
        // The event record is just not marked complete — log and continue.
        console.error("[webhook] failed to mark event as completed:", completeError);
      }

      // ── Low-stock alerts — fire-and-forget, only on first fulfillment ────
      if (orderItems && orderItems.length > 0 && fulfillResult === "fulfilled") {
        const regularProductIds = orderItems
          .filter(
            (item: { variant_id: string | null; product_id: string | null }) =>
              !item.variant_id && item.product_id
          )
          .map((item: { product_id: string | null }) => item.product_id as string);

        const variantIds = orderItems
          .filter((item: { variant_id: string | null }) => item.variant_id)
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
