import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { DeleteCouponButton } from "./delete-coupon-button";
import type { Coupon } from "@/types";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCouponsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  function formatValue(coupon: Coupon) {
    return coupon.type === "percentage"
      ? `${coupon.value}%`
      : `€${Number(coupon.value).toFixed(2)}`;
  }

  function couponStatus(coupon: Coupon) {
    if (!coupon.is_active) return { label: "Inactive", color: "bg-muted text-muted-foreground" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { label: "Expired", color: "bg-red-100 text-red-800" };
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses)
      return { label: "Limit reached", color: "bg-orange-100 text-orange-800" };
    return { label: "Active", color: "bg-green-100 text-green-800" };
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Link href="/admin/coupons/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Coupon
          </Button>
        </Link>
      </div>

      {!coupons || coupons.length === 0 ? (
        <p className="text-muted-foreground">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Discount</th>
                <th className="px-4 py-2 text-center">Uses</th>
                <th className="px-4 py-2 text-left">Expires</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(coupons as Coupon[]).map((coupon) => {
                const status = couponStatus(coupon);
                return (
                  <tr key={coupon.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-2 font-mono font-semibold">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[180px] truncate">
                      {coupon.description || "—"}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {formatValue(coupon)}
                      {coupon.min_order_amount && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (min €{Number(coupon.min_order_amount).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {coupon.uses_count}
                      {coupon.max_uses !== null && ` / ${coupon.max_uses}`}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {coupon.expires_at
                        ? new Date(coupon.expires_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Badge className={`text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/coupons/${coupon.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <DeleteCouponButton id={coupon.id} code={coupon.code} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
