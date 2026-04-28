import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gold-frame/30 bg-card">
      <div className="mx-auto max-w-screen-2xl space-y-2 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>
          <span className="font-display text-foreground">Finly</span> · финансы
          селлера на маркетплейсах
        </p>
        <p>
          © 2026 · Связь с автором:{" "}
          <a
            className="text-orange-flame hover:underline"
            href="https://t.me/Virtuozick"
            target="_blank"
            rel="noopener noreferrer"
          >
            @Virtuozick
          </a>{" "}
          (Telegram)
        </p>
        <p>
          <Link className="hover:text-foreground" href="/legal/privacy">
            Политика конфиденциальности
          </Link>
          {" · "}
          <Link className="hover:text-foreground" href="/legal/terms">
            Условия использования
          </Link>
        </p>
      </div>
    </footer>
  );
}
