import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    // Don't expose internal/Convex Auth fields outwards
    return {
      _id: user._id,
      email: user.email ?? "",
      name: user.name ?? "",
      phone: user.phone ?? "",
      businessName: user.businessName ?? "",
      shopsCountWB: user.shopsCountWB ?? 0,
      shopsCountOzon: user.shopsCountOzon ?? 0,
      skuCount: user.skuCount ?? 0,
      status: user.status ?? "pending",
      isSystemAdmin: user.isSystemAdmin ?? false,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      createdAt: user.createdAt ?? 0,
    };
  },
});
