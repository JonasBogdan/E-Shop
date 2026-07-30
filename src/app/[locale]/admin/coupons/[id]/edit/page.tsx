"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Coupon } from "@/types";

export default function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState<string>("");

  useEffect(() => {
    params.then(({ id: resolvedId }) => {
      setId(resolvedId);
      fetch(`/api/admin/coupons/${resolvedId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) setError("Coupon not found");
          else setCoupon(data as Coupon);
        })
        .catch(() => setError("Failed to load coupon"));
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      code: fd.get("code"),
      description: fd.get("description") || null,
      type: fd.get("type"),
      value: fd.get("value"),
      min_order_amount: fd.get("min_order_amount") || null,
      max_uses: fd.get("max_uses") || null,
      expires_at: fd.get("expires_at") || null,
      is_active: fd.get("is_active") === "true",
    };

    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      router.push("/admin/coupons");
    } else {
      setError(data.error || "Failed to update coupon");
      setLoading(false);
    }
  }

  if (error && !coupon)
    return <p className="text-destructive">{error}</p>;
  if (!coupon)
    return <p className="text-muted-foreground">Loading...</p>;

  const expiresValue = coupon.expires_at
    ? new Date(coupon.expires_at).toISOString().slice(0, 16)
    : "";

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/coupons">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Coupon — {coupon.code}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Coupon Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Code</label>
              <Input
                name="code"
                defaultValue={coupon.code}
                required
                className="mt-1 font-mono uppercase"
                style={{ textTransform: "uppercase" }}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                name="description"
                defaultValue={coupon.description ?? ""}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  name="type"
                  defaultValue={coupon.type}
                  required
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (€)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Value</label>
                <Input
                  name="value"
                  type="number"
                  defaultValue={coupon.value}
                  required
                  min="0.01"
                  step="0.01"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min order (€)</label>
                <Input
                  name="min_order_amount"
                  type="number"
                  defaultValue={coupon.min_order_amount ?? ""}
                  min="0"
                  step="0.01"
                  placeholder="None"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max uses</label>
                <Input
                  name="max_uses"
                  type="number"
                  defaultValue={coupon.max_uses ?? ""}
                  min="1"
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Expiry date</label>
              <Input
                name="expires_at"
                type="datetime-local"
                defaultValue={expiresValue}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                name="is_active"
                defaultValue={coupon.is_active ? "true" : "false"}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              Used {coupon.uses_count} time{coupon.uses_count !== 1 ? "s" : ""} so far.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
