import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;
  const adminSupabase = createAdminClient();

  // Check if already favorited
  const { data: existing } = await adminSupabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .single();

  if (existing) {
    // Remove favorite
    await adminSupabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    return NextResponse.json({ favorited: false });
  } else {
    // Add favorite
    await adminSupabase
      .from("favorites")
      .insert({ user_id: user.id, product_id: productId });

    return NextResponse.json({ favorited: true });
  }
}
