import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("unauthorized");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("unauthorized: user not found");
  return user;
}

export async function ensureApproved(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.status !== "approved") {
    throw new Error(`forbidden: status=${user.status}`);
  }
  return user;
}

export async function ensureAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await ensureApproved(ctx);
  if (!user.isSystemAdmin) throw new Error("forbidden: not admin");
  return user;
}

export async function ensureOrgMember(
  ctx: Ctx,
  orgId: Id<"organizations">
): Promise<{
  user: Doc<"users">;
  org: Doc<"organizations">;
  membership: Doc<"memberships">;
}> {
  const user = await ensureApproved(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", user._id).eq("orgId", orgId)
    )
    .unique();
  if (!membership) throw new Error("forbidden: not a member of this org");
  const org = await ctx.db.get(orgId);
  if (!org) throw new Error("not found: org");
  return { user, org, membership };
}

export async function ensureOrgOwner(
  ctx: Ctx,
  orgId: Id<"organizations">
): Promise<{
  user: Doc<"users">;
  org: Doc<"organizations">;
  membership: Doc<"memberships">;
}> {
  const result = await ensureOrgMember(ctx, orgId);
  if (result.membership.role !== "owner")
    throw new Error("forbidden: not owner");
  return result;
}

export async function ensureShopAccess(
  ctx: Ctx,
  shopId: Id<"shops">
): Promise<{
  user: Doc<"users">;
  shop: Doc<"shops">;
  membership: Doc<"memberships">;
}> {
  const user = await ensureApproved(ctx);
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new Error("not found: shop");
  if (!shop.orgId) {
    throw new Error("invalid state: shop has no orgId — миграция не выполнена");
  }
  const orgId = shop.orgId;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", user._id).eq("orgId", orgId)
    )
    .unique();
  if (!membership) throw new Error("forbidden: not a member of shop's org");
  return { user, shop, membership };
}

export async function listUserShopIds(ctx: Ctx): Promise<Id<"shops">[]> {
  const user = await ensureApproved(ctx);
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const shopIds: Id<"shops">[] = [];
  for (const m of memberships) {
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_org", (q) => q.eq("orgId", m.orgId))
      .collect();
    shopIds.push(...shops.map((s) => s._id));
  }
  return shopIds;
}
