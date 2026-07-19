import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAppName } from "@/lib/branding";
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
  return (
    <MarketingOpening>
      <MarketingHome />
    </MarketingOpening>
  );
}
