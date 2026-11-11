import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, customerInfo, couponCode, locale } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    // Validate quantities
    for (const item of items as Array<{ quantity: unknown }>) {
      const q = item.quantity;
      if (!Number.isInteger(q) || (q as number) < 1) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
    }

    // Validate locale — only accept known locales, fall back to default
    const VALID_LOCALES = ["en", "lt"];
    const safeLocale = VALID_LOCALES.includes(locale) ? locale : "lt";

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured. Please set STRIPE_SECRET_KEY." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get current user (optional - guest checkout allowed)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Separate variant items from regular product items
    const variantItems = items.filter(
      (item: { variantId?: string }) => item.variantId
    );
    const regularItems = items.filter(
      (item: { variantId?: string }) => !item.variantId
    );

    // Fetch products for regular items
    const regularProductIds = regularItems.map(
      (item: { productId?: string; id: string }) => item.productId || item.id
    );
    const regularProducts =
      regularProductIds.length > 0
        ? (
            await adminSupabase
              .from("products")
              .select("id, name_en, price, stock")
              .in("id", regularProductIds)
              .eq("is_active", true)
          ).data || []
        : [];

    if (
      regularProductIds.length > 0 &&
      regularProducts.length !== regularProductIds.length
    ) {
      return NextResponse.json(
        { error: "One or more products are no longer available" },
        { status: 400 }
      );
    }

    // Fetch variants for variant items
    const variantIds = variantItems.map(
      (item: { variantId: string }) => item.variantId
    );
    const dbVariants =
      variantIds.length > 0
        ? (
            await adminSupabase
              .from("product_variants")
              .select("id, name, price, stock, product_id")
              .in("id", variantIds)
              .eq("is_active", true)
          ).data || []
        : [];

    if (variantIds.length > 0 && dbVariants.length !== variantIds.length) {
      return NextResponse.json(
        { error: "One or more product variants are no longer available" },
        { status: 400 }
      );
    }

    // Validate stock for all items
    const stockErrors: string[] = [];

    for (const item of regularItems as Array<{
      id: string;
      productId?: string;
      quantity: number;
    }>) {
      const productId = item.productId || item.id;
      const product = regularProducts.find((p) => p.id === productId);
      if (!product) continue;
      if (product.stock === 0) {
        stockErrors.push(`"${product.name_en}" is out of stock`);
      } else if (item.quantity > product.stock) {
        stockErrors.push(
          `Only ${product.stock} unit${product.stock === 1 ? "" : "s"} of "${product.name_en}" available`
        );
      }
    }

    for (const item of variantItems as Array<{
      variantId: string;
      quantity: number;
    }>) {
      const variant = dbVariants.find((v) => v.id === item.variantId);
      if (!variant) continue;
      if (variant.stock === 0) {
        stockErrors.push(`"${variant.name}" is out of stock`);
      } else if (item.quantity > variant.stock) {
        stockErrors.push(
          `Only ${variant.stock} unit${variant.stock === 1 ? "" : "s"} of "${variant.name}" available`
        );
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: stockErrors.join(". ") },
        { status: 400 }
      );
    }

    // Build line items and order items using DB prices (never trust client prices)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotal = 0;
    const orderItems: Array<{
      product_id: string | null;
      variant_id: string | null;
      product_name: string;
      variant_name: string | null;
      product_price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of regularItems as Array<{
      id: string;
      productId?: string;
      quantity: number;
      name?: string;
    }>) {
      const productId = item.productId || item.id;
      const product = regularProducts.find((p) => p.id === productId);
      if (!product) continue;

      const quantity = item.quantity;
      const unitPrice = Number(product.price);
      const itemSubtotal = unitPrice * quantity;
      subtotal += itemSubtotal;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: item.name || product.name_en },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });

      orderItems.push({
        product_id: product.id,
        variant_id: null,
        product_name: product.name_en,
        variant_name: null,
        product_price: unitPrice,
        quantity,
        subtotal: itemSubtotal,
      });
    }

    // Fetch parent product names once for all variant items
    const uniqueParentIds = [...new Set(dbVariants.map((v) => v.product_id).filter(Boolean))];
    const { data: parentProducts } = uniqueParentIds.length > 0
      ? await adminSupabase
          .from("products")
          .select("id, name_en")
          .in("id", uniqueParentIds)
      : { data: [] };

    for (const item of variantItems as Array<{
      variantId: string;
      quantity: number;
    }>) {
      const variant = dbVariants.find((v) => v.id === item.variantId);
      if (!variant) continue;

      const quantity = item.quantity;
      const unitPrice = Number(variant.price);
      const itemSubtotal = unitPrice * quantity;
      subtotal += itemSubtotal;

      const parent = parentProducts?.find((p) => p.id === variant.product_id);
      const displayName = parent
        ? `${parent.name_en} – ${variant.name}`
        : variant.name;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: displayName },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });

      orderItems.push({
        product_id: variant.product_id || null,
        variant_id: variant.id,
        product_name: displayName,
        variant_name: variant.name,
        product_price: unitPrice,
        quantity,
        subtotal: itemSubtotal,
      });
    }

    // Validate and apply coupon discount (server-side re-validation)
    let discountAmount = 0;
    let stripeCouponId: string | undefined;
    let validatedCouponCode: string | undefined;

    if (couponCode) {
      const { data: coupon } = await adminSupabase
        .from("coupons")
        .select("*")
        .eq("code", (couponCode as string).toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!coupon) {
        return NextResponse.json(
          { error: "Invalid or inactive coupon code" },
          { status: 400 }
        );
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This coupon has expired" },
          { status: 400 }
        );
      }

      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return NextResponse.json(
          { error: "This coupon has reached its usage limit" },
          { status: 400 }
        );
      }

      if (
        coupon.min_order_amount !== null &&
        subtotal < Number(coupon.min_order_amount)
      ) {
        return NextResponse.json(
          {
            error: `Minimum order of €${Number(coupon.min_order_amount).toFixed(2)} required for this coupon`,
          },
          { status: 400 }
        );
      }

      if (coupon.type === "percentage") {
        discountAmount = (subtotal * Number(coupon.value)) / 100;
      } else {
        discountAmount = Number(coupon.value);
      }
      discountAmount = Math.min(subtotal, Math.round(discountAmount * 100) / 100);
      validatedCouponCode = coupon.code;

      const stripeCoupon = await stripe.coupons.create({
        name: `Coupon ${coupon.code}`,
        amount_off: Math.round(discountAmount * 100),
        currency: "eur",
        duration: "once",
      });
      stripeCouponId = stripeCoupon.id;
    }

    const finalTotal = subtotal - discountAmount;

    // Create order in database
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        user_id: user?.id || null,
        status: "pending",
        total: finalTotal,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone || null,
        shipping_address_line1: customerInfo.address,
        shipping_city: customerInfo.city,
        shipping_postal_code: customerInfo.postalCode,
        shipping_country: "LT",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

    // Insert order items (with variant_id and variant_name when applicable)
    const { error: itemsError } = await adminSupabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        product_price: item.product_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }))
    );

    if (itemsError) {
      console.error("Order items insertion error:", itemsError);
      // Clean up the orphaned order before failing
      await adminSupabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to save order items. Please try again." },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(stripeCouponId
        ? { discounts: [{ coupon: stripeCouponId }] }
        : {}),
      metadata: {
        order_id: order.id,
        ...(validatedCouponCode ? { coupon_code: validatedCouponCode } : {}),
      },
      customer_email: customerInfo.email,
      success_url: `${siteUrl}/${safeLocale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${safeLocale}/cart`,
    });

    if (session.id) {
      await adminSupabase
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
