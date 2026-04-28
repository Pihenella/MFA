"use client";

import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function RejectedPage() {
  return (
    <FinlyEmptyState
      pose="not-found"
      title="Заявка отклонена"
      body="Не вышло. Свяжитесь с админом, если считаете это ошибкой."
      cta={{ label: "Связаться с админом", href: "https://t.me/Virtuozick" }}
    />
  );
}
