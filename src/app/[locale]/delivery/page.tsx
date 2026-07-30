import { setRequestLocale } from "next-intl/server";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";
import { Truck, RotateCcw, Clock, Package } from "lucide-react";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: "Delivery & Returns | PetFood Shop",
};

export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-extrabold">Delivery &amp; Returns</h1>
      <p className="mb-10 text-muted-foreground">
        Everything you need to know about how we ship your order and how to return it.
      </p>

      {/* Delivery cards */}
      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: <Clock className="h-6 w-6 text-primary" />,
            title: "Processing Time",
            body: "Orders are packed and dispatched within 1–2 business days of payment confirmation.",
          },
          {
            icon: <Truck className="h-6 w-6 text-primary" />,
            title: "Delivery Time",
            body: "Lithuania: 1–2 business days. EU countries: 3–7 business days.",
          },
          {
            icon: <Package className="h-6 w-6 text-primary" />,
            title: "Shipping Cost",
            body: "Free delivery on orders over €50. Standard shipping: €3.99 (Lithuania), €8.99 (EU).",
          },
          {
            icon: <RotateCcw className="h-6 w-6 text-primary" />,
            title: "Returns",
            body: "14-day return window from delivery. Unopened products only (food hygiene regulations).",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-sm"
          >
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2">{card.icon}</div>
            <h3 className="font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-bold">Delivery Methods</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Zone</th>
                  <th className="px-4 py-3 text-left font-semibold">Courier</th>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3 text-left font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                <tr>
                  <td className="px-4 py-3">Lithuania</td>
                  <td className="px-4 py-3">DPD / Omniva</td>
                  <td className="px-4 py-3">1–2 days</td>
                  <td className="px-4 py-3">€3.99 (free over €50)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Latvia, Estonia</td>
                  <td className="px-4 py-3">DPD</td>
                  <td className="px-4 py-3">2–3 days</td>
                  <td className="px-4 py-3">€6.99</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Other EU</td>
                  <td className="px-4 py-3">DPD</td>
                  <td className="px-4 py-3">4–7 days</td>
                  <td className="px-4 py-3">€8.99</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">How to Return</h2>
          <ol className="mt-3 space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <span>Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> within 14 days of receiving your order.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              <span>Include your order number and the items you wish to return.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
              <span>We will send you a return label or instructions.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</span>
              <span>Once we receive the goods in original condition, a full refund is issued within 5 business days.</span>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold">Questions?</h2>
          <p className="mt-2 text-muted-foreground">
            Call us on <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">{CONTACT_PHONE}</a> or
            email <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
