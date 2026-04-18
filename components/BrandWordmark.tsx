import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";

export function BrandWordmark({ className = "" }: { className?: string }) {
  const title = getAppName();
  const sub = getAppTagline();
  return (
    <div className={`text-center ${className}`}>
      <InterMunEmblem
        alt=""
        className="mx-auto mb-4 h-20 w-20 md:h-24 md:w-24 rounded-2xl ring-1 ring-black/10 dark:ring-white/15"
      />
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
