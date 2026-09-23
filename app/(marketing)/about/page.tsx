import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.aboutPage");
  const appName = getAppName();
  return {
    title: t("metaTitle", { app: appName }),
    description: t("metaDescription", { app: appName }),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("marketing.aboutPage");
  const appName = getAppName();

  return (
    <MarketingDocumentPage
      eyebrow={t("eyebrow", { app: appName })}
      title={t("title")}
      intro={t("intro", { app: appName })}
      sections={[
        {
          title: t("purposeTitle"),
          content: (
            <>
              <p>{t("purposeP1", { app: appName })}</p>
              <p>{t("purposeP2")}</p>
            </>
          ),
        },
        {
          title: t("rolesTitle"),
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>{t("rolesDelegates")}</li>
              <li>{t("rolesChairs")}</li>
              <li>{t("rolesAdvisors")}</li>
              <li>{t("rolesSecretariat")}</li>
            </ul>
          ),
        },
        {
          title: t("techTitle"),
          content: (
            <>
              <p>{t("techP1")}</p>
              <p>
                {t("techCtaBefore", { app: appName })}{" "}
                <Link href="/#contact" className="font-semibold text-[var(--clicky-blue)] hover:underline">
                  {t("techCtaLink")}
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
