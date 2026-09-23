import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.termsPage");
  const appName = getAppName();
  return {
    title: t("metaTitle", { app: appName }),
    description: t("metaDescription", { app: appName }),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("marketing.termsPage");
  const appName = getAppName();
  const contactEmail = getPartnershipContactEmail();
  const contactLabel = contactEmail || t("contactFormFallback");
  const contact = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--accent)] hover:underline">
      {contactEmail}
    </a>
  ) : (
    contactLabel
  );

  return (
    <MarketingDocumentPage
      eyebrow={t("eyebrow")}
      title={t("title")}
      intro={t("intro", { app: appName })}
      updated={t("updated")}
      sections={[
        {
          title: t("usingTitle"),
          content: (
            <>
              <p>{t("usingP1")}</p>
              <p>{t("usingP2")}</p>
            </>
          ),
        },
        {
          title: t("accountsTitle"),
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>{t("accountsL1")}</li>
              <li>{t("accountsL2")}</li>
              <li>{t("accountsL3")}</li>
              <li>{t("accountsL4")}</li>
            </ul>
          ),
        },
        {
          title: t("contentTitle"),
          content: (
            <>
              <p>{t("contentP1")}</p>
              <p>{t("contentP2")}</p>
            </>
          ),
        },
        {
          title: t("acceptableTitle"),
          content: <p>{t("acceptableP1")}</p>,
        },
        {
          title: t("organisersTitle"),
          content: <p>{t("organisersP1")}</p>,
        },
        {
          title: t("availabilityTitle"),
          content: <p>{t("availabilityP1")}</p>,
        },
        {
          title: t("suspensionTitle"),
          content: <p>{t("suspensionP1")}</p>,
        },
        {
          title: t("liabilityTitle"),
          content: (
            <>
              <p>{t("liabilityP1", { app: appName })}</p>
              <p>{t("liabilityP2")}</p>
            </>
          ),
        },
        {
          title: t("privacyTitle"),
          content: (
            <>
              <p>
                {t.rich("privacyP1", {
                  privacy: (chunks) => (
                    <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
              <p>
                {t.rich("questions", {
                  contact: () => contact,
                })}
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
