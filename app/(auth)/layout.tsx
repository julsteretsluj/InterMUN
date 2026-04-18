import { BrandWordmark } from "@/components/BrandWordmark";
import { ThemeSelector } from "@/components/ThemeSelector";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-transparent">
      <div className="theme-page-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-3xl space-y-8 px-2 sm:px-4 md:space-y-10">
        <div className="flex justify-end">
          <ThemeSelector />
        </div>
        <BrandWordmark size="hero" />
        {children}
      </div>
    </div>
  );
}
