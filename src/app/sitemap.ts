import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const locales = ["en", "lt"];
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";

function url(path: string) {
  return `${siteUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("slug, updated_at"),
    supabase.from("products").select("slug, updated_at").eq("is_active", true),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/en"), lastModified: new Date(), alternates: { languages: { en: url("/en"), lt: url("/lt") } } },
    { url: url("/en/about"), lastModified: new Date(), alternates: { languages: { en: url("/en/about"), lt: url("/lt/about") } } },
    { url: url("/en/contact"), lastModified: new Date(), alternates: { languages: { en: url("/en/contact"), lt: url("/lt/contact") } } },
    { url: url("/en/privacy"), lastModified: new Date(), alternates: { languages: { en: url("/en/privacy"), lt: url("/lt/privacy") } } },
    { url: url("/en/terms"), lastModified: new Date(), alternates: { languages: { en: url("/en/terms"), lt: url("/lt/terms") } } },
    { url: url("/en/delivery"), lastModified: new Date(), alternates: { languages: { en: url("/en/delivery"), lt: url("/lt/delivery") } } },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).flatMap((c) =>
    locales.map((locale) => ({
      url: url(`/${locale}/category/${c.slug}`),
      lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    }))
  );

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).flatMap((p) =>
    locales.map((locale) => ({
      url: url(`/${locale}/product/${p.slug}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    }))
  );

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
