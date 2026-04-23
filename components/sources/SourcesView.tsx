"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, Link2, Plus } from "lucide-react";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { isGoogleDocsDocumentUrl } from "@/lib/google-docs-embed";

interface Source {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
}

export function SourcesView({
  sources,
  currentUserId,
  canEditAll,
}: {
  sources: Source[];
  currentUserId: string;
  canEditAll: boolean;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("views.sources");
  const router = useRouter();
  const [items, setItems] = useState(sources);
  const [selectedId, setSelectedId] = useState<string | null>(() => sources[0]?.id ?? null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const supabase = createClient();

  useEffect(() => {
    setItems(sources);
  }, [sources]);

  const displaySelectedId =
    selectedId != null && items.some((s) => s.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null);
  const selected = items.find((s) => s.id === displaySelectedId) ?? null;

  async function refreshSources() {
    if (canEditAll) {
      const { data } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setItems(data as Source[]);
      return;
    }

    const { data: follows } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", currentUserId);

    const followedIds = (follows ?? []).map((f) => f.followed_id as string);
    const ids = [currentUserId, ...followedIds];

    const { data } = await supabase
      .from("sources")
      .select("*")
      .in("user_id", ids.length > 0 ? ids : [currentUserId])
      .order("created_at", { ascending: false });

    if (data) setItems(data as Source[]);
  }

  async function addSource() {
    setMutationError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !url.trim()) return;
    const { data: row, error } = await supabase
      .from("sources")
      .insert({
        user_id: user.id,
        url: url.trim(),
        title: title.trim() || null,
      })
      .select("id")
      .single();
    if (error) {
      setMutationError(error.message);
      return;
    }
    setUrl("");
    setTitle("");
    setShowForm(false);
    await refreshSources();
    if (row?.id) setSelectedId(row.id as string);
    router.refresh();
  }

  async function saveEdit() {
    setMutationError(null);
    if (!editing) return;
    if (!canEditAll && editing.user_id !== currentUserId) return;
    if (!editUrl.trim()) return;

    const { error } = await supabase
      .from("sources")
      .update({
        url: editUrl.trim(),
        title: editTitle.trim() || null,
      })
      .eq("id", editing.id);

    if (error) {
      setMutationError(error.message);
      return;
    }

    setEditing(null);
    setEditUrl("");
    setEditTitle("");
    await refreshSources();
    router.refresh();
  }

  async function deleteSource(id: string) {
    setMutationError(null);
    if (!canEditAll) {
      const src = items.find((s) => s.id === id);
      if (!src || src.user_id !== currentUserId) return;
    }
    const { error } = await supabase.from("sources").delete().eq("id", id);
    if (error) {
      setMutationError(error.message);
      return;
    }
    await refreshSources();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {mutationError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100" role="alert">
          {mutationError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-95"
      >
        <Plus className="h-4 w-4" />
        {t("addSource")}
      </button>
      {showForm && (
        <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-brand-navy dark:text-zinc-100">{t("sourceUrl")}</span>
            <OpenNewGoogleDocButton />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("urlPlaceholder")}
            className="mun-field"
          />
          <p className="text-xs text-brand-muted">{t("urlHelp")}</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titleOptional")}
            className="mun-field"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void addSource()} className="mun-btn-primary">
              {tc("save")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="mun-btn">
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
          <h3 className="font-semibold text-brand-navy dark:text-zinc-100">{t("editSource")}</h3>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-brand-navy dark:text-zinc-100">{tc("url")}</span>
            <OpenNewGoogleDocButton />
          </div>
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            className="mun-field"
            placeholder={t("urlPlaceholderShort")}
          />
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="mun-field"
            placeholder={t("titleOptional")}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveEdit()} className="mun-btn-primary">
              {t("saveChanges")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setEditUrl("");
                setEditTitle("");
              }}
              className="mun-btn"
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 space-y-2 lg:w-56">
            <label className="text-sm font-medium text-brand-navy lg:hidden dark:text-zinc-100">{t("sourceLabel")}</label>
            <select
              className="mun-field lg:hidden"
              value={displaySelectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || s.url}
                </option>
              ))}
            </select>
            <div className="hidden max-h-[min(70vh,640px)] flex-col gap-1 overflow-y-auto lg:flex">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    displaySelectedId === s.id
                      ? "border-brand-accent/45 bg-brand-accent/10 font-medium text-brand-navy dark:border-brand-accent/40 dark:bg-brand-accent/15 dark:text-brand-navy"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <Link2 className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{s.title || s.url}</span>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline dark:text-brand-accent-bright"
                >
                  {selected.title || t("openLink")}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                {(canEditAll || selected.user_id === currentUserId) && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(selected);
                        setEditUrl(selected.url);
                        setEditTitle(selected.title || "");
                      }}
                      className="text-sm text-brand-accent hover:underline dark:text-brand-accent-bright"
                    >
                      {tc("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSource(selected.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      {tc("delete")}
                    </button>
                  </div>
                )}
              </div>
              {isGoogleDocsDocumentUrl(selected.url) ? (
                <GoogleDocsEmbed googleDocsUrl={selected.url.trim()} heading={t("embedHeading")} compact />
              ) : (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-100/90">
                  {t("notGoogleDoc")}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
