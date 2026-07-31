import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORDER_STATUS_COLORS } from "@/lib/constants";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { AdminSearchInput } from "@/components/admin/search-input";
import { DeleteOrderButton } from "@/components/admin/delete-order-button";

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { search, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  setRequestLocale(locale);

  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`
    );
  }

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <AdminSearchInput placeholder="Search by name or email..." />
      </div>

      {!orders || orders.length === 0 ? (
        <p className="text-muted-foreground">
          {search ? `No orders matching "${search}".` : "No orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono text-xs">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">{order.customer_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {order.customer_email}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Badge className={ORDER_STATUS_COLORS[order.status] || ""}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatPrice(Number(order.total))}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <DeleteOrderButton orderId={order.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  );
}
