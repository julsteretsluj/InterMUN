import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingDocumentPage } from "@/components/marketing/MarketingDocumentPage";
import { getAppName, getPartnershipContactEmail } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.privacyPage");
  const appName = getAppName();
  return {
    title: t("metaTitle", { app: appName }),
    description: t("metaDescription", { app: appName }),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("marketing.privacyPage");
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
          title: t("collectTitle"),
          content: (
            <>
              <p>{t("collectIntro")}</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>{t("collectL1")}</li>
                <li>{t("collectL2")}</li>
                <li>{t("collectL3")}</li>
                <li>{t("collectL4")}</li>
                <li>{t("collectL5")}</li>
              </ul>
            </>
          ),
        },
        {
          title: t("useTitle"),
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>{t("useL1")}</li>
              <li>{t("useL2")}</li>
              <li>{t("useL3")}</li>
              <li>{t("useL4")}</li>
              <li>{t("useL5")}</li>
            </ul>
          ),
        },
        {
          title: t("sharingTitle"),
          content: (
            <>
              <p>{t("sharingP1")}</p>
              <p>{t("sharingP2")}</p>
            </>
          ),
        },
        {
          title: t("retentionTitle"),
          content: (
            <>
              <p>{t("retentionP1")}</p>
              <p>{t("retentionP2")}</p>
            </>
          ),
        },
        {
          title: t("rightsTitle"),
          content: (
            <>
              <p>{t("rightsP1")}</p>
              <p>{t("rightsP2")}</p>
            </>
          ),
        },
        {
          title: t("childrenTitle"),
          content: <p>{t("childrenP1")}</p>,
        },
        {
          title: t("changesTitle"),
          content: (
            <>
              <p>{t("changesP1")}</p>
              <p>
                {t.rich("contact", {
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
