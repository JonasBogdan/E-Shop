import { getTranslations, setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/products/product-grid";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const tSearch = await getTranslations("search");

  const supabase = createAdminClient();

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  let favoriteIds = new Set<string>();
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);
    favoriteIds = new Set(favs?.map((f) => f.product_id) ?? []);
  }

  let products = null;
  if (q && q.trim().length > 0) {
    const searchTerm = `%${q.trim()}%`;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .or(
        `name_en.ilike.${searchTerm},name_lt.ilike.${searchTerm},description_en.ilike.${searchTerm},description_lt.ilike.${searchTerm}`
      )
      .limit(40);
    products = data;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{t("search")}</span>
      </nav>

      <form action="" method="GET" className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={q || ""}
            placeholder={t("search")}
            className="pl-10"
            autoFocus
          />
        </div>
      </form>

      {q ? (
        <>
          <h1 className="mb-6 text-2xl font-bold">
            {products && products.length > 0
              ? tSearch("results", { count: products.length })
              : tSearch("noResults", { query: q })}
          </h1>
          {products && products.length > 0 && (
            <ProductGrid products={products} favoriteIds={favoriteIds} />
          )}
        </>
      ) : (
        <p className="text-muted-foreground">{t("search")}</p>
      )}
    </div>
  );
}
