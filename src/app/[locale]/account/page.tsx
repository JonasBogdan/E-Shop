import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "@/components/account/profile-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("account");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name, phone, address_line1, city, postal_code")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("profile")}</h1>
      <ProfileForm email={user.email ?? ""} profile={profile} />
    </div>
  );
}
