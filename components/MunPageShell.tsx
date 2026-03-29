export function MunPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mun-shell">
      <h2 className="mun-shell-title">{title}</h2>
      {children}
    </div>
  );
}
