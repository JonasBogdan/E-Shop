import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalizedField, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CONTACT_PHONE } from "@/lib/constants";
import { Package, Phone, ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import { HeroCarousel } from "@/components/hero-carousel";

type Props = {
  params: Promise<{ locale: string }>;
};

const categoryImages: Record<string, string> = {
  "dog-food": "/images/category-dogs.jpg",
  "cat-food": "/images/category-cats.jpg",
  misc: "/images/category-misc.jpg",
  supplements: "/images/category-misc.jpg",
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const { data: featuredProducts } = await supabase
    .from("products")
    .select("*")
    .eq("is_featured", true)
    .eq("is_active", true)
    .limit(8);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 py-16 sm:px-6 lg:px-8">
        {/* Decorative background circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/6 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-primary/4 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Text side */}
            <div className="py-8 text-center lg:py-16 lg:text-left">
              {/* Trust badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-sm font-medium text-primary">
                <Star className="h-3.5 w-3.5 fill-current" />
                Premium Quality Pet Food
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl lg:mx-0">
                {t("heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link href="/category/dog-food">
                  <Button size="lg" className="gap-2 px-8 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
                    {t("shopNow")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg" className="gap-2 px-8 border-border/80 hover:border-primary/40 hover:bg-primary/5">
                    <Phone className="h-4 w-4" />
                    {CONTACT_PHONE}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Image side */}
            <div className="hidden lg:block">
              <HeroCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("browseCategories")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => {
            const image = categoryImages[category.slug];
            return (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  {/* Background photo */}
                  {image ? (
                    <Image
                      src={image}
                      alt={getLocalizedField(category, "name", locale)}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5 transition-all duration-300 group-hover:from-black/80" />
                  {/* Text content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-xl font-bold drop-shadow-sm">
                      {getLocalizedField(category, "name", locale)}
                    </h3>
                    <p className="mt-1 text-sm text-white/75 leading-relaxed">
                      {getLocalizedField(category, "description", locale)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90 transition-all duration-200 group-hover:gap-2">
                      {tCommon("viewDetails")} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {(!categories || categories.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <p>Categories will appear here once the database is set up.</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="px-4 py-16 sm:px-6 lg:px-8" style={{ background: "oklch(0.97 0.008 75)" }}>
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("featuredProducts")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <div className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-border">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {product.images && product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={getLocalizedField(product, "name", locale)}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Package className="h-12 w-12 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="line-clamp-1 font-semibold text-sm sm:text-base">
                        {getLocalizedField(product, "name", locale)}
                      </h3>
                      <p className="mt-1 font-bold text-primary">
                        {formatPrice(Number(product.price))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Banner */}
      <section className="bg-primary px-4 py-10 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
              <Phone className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold">
              {t("contactBanner", { phone: CONTACT_PHONE })}
            </p>
          </div>
          <Link href="/contact">
            <Button
              variant="secondary"
              size="lg"
              className="shrink-0 font-semibold shadow-lg shadow-black/10 hover:shadow-xl"
            >
              {tNav("contact")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
