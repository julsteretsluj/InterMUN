// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { resolveGlossaryEntries, type GlossaryContext } from "@/lib/mun-glossary";
import {
  curriculumSectionId,
  GUIDES_CURRICULUM,
  parseCurriculumHash,
  type GuideRole,
} from "@/lib/guides-curriculum";
import { cn } from "@/lib/utils";

interface Guide {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  google_docs_url?: string | null;
}

type SidebarSelection =
  | { layer: "howto"; sectionKey: string }
  | { layer: "conference"; guideId: string };

function GuideMarkdown({ body }: { body: string }) {
  return (
    <div className="prose-guide text-sm leading-relaxed text-slate-800 dark:text-zinc-200 [&_a]:text-brand-diplomatic [&_a]:underline dark:[&_a]:text-brand-accent-bright [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-brand-navy dark:[&_h2]:text-zinc-100 [&_h2:first-child]:mt-0 [&_li]:my-0.5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-white/10 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs dark:[&_pre]:bg-black/40">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

export function GuidesView({
  guides,
  canEdit,
  glossaryContext,
  role = "delegate",
}: {
  guides: Guide[];
  canEdit: boolean;
  glossaryContext?: GlossaryContext | null;
  role?: GuideRole;
}) {
  const t = useTranslations("guides");
  const glossary = useMemo(
    () =>
      resolveGlossaryEntries({
        committeeCode: glossaryContext?.committeeCode ?? null,
        committeeLabel: glossaryContext?.committeeLabel ?? null,
        topicLabels: glossaryContext?.topicLabels ?? [],
      }),
    [glossaryContext?.committeeCode, glossaryContext?.committeeLabel, glossaryContext?.topicLabels]
  );

  const curriculumKeys = GUIDES_CURRICULUM[role];
  const defaultGuides: Guide[] = useMemo(
    () => [
      {
        id: "rop",
        slug: "rop",
        title: t("default.rop.title"),
        content: t("default.rop.content"),
        google_docs_url: null,
      },
      {
        id: "examples",
        slug: "examples",
        title: t("default.examples.title"),
        content: t("default.examples.content"),
        google_docs_url: null,
      },
      {
        id: "templates",
        slug: "templates",
        title: t("default.templates.title"),
        content: t("default.templates.content"),
        google_docs_url: null,
      },
      {
        id: "chair-report",
        slug: "chair-report",
        title: t("default.chairReport.title"),
        content: t("default.chairReport.content"),
        google_docs_url: null,
      },
    ],
    [t]
  );

  const conferenceItems = guides.length > 0 ? guides : defaultGuides;

  const [activeRole, setActiveRole] = useState<GuideRole>(role);
  const [selection, setSelection] = useState<SidebarSelection>(() => ({
    layer: "howto",
    sectionKey: curriculumKeys[0] ?? "overview",
  }));
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createGoogleUrl, setCreateGoogleUrl] = useState("");
  const [conferenceList, setConferenceList] = useState<Guide[]>(conferenceItems);

  const supabase = createClient();
  const activeCurriculumKeys = GUIDES_CURRICULUM[activeRole];

  useEffect(() => {
    setActiveRole(role);
    setSelection({ layer: "howto", sectionKey: GUIDES_CURRICULUM[role][0] ?? "overview" });
  }, [role]);

  useEffect(() => {
    setConferenceList(guides.length > 0 ? guides : defaultGuides);
  }, [guides, defaultGuides]);

  useEffect(() => {
    function applyHash() {
      const parsed = parseCurriculumHash(window.location.hash);
      if (!parsed) return;
      setActiveRole(parsed.role);
      setSelection({ layer: "howto", sectionKey: parsed.sectionKey });
      const el = document.getElementById(curriculumSectionId(parsed.role, parsed.sectionKey));
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const selectedConference =
    selection.layer === "conference"
      ? conferenceList.find((g) => g.id === selection.guideId) ?? conferenceList[0] ?? null
      : null;

  const howtoTitle =
    selection.layer === "howto"
      ? t(`roles.${activeRole}.${selection.sectionKey}.title` as Parameters<typeof t>[0])
      : null;
  const howtoBody =
    selection.layer === "howto"
      ? t(`roles.${activeRole}.${selection.sectionKey}.body` as Parameters<typeof t>[0])
      : null;

  function selectHowto(sectionKey: string) {
    setSelection({ layer: "howto", sectionKey });
    setEditMode(false);
    const id = curriculumSectionId(activeRole, sectionKey);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  function selectConference(guide: Guide) {
    setSelection({ layer: "conference", guideId: guide.id });
    setEditMode(false);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-4 lg:w-52">
        <div className="space-y-2">
          <p className="px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
            {t("layers.howTo")}
          </p>
          {activeCurriculumKeys.map((sectionKey) => {
            const id = curriculumSectionId(activeRole, sectionKey);
            const active =
              selection.layer === "howto" && selection.sectionKey === sectionKey;
            return (
              <button
                key={id}
                id={id}
                type="button"
                onClick={() => selectHowto(sectionKey)}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  active
                    ? "bg-brand-accent text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15"
                )}
              >
                {t(`roles.${activeRole}.${sectionKey}.title` as Parameters<typeof t>[0])}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
            {t("layers.conference")}
          </p>
          {conferenceList.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => selectConference(g)}
              className={cn(
                "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                selection.layer === "conference" && selectedConference?.id === g.id
                  ? "bg-brand-accent text-white"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15"
              )}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {glossary.length > 0 ? (
          <section className="mb-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <h3 className="text-base font-semibold text-brand-navy dark:text-zinc-100">
              {t("glossary.title")}
            </h3>
            <p className="mt-1 text-sm text-brand-muted">{t("glossary.subtitle")}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {glossaryContext?.committeeCode?.trim() ? (
                <span className="rounded-full border border-brand-accent/35 bg-brand-accent/10 px-2 py-0.5 font-mono text-brand-navy dark:text-zinc-100">
                  {t("glossary.committeeCode", {
                    code: glossaryContext.committeeCode.trim().toUpperCase(),
                  })}
                </span>
              ) : null}
              {(glossaryContext?.topicLabels ?? []).slice(0, 2).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-slate-300/80 bg-white px-2 py-0.5 text-slate-700 dark:border-white/15 dark:bg-black/30 dark:text-zinc-200"
                >
                  {t("glossary.topicLine", { topic })}
                </span>
              ))}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {glossary.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-3 text-sm shadow-sm dark:border-white/10 dark:bg-black/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-brand-navy dark:text-zinc-100">
                      {t(`glossary.terms.${entry.id}.term` as Parameters<typeof t>[0])}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-zinc-300">
                      {t(`glossary.sources.${entry.source}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                    {t(`glossary.terms.${entry.id}.definition` as Parameters<typeof t>[0])}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selection.layer === "howto" && howtoTitle && howtoBody ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-brand-navy shadow-sm dark:border-white/10 dark:bg-black/30 dark:text-zinc-100">
            <h2 className="mb-4 text-xl font-bold">{howtoTitle}</h2>
            <GuideMarkdown body={howtoBody} />
          </div>
        ) : null}

        {selection.layer === "conference" && selectedConference ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-brand-navy shadow-sm dark:border-white/10 dark:bg-black/30 dark:text-zinc-100">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-bold">{selectedConference.title}</h2>
              {canEdit && !editMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(true);
                    setEditTitle(selectedConference.title);
                    setEditContent(selectedConference.content || "");
                    setEditGoogleUrl(selectedConference.google_docs_url?.trim() || "");
                  }}
                  className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white transition-opacity duration-200 hover:opacity-95"
                >
                  {t("edit")}
                </button>
              ) : null}
            </div>

            {!editMode ? (
              <div className="space-y-4">
                {selectedConference.google_docs_url?.trim() ? (
                  <GoogleDocsEmbed
                    googleDocsUrl={selectedConference.google_docs_url.trim()}
                    heading={t("guideDocument")}
                    compact
                  />
                ) : null}
                {selectedConference.content?.trim() ? (
                  <div>
                    {selectedConference.google_docs_url?.trim() ? (
                      <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        {t("additionalNotes")}
                      </p>
                    ) : null}
                    <GuideMarkdown body={selectedConference.content} />
                  </div>
                ) : !selectedConference.google_docs_url?.trim() ? (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">{t("noContentYet")}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mun-field"
                  placeholder={t("titlePlaceholder")}
                />
                <div>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label className="mun-label normal-case">{t("googleDocsUrl")}</label>
                    <OpenNewGoogleDocButton />
                  </div>
                  <input
                    value={editGoogleUrl}
                    onChange={(e) => setEditGoogleUrl(e.target.value)}
                    className="mun-field"
                    placeholder={t("googleDocsPlaceholder")}
                    type="url"
                  />
                  <p className="mt-1 text-xs text-brand-muted">{t("googleDocsHelp")}</p>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="mun-field h-56 resize-y"
                  placeholder={t("markdownOptional")}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("guides")
                        .update({
                          title: editTitle.trim(),
                          content: editContent,
                          google_docs_url: editGoogleUrl.trim() || null,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("slug", selectedConference.slug);
                      if (error) return;
                      const { data } = await supabase.from("guides").select("*").order("slug");
                      if (data) {
                        const nextItems =
                          (data as Guide[])?.length > 0 ? (data as Guide[]) : defaultGuides;
                        setConferenceList(nextItems);
                        const nextSelected =
                          nextItems.find((g) => g.slug === selectedConference.slug) ||
                          nextItems[0] ||
                          null;
                        if (nextSelected) {
                          setSelection({ layer: "conference", guideId: nextSelected.id });
                        }
                      }
                      setEditMode(false);
                    }}
                    className="mun-btn-primary"
                  >
                    {t("save")}
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className="mun-btn">
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {canEdit ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <h3 className="font-semibold text-brand-navy dark:text-zinc-100">{t("createNewGuide")}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder={t("slugPlaceholder")}
                className="mun-field"
              />
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder={t("titleLowerPlaceholder")}
                className="mun-field"
              />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="mun-label normal-case">{t("googleDocsUrlOptional")}</label>
                <OpenNewGoogleDocButton />
              </div>
              <input
                value={createGoogleUrl}
                onChange={(e) => setCreateGoogleUrl(e.target.value)}
                placeholder={t("googleDocsPlaceholder")}
                className="mun-field"
                type="url"
              />
            </div>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder={t("markdownContentOptional")}
              className="mun-field h-40 resize-y"
            />
            <button
              type="button"
              onClick={async () => {
                if (!createSlug.trim() || !createTitle.trim()) return;
                const { error } = await supabase.from("guides").upsert({
                  slug: createSlug.trim(),
                  title: createTitle.trim(),
                  content: createContent,
                  google_docs_url: createGoogleUrl.trim() || null,
                  updated_at: new Date().toISOString(),
                });
                if (error) return;
                const { data } = await supabase.from("guides").select("*").order("slug");
                if (data && Array.isArray(data) && data.length > 0) {
                  const nextItems = data as Guide[];
                  setConferenceList(nextItems);
                  const created =
                    nextItems.find((g) => g.slug === createSlug.trim()) || nextItems[0] || null;
                  if (created) setSelection({ layer: "conference", guideId: created.id });
                  setCreateSlug("");
                  setCreateTitle("");
                  setCreateContent("");
                  setCreateGoogleUrl("");
                }
              }}
              className="mun-btn-primary"
            >
              {t("create")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
