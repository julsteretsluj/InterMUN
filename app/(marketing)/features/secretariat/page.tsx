import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingFeaturesPage } from "@/components/marketing/MarketingFeaturesPage";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.featuresPages.secretariat");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SecretariatFeaturesPage() {
  return (
    <MarketingOpening>
      <MarketingFeaturesPage role="secretariat" />
    </MarketingOpening>
  );
}
