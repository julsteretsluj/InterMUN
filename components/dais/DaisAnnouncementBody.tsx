// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { GuideResourceList } from "@/components/guides/GuideResources";
import { guideHrefOpenProps, parseGuideResources, safeGuideHref, type GuideResource } from "@/lib/guide-resources";

const BARE_URL_RE = /(https?:\/\/[^\s<]+)/gi;

function PlainWithLinks({ text }: { text: string }) {
  const parts = text.split(BARE_URL_RE);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const href = /^https?:\/\//i.test(part) ? safeGuideHref(part.replace(/[),.;]+$/, "")) : null;
        if (!href) return <span key={i}>{part}</span>;
        const trailing = part.slice(href.length);
        const open = guideHrefOpenProps(href);
        return (
          <span key={i}>
            <a className="text-brand-diplomatic underline dark:text-brand-accent-bright" {...open}>
              {href}
            </a>
            {trailing}
          </span>
        );
      })}
    </span>
  );
}

export function DaisAnnouncementBody({
  body,
  format,
  resources,
  compact = false,
}: {
  body: string;
  format: "plain" | "markdown";
  resources?: GuideResource[] | unknown;
  compact?: boolean;
}) {
  const items = parseGuideResources(resources);
  return (
    <div className="space-y-2">
      {body.trim() ? (
        format === "markdown" ? (
          <div className="text-inherit [&_a]:text-brand-diplomatic [&_a]:underline dark:[&_a]:text-brand-accent-bright [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold">
            <GuideMarkdown body={body} />
          </div>
        ) : (
          <PlainWithLinks text={body} />
        )
      ) : null}
      <GuideResourceList resources={items} embedPdfs={!compact} compact={compact} />
    </div>
  );
}
