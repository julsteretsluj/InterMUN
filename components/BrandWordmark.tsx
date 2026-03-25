import { getAppName, getAppTagline } from "@/lib/branding";

export function BrandWordmark({ className = "" }: { className?: string }) {
  const title = getAppName();
  const sub = getAppTagline();
  return (
    <div className={`text-center ${className}`}>
      <p className="font-display text-3xl md:text-4xl font-semibold text-brand-navy tracking-tight">
        {title}
      </p>
      {sub ? (
        <p className="text-[0.65rem] sm:text-xs text-brand-muted mt-1.5 uppercase tracking-[0.28em]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
