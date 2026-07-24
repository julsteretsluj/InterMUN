// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { StanceHeatmap } from "@/components/stances/StanceHeatmap";
import { MarketingDelegateResolutionBuilderPanel } from "@/components/marketing/MarketingDelegateResolutionBuilderPanel";
import { cn } from "@/lib/utils";
import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW, SESSION_FLOOR_LABEL } from "./marketing-preview-styles";

type PrepTab = "documents" | "resolutions" | "speeches" | "stances";

const PREP_TABS: PrepTab[] = ["documents", "resolutions", "speeches", "stances"];

export function MarketingDelegatePrepWorkspacePanel({
  className,
  compactIntro = false,
}: {
  className?: string;
  compactIntro?: boolean;
}) {
  const tPrep = useTranslations("marketing.preview");
  const [tab, setTab] = useState<PrepTab>("documents");

  return (
    <section className={cn("space-y-3", className)}>
      {!compactIntro ? (
        <div className={MARKETING_CHAMBER_PREVIEW}>
          <h3 className="font-display text-lg font-semibold text-brand-navy">{tPrep("prepWorkspaceTitle")}</h3>
          <p className="mt-1 text-sm text-brand-muted">{tPrep("prepWorkspaceHint")}</p>
        </div>
      ) : null}

      <div className={cn(MARKETING_SESSION_SURFACE, "space-y-4")}>
        <div
          className="flex flex-wrap gap-2 border-b border-[var(--hairline)] pb-3"
          role="tablist"
          aria-label={tPrep("prepWorkspaceTitle")}
        >
          {PREP_TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                tab === key
                  ? "border-brand-accent/45 bg-brand-accent/12 text-brand-navy"
                  : "border-brand-navy/15 bg-white text-brand-muted hover:border-brand-accent/30"
              )}
            >
              {tPrep(`prepTile.${key}`)}
            </button>
          ))}
        </div>

        {tab === "documents" ? <DocumentsWorkspace /> : null}
        {tab === "resolutions" ? <MarketingDelegateResolutionBuilderPanel /> : null}
        {tab === "speeches" ? <SpeechesWorkspace /> : null}
        {tab === "stances" ? <StancesWorkspace /> : null}
      </div>
    </section>
  );
}

function DocumentsWorkspace() {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [showForm, setShowForm] = useState(true);
  const [saved, setSaved] = useState<{ id: string; title: string }[]>([
    { id: "pp-draft", title: "Position paper — climate finance" },
  ]);
  const [form, setForm] = useState({
    doc_type: "prep_doc" as const,
    title: "",
    content: "",
    google_docs_url: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  const save = () => {
    const title = form.title.trim() || t("titlePlaceholder");
    if (!form.content.trim() && !form.google_docs_url.trim()) {
      setStatus(t("alertNeedContentOrUrl"));
      return;
    }
    setSaved((prev) => [{ id: `doc-${Date.now()}`, title }, ...prev]);
    setForm({ doc_type: "prep_doc", title: "", content: "", google_docs_url: "" });
    setShowForm(false);
      setStatus(tc("saved"));
  };

  return (
    <div className="space-y-4" role="tabpanel">
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("addDocument")}
      </button>

      {showForm ? (
        <div className="mun-card space-y-3 border-slate-200">
          <h3 className="font-display font-semibold text-brand-navy">{t("newDocumentTitle")}</h3>
          <div className="space-y-3">
            <div>
              <label className="mun-label mb-1 block normal-case">{t("typeLabel")}</label>
              <select
                value={form.doc_type}
                onChange={(e) => setForm({ ...form, doc_type: e.target.value as "prep_doc" })}
                className="mun-field"
              >
                <option value="prep_doc">{t("types.prep_doc")}</option>
              </select>
              <p className="mt-1 text-xs text-brand-muted">{t("delegatePositionPaperNote")}</p>
            </div>
            <div>
              <label className="mun-label mb-1 block normal-case">{t("titleLabel")}</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mun-field"
                placeholder={t("titlePlaceholder")}
              />
            </div>
            <div>
              <label className="mun-label mb-1 block normal-case">{t("googleDocsUrl")}</label>
              <input
                value={form.google_docs_url}
                onChange={(e) => setForm({ ...form, google_docs_url: e.target.value })}
                className="mun-field"
                type="url"
                placeholder={t("googleDocsPlaceholder")}
              />
            </div>
            <div>
              <label className="mun-label mb-1 block normal-case">{t("plainTextOptional")}</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mun-field h-32 resize-y"
                placeholder={t("plainTextPlaceholder")}
              />
            </div>
            {status ? (
              <p className="text-sm text-brand-muted" role="status">
                {status}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={save} className="mun-btn-primary">
                {tc("save")}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="mun-btn">
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saved.length > 0 ? (
        <ul className="space-y-2">
          <p className={SESSION_FLOOR_LABEL}>{t("tabs.library")}</p>
          {saved.map((doc) => (
            <li
              key={doc.id}
              className="rounded-lg border border-brand-navy/10 bg-white px-3 py-2 text-sm font-medium text-brand-navy"
            >
              {doc.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SpeechesWorkspace() {
  const t = useTranslations("speeches");
  const tc = useTranslations("common");
  const [showForm, setShowForm] = useState(true);
  const [items, setItems] = useState<{ id: string; title: string }[]>([
    { id: "gsl-1", title: "GSL — climate adaptation" },
  ]);
  const [form, setForm] = useState({ title: "", content: "", google_docs_url: "" });
  const [status, setStatus] = useState<string | null>(null);

  const save = () => {
    const title = form.title.trim() || t("untitled");
    setItems((prev) => [{ id: `speech-${Date.now()}`, title }, ...prev]);
    setForm({ title: "", content: "", google_docs_url: "" });
    setShowForm(false);
    setStatus(tc("saved"));
  };

  return (
    <div className="space-y-4" role="tabpanel">
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("newSpeech")}
      </button>

      {showForm ? (
        <div className="mun-card space-y-3 border-slate-200">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("speechTitlePlaceholder")}
            className="mun-field"
          />
          <div>
            <label className="mun-label mb-1 block normal-case">{t("googleDocsUrl")}</label>
            <input
              value={form.google_docs_url}
              onChange={(e) => setForm({ ...form, google_docs_url: e.target.value })}
              className="mun-field"
              type="url"
              placeholder={t("googleDocsPlaceholder")}
            />
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={t("plainTextOptional")}
            className="mun-field h-32 resize-y"
          />
          {status ? (
            <p className="text-sm text-brand-diplomatic" role="status">
              {status}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} className="mun-btn-primary">
              {t("save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="mun-btn">
              {tc("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-2">
        {items.map((speech) => (
          <li
            key={speech.id}
            className="rounded-lg border border-brand-navy/10 bg-white px-3 py-2 text-sm font-medium text-brand-navy"
          >
            {speech.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StancesWorkspace() {
  const t = useTranslations("stances");
  const tc = useTranslations("common");
  const [stanceData, setStanceData] = useState<Record<string, number>>({
    "Climate finance": 4,
    "Tech transfer": 3,
  });
  const [stanceForm, setStanceForm] = useState({ topic: "", extent: 5 });
  const [noteContent, setNoteContent] = useState(
    "Support binding targets with flexible implementation timelines for developing states."
  );
  const [status, setStatus] = useState<string | null>(null);

  const addStance = () => {
    const topic = stanceForm.topic.trim();
    if (!topic) return;
    setStanceData((prev) => ({ ...prev, [topic]: stanceForm.extent }));
    setStanceForm({ topic: "", extent: 5 });
  };

  const saveNote = () => {
    setStatus(tc("saved"));
  };

  return (
    <div className="space-y-6" role="tabpanel">
      <div>
        <h3 className="mb-2 font-semibold text-brand-navy">{t("heatmapTitle")}</h3>
        <p className="mb-3 text-sm text-brand-muted">{t("heatmapHelp")}</p>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <input
            type="text"
            value={stanceForm.topic}
            onChange={(e) => setStanceForm({ ...stanceForm, topic: e.target.value })}
            placeholder={t("topicPlaceholder")}
            className="mun-field w-48 min-w-0"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-brand-navy">{t("extentLabel")}</label>
            <input
              type="range"
              min={1}
              max={5}
              value={stanceForm.extent}
              onChange={(e) => setStanceForm({ ...stanceForm, extent: +e.target.value })}
              className="w-24"
            />
            <span className="text-sm tabular-nums text-brand-muted">{stanceForm.extent}</span>
          </div>
          <button
            type="button"
            onClick={addStance}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("add")}
          </button>
        </div>
        <StanceHeatmap data={stanceData} />
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-brand-navy">{t("notesPerAllocation")}</h3>
        <p className="mb-2 text-sm font-medium text-brand-navy">Kenya</p>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          className="mun-field h-32 resize-y"
          placeholder={t("notesPlaceholder")}
        />
        {status ? (
          <p className="mt-2 text-sm text-brand-diplomatic" role="status">
            {status}
          </p>
        ) : null}
        <button type="button" onClick={saveNote} className="mun-btn-primary mt-2">
          {tc("save")}
        </button>
      </div>
    </div>
  );
}
