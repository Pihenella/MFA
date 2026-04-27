import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

const HOUR_MS = 60 * 60 * 1000;

const LIMITS: Record<string, { count: number; windowMs: number }> = {
  verify: { count: 3, windowMs: HOUR_MS },
  reset: { count: 5, windowMs: HOUR_MS },
  approved: { count: 100, windowMs: HOUR_MS },
  rejected: { count: 100, windowMs: HOUR_MS },
  teamInvite: { count: 100, windowMs: HOUR_MS },
  inviteAccepted: { count: 100, windowMs: HOUR_MS },
};

export const checkAndRecord = internalMutation({
  args: {
    email: v.string(),
    kind: v.union(
      v.literal("verify"),
      v.literal("reset"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("teamInvite"),
      v.literal("inviteAccepted")
    ),
  },
  handler: async (ctx, { email, kind }) => {
    const limit = LIMITS[kind];
    const since = Date.now() - limit.windowMs;
    const recent = await ctx.db
      .query("emailSendLog")
      .withIndex("by_email_kind", (q) =>
        q.eq("email", email).eq("kind", kind)
      )
      .filter((q) => q.gte(q.field("sentAt"), since))
      .collect();

    if (recent.length >= limit.count) {
      throw new Error(
        `Rate limit exceeded: ${recent.length}/${limit.count} ${kind}-писем за ${limit.windowMs / HOUR_MS}ч`
      );
    }
    await ctx.db.insert("emailSendLog", { email, kind, sentAt: Date.now() });
  },
});
