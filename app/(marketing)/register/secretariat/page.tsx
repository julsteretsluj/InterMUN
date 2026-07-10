import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SecretariatRegistrationWizard } from "@/components/registration/SecretariatRegistrationWizard";

export default async function SecretariatRegistrationPage() {
  const t = await getTranslations("secretariatRegistration");

  return (
    <div className="mun-marketing-surface min-h-[calc(100vh-4rem)] py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <p className="mun-marketing-eyebrow">{t("eyebrow")}</p>
        <h1 className="mun-display mt-3 text-3xl text-brand-navy md:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-base leading-relaxed text-brand-muted">{t("subtitle")}</p>
        <p className="mt-2 text-sm text-brand-muted">
          {t("alreadyAccount")}{" "}
          <Link href="/signup" className="font-semibold text-brand-accent hover:underline">
            {t("alreadyAccountLink")}
          </Link>
        </p>
        <SecretariatRegistrationWizard className="mt-8" />
      </div>
    </div>
  );
}
