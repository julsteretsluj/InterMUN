import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAppName } from "@/lib/branding";
import { isAdminRole, isSmtRole, SMT_APP_HOME, ADMIN_APP_HOME } from "@/lib/roles";
import { MarketingHome } from "@/components/marketing/MarketingHome";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("metaTitle", { app: getAppName() }),
    description: t("metaDescription"),
  };
}

export default async function MarketingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (isAdminRole(profile?.role)) redirect(ADMIN_APP_HOME);
    redirect(isSmtRole(profile?.role) ? SMT_APP_HOME : "/profile");
  }

  return (
    <MarketingOpening>
      <MarketingHome />
    </MarketingOpening>
  );
}
