import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { UpdateOrderStatus } from "./update-status";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const adminSupabase = createAdminClient();

  const { data: order } = await adminSupabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await adminSupabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-muted-foreground">{order.customer_email}</p>
            {order.customer_phone && (
              <p className="text-muted-foreground">{order.customer_phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">{order.shipping_address_line1}</p>
            <p className="text-muted-foreground">
              {order.shipping_city}, {order.shipping_postal_code}
            </p>
            <p className="text-muted-foreground">{order.shipping_country}</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items?.map((item) => (
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
        </CardContent>
      </Card>

      {/* Stripe Info */}
      {order.stripe_session_id && (
        <p className="mt-4 text-xs text-muted-foreground">
          Stripe session: {order.stripe_session_id}
        </p>
      )}
    </div>
  );
}
