"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { parseAllocationCsv } from "@/lib/parse-allocation-csv";
import { ensureDaisSeatAllocations } from "@/lib/ensure-dais-seat-allocations";
import { getTranslations } from "next-intl/server";

const MAX_COUNTRY_LEN = 500;
const MAX_CODE_LEN = 120;
const MAX_IMPORT_ROWS = 2000;

type AuthOk = { supabase: Awaited<ReturnType<typeof createClient>>; ok: true };
type AuthErr = { error: string; ok: false };

async function requireSmt(conferenceId: string): Promise<AuthOk | AuthErr> {
  const t = await getTranslations("serverActions.smtAllocations");
  const eventId = await getActiveEventId();
  if (!eventId) {
    return { error: t("chooseEventFirst"), ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notSignedIn"), ok: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "smt") {
    return { error: t("onlySmtManageMatrix"), ok: false };
  }

  const { data: conf } = await supabase
    .from("conferences")
    .select("id")
    .eq("id", conferenceId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!conf) {
    return { error: t("committeeNotInActiveEvent"), ok: false };
  }

  return { supabase, ok: true };
}

function revalidateAllocationPaths() {
  revalidatePath("/smt/allocation-matrix");
  revalidatePath("/smt/allocation-passwords");
}

export async function smtAddAllocationRow(formData: FormData) {
  const t = await getTranslations("serverActions.smtAllocations");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (!conferenceId || !country) {
    return { error: t("requiredCommitteeAndCountry") };
  }
  if (country.length > MAX_COUNTRY_LEN) {
    return { error: t("countryTooLong") };
  }
  if (code.length > MAX_CODE_LEN) {
    return { error: t("codeTooLong") };
  }

  const auth = await requireSmt(conferenceId);
  if (!auth.ok) return { error: auth.error };

  const { data: insertRow, error: insErr } = await auth.supabase
    .from("allocations")
    .insert({ conference_id: conferenceId, country, user_id: null })
    .select("id")
    .single();

  if (insErr || !insertRow) {
    return { error: insErr?.message ?? t("couldNotCreateAllocation") };
  }

  if (code) {
    const { error: codeErr } = await auth.supabase.from("allocation_gate_codes").upsert(
      {
        allocation_id: insertRow.id,
        code,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "allocation_id" }
    );
    if (codeErr) return { error: codeErr.message };
  }

  await ensureDaisSeatAllocations(auth.supabase, conferenceId);
  revalidateAllocationPaths();
  return { success: true as const };
}

export async function smtUpdateAllocationRow(formData: FormData) {
  const t = await getTranslations("serverActions.smtAllocations");
  const allocationId = String(formData.get("allocation_id") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (!allocationId || !country) {
    return { error: t("requiredAllocationAndCountry") };
  }
  if (country.length > MAX_COUNTRY_LEN) {
    return { error: t("countryTooLong") };
  }
  if (code.length > MAX_CODE_LEN) {
    return { error: t("codeTooLong") };
  }

  const supabase = await createClient();
  const { data: row, error: fetchErr } = await supabase
    .from("allocations")
    .select("conference_id")
    .eq("id", allocationId)
    .maybeSingle();
  if (fetchErr || !row?.conference_id) {
    return { error: fetchErr?.message ?? t("allocationNotFound") };
  }

  const auth = await requireSmt(row.conference_id);
  if (!auth.ok) return { error: auth.error };

  const { error: upErr } = await auth.supabase
    .from("allocations")
    .update({ country })
    .eq("id", allocationId);
  if (upErr) return { error: upErr.message };

  if (code) {
    const { error: codeErr } = await auth.supabase.from("allocation_gate_codes").upsert(
      {
        allocation_id: allocationId,
        code,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "allocation_id" }
    );
    if (codeErr) return { error: codeErr.message };
  } else {
    await auth.supabase.from("allocation_gate_codes").delete().eq("allocation_id", allocationId);
  }

  revalidateAllocationPaths();
  return { success: true as const };
}

export async function smtDeleteAllocationRow(allocationId: string) {
  const t = await getTranslations("serverActions.smtAllocations");
  const id = allocationId.trim();
  if (!id) return { error: t("missingAllocation") };

  const supabase = await createClient();
  const { data: row, error: fetchErr } = await supabase
    .from("allocations")
    .select("conference_id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !row?.conference_id) {
    return { error: fetchErr?.message ?? t("allocationNotFound") };
  }
  if (row.user_id) {
    return {
      error: t("seatLinkedToDelegate"),
    };
  }

  const auth = await requireSmt(row.conference_id);
  if (!auth.ok) return { error: auth.error };

  const { error: delErr } = await auth.supabase.from("allocations").delete().eq("id", id);
  if (delErr) return { error: delErr.message };

  revalidateAllocationPaths();
  return { success: true as const };
}

export async function smtImportAllocationsCsv(formData: FormData) {
  const t = await getTranslations("serverActions.smtAllocations");
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const csvText = String(formData.get("csv_text") ?? "");
  const mode = String(formData.get("mode") ?? "append").trim();

  if (!conferenceId) return { error: t("selectCommittee") };

  const auth = await requireSmt(conferenceId);
  if (!auth.ok) return { error: auth.error };

  let rows: ReturnType<typeof parseAllocationCsv>;
  try {
    rows = parseAllocationCsv(csvText);
  } catch {
    return { error: t("couldNotParseCsv") };
  }

  if (rows.length === 0) {
    return { error: t("noDataRowsFound") };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { error: t("importLimitedRows", { max: MAX_IMPORT_ROWS }) };
  }
  for (const r of rows) {
    if (r.country.length > MAX_COUNTRY_LEN) {
      return { error: t("rowTooLong", { row: r.country.slice(0, 40) }) };
    }
    if (r.code && r.code.length > MAX_CODE_LEN) {
      return { error: t("codeTooLongOnRow", { row: r.country }) };
    }
  }

  if (mode === "replace_unassigned") {
    const { data: toRemove, error: listErr } = await auth.supabase
      .from("allocations")
      .select("id")
      .eq("conference_id", conferenceId)
      .is("user_id", null);

    if (listErr) return { error: listErr.message };
    const ids = (toRemove ?? []).map((r) => r.id);
    if (ids.length) {
      await auth.supabase.from("allocation_gate_codes").delete().in("allocation_id", ids);
      const { error: delErr } = await auth.supabase.from("allocations").delete().in("id", ids);
      if (delErr) return { error: delErr.message };
    }
  }

  let inserted = 0;
  let skippedDup = 0;

  const { data: existingAfter } = await auth.supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId);

  const existingLower = new Set(
    (existingAfter ?? []).map((e) => e.country.trim().toLowerCase())
  );

  const seenInCsv = new Set<string>();
  const deduped: typeof rows = [];
  for (const r of rows) {
    const k = r.country.trim().toLowerCase();
    if (seenInCsv.has(k)) continue;
    seenInCsv.add(k);
    deduped.push(r);
  }

  for (const r of deduped) {
    const key = r.country.trim().toLowerCase();
    if (existingLower.has(key)) {
      skippedDup += 1;
      continue;
    }
    existingLower.add(key);

    const { data: ins, error: insErr } = await auth.supabase
      .from("allocations")
      .insert({ conference_id: conferenceId, country: r.country.trim(), user_id: null })
      .select("id")
      .single();

    if (insErr) {
      return { error: insErr.message, inserted, skippedDup };
    }
    inserted += 1;

    if (r.code) {
      const { error: codeErr } = await auth.supabase.from("allocation_gate_codes").upsert(
        {
          allocation_id: ins.id,
          code: r.code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "allocation_id" }
      );
      if (codeErr) {
        return { error: codeErr.message, inserted, skippedDup };
      }
    }
  }

  await ensureDaisSeatAllocations(auth.supabase, conferenceId);
  revalidateAllocationPaths();
  return {
    success: true as const,
    inserted,
    skippedDup,
    replaceMode: mode === "replace_unassigned",
  };
}
