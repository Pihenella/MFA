import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ensureOrgOwner } from "../lib/helpers";

export const renameOrg = mutation({
  args: { orgId: v.id("organizations"), newName: v.string() },
  handler: async (ctx, { orgId, newName }) => {
    await ensureOrgOwner(ctx, orgId);
    const trimmed = newName.trim();
    if (trimmed.length < 1) throw new Error("Имя не может быть пустым");
    if (trimmed.length > 100) throw new Error("Имя слишком длинное");
    await ctx.db.patch(orgId, { name: trimmed });
    return { ok: true };
  },
});
