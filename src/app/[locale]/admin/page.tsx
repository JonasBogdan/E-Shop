import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { ORDER_STATUS_COLORS } from "@/lib/constants";

type Props = {
  params: Promise<{ locale: string }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function AdminDashboard({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();

  // Parallel data fetching (first wave)
  const [
    { count: productCount },
    { count: orderCount },
    { data: allOrders },
    { data: recentOrders },
    { data: lowStockProducts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("status, total, created_at, customer_email")
      .neq("status", "pending"),
    supabase
      .from("orders")
      .select("id, customer_name, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("id, name_en, stock")
      .lte("stock", 5)
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(5),
  ]);

  // Fetch order items for paid/completed orders (two-step to avoid unreliable join filter)
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("id")
    .not("status", "in", "(pending,cancelled)");

  const validOrderIds = (paidOrders ?? []).map((o) => o.id);

  const { data: orderItems } =
    validOrderIds.length > 0
      ? await supabase
          .from("order_items")
          .select("product_name, quantity, subtotal")
          .in("order_id", validOrderIds)
      : { data: [] };

  // Revenue calculations
  const revenueOrders = (allOrders ?? []).filter(
    (o) => o.status !== "cancelled"
  );
  const totalRevenue = revenueOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRevenue = revenueOrders
    .filter((o) => new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + Number(o.total), 0);

  // Unique customers (by email, from paid orders)
  const uniqueCustomers = new Set(revenueOrders.map((o) => o.customer_email))
    .size;

  // Orders by status
  const statusCounts: Record<string, number> = {};
  for (const order of allOrders ?? []) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  }
  // Also count pending
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("status")
    .eq("status", "pending");
  if (pendingOrders) {
    statusCounts["pending"] = pendingOrders.length;
  }

  // Top products by revenue
  const productRevenue: Record<string, { revenue: number; units: number }> = {};
  for (const item of orderItems ?? []) {
    if (!productRevenue[item.product_name]) {
      productRevenue[item.product_name] = { revenue: 0, units: 0 };
    }
    productRevenue[item.product_name].revenue += Number(item.subtotal);
    productRevenue[item.product_name].units += item.quantity;
  }
  const topProducts = Object.entries(productRevenue)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxProductRevenue = topProducts[0]?.[1].revenue || 1;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(monthRevenue)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orderCount || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {revenueOrders.filter((o) => new Date(o.created_at) >= monthStart).length} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productCount || 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lowStockProducts?.length || 0} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueCustomers}</p>
            <p className="mt-1 text-xs text-muted-foreground">unique emails</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Orders by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ORDER_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              {Object.keys(statusCounts).length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map(([name, { revenue, units }]) => (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium max-w-[60%]" title={name}>
                        {name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatCurrency(revenue)}{" "}
                        <span className="text-xs">({units} sold)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{
                          width: `${(revenue / maxProductRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name_en}</span>
                  <span
                    className={`font-semibold ${
                      p.stock === 0 ? "text-destructive" : "text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/admin/products"
              className="mt-3 flex items-center gap-1 text-xs text-orange-700 hover:underline dark:text-orange-400"
            >
              Manage products <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Order</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:text-primary"
                      >
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{order.customer_name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ORDER_STATUS_COLORS[order.status] ?? "bg-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
