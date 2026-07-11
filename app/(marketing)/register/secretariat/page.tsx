import { getTranslations } from "next-intl/server";
import { SecretariatRegistrationPageClient } from "@/components/registration/SecretariatRegistrationPageClient";
import { getAppName } from "@/lib/branding";

export default async function SecretariatRegistrationPage() {
  const appName = getAppName();

  return <SecretariatRegistrationPageClient appName={appName} />;
}
