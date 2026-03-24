"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Report {
  id: string;
  report_type: string;
  description: string | null;
  created_at: string;
}

export function ReportView({ reports }: { reports: Report[] }) {
  const [items, setItems] = useState(reports);
  const [reportType, setReportType] = useState<"ai_use" | "inappropriate_conduct">(
    "ai_use"
  );
  const [description, setDescription] = useState("");
  const supabase = createClient();

  async function submitReport() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("reports").insert({
      user_id: user.id,
      report_type: reportType,
      description: description || null,
    });
    setDescription("");
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  }

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg dark:border-slate-700">
        <h3 className="font-semibold mb-3">Submit Report</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Report type</label>
            <select
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value as "ai_use" | "inappropriate_conduct")
              }
              className="w-full px-3 py-2 border rounded dark:bg-slate-700"
            >
              <option value="ai_use">AI use</option>
              <option value="inappropriate_conduct">
                Inappropriate conduct (as per RoP)
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident..."
              className="w-full h-24 px-3 py-2 border rounded dark:bg-slate-700"
            />
          </div>
          <button
            onClick={submitReport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit Report
          </button>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3">Your Reports</h3>
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="p-3 border rounded dark:border-slate-700"
            >
              <span className="text-sm font-medium capitalize">
                {r.report_type.replace("_", " ")}
              </span>
              {r.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {r.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
