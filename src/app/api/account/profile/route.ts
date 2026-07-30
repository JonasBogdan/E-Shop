import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { full_name, phone, address_line1, city, postal_code } = body;

  // Basic validation
  if (full_name !== undefined && typeof full_name !== "string") {
    return NextResponse.json({ error: "Invalid full_name" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("profiles")
    .update({
      full_name: full_name?.trim() || null,
      phone: phone?.trim() || null,
      address_line1: address_line1?.trim() || null,
      city: city?.trim() || null,
      postal_code: postal_code?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
