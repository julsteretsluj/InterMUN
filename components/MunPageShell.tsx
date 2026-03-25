export function MunPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-brand-navy mb-6">
        {title}
      </h2>
      {children}
    </div>
  );
}
