import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { deepMergeMessages } from "@/lib/i18n/deep-merge-messages";
import {
  isPublicMarketingPath,
  pickMessageNamespaces,
  publicMessageNamespaces,
} from "@/lib/i18n/message-slices";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/locales";

const mergedLocaleCache = new Map<string, Record<string, unknown>>();

async function loadMergedMessages(locale: string): Promise<Record<string, unknown>> {
  const cached = mergedLocaleCache.get(locale);
  if (cached) return cached;

  const enMessages = (await import(`../messages/en.json`)).default as Record<string, unknown>;
  if (locale === DEFAULT_LOCALE) {
    mergedLocaleCache.set(locale, enMessages);
    return enMessages;
  }

  const localeMessages = (await import(`../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;
  const merged = deepMergeMessages(enMessages, localeMessages) as Record<string, unknown>;
  mergedLocaleCache.set(locale, merged);
  return merged;
}

export default getRequestConfig(async () => {
  const [cookieStore, hdrs] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);
  const allMessages = await loadMergedMessages(locale);
  const pathname = hdrs.get("x-pathname");

  const messages = isPublicMarketingPath(pathname)
    ? pickMessageNamespaces(allMessages, publicMessageNamespaces())
    : allMessages;

  return {
    locale,
    messages,
  };
});
