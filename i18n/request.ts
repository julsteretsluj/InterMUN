import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { deepMergeMessages } from "@/lib/i18n/deep-merge-messages";
import { getIntlMessageFallback, onIntlError } from "@/lib/i18n/intl-error-handling";
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

/**
 * Server components get the full merged catalog: shared server UI (e.g.
 * `AppleGateLayout` on a 404 under /chair) must resolve any namespace on any
 * route. Only the client payload is sliced, via `clientMessagesForPath`.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);

  return {
    locale,
    messages: await loadMergedMessages(locale),
    onError: onIntlError,
    getMessageFallback: getIntlMessageFallback,
  };
});
