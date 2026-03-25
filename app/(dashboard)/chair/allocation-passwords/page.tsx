import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AllocationPasswordsClient } from "./AllocationPasswordsClient";

type ProfileEmbed = { name: string | null } | null;

type AllocRow = {
  id: string;
  country: string;
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[];
};

function embedName(p: ProfileEmbed | ProfileEmbed[]): string | null {
  if (p == null) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row?.name?.trim() || null;
}

export default async function AllocationPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const { conference: conferenceParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    redirect("/profile");
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .order("created_at", { ascending: false });

  const list = conferences ?? [];
  const conferenceId =
    conferenceParam && list.some((c) => c.id === conferenceParam)
      ? conferenceParam
      : list[0]?.id;

  if (!conferenceId) {
    return (
      <MunPageShell title="Allocation passwords">
        <p className="text-sm text-brand-muted">Create a conference first.</p>
      </MunPageShell>
    );
  }

  const { data: allocData } = await supabase
    .from("allocations")
    .select("id, country, user_id, profiles(name)")
    .eq("conference_id", conferenceId)
    .order("country");

  const rows = (allocData ?? []) as AllocRow[];
  const ids = rows.map((r) => r.id);

  const { data: codeRows } = ids.length
    ? await supabase
        .from("allocation_gate_codes")
        .select("allocation_id, code")
        .in("allocation_id", ids)
    : { data: [] as { allocation_id: string; code: string | null }[] };

  const codeMap = new Map(
    (codeRows ?? []).map((c) => [c.allocation_id, c.code ?? ""])
  );

  const merged = rows.map((r) => ({
    allocationId: r.id,
    country: r.country?.trim() || "—",
    delegateName: embedName(r.profiles),
    code: codeMap.get(r.id) ?? "",
  }));

  const activeConf = list.find((c) => c.id === conferenceId);

  return (
    <MunPageShell title="Allocation passwords">
      <p className="text-sm text-brand-muted mb-4 max-w-2xl">
        Per-allocation <strong>codes</strong> for placards, binders, or handouts. Stored in
        plain text so you can copy this list—treat it like a seating chart (do not share
        publicly). The <Link href="/chair/committee-access" className="text-brand-gold underline">committee password</Link> is separate and shared by all delegates for the secondary
        sign-in.
      </p>

      {list.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/chair/allocation-passwords?conference=${c.id}`}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                c.id === conferenceId
                  ? "bg-brand-navy text-brand-paper border-brand-navy"
                  : "border-brand-navy/20 text-brand-navy hover:bg-brand-cream"
              }`}
            >
              {c.name}
              {c.committee ? ` — ${c.committee}` : ""}
            </Link>
          ))}
        </div>
      )}

      <AllocationPasswordsClient
        conferenceId={conferenceId}
        conferenceLabel={
          [activeConf?.name, activeConf?.committee].filter(Boolean).join(" — ") ||
          "Conference"
        }
        rows={merged}
      />
    </MunPageShell>
  );
}
