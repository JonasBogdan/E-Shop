import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, description, type, value, min_order_amount, max_uses, expires_at, is_active } = body;

  if (!code || !type || value === undefined) {
    return NextResponse.json(
      { error: "code, type, and value are required" },
      { status: 400 }
    );
  }

  if (!["percentage", "fixed"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (Number(value) <= 0) {
    return NextResponse.json({ error: "Value must be positive" }, { status: 400 });
  }

  if (type === "percentage" && Number(value) > 100) {
    return NextResponse.json(
      { error: "Percentage discount cannot exceed 100%" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: code.toUpperCase().trim(),
      description: description || null,
      type,
      value: Number(value),
      min_order_amount: min_order_amount ? Number(min_order_amount) : null,
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
      is_active: is_active !== false,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
