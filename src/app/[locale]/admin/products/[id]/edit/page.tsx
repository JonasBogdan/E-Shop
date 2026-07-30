"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
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
import { ArrowLeft, ImagePlus, X, Plus, Trash2, Save } from "lucide-react";

type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sort_order: number;
  is_active: boolean;
  isNew?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name_en: string }>
  >([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variants state
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantError, setVariantError] = useState("");

  useEffect(() => {
    async function load() {
      const [productRes, variantRes] = await Promise.all([
        fetch(`/api/admin/products/${params.id}`),
        fetch(`/api/admin/products/${params.id}/variants`),
      ]);

      if (!productRes.ok) {
        setError("Product not found");
        return;
      }
      const { product: prod, categories: cats } = await productRes.json();
      if (prod) {
        setProduct(prod);
        setImages((prod.images as string[]) || []);
      }
      if (cats) setCategories(cats);

      if (variantRes.ok) {
        const { variants: v } = await variantRes.json();
        setVariants(v || []);
      }
    }
    load();
  }, [params.id]);

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
    const res = await fetch(`/api/admin/products/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: form.get("category_id"),
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
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update product");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
  }

  // --- Variant helpers ---

  function addVariantRow() {
    const tempId = `new-${Date.now()}`;
    setVariants((prev) => [
      ...prev,
      {
        id: tempId,
        name: "",
        price: 0,
        stock: 0,
        sort_order: prev.length,
        is_active: true,
        isNew: true,
      },
    ]);
  }

  function updateVariantField(
    id: string,
    field: keyof Variant,
    value: string | number | boolean
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  }

  async function saveVariant(variant: Variant) {
    setVariantError("");
    if (!variant.name.trim()) {
      setVariantError("Variant name is required");
      return;
    }

    setVariants((prev) =>
      prev.map((v) => (v.id === variant.id ? { ...v, isSaving: true } : v))
    );

    if (variant.isNew) {
      const res = await fetch(`/api/admin/products/${params.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          sort_order: variant.sort_order,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setVariantError(data.error || "Failed to save variant");
        setVariants((prev) =>
          prev.map((v) =>
            v.id === variant.id ? { ...v, isSaving: false } : v
          )
        );
        return;
      }

      const { variant: saved } = await res.json();
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variant.id
            ? { ...saved, isNew: false, isSaving: false }
            : v
        )
      );
    } else {
      const res = await fetch(
        `/api/admin/products/${params.id}/variants/${variant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
            sort_order: variant.sort_order,
            is_active: variant.is_active,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setVariantError(data.error || "Failed to update variant");
      }
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variant.id ? { ...v, isSaving: false } : v
        )
      );
    }
  }

  async function deleteVariant(variant: Variant) {
    if (variant.isNew) {
      setVariants((prev) => prev.filter((v) => v.id !== variant.id));
      return;
    }

    setVariants((prev) =>
      prev.map((v) =>
        v.id === variant.id ? { ...v, isDeleting: true } : v
      )
    );

    const res = await fetch(
      `/api/admin/products/${params.id}/variants/${variant.id}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const data = await res.json();
      setVariantError(data.error || "Failed to delete variant");
      setVariants((prev) =>
        prev.map((v) =>
          v.id === variant.id ? { ...v, isDeleting: false } : v
        )
      );
      return;
    }

    setVariants((prev) => prev.filter((v) => v.id !== variant.id));
  }

  if (!product) {
    return (
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error || "Loading..."}
      </p>
    );
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

      <h1 className="mb-6 text-2xl font-bold">Edit Product</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Details (English)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name (EN) *</label>
                <Input
                  name="name_en"
                  required
                  defaultValue={product.name_en as string}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (EN)</label>
                <textarea
                  name="description_en"
                  rows={4}
                  defaultValue={(product.description_en as string) || ""}
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
                <Input
                  name="name_lt"
                  required
                  defaultValue={product.name_lt as string}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (LT)</label>
                <textarea
                  name="description_lt"
                  rows={4}
                  defaultValue={(product.description_lt as string) || ""}
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
                <Select
                  name="category_id"
                  defaultValue={product.category_id as string}
                  required
                >
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
              <p className="text-xs text-muted-foreground">
                Base price and stock are used only when no variants are defined.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Price (EUR)</label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={product.price as number}
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
                    defaultValue={(product.compare_at_price as number) || ""}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Stock</label>
                  <Input
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={product.stock as number}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Weight</label>
                  <Input
                    name="weight"
                    defaultValue={(product.weight as string) || ""}
                    className="mt-1"
                  />
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
                  defaultChecked={product.is_active as boolean}
                  className="h-4 w-4"
                />
                <span className="text-sm">Active (visible in store)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  name="is_featured"
                  type="checkbox"
                  defaultChecked={product.is_featured as boolean}
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

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex gap-4">
          <Button type="submit" disabled={loading || uploading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/admin/products">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>

      {/* Variants Section — managed independently */}
      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Variants</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Size or bundle options (e.g. 1kg, 3kg, 15+3kg). When variants
                exist, the product page shows a size selector instead of the
                base price.
              </p>
            </div>
            <Button type="button" size="sm" onClick={addVariantRow}>
              <Plus className="mr-1 h-4 w-4" />
              Add variant
            </Button>
          </CardHeader>
          <CardContent>
            {variantError && (
              <p className="mb-3 text-sm text-destructive">{variantError}</p>
            )}

            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variants yet. Click &quot;Add variant&quot; to create sizes or bundles.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-2 py-2 text-left font-medium">Name</th>
                      <th className="px-2 py-2 text-left font-medium">Price (€)</th>
                      <th className="px-2 py-2 text-left font-medium">Stock</th>
                      <th className="px-2 py-2 text-left font-medium">Order</th>
                      <th className="px-2 py-2 text-left font-medium">Active</th>
                      <th className="px-2 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} className="border-b">
                        <td className="px-2 py-2">
                          <Input
                            value={v.name}
                            onChange={(e) =>
                              updateVariantField(v.id, "name", e.target.value)
                            }
                            placeholder="e.g. 1kg"
                            className="h-8 w-32 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price}
                            onChange={(e) =>
                              updateVariantField(
                                v.id,
                                "price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-24 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) =>
                              updateVariantField(
                                v.id,
                                "stock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 w-20 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={v.sort_order}
                            onChange={(e) =>
                              updateVariantField(
                                v.id,
                                "sort_order",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 w-16 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={v.is_active}
                            onChange={(e) =>
                              updateVariantField(
                                v.id,
                                "is_active",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => saveVariant(v)}
                              disabled={v.isSaving}
                              className="h-7 px-2 text-xs"
                            >
                              <Save className="mr-1 h-3 w-3" />
                              {v.isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteVariant(v)}
                              disabled={v.isDeleting}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
