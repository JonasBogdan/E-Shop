import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { code, total } = await req.json();

  if (!code || typeof total !== "number") {
    return NextResponse.json(
      { error: "code and total are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
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

  if (coupon.min_order_amount !== null && total < Number(coupon.min_order_amount)) {
    return NextResponse.json(
      {
        error: `Minimum order of €${Number(coupon.min_order_amount).toFixed(2)} required for this coupon`,
      },
      { status: 400 }
    );
  }

  let discount: number;
  if (coupon.type === "percentage") {
    discount = (total * Number(coupon.value)) / 100;
  } else {
    discount = Number(coupon.value);
  }
  discount = Math.min(total, Math.round(discount * 100) / 100);

  return NextResponse.json({
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    discount,
    finalTotal: Math.round((total - discount) * 100) / 100,
  });
}
