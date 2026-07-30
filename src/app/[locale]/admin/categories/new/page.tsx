"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const name_en = form.get("name_en") as string;
    const slug = name_en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name_en,
        name_lt: form.get("name_lt"),
        description_en: form.get("description_en") || null,
        description_lt: form.get("description_lt") || null,
        sort_order: parseInt(form.get("sort_order") as string) || 0,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create category");
      setLoading(false);
      return;
    }

    router.push("/admin/categories");
  }

  return (
    <div>
      <Link
        href="/admin/categories"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Categories
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Add Category</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Category Details (English)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name (EN) *</label>
                <Input name="name_en" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Description (EN)</label>
                <textarea
                  name="description_en"
                  rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Details (Lithuanian)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name (LT) *</label>
                <Input name="name_lt" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Description (LT)</label>
                <textarea
                  name="description_lt"
                  rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  name="sort_order"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="mt-1 w-32"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Lower numbers appear first.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create Category"}
          </Button>
          <Link href="/admin/categories">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
