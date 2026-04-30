import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  generateRandomToken,
  tokensEqual,
  normalizeEmail,
  escapeHtml,
} from "./auth-utils";

describe("validateEmail", () => {
  it("принимает корректный email", () => {
    expect(validateEmail("user@example.com").ok).toBe(true);
  });
  it("отклоняет email без @", () => {
    expect(validateEmail("invalid").ok).toBe(false);
  });
  it("отклоняет пустую строку", () => {
    expect(validateEmail("").ok).toBe(false);
  });
  it("отклоняет email длиннее 254 символов", () => {
    const long = "a".repeat(251) + "@a.b";
    expect(validateEmail(long).ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("принимает >= 8 символов с буквой и цифрой", () => {
    expect(validatePassword("password1").ok).toBe(true);
  });
  it("отклоняет короче 8", () => {
    expect(validatePassword("pass1").ok).toBe(false);
  });
  it("отклоняет без цифры", () => {
    expect(validatePassword("passwordword").ok).toBe(false);
  });
  it("отклоняет без буквы", () => {
    expect(validatePassword("12345678").ok).toBe(false);
  });
});

describe("generateRandomToken", () => {
  it("генерирует 64-символьный hex (32 байта)", () => {
    const token = generateRandomToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
  it("генерирует уникальные токены", () => {
    const a = generateRandomToken(32);
    const b = generateRandomToken(32);
    expect(a).not.toBe(b);
  });
});

describe("tokensEqual (constant-time)", () => {
  it("true для равных токенов", () => {
    const t = generateRandomToken(32);
    expect(tokensEqual(t, t)).toBe(true);
  });
  it("false для разных", () => {
    expect(tokensEqual("abc", "abd")).toBe(false);
  });
  it("false для разной длины (не throw)", () => {
    expect(tokensEqual("abc", "abcd")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("приводит к lowercase и trim", () => {
    expect(normalizeEmail("  User@Example.com ")).toBe("user@example.com");
  });
});

describe("escapeHtml", () => {
  it("экранирует < > & \" '", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
  it("оставляет обычный текст как есть", () => {
    expect(escapeHtml("Юрий")).toBe("Юрий");
  });
  it("апостроф", () => {
    expect(escapeHtml("O'Brien")).toBe("O&#39;Brien");
  });
});
