import { redirect } from "next/navigation";

/** Milestones are delegate/chair/advisor/admin surfaces — not part of SMT ops. */
export default function SmtMilestonesPage() {
  redirect("/smt");
}
