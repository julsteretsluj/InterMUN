import Link from "next/link";

export function SessionFloorNoCommittee() {
  return (
    <>
      <p className="mb-4 max-w-lg text-sm text-brand-muted">
        Join a committee with your room code first (or set a code and enter), then return here to run the session
        floor for that committee.
      </p>
      <Link href="/chair/room-code" className="inline-block font-medium text-brand-gold hover:underline">
        Go to room codes
      </Link>
    </>
  );
}
