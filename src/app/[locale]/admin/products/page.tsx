import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPagination } from "@/components/admin/pagination";
import { Plus, AlertTriangle } from "lucide-react";
import { DeleteProductButton } from "./delete-product-button";
import { AdminSearchInput } from "@/components/admin/search-input";

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { search, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  setRequestLocale(locale);

  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("*, categories(name_en)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (search) {
    query = query.ilike("name_en", `%${search}%`);
  }

  const { data: products, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex flex-1 items-center justify-end gap-3">
          <AdminSearchInput placeholder="Search products..." />
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {!products || products.length === 0 ? (
        <p className="text-muted-foreground">
          {search ? `No products matching "${search}".` : "No products yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-center">Stock</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Featured</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{product.name_en}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {(product.categories as { name_en: string } | null)?.name_en || "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    &euro;{Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={
                        product.stock === 0
                          ? "font-semibold text-destructive"
                          : product.stock <= 5
                          ? "font-semibold text-yellow-600"
                          : ""
                      }
                    >
                      {product.stock === 0 ? (
                        <span className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {product.stock}
                        </span>
                      ) : (
                        product.stock
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {product.is_featured ? "Yes" : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <DeleteProductButton id={product.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  );
}
