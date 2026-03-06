"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #fecaca",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>!</div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#111827",
              marginBottom: "0.5rem",
            }}
          >
            Критическая ошибка
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}
          >
            Приложение не удалось загрузить. Попробуйте обновить страницу.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#111827",
              color: "white",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
