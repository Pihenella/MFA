import { query } from "../_generated/server";
import { ensureApproved } from "../lib/helpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await ensureApproved(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        if (!org) return null;
        return {
          orgId: org._id,
          name: org.name,
          role: m.role,
          ownerId: org.ownerId,
        };
      })
    );
    return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});
