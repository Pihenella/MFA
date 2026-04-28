import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  ACHIEVEMENT_KINDS,
  listAll,
  markSeen,
  newSinceLastSeen,
  recordAchievementIfNew,
  recordIfNew,
} from "./achievements";

describe("convex/achievements", () => {
  it("exports public and internal functions", () => {
    expect(recordIfNew).toBeDefined();
    expect(newSinceLastSeen).toBeDefined();
    expect(markSeen).toBeDefined();
    expect(listAll).toBeDefined();
    expect(ACHIEVEMENT_KINDS).toContain("storeAnniversary");
  });

  it("recordAchievementIfNew is idempotent per (userId, kind)", async () => {
    const userId = "user_1" as Id<"users">;
    const docs: Array<{
      _id: Id<"userAchievements">;
      userId: Id<"users">;
      kind: string;
      payload?: unknown;
    }> = [];

    const ctx = {
      db: {
        query: () => ({
          withIndex: (
            _indexName: string,
            selector: (q: {
              eq: (field: string, value: unknown) => {
                eq: (field: string, value: unknown) => unknown;
              };
            }) => unknown,
          ) => {
            const filters: Record<string, unknown> = {};
            const q = {
              eq: (field: string, value: unknown) => {
                filters[field] = value;
                return q;
              },
            };
            selector(q);
            return {
              first: async () =>
                docs.find(
                  (doc) =>
                    doc.userId === filters.userId &&
                    doc.kind === filters.kind,
                ) ?? null,
            };
          },
        }),
        insert: async (
          _tableName: "userAchievements",
          row: Omit<(typeof docs)[number], "_id">,
        ) => {
          const id = `achievement_${docs.length + 1}` as Id<"userAchievements">;
          docs.push({ _id: id, ...row });
          return id;
        },
      },
    } as unknown as Pick<MutationCtx, "db">;

    const id1 = await recordAchievementIfNew(ctx, {
      userId,
      kind: "firstShop",
      payload: { shopId: "shop_1" },
    });
    const id2 = await recordAchievementIfNew(ctx, {
      userId,
      kind: "firstShop",
      payload: { shopId: "shop_1" },
    });

    expect(id1).toBeTruthy();
    expect(id2).toBeNull();
    expect(docs).toHaveLength(1);
    expect(docs[0].payload).toEqual({ shopId: "shop_1" });
  });
});
