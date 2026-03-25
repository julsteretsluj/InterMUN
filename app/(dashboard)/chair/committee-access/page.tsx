import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { CommitteeAccessForm } from "./CommitteeAccessForm";

export default async function ChairCommitteeAccessPage() {
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
    .select("id, name, committee, committee_password_hash")
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title="Committee access (chair / SMT)">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        Set a <strong>committee password</strong> for a conference. Delegates must enter that
        password plus their allocation after signing in. Leave unset (remove) to disable this
        step. Passwords are stored as a hash; you cannot view the current password again.
      </p>
      <CommitteeAccessForm conferences={conferences ?? []} />
    </MunPageShell>
  );
}
