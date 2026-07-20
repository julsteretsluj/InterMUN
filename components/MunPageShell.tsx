// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { GlassPanel } from "@/components/ui/GlassPanel";

export function MunPageShell({
  title,
  children,
  titleAside,
}: {
  title: string;
  children: React.ReactNode;
  /** Optional actions / guide link beside the page title. */
  titleAside?: React.ReactNode;
}) {
  return (
    <GlassPanel className="space-y-4" material="regular" interactive={false}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="mun-apple-text mun-apple-text-title-2-emphasized !mb-0">{title}</h2>
        {titleAside ? <div className="shrink-0">{titleAside}</div> : null}
      </div>
      {children}
    </GlassPanel>
  );
}
