import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CONTACT_PHONE, CONTACT_EMAIL, WORKING_HOURS } from "@/lib/constants";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact Us | PetFood Shop",
    description: "Get in touch with PetFood Shop. Order by phone or email.",
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("contact");
  const tNav = await getTranslations("nav");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{t("title")}</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <p className="mb-8 text-lg text-muted-foreground">{t("orderByPhone")}</p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("phone")}</h3>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                className="mt-1 text-lg text-primary hover:underline"
              >
                {CONTACT_PHONE}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("email")}</h3>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-1 text-lg text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("hours")}</h3>
              <p className="mt-1 text-muted-foreground">{WORKING_HOURS}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Address</h3>
              <p className="mt-1 text-muted-foreground">Vilnius, Lithuania</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
