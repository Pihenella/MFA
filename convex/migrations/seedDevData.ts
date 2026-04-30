import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { DataModel, Id } from "../_generated/dataModel";
import { FunctionReference, GenericMutationCtx } from "convex/server";

const seedDayRef = "migrations/seedDevData:seedDay" as unknown as FunctionReference<
  "mutation",
  "internal",
  { shopId: Id<"shops">; daysBack: number; seed: number },
  { dateStr: string; ordersCount: number; salesCount: number; finCount: number }
>;

const SHOP_NAME = "AID WB (TEST DATA)";
const FAKE_TOKEN = "DEV_FAKE_TOKEN_DO_NOT_USE";

const SKUS = [
  { nmId: 100200001, article: "AID-001", subject: "Кружка термо", cost: 180, price: 850 },
  { nmId: 100200002, article: "AID-002", subject: "Термос 500ml", cost: 420, price: 1490 },
  { nmId: 100200003, article: "AID-003", subject: "Бутылка спорт", cost: 220, price: 990 },
  { nmId: 100200004, article: "AID-004", subject: "Контейнер ланч", cost: 150, price: 690 },
  { nmId: 100200005, article: "AID-005", subject: "Ланч-бокс XL", cost: 380, price: 1290 },
];

const TODAY = "2026-04-28";
const DAYS_BACK = 59;

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function dateStrOffset(daysBack: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

async function deleteShopData(
  ctx: { db: GenericMutationCtx<DataModel>["db"] },
  shopId: Id<"shops">
) {
  const orders = await ctx.db.query("orders").withIndex("by_shop_date", (q) => q.eq("shopId", shopId)).collect();
  for (const r of orders) await ctx.db.delete(r._id);
  const sales = await ctx.db.query("sales").withIndex("by_shop_date", (q) => q.eq("shopId", shopId)).collect();
  for (const r of sales) await ctx.db.delete(r._id);
  const financials = await ctx.db.query("financials").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of financials) await ctx.db.delete(r._id);
  const costs = await ctx.db.query("costs").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of costs) await ctx.db.delete(r._id);
  const campaigns = await ctx.db.query("campaigns").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of campaigns) await ctx.db.delete(r._id);
  const nmReports = await ctx.db.query("nmReports").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of nmReports) await ctx.db.delete(r._id);
  const stocks = await ctx.db.query("stocks").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of stocks) await ctx.db.delete(r._id);
  const syncLog = await ctx.db.query("syncLog").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect();
  for (const r of syncLog) await ctx.db.delete(r._id);
}

export const seedDevData = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const org = await ctx.db.query("organizations").first();
    if (!org) throw new Error("Нет org. Сначала запусти seedLegacyUser.");

    const allShops = await ctx.db.query("shops").collect();
    const existing = allShops.find((s) => s.name === SHOP_NAME);

    if (existing && !force) {
      throw new Error(
        `Shop "${SHOP_NAME}" уже существует. Используй force=true для пересоздания.`
      );
    }
    if (existing) {
      await deleteShopData(ctx, existing._id);
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    const shopId = await ctx.db.insert("shops", {
      orgId: org._id,
      marketplace: "wb",
      name: SHOP_NAME,
      apiKey: FAKE_TOKEN,
      isActive: false,
      lastSyncAt: now,
      enabledCategories: [],
    });

    for (const sku of SKUS) {
      await ctx.db.insert("costs", {
        shopId,
        nmId: sku.nmId,
        supplierArticle: sku.article,
        cost: sku.cost,
        updatedAt: now,
      });
    }

    const periods = [
      { start: "2026-04-01", end: "2026-04-28" },
      { start: "2026-03-01", end: "2026-03-31" },
    ];
    const random = seededRandom(42);
    for (const period of periods) {
      for (const sku of SKUS) {
        await ctx.db.insert("nmReports", {
          shopId,
          nmId: sku.nmId,
          openCardCount: 800 + Math.floor(random() * 1500),
          addToCartCount: 80 + Math.floor(random() * 200),
          ordersCount: 10 + Math.floor(random() * 30),
          buyoutsCount: 8 + Math.floor(random() * 25),
          convOpenToCart: 8 + random() * 5,
          convCartToOrder: 14 + random() * 8,
          periodStart: period.start,
          periodEnd: period.end,
          updatedAt: now,
        });
      }
    }

    const campaignsData = [
      { campaignId: 9000001, name: "AID-001 авто", spent: 12500, budget: 20000, impressions: 145000, clicks: 4200 },
      { campaignId: 9000002, name: "AID-002 поиск", spent: 8200, budget: 15000, impressions: 98000, clicks: 3100 },
    ];
    for (const c of campaignsData) {
      await ctx.db.insert("campaigns", { shopId, ...c, updatedAt: now });
    }

    for (let d = 0; d <= DAYS_BACK; d++) {
      await ctx.scheduler.runAfter(d * 80, seedDayRef, {
        shopId,
        daysBack: d,
        seed: 1000 + d,
      });
    }

    return {
      shopId,
      skus: SKUS.length,
      campaigns: campaignsData.length,
      nmReports: periods.length * SKUS.length,
      scheduledDays: DAYS_BACK + 1,
    };
  },
});

export const seedDay = internalMutation({
  args: {
    shopId: v.id("shops"),
    daysBack: v.number(),
    seed: v.number(),
  },
  handler: async (ctx, { shopId, daysBack, seed }) => {
    const dateStr = dateStrOffset(daysBack);
    const random = seededRandom(seed);

    let ordersCount = 0;
    let salesCount = 0;
    let finCount = 0;

    for (const sku of SKUS) {
      const ordersToday = Math.floor(random() * 4) + 1;
      for (let i = 0; i < ordersToday; i++) {
        const isCancel = random() < 0.08;
        await ctx.db.insert("orders", {
          shopId,
          date: dateStr,
          nmId: sku.nmId,
          supplierArticle: sku.article,
          quantity: 1,
          totalPrice: sku.price,
          priceWithDisc: Math.round(sku.price * 0.85),
          discountPercent: 15,
          warehouseName: "Электросталь",
          status: isCancel ? "cancelled" : "delivered",
          orderId: `seed-${shopId}-${dateStr}-${sku.nmId}-o${i}`,
          isCancel,
        });
        ordersCount++;
      }

      const salesToday = Math.floor(ordersToday * 0.7);
      for (let i = 0; i < salesToday; i++) {
        const isReturn = random() < 0.12;
        const sellerPrice = sku.price;
        const wbDiscPct = 0.15;
        const finalPrice = Math.round(sellerPrice * (1 - wbDiscPct));
        const forPay = Math.round(finalPrice * 0.78);
        await ctx.db.insert("sales", {
          shopId,
          date: dateStr,
          nmId: sku.nmId,
          supplierArticle: sku.article,
          quantity: 1,
          priceWithDisc: finalPrice,
          forPay,
          finishedPrice: finalPrice,
          saleID: `seed-${shopId}-${dateStr}-${sku.nmId}-s${i}`,
          isReturn,
          warehouseName: "Электросталь",
        });
        salesCount++;

        const reportId = parseInt(`${dateStr.replace(/-/g, "")}${sku.nmId % 1000}${i}`);
        await ctx.db.insert("financials", {
          shopId,
          realizationreportId: reportId,
          dateFrom: dateStr,
          dateTo: dateStr,
          rrDt: dateStr,
          saleDt: dateStr,
          supplierArticle: sku.article,
          nmId: sku.nmId,
          subject: sku.subject,
          retailAmount: finalPrice,
          retailPrice: finalPrice,
          returnAmount: isReturn ? finalPrice : 0,
          deliveryAmount: 0,
          deliveryRub: 75,
          stornoDeliveryAmount: 0,
          ppvzForPay: isReturn ? -forPay : forPay,
          ppvzSalesTotal: finalPrice,
          acceptance: 0,
          penalty: 0,
          additionalPayment: 0,
          storageAmount: 5,
          deductionAmount: 0,
          siteCountry: "RU",
          warehouseName: "Электросталь",
          realizationreportDate: dateStr,
          docTypeName: isReturn ? "Возврат" : "Продажа",
          supplierOperName: isReturn ? "Возврат" : "Продажа",
        });
        finCount++;
      }
    }

    const dailyExpenses = [
      { name: "Логистика", oper: "Логистика", deliveryRub: 320, storage: 0, penalty: 0, deduction: 0 },
      { name: "Хранение", oper: "Хранение", deliveryRub: 0, storage: 180, penalty: 0, deduction: 0 },
      { name: "Платная приёмка", oper: "Платная приёмка", deliveryRub: 0, storage: 0, penalty: 0, deduction: 90 },
    ];
    for (let i = 0; i < dailyExpenses.length; i++) {
      const e = dailyExpenses[i];
      await ctx.db.insert("financials", {
        shopId,
        realizationreportId: parseInt(`${dateStr.replace(/-/g, "")}99${i}`),
        dateFrom: dateStr,
        dateTo: dateStr,
        rrDt: dateStr,
        supplierArticle: "AID-EXP",
        nmId: 0,
        subject: e.name,
        retailAmount: 0,
        returnAmount: 0,
        deliveryAmount: 0,
        deliveryRub: e.deliveryRub,
        stornoDeliveryAmount: 0,
        ppvzForPay: 0,
        acceptance: 0,
        penalty: e.penalty,
        additionalPayment: 0,
        storageAmount: e.storage,
        deductionAmount: e.deduction,
        siteCountry: "RU",
        warehouseName: "Электросталь",
        realizationreportDate: dateStr,
        docTypeName: e.name,
        supplierOperName: e.oper,
      });
      finCount++;
    }

    return { dateStr, ordersCount, salesCount, finCount };
  },
});

export const removeDevData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allShops = await ctx.db.query("shops").collect();
    const existing = allShops.find((s) => s.name === SHOP_NAME);
    if (!existing) return { deleted: false };
    await deleteShopData(ctx, existing._id);
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
