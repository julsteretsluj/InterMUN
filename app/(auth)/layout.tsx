import { BrandWordmark } from "@/components/BrandWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-transparent">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(22,163,74,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(29,185,84,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <BrandWordmark />
        {children}
      </div>
    </div>
  );
}
