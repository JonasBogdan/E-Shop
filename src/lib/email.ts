import { Resend } from "resend";
import {
  SITE_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  DEFAULT_LOCALE,
} from "@/lib/constants";
import type { Order, OrderItem } from "@/types";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM =
  process.env.RESEND_FROM_EMAIL ?? `${SITE_NAME} <onboarding@resend.dev>`;

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------

function emailWrapper(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:#09090b;padding:28px 32px;">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">🐾 ${SITE_NAME}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      ${body}
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #e4e4e7;background:#fafafa;">
      <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
        ${SITE_NAME} &nbsp;·&nbsp; ${CONTACT_EMAIL} &nbsp;·&nbsp; ${CONTACT_PHONE}
      </p>
    </div>

  </div>
</body>
</html>`;
}

function itemsTable(items: OrderItem[]) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#09090b;">
          ${item.product_name}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#71717a;text-align:center;">
          ×${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#09090b;text-align:right;font-weight:500;">
          ${formatPrice(Number(item.subtotal))}
        </td>
      </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#71717a;text-align:left;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e4e4e7;">Item</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#71717a;text-align:center;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e4e4e7;">Qty</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#71717a;text-align:right;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e4e4e7;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function shippingBlock(order: Order) {
  return `
    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin-top:20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Shipping Address</p>
      <p style="margin:0;font-size:14px;color:#09090b;line-height:1.6;">
        ${order.customer_name}<br/>
        ${order.shipping_address_line1}<br/>
        ${order.shipping_city}, ${order.shipping_postal_code}<br/>
        ${order.shipping_country}
        ${order.customer_phone ? `<br/>${order.customer_phone}` : ""}
      </p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Customer order confirmation
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationEmail(
  order: Order,
  items: OrderItem[]
) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping customer email");
    return;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#09090b;">Order confirmed ✓</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">
      Hi ${order.customer_name}, thanks for your order! We'll get it ready for dispatch soon.
    </p>

    <div style="background:#f4f4f5;border-radius:6px;padding:12px 16px;display:inline-block;margin-bottom:24px;">
      <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Order number</span><br/>
      <span style="font-size:18px;font-weight:700;color:#09090b;letter-spacing:1px;">#${shortId}</span>
    </div>

    ${itemsTable(items)}

    <div style="text-align:right;margin-top:8px;">
      <span style="font-size:16px;font-weight:700;color:#09090b;">
        Total: ${formatPrice(Number(order.total))}
      </span>
    </div>

    ${shippingBlock(order)}

    <p style="margin-top:28px;font-size:14px;color:#71717a;">
      We'll send you another email when your order ships. If you have any questions,
      reply to this email or call us at ${CONTACT_PHONE}.
    </p>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Order confirmed — #${shortId} | ${SITE_NAME}`,
    html: emailWrapper(body),
  });

  if (error) {
    console.error("[email] Failed to send customer confirmation:", error);
  }
}

// ---------------------------------------------------------------------------
// Order status update (customer-facing)
// ---------------------------------------------------------------------------

type StatusEmailContent = {
  subject: string;
  heading: string;
  intro: string;
  detail?: string;
};

function getStatusContent(
  status: string,
  shortId: string,
  order: Order
): StatusEmailContent | null {
  switch (status) {
    case "processing":
      return {
        subject: `Your order #${shortId} is being prepared | ${SITE_NAME}`,
        heading: "We're preparing your order 📦",
        intro: `Hi ${order.customer_name}, great news! Your order <strong>#${shortId}</strong> is now being processed and prepared for shipment.`,
        detail: "We'll send you another email with tracking information as soon as your order ships.",
      };
    case "shipped":
      return {
        subject: `Your order #${shortId} has shipped! | ${SITE_NAME}`,
        heading: "Your order is on its way! 🚚",
        intro: `Hi ${order.customer_name}, your order <strong>#${shortId}</strong> has been dispatched and is on its way to you.`,
        detail: "Please allow 2–5 business days for delivery. If you have any questions, don't hesitate to reach out.",
      };
    case "delivered":
      return {
        subject: `Your order #${shortId} has been delivered | ${SITE_NAME}`,
        heading: "Order delivered! 🎉",
        intro: `Hi ${order.customer_name}, your order <strong>#${shortId}</strong> has been delivered. We hope your pets love their new goodies!`,
        detail: `If anything is missing or not as expected, please contact us at ${CONTACT_EMAIL} and we'll make it right.`,
      };
    case "cancelled":
      return {
        subject: `Your order #${shortId} has been cancelled | ${SITE_NAME}`,
        heading: "Order cancelled",
        intro: `Hi ${order.customer_name}, your order <strong>#${shortId}</strong> has been cancelled.`,
        detail: `If you did not request this cancellation or have any questions, please contact us at ${CONTACT_EMAIL} or call ${CONTACT_PHONE}.`,
      };
    default:
      return null;
  }
}

export async function sendOrderStatusUpdateEmail(
  order: Order,
  newStatus: string
) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping status update email");
    return;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const content = getStatusContent(newStatus, shortId, order);

  if (!content) return; // no email for pending/paid (handled by Stripe webhook)

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#09090b;">${content.heading}</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">${content.intro}</p>

    <div style="background:#f4f4f5;border-radius:6px;padding:12px 16px;display:inline-block;margin-bottom:24px;">
      <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Order number</span><br/>
      <span style="font-size:18px;font-weight:700;color:#09090b;letter-spacing:1px;">#${shortId}</span>
    </div>

    ${shippingBlock(order)}

    ${
      content.detail
        ? `<p style="margin-top:24px;font-size:14px;color:#71717a;">${content.detail}</p>`
        : ""
    }`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: content.subject,
    html: emailWrapper(body),
  });

  if (error) {
    console.error(`[email] Failed to send status update (${newStatus}):`, error);
  }
}

// ---------------------------------------------------------------------------
// Admin new-order notification
// ---------------------------------------------------------------------------

export async function sendAdminOrderNotificationEmail(
  order: Order,
  items: OrderItem[]
) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping admin email");
    return;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#09090b;">New order received 🛒</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">
      Order <strong>#${shortId}</strong> — ${formatPrice(Number(order.total))}
    </p>

    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Customer</p>
      <p style="margin:0;font-size:14px;color:#09090b;line-height:1.7;">
        <strong>${order.customer_name}</strong><br/>
        ${order.customer_email}
        ${order.customer_phone ? `<br/>${order.customer_phone}` : ""}
      </p>
    </div>

    ${itemsTable(items)}

    <div style="text-align:right;margin-top:8px;">
      <span style="font-size:16px;font-weight:700;color:#09090b;">
        Total: ${formatPrice(Number(order.total))}
      </span>
    </div>

    ${shippingBlock(order)}

    ${
      siteUrl
        ? `<div style="margin-top:28px;text-align:center;">
            <a href="${siteUrl}/${DEFAULT_LOCALE}/admin/orders/${order.id}"
               style="display:inline-block;padding:12px 24px;background:#09090b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              View in Admin
            </a>
           </div>`
        : ""
    }`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: CONTACT_EMAIL,
    subject: `New order #${shortId} — ${formatPrice(Number(order.total))} | ${SITE_NAME}`,
    html: emailWrapper(body),
  });

  if (error) {
    console.error("[email] Failed to send admin notification:", error);
  }
}

// ---------------------------------------------------------------------------
// Low stock alert (admin)
// ---------------------------------------------------------------------------

export async function sendLowStockAlertEmail(
  products: { name_en: string; stock: number }[]
) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping low stock alert");
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const rows = products
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;color:#09090b;">
          ${p.name_en}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;font-size:14px;text-align:right;font-weight:600;color:${p.stock === 0 ? "#dc2626" : "#d97706"};">
          ${p.stock === 0 ? "Out of stock" : `${p.stock} left`}
        </td>
      </tr>`
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#09090b;">⚠️ Low stock alert</h2>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">
      The following ${products.length > 1 ? `${products.length} products are` : "product is"} running low or out of stock.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#71717a;text-align:left;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e4e4e7;">Product</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#71717a;text-align:right;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e4e4e7;">Stock</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    ${
      siteUrl
        ? `<div style="text-align:center;">
            <a href="${siteUrl}/${DEFAULT_LOCALE}/admin/products"
               style="display:inline-block;padding:12px 24px;background:#09090b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Manage Products
            </a>
           </div>`
        : ""
    }`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: CONTACT_EMAIL,
    subject: `Low stock alert — ${products.length} product${products.length > 1 ? "s" : ""} | ${SITE_NAME}`,
    html: emailWrapper(body),
  });

  if (error) {
    console.error("[email] Failed to send low stock alert:", error);
  }
}
