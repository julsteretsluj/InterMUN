"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { resolveGlossaryEntries, type GlossaryContext } from "@/lib/mun-glossary";

interface Guide {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  google_docs_url?: string | null;
}

export function GuidesView({
  guides,
  canEdit,
  glossaryContext,
}: {
  guides: Guide[];
  canEdit: boolean;
  glossaryContext?: GlossaryContext | null;
}) {
  const t = useTranslations("views.guides");
  const glossary = useMemo(
    () =>
      resolveGlossaryEntries({
        committeeCode: glossaryContext?.committeeCode ?? null,
        committeeLabel: glossaryContext?.committeeLabel ?? null,
        topicLabels: glossaryContext?.topicLabels ?? [],
      }),
    [glossaryContext?.committeeCode, glossaryContext?.committeeLabel, glossaryContext?.topicLabels]
  );
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

  const items = guides.length > 0 ? guides : defaultGuides;
  const [selected, setSelected] = useState<Guide | null>(items[0] || null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createGoogleUrl, setCreateGoogleUrl] = useState("");

  const supabase = createClient();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-2 lg:w-48">
        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelected(g)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              selected?.id === g.id
                ? "bg-brand-accent text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {glossary.length > 0 ? (
          <section className="mb-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <h3 className="text-base font-semibold text-brand-navy dark:text-zinc-100">{t("glossary.title")}</h3>
            <p className="mt-1 text-sm text-brand-muted">{t("glossary.subtitle")}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {glossaryContext?.committeeCode?.trim() ? (
                <span className="rounded-full border border-brand-accent/35 bg-brand-accent/10 px-2 py-0.5 font-mono text-brand-navy dark:text-zinc-100">
                  {t("glossary.committeeCode", { code: glossaryContext.committeeCode.trim().toUpperCase() })}
                </span>
              ) : null}
              {(glossaryContext?.topicLabels ?? []).slice(0, 2).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-slate-300/80 bg-white px-2 py-0.5 text-slate-700 dark:border-white/15 dark:bg-black/30 dark:text-zinc-200"
                >
                  {t("glossary.topicTag", { topic })}
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
                      {t(`glossary.terms.${entry.id}.term`)}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-zinc-300">
                      {t(`glossary.sources.${entry.source}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                    {t(`glossary.terms.${entry.id}.definition`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selected && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-brand-navy shadow-sm dark:border-white/10 dark:bg-black/30 dark:text-zinc-100">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-bold">{selected.title}</h2>
              {canEdit && !editMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(true);
                    setEditTitle(selected.title);
                    setEditContent(selected.content || "");
                    setEditGoogleUrl(selected.google_docs_url?.trim() || "");
                  }}
                  className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white transition-opacity duration-200 hover:opacity-95"
                >
                  {t("edit")}
                </button>
              ) : null}
            </div>

            {!editMode ? (
              <div className="space-y-4">
                {selected.google_docs_url?.trim() ? (
                  <GoogleDocsEmbed
                    googleDocsUrl={selected.google_docs_url.trim()}
                    heading={t("guideDocument")}
                    compact
                  />
                ) : null}
                {selected.content?.trim() ? (
                  <div>
                    {selected.google_docs_url?.trim() ? (
                      <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        {t("additionalNotes")}
                      </p>
                    ) : null}
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-zinc-200">
                      {selected.content}
                    </pre>
                  </div>
                ) : !selected.google_docs_url?.trim() ? (
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
                        .eq("slug", selected.slug);
                      if (error) return;
                      const { data } = await supabase.from("guides").select("*").order("slug");
                      if (data) {
                        const nextItems =
                          (data as Guide[])?.length > 0 ? (data as Guide[]) : defaultGuides;
                        const nextSelected =
                          nextItems.find((g) => g.slug === selected.slug) || nextItems[0] || null;
                        setSelected(nextSelected);
                      }
                      setEditMode(false);
                    }}
                    className="mun-btn-primary"
                  >
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="mun-btn"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canEdit && (
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
                  setSelected(
                    nextItems.find((g) => g.slug === createSlug.trim()) || nextItems[0] || null
                  );
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
        )}
      </div>
    </div>
  );
}
