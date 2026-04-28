import { FinlySection } from "@/components/finly/FinlySection";

type Props = { title: string; children: React.ReactNode };

export function DashboardSection({ title, children }: Props) {
  return (
    <FinlySection title={title}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </FinlySection>
  );
}
