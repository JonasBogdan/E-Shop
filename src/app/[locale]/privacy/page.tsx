import { setRequestLocale } from "next-intl/server";
import { CONTACT_EMAIL, SITE_NAME, SITE_DOMAIN } from "@/lib/constants";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_NAME}`,
};

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: March 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-bold">1. Who We Are</h2>
          <p className="mt-2 text-muted-foreground">
            {SITE_NAME} operates the website {SITE_DOMAIN}. This privacy policy explains how we
            collect, use, and protect your personal data when you use our website and services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Data We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong>Account data:</strong> name, email address, phone number, delivery address</li>
            <li><strong>Order data:</strong> products purchased, prices, delivery details, payment status</li>
            <li><strong>Usage data:</strong> pages visited, browser type, IP address (via cookies)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. How We Use Your Data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>To process and fulfil your orders</li>
            <li>To send order confirmation and status update emails</li>
            <li>To manage your account and preferences</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            We use cookies to keep you logged in and to remember your shopping cart. We do not use
            third-party tracking or advertising cookies. You can decline non-essential cookies via
            the banner shown on your first visit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Data Sharing</h2>
          <p className="mt-2 text-muted-foreground">
            We share your data only with third parties required to run our service:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong>Stripe</strong> — payment processing (card data never touches our servers)</li>
            <li><strong>Supabase</strong> — secure database hosting</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
          </ul>
          <p className="mt-2 text-muted-foreground">We do not sell your data to any third party.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Data Retention</h2>
          <p className="mt-2 text-muted-foreground">
            We retain your account and order data for as long as your account is active or as
            required by law (typically 5 years for financial records). You may request deletion
            of your account at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">7. Your Rights (GDPR)</h2>
          <p className="mt-2 text-muted-foreground">Under GDPR you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            To exercise these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">8. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            If you have any questions about this privacy policy, please email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
