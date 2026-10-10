// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { getLocale, getMessages } from "next-intl/server";
import { IntlProvider } from "@/components/i18n/IntlProvider";
import { omitDeferredAppNamespaces } from "@/lib/i18n/message-slices";

/**
 * Re-provides locale messages for authenticated app shells.
 *
 * Root `app/layout.tsx` keeps a persistent NextIntlClientProvider. Public routes
 * intentionally hydrate a sliced catalog (see `lib/i18n/message-slices.ts`). After
 * login, `router.push` into /chair (etc.) can keep that sliced catalog because the
 * root layout does not remount — missing namespaces then render as humanized keys
 * (e.g. "title", "begin button"). Nested providers on app layouts override with
 * the full app catalog for the current pathname.
 */
export async function AppMessagesProvider({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <IntlProvider locale={locale} messages={omitDeferredAppNamespaces(messages)}>
      {children}
    </IntlProvider>
  );
}
