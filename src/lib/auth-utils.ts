export type ValidationResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  if (!email) return { ok: false, error: "Email обязателен" };
  if (email.length > 254) return { ok: false, error: "Email слишком длинный" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Некорректный email" };
  return { ok: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) return { ok: false, error: "Минимум 8 символов" };
  if (!/[0-9]/.test(password)) return { ok: false, error: "Нужна цифра" };
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password))
    return { ok: false, error: "Нужна буква" };
  return { ok: true };
}

export function generateRandomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
