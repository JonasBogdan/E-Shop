import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle, Package, ArrowRight } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("checkout");
  const tCart = await getTranslations("cart");

  // Fetch order number from DB using Stripe session ID
  let orderNumber: string | null = null;
  if (session_id) {
    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session_id)
      .single();
    if (order) orderNumber = order.id.slice(0, 8).toUpperCase();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-extrabold">{t("successTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("successMessage")}</p>

        {orderNumber && (
          <div className="mt-6 rounded-xl border border-border/60 bg-muted/40 px-6 py-4">
            <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
            <p className="mt-1 font-mono text-lg font-bold text-primary">#{orderNumber}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/account/orders">
            <Button variant="outline" className="w-full gap-2">
              <Package className="h-4 w-4" />
              View My Orders
            </Button>
          </Link>
          <Link href="/">
            <Button className="w-full gap-2">
              {tCart("continueShopping")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
