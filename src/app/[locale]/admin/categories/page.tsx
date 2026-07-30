import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DeleteCategoryButton } from "./delete-category-button";
import type { Category } from "@/types";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </Link>
      </div>

      {!categories || categories.length === 0 ? (
        <p className="text-muted-foreground">No categories yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Name (EN)</th>
                <th className="px-4 py-2 text-left">Name (LT)</th>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-center">Sort Order</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories as Category[]).map((category) => (
                <tr key={category.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{category.name_en}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {category.name_lt}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {category.slug}
                  </td>
                  <td className="px-4 py-2 text-center">{category.sort_order}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/categories/${category.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <DeleteCategoryButton id={category.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
