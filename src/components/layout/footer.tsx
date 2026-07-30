import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Phone, Mail, Clock } from "lucide-react";
import { CONTACT_PHONE, CONTACT_EMAIL, WORKING_HOURS } from "@/lib/constants";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="overflow-hidden flex-shrink-0" style={{height: '32px', mixBlendMode: 'screen'}}>
                <img src="/Logo.png" alt="CanisCattus" style={{height: '43px', width: 'auto', display: 'block', filter: 'invert(1)'}} />
              </div>
              <span className="text-lg font-bold tracking-tight">CanisCattus</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-background/60">
              {t("footer.description")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-background/40">
              {t("home.browseCategories")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/category/dog-food" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.dogFood")}
                </Link>
              </li>
              <li>
                <Link href="/category/cat-food" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.catFood")}
                </Link>
              </li>
              <li>
                <Link href="/category/misc" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.misc")}
                </Link>
              </li>
              <li>
                <Link href="/category/supplements" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.supplements")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-background/40">
              {t("contact.title")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {CONTACT_PHONE}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                {CONTACT_EMAIL}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                {WORKING_HOURS}
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-background/40">
              {t("nav.account")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/login" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.login")}
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("nav.signup")}
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("account.orders")}
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("footer.delivery")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-background/60 transition-colors hover:text-primary">
                  {t("footer.about")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-background/10 pt-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-background/40">
              &copy; {new Date().getFullYear()} CanisCattus. {t("footer.rights")}
            </p>
            <div className="flex gap-4 text-xs text-background/40">
              <Link href="/privacy" className="transition-colors hover:text-primary">
                {t("footer.privacyPolicy")}
              </Link>
              <Link href="/terms" className="transition-colors hover:text-primary">
                {t("footer.terms")}
              </Link>
              <Link href="/delivery" className="transition-colors hover:text-primary">
                {t("footer.delivery")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
