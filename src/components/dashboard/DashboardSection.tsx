type Props = { title: string; children: React.ReactNode };

export function DashboardSection({ title, children }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}
