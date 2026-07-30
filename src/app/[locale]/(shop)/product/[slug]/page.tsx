import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductGrid } from "@/components/products/product-grid";
import { FavoriteButton } from "@/components/products/favorite-button";
import { ProductVariantSection } from "@/components/products/product-variant-section";
import { ProductImageGallery } from "@/components/products/product-image-gallery";
import { QuantityAddToCart } from "@/components/products/quantity-add-to-cart";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return {};

  const name = getLocalizedField(product, "name", locale);
  const description = getLocalizedField(product, "description", locale);

  return {
    title: `${name} | PetFood Shop`,
    description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const supabase = createAdminClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(slug, name_en, name_lt)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) {
    notFound();
  }

  const name = getLocalizedField(product, "name", locale);
  const description = getLocalizedField(product, "description", locale);
  const category = product.categories as { slug: string; name_en: string; name_lt: string } | null;
  const categoryName = category
    ? getLocalizedField(category, "name", locale)
    : "";

  // Fetch active variants
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, name, price, stock")
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const hasVariants = variants && variants.length > 0;

  const hasDiscount =
    !hasVariants &&
    product.compare_at_price &&
    product.compare_at_price > product.price;
  const outOfStock = !hasVariants && product.stock <= 0;

  // Fetch related products from same category
  const { data: relatedProducts } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(4);

  // Fetch current user's favorite IDs (if logged in)
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  let favoriteIds = new Set<string>();
  let isCurrentFavorited = false;
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id);
    favoriteIds = new Set(favs?.map((f) => f.product_id) ?? []);
    isCurrentFavorited = favoriteIds.has(product.id);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        {category && (
          <>
            <Link
              href={`/category/${category.slug}`}
              className="hover:text-foreground"
            >
              {categoryName}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{name}</span>
      </nav>

      {/* Product Details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div className="relative">
          <ProductImageGallery images={product.images ?? []} alt={name} />
          {hasDiscount && (
            <Badge
              variant="destructive"
              className="absolute left-4 top-4 z-10 text-sm"
            >
              Sale
            </Badge>
          )}
          {user && (
            <FavoriteButton productId={product.id} isFavorited={isCurrentFavorited} />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{name}</h1>

          {product.weight && !hasVariants && (
            <p className="mt-2 text-muted-foreground">{product.weight}</p>
          )}

          {hasVariants ? (
            <ProductVariantSection
              product={product}
              variants={variants}
              inStockLabel={tCommon("inStock")}
              outOfStockLabel={tCommon("outOfStock")}
            />
          ) : (
            <>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(Number(product.price))}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(Number(product.compare_at_price))}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {outOfStock ? (
                  <Badge variant="secondary">{tCommon("outOfStock")}</Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600"
                  >
                    {tCommon("inStock")}
                  </Badge>
                )}
                {!outOfStock && product.stock <= 5 && (
                  <span className="text-sm font-medium text-yellow-600">
                    Only {product.stock} left!
                  </span>
                )}
              </div>

              <Separator className="my-6" />

              {description && (
                <div>
                  <h2 className="mb-2 font-semibold">{t("description")}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              )}

              <Separator className="my-6" />

              <QuantityAddToCart product={product} />
            </>
          )}

          {hasVariants && description && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="mb-2 font-semibold">{t("description")}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </>
          )}

          <Link
            href={category ? `/category/${category.slug}` : "/"}
            className="mt-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {categoryName ? `Back to ${categoryName}` : tCommon("backToHome")}
          </Link>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{t("relatedProducts")}</h2>
          <ProductGrid products={relatedProducts} favoriteIds={favoriteIds} />
        </section>
      )}
    </div>
  );
}
