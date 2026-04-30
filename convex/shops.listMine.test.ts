import { describe, it, expect } from "vitest";
import * as shops from "./shops";

describe("convex/shops listMine", () => {
  it("exports listMine as a function", () => {
    expect(typeof shops.listMine).toBe("function");
  });
});
