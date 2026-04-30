"use client";

import { FinlyEmptyState } from "@/components/finly/FinlyEmptyState";

export default function PendingApprovalPage() {
  return (
    <FinlyEmptyState
      pose="empty-shops"
      title="Лига рассматривает заявку"
      body="Сэр-исследователь ждёт у дверей Лиги. Как только админ подтвердит вашу заявку, вы получите письмо."
    />
  );
}
