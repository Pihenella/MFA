import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Welcome({ userName }: { userName: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
      <h1 className="text-3xl font-bold">👋 Добро пожаловать, {userName}!</h1>
      <p className="text-gray-600">
        Чтобы начать работу, добавьте магазин — Wildberries или Ozon.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/settings?marketplace=wb">
          <Button>🟣 Добавить магазин Wildberries</Button>
        </Link>
        <Link href="/settings?marketplace=ozon">
          <Button variant="outline">🔵 Добавить магазин Ozon</Button>
        </Link>
      </div>
      <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 text-left">
        <strong>Что вам понадобится:</strong>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>API-ключ WB (создаётся в ЛК WB → Настройки → Доступ к API)</li>
          <li>Client ID + API-ключ Ozon (создаётся в ЛК Ozon Seller → Настройки → API)</li>
        </ul>
      </div>
    </div>
  );
}
