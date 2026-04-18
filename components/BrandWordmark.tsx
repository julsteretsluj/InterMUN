import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";

export function BrandWordmark({ className = "" }: { className?: string }) {
  const title = getAppName();
  const sub = getAppTagline();
  return (
    <div className={`text-center ${className}`}>
      <div className="mb-4 flex justify-center">
        <InterMunEmblem alt="" className="h-20 w-20 rounded-2xl md:h-24 md:w-24" />
      </div>
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
