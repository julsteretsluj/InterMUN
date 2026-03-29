import { redirect } from "next/navigation";

/** @deprecated Use `/official-links` (same content for every dashboard role). */
export default function ChairOfficialLinksRedirectPage() {
  redirect("/official-links");
}
