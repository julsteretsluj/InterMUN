import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { deepMergeMessages } from "@/lib/i18n/deep-merge-messages";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);
  const enMessages = (await import(`../messages/en.json`)).default as Record<string, unknown>;
  const localeMessages = (await import(`../messages/${locale}.json`)).default as Record<string, unknown>;
  const messages =
    locale === DEFAULT_LOCALE
      ? enMessages
      : (deepMergeMessages(enMessages, localeMessages) as typeof enMessages);
  return {
    locale,
    messages,
  };
});
