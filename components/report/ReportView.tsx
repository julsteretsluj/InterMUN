"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmojiQuickInsert } from "@/components/EmojiQuickInsert";

interface Report {
  id: string;
  report_type: string;
  description: string | null;
  created_at: string;
}

export function ReportView({
  reports,
  canViewAll,
  initialDescription,
}: {
  reports: Report[];
  canViewAll: boolean;
  /** Optional prefill (e.g. deep link from a member profile). */
  initialDescription?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(reports);
  const [reportType, setReportType] = useState<"ai_use" | "inappropriate_conduct">(
    "ai_use"
  );
  const [description, setDescription] = useState(initialDescription ?? "");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setItems(reports);
  }, [reports]);

  async function submitReport() {
    setMutationError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      report_type: reportType,
      description: description || null,
    });
    if (error) {
      setMutationError(error.message);
      return;
    }
    setDescription("");
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (!canViewAll) q = q.eq("user_id", user.id);
    const { data, error: listErr } = await q;
    if (listErr) {
      setMutationError(listErr.message);
      router.refresh();
      return;
    }
    if (data) setItems(data);
    router.refresh();
  }

  function appendEmoji(emoji: string) {
    setDescription((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${emoji} `);
  }

  return (
    <div className="space-y-6">
      {mutationError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}
      <div className="mun-card space-y-3">
        <h3 className="font-semibold text-brand-navy">Submit report</h3>
        <div className="space-y-3">
          <div>
            <label className="mun-label mb-2 block normal-case">Report type</label>
            <select
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value as "ai_use" | "inappropriate_conduct")
              }
              className="mun-field"
            >
              <option value="ai_use">AI use</option>
              <option value="inappropriate_conduct">
                Inappropriate conduct (as per RoP)
              </option>
            </select>
          </div>
          <div>
            <label className="mun-label mb-2 block normal-case">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident..."
              className="mun-field h-28 resize-y"
            />
            <EmojiQuickInsert onPick={appendEmoji} />
          </div>
          <button type="button" onClick={() => void submitReport()} className="mun-btn-primary">
            Submit report
          </button>
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-brand-navy">
          {canViewAll ? "All reports" : "Your reports"}
        </h3>
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="mun-card-dense">
              <span className="text-sm font-medium capitalize text-brand-navy">
                {r.report_type.replace("_", " ")}
              </span>
              {r.description && (
                <p className="mt-1 text-sm text-brand-muted">{r.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
