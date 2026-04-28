import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function NotFound() {
  return (
    <FinlyEmptyState
      pose="not-found"
      title="Карта потеряна"
      body="Этой страницы здесь нет. Сэр-исследователь развернул карту вверх ногами."
      cta={{ label: "Вернуться на дашборд", href: "/" }}
    />
  );
}
