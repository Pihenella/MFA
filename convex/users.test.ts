import { describe, it, expect } from "vitest";
// Smoke-тест: проверяем что модуль грузится и экспорт current — query.
import * as users from "./users";

describe("convex/users", () => {
  it("exports `current` as a Convex query", () => {
    expect(users.current).toBeDefined();
    expect(typeof users.current).toBe("function");
  });
});
