// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { NextIntlClientProvider } from "next-intl";
import { getIntlMessageFallback, onIntlError } from "@/lib/i18n/intl-error-handling";

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
      onError={onIntlError}
      getMessageFallback={getIntlMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
