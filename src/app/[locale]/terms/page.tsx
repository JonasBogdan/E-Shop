import { setRequestLocale } from "next-intl/server";
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME, SITE_DOMAIN } from "@/lib/constants";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: `Terms & Conditions | ${SITE_NAME}`,
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-extrabold">Terms &amp; Conditions</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: March 2026</p>

      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-bold">1. General</h2>
          <p className="mt-2 text-muted-foreground">
            By placing an order on {SITE_NAME} ({SITE_DOMAIN}) you agree to these terms and
            conditions. Please read them carefully before purchasing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Products and Pricing</h2>
          <p className="mt-2 text-muted-foreground">
            All prices are shown in Euros (€) and include VAT where applicable. We reserve the
            right to change prices at any time. In the event of a pricing error, we will contact
            you before processing your order.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Ordering</h2>
          <p className="mt-2 text-muted-foreground">
            When you place an order you will receive a confirmation email. This confirmation is
            an acknowledgement of receipt, not acceptance of your order. We reserve the right to
            refuse or cancel orders at our discretion (e.g. if a product is out of stock).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Payment</h2>
          <p className="mt-2 text-muted-foreground">
            Payment is processed securely through Stripe. We accept all major credit and debit
            cards. Your card details are never stored on our servers. You may also place orders
            by calling us on {CONTACT_PHONE}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Delivery</h2>
          <p className="mt-2 text-muted-foreground">
            Orders are typically dispatched within 1–2 business days. Delivery times and costs
            are described on our{" "}
            <a href="../delivery" className="text-primary hover:underline">
              Delivery &amp; Returns
            </a>{" "}
            page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Right of Withdrawal (EU Consumers)</h2>
          <p className="mt-2 text-muted-foreground">
            As a consumer in the EU you have the right to withdraw from your purchase within
            <strong> 14 calendar days</strong> of receiving your goods, without giving a reason.
            To exercise this right, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            before the 14-day period expires.
          </p>
          <p className="mt-2 text-muted-foreground">
            Food products that have been opened cannot be returned for hygiene reasons, unless
            the product is defective or incorrectly described.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Liability</h2>
          <p className="mt-2 text-muted-foreground">
            {SITE_NAME} is not liable for indirect, incidental, or consequential damages arising
            from the use of our products or website beyond the value of the goods purchased.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Governing Law</h2>
          <p className="mt-2 text-muted-foreground">
            These terms are governed by the laws of the Republic of Lithuania. Any disputes shall
            be resolved in Lithuanian courts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">9. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            or {CONTACT_PHONE}.
          </p>
        </section>
      </div>
    </div>
  );
}
