// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { guideHrefOpenProps, isGuideFileUrl, isGuidePdfUrl, safeGuideHref } from "@/lib/guide-resources";
import { cn } from "@/lib/utils";

function childText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(childText).join("");
  return "";
}

export function GuideMarkdown({ body }: { body: string }) {
  return (
    <div className="prose-guide text-sm leading-relaxed text-brand-navy dark:text-zinc-200 [&_a]:text-brand-diplomatic [&_a]:underline dark:[&_a]:text-brand-accent-bright [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-brand-navy dark:[&_h2]:text-zinc-100 [&_h2:first-child]:mt-0 [&_li]:my-0.5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-[var(--apple-bg-tertiary)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-white/10 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--apple-bg-tertiary)] [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs dark:[&_pre]:bg-black/40">
      <ReactMarkdown
        components={{
          a: ({ href, title, children }) => {
            const url = safeGuideHref(href);
            if (!url) return <span>{children}</span>;
            const label = childText(children).replace(/^button:\s*/i, "").trim() || url;
            const asButton =
              title?.toLowerCase() === "button" ||
              title?.toLowerCase() === "btn" ||
              /^button:\s*/i.test(childText(children));
            const asFile = isGuideFileUrl(url);
            const open = guideHrefOpenProps(url);
            if (asButton) {
              return (
                <a
                  {...open}
                  className="mun-btn-primary mb-2 mr-2 inline-flex no-underline"
                >
                  {label}
                </a>
              );
            }
            return (
              <a
                {...open}
                download={asFile && open.target === "_blank" ? true : undefined}
                className={cn(asFile && "font-medium")}
              >
                {label}
              </a>
            );
          },
        }}
      >
        {autolinkBareUrls(body)}
      </ReactMarkdown>
    </div>
  );
}

export function autolinkBareUrls(markdown: string): string {
  return markdown.replace(
    /(^|[\s(])(https?:\/\/[^\s)<]+)/gm,
    (full, prefix: string, raw: string, offset: number, source: string) => {
      const before = source.slice(Math.max(0, offset - 1), offset + prefix.length);
      if (before.includes("](")) return full;
      return `${prefix}[${raw}](${raw})`;
    }
  );
}

export function GuidePdfEmbed({ url, title }: { url: string; title: string }) {
  if (!isGuidePdfUrl(url)) return null;
  return (
    <iframe
      src={url}
      title={title}
      className="h-[min(32rem,70vh)] w-full rounded-xl border border-[var(--hairline)] bg-white dark:border-white/10"
    />
  );
}
