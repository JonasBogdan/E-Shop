import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function OrderDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("account");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const adminSupabase = createAdminClient();

  const { data: order } = await adminSupabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) notFound();

  const { data: items } = await adminSupabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return (
    <div>
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("orders")} #{order.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge className={statusColors[order.status] || ""}>
          {order.status}
        </Badge>
      </div>

      {/* Order Items */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {!items || items.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Package className="h-5 w-5" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id ?? item.product_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-muted-foreground">
                      {formatPrice(Number(item.product_price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(Number(item.subtotal))}</p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p className="font-medium">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="text-muted-foreground">{order.customer_phone}</p>
          )}
          <p className="text-muted-foreground">{order.shipping_address_line1}</p>
          <p className="text-muted-foreground">
            {order.shipping_city}, {order.shipping_postal_code}
          </p>
          <p className="text-muted-foreground">{order.shipping_country}</p>
        </CardContent>
      </Card>
    </div>
  );
}
