import { PublicPageControls } from "@/components/PublicPageControls";

export default function AllocationCodeGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicPageControls className="fixed right-4 top-4 z-30" />
      {children}
    </>
  );
}
