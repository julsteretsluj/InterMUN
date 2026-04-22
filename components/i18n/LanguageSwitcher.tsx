"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/locales";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("language");
  const [pending, startTransition] = useTransition();

  function setLocale(nextLocale: AppLocale) {
    const search = searchParams.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; path=/; max-age=${oneYear}; samesite=lax`;
    startTransition(() => {
      router.replace(href);
      router.refresh();
    });
  }

  return (
    <label className={className}>
      <span className="sr-only">{t("selectorAria")}</span>
      <select
        aria-label={t("selectorAria")}
        className="rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-discord-divider dark:bg-discord-elevated dark:text-zinc-200"
        value={locale}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value as AppLocale)}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
