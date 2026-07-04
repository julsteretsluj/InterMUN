import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingFeaturesPage } from "@/components/marketing/MarketingFeaturesPage";
import { MarketingOpening } from "@/components/marketing/MarketingOpening";
import { redirectMarketingGuestsToApp } from "@/lib/marketing-guest-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.featuresPages.chairs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ChairsFeaturesPage() {
  await redirectMarketingGuestsToApp();
  return (
    <MarketingOpening>
      <MarketingFeaturesPage role="chairs" />
    </MarketingOpening>
  );
}
