export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="font-display text-3xl md:text-4xl font-semibold text-brand-navy tracking-tight">
        InterMUN
      </p>
      <p className="text-[0.65rem] sm:text-xs text-brand-muted mt-1.5 uppercase tracking-[0.28em]">
        Policies with a purpose
      </p>
    </div>
  );
}
