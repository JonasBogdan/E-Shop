import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import { ProductGrid } from "@/components/products/product-grid";
import { FilterBar } from "@/components/products/filter-bar";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = createAdminClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) return {};

  const name = getLocalizedField(category, "name", locale);
  const description = getLocalizedField(category, "description", locale);

  return {
    title: `${name} | ${SITE_NAME}`,
    description,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { sort, minPrice, maxPrice, inStock } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("category");
  const tNav = await getTranslations("nav");

  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) {
    notFound();
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("category_id", category.id)
    .eq("is_active", true);

  // Apply filters
  if (minPrice) query = query.gte("price", Number(minPrice));
  if (maxPrice) query = query.lte("price", Number(maxPrice));
  if (inStock === "1") query = query.gt("stock", 0);

  // Apply sort
  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: products } = await query;

  // Fetch current user's favorite IDs (if logged in)
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  let favoriteIds = new Set<string>();
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);
    favoriteIds = new Set(favs?.map((f) => f.product_id) ?? []);
  }

  const categoryName = getLocalizedField(category, "name", locale);
  const categoryDescription = getLocalizedField(category, "description", locale);

  const hasActiveFilters = minPrice || maxPrice || inStock === "1";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{categoryName}</span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{categoryName}</h1>
        {categoryDescription && (
          <p className="mt-2 text-muted-foreground">{categoryDescription}</p>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Sidebar filters */}
        <aside className="w-full lg:w-56 lg:shrink-0">
          <FilterBar />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Sort + count row */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {products?.length || 0} {t("allProducts").toLowerCase()}
              {hasActiveFilters && (
                <span className="ml-1 font-medium text-primary">(filtered)</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:block">
                {t("sortBy")}:
              </span>
              <div className="flex gap-1">
                {[
                  { value: "newest", label: t("newest") },
                  { value: "price-asc", label: t("priceLowHigh") },
                  { value: "price-desc", label: t("priceHighLow") },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={`/category/${slug}?sort=${option.value}${minPrice ? `&minPrice=${minPrice}` : ""}${maxPrice ? `&maxPrice=${maxPrice}` : ""}${inStock === "1" ? "&inStock=1" : ""}`}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      sort === option.value ||
                      (!sort && option.value === "newest")
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {products && products.length > 0 ? (
            <ProductGrid products={products} favoriteIds={favoriteIds} />
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-muted">
                <Image
                  src="/images/cart-empty.jpg"
                  alt="No products found"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="font-semibold text-foreground">
                {hasActiveFilters ? "No products match your filters" : t("noProducts")}
              </p>
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground">Try adjusting the price range or removing filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
