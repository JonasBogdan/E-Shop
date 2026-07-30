import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductGrid } from "@/components/products/product-grid";
import { Heart } from "lucide-react";
import type { Product } from "@/types";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("account");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const adminSupabase = createAdminClient();
  const { data: favorites } = await adminSupabase
    .from("favorites")
    .select("product_id, products(*)")
    .eq("user_id", user.id);

  type FavoriteRow = { product_id: string; products: Product | null };
  const products = ((favorites as FavoriteRow[] | null)
    ?.map((f) => f.products)
    .filter((p): p is Product => p !== null) || []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("favorites")}</h1>

      {!products || products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Heart className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t("noFavorites")}</p>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
