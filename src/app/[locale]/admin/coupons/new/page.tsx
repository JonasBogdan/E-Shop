"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      router.push("/admin/coupons");
    } else {
      setError(data.error || "Failed to create coupon");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/coupons">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Coupon</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Coupon Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Code <span className="text-destructive">*</span>
              </label>
              <Input
                name="code"
                required
                placeholder="SUMMER20"
                className="mt-1 font-mono uppercase"
                style={{ textTransform: "uppercase" }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Customers enter this at checkout (auto-uppercased)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                name="description"
                placeholder="Summer sale discount"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Type <span className="text-destructive">*</span>
                </label>
                <select
                  name="type"
                  required
                  defaultValue="percentage"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (€)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Value <span className="text-destructive">*</span>
                </label>
                <Input
                  name="value"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="10"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min order amount (€)</label>
                <Input
                  name="min_order_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max uses</label>
                <Input
                  name="max_uses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Expiry date</label>
              <Input name="expires_at" type="datetime-local" className="mt-1" />
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                name="is_active"
                defaultValue="true"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Coupon"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
