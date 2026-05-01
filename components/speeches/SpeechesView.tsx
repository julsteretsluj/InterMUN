"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Mic, Plus } from "lucide-react";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { EmojiQuickInsert } from "@/components/EmojiQuickInsert";

interface Speech {
  id: string;
  title: string | null;
  content: string | null;
  google_docs_url?: string | null;
}

export function SpeechesView({ speeches }: { speeches: Speech[] }) {
  const t = useTranslations("speeches");
  const tc = useTranslations("common");
  const router = useRouter();
  const [items, setItems] = useState(speeches);
  const [selectedId, setSelectedId] = useState<string | null>(speeches[0]?.id ?? null);
  const [editing, setEditing] = useState<Speech | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", google_docs_url: "" });
  const [saveError, setSaveError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setItems(speeches);
  }, [speeches]);

  const displaySelectedId =
    selectedId != null && items.some((s) => s.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null);
  const selected = items.find((s) => s.id === displaySelectedId) ?? null;

  async function saveSpeech() {
    setSaveError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const gUrl = form.google_docs_url.trim() || null;
    if (editing) {
      const { error } = await supabase
        .from("speeches")
        .update({
          title: form.title || null,
          content: form.content || null,
          google_docs_url: gUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (error) {
        setSaveError(error.message);
        return;
      }
      setSelectedId(editing.id);
    } else {
      const { data: row, error } = await supabase
        .from("speeches")
        .insert({
          user_id: user.id,
          title: form.title || null,
          content: form.content || null,
          google_docs_url: gUrl,
        })
        .select("id")
        .single();
      if (error) {
        setSaveError(error.message);
        return;
      }
      if (row?.id) setSelectedId(row.id as string);
    }
    setEditing(null);
    setShowForm(false);
    setForm({ title: "", content: "", google_docs_url: "" });
    const { data } = await supabase
      .from("speeches")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setItems(data as Speech[]);
    router.refresh();
  }

  function appendEmoji(emoji: string) {
    setForm((prev) => ({
      ...prev,
      content: `${prev.content}${prev.content.endsWith(" ") || prev.content.length === 0 ? "" : " "}${emoji} `,
    }));
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({ title: "", content: "", google_docs_url: "" });
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-95"
      >
        <Plus className="h-4 w-4" />
        {t("newSpeech")}
      </button>
      {(showForm || editing) && (
        <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("speechTitlePlaceholder")}
            className="mun-field"
          />
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="mun-label normal-case">{t("googleDocsUrl")}</label>
              <OpenNewGoogleDocButton />
            </div>
            <input
              value={form.google_docs_url}
              onChange={(e) => setForm({ ...form, google_docs_url: e.target.value })}
              className="mun-field"
              type="url"
              placeholder={t("googleDocsPlaceholder")}
            />
            <p className="mt-1 text-xs text-brand-muted">{t("googleDocsHelp")}</p>
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={t("plainTextOptional")}
            className="mun-field h-40 resize-y"
          />
          <EmojiQuickInsert onPick={appendEmoji} />
          <div className="flex flex-wrap gap-2">
            {saveError ? (
              <p className="w-full text-sm text-red-600" role="alert">
                {saveError}
              </p>
            ) : null}
            <button type="button" onClick={() => void saveSpeech()} className="mun-btn-primary">
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="mun-btn"
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">{t("noSpeechesYet")}</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 space-y-2 lg:w-56">
            <label className="text-sm font-medium text-brand-navy lg:hidden dark:text-zinc-100">
              {t("speechLabel")}
            </label>
            <select
              className="mun-field lg:hidden"
              value={displaySelectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || t("untitled")}
                </option>
              ))}
            </select>
            <div className="hidden max-h-[min(70vh,640px)] flex-col gap-1 overflow-y-auto lg:flex">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    displaySelectedId === s.id
                      ? "border-brand-accent/45 bg-brand-accent/10 font-medium text-brand-navy dark:border-brand-accent/40 dark:bg-brand-accent/15 dark:text-brand-navy"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <Mic className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{s.title || t("untitled")}</span>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="min-w-0 flex-1 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/25 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-brand-navy dark:text-zinc-100">
                  {selected.title || t("untitled")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(selected);
                    setForm({
                      title: selected.title || "",
                      content: selected.content || "",
                      google_docs_url: selected.google_docs_url?.trim() || "",
                    });
                    setShowForm(false);
                  }}
                  className="text-sm font-medium text-brand-accent hover:underline dark:text-brand-accent-bright"
                >
                  {tc("edit")}
                </button>
              </div>
              {selected.google_docs_url?.trim() ? (
                <GoogleDocsEmbed
                  googleDocsUrl={selected.google_docs_url.trim()}
                  heading={t("speechDocument")}
                  compact
                />
              ) : null}
              {selected.content?.trim() ? (
                <div>
                  {selected.google_docs_url?.trim() ? (
                    <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                      {t("draftText")}
                    </p>
                  ) : null}
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-4 font-sans text-sm dark:border-white/10 dark:bg-black/30">
                    {selected.content}
                  </pre>
                </div>
              ) : !selected.google_docs_url?.trim() ? (
                <p className="text-sm text-brand-muted">{t("noContentHint")}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
