"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<
    Array<{ id: string; name_en: string }>
  >([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("id, name_en")
        .order("sort_order");
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError("");

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const { url } = await res.json();
        uploadedUrls.push(url);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to upload image");
      }
    }

    setImages((prev) => [...prev, ...uploadedUrls]);
    setUploading(false);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const slug = (form.get("name_en") as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: form.get("category_id"),
        slug,
        name_en: form.get("name_en"),
        name_lt: form.get("name_lt"),
        description_en: form.get("description_en") || null,
        description_lt: form.get("description_lt") || null,
        price: parseFloat(form.get("price") as string),
        compare_at_price: form.get("compare_at_price")
          ? parseFloat(form.get("compare_at_price") as string)
          : null,
        stock: parseInt(form.get("stock") as string) || 0,
        weight: form.get("weight") || null,
        is_active: form.get("is_active") === "on",
        is_featured: form.get("is_featured") === "on",
        images,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create product");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
  }

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Products
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Add Product</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Details (English)</CardTitle>
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
                  rows={4}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Details (Lithuanian)</CardTitle>
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
                  rows={4}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category *</label>
                <Select name="category_id" required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price (EUR) *</label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Compare Price</label>
                  <Input
                    name="compare_at_price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Stock *</label>
                  <Input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Weight</label>
                  <Input name="weight" placeholder="e.g. 2kg" className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4"
                />
                <span className="text-sm">Active (visible in store)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  name="is_featured"
                  type="checkbox"
                  className="h-4 w-4"
                />
                <span className="text-sm">Featured (shown on home page)</span>
              </label>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />

              <div className="flex flex-wrap gap-4">
                {images.map((url, i) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt={`Product image ${i + 1}`}
                      className="h-32 w-32 rounded-md border object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">
                    {uploading ? "Uploading..." : "Add image"}
                  </span>
                </button>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Max 5MB per image. The first image will be used as the primary
                product photo.
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex gap-4">
          <Button type="submit" disabled={loading || uploading}>
            {loading ? "Saving..." : "Create Product"}
          </Button>
          <Link href="/admin/products">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
