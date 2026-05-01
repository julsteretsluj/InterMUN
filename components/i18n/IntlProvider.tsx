"use client";

import { NextIntlClientProvider } from "next-intl";

function humanizeI18nKey(path: string): string {
  const leaf = path.split(".").pop() ?? path;
  const spaced = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return "Missing translation";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={() => {
        // Avoid noisy UI fallbacks while locale files are being updated.
      }}
      getMessageFallback={({ namespace, key }) =>
        humanizeI18nKey(namespace ? `${namespace}.${key}` : key)
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
