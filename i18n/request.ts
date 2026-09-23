import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { deepMergeMessages } from "@/lib/i18n/deep-merge-messages";
import {
  isPublicMarketingPath,
  omitDeferredAppNamespaces,
  pickMessageNamespaces,
  publicMessageNamespaces,
} from "@/lib/i18n/message-slices";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/locales";

const mergedLocaleCache = new Map<string, Record<string, unknown>>();

async function loadMergedMessages(locale: string): Promise<Record<string, unknown>> {
  // Dev: skip in-memory cache so edits under messages/ pick up without a full
  // process restart (Next still may need a refresh for JSON module HMR).
  const useCache = process.env.NODE_ENV === "production";
  if (useCache) {
    const cached = mergedLocaleCache.get(locale);
    if (cached) return cached;
  }

  const enMessages = (await import(`../messages/en.json`)).default as Record<string, unknown>;
  if (locale === DEFAULT_LOCALE) {
    if (useCache) mergedLocaleCache.set(locale, enMessages);
    return enMessages;
  }

  const localeMessages = (await import(`../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;
  const merged = deepMergeMessages(enMessages, localeMessages) as Record<string, unknown>;
  if (useCache) mergedLocaleCache.set(locale, merged);
  return merged;
}

export default getRequestConfig(async () => {
  const [cookieStore, hdrs] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);
  const allMessages = await loadMergedMessages(locale);
  const pathname = hdrs.get("x-pathname");

  const messages = isPublicMarketingPath(pathname)
    ? pickMessageNamespaces(allMessages, publicMessageNamespaces())
    : omitDeferredAppNamespaces(allMessages);

  return {
    locale,
    messages,
  };
});
