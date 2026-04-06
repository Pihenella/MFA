import { query } from "./_generated/server";
import { v } from "convex/values";

const GROUP_BY = v.union(
  v.literal("article"),
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
  v.literal("store"),
  v.literal("brand"),
  v.literal("subject"),
);

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function fmtDate(dt: Date) {
  return `${String(dt.getUTCDate()).padStart(2, "0")}.${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - dow + 1);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return `${fmtDate(mon)}-${fmtDate(sun)}.${String(d.getUTCFullYear()).slice(2)}`;
}

function monthLabel(dateStr: string): string {
  const m = parseInt(dateStr.slice(5, 7), 10) - 1;
  return `${MONTHS[m]} (${dateStr.slice(0, 4)})`;
}

function monthSortKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function weekSortKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - dow + 1);
  return mon.toISOString().slice(0, 10);
}

type Accum = {
  salesSeller: number;
  returnsSeller: number;
  salesWbDisc: number;
  returnsWbDisc: number;
  forPaySales: number;
  forPayReturns: number;
  salesQty: number;
  returnsQty: number;
  logistics: number;
  storage: number;
  penalties: number;
  acceptance: number;
  deductions: number;
  compensation: number;
  ordersRub: number;
  ordersCount: number;
  cancelledRub: number;
  cancelledCount: number;
  nmIds: Set<number>;
  sortKey: string;
  // per-nm counts for COGS
  nmSales: Map<number, number>;
  nmReturns: Map<number, number>;
};

function newAccum(sortKey: string): Accum {
  return {
    salesSeller: 0, returnsSeller: 0, salesWbDisc: 0, returnsWbDisc: 0,
    forPaySales: 0, forPayReturns: 0, salesQty: 0, returnsQty: 0,
    logistics: 0, storage: 0, penalties: 0, acceptance: 0, deductions: 0, compensation: 0,
    ordersRub: 0, ordersCount: 0, cancelledRub: 0, cancelledCount: 0,
    nmIds: new Set(), sortKey,
    nmSales: new Map(), nmReturns: new Map(),
  };
}

export const getSalesAnalytics = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
    groupBy: GROUP_BY,
  },
  handler: async (ctx, { shopId, dateFrom, dateTo, groupBy }) => {
    // ── Fetch all needed data ──
    const shops = await ctx.db.query("shops").collect();
    const shopMap = new Map(shops.map((s) => [s._id as string, s.name]));
    const activeShops = shopId ? shops.filter((s) => s._id === shopId) : shops;

    const financials = (
      await Promise.all(
        activeShops.map((s) =>
          ctx.db
            .query("financials")
            .withIndex("by_shop_rrdt", (q) =>
              q.eq("shopId", s._id).gte("rrDt", dateFrom).lte("rrDt", dateTo)
            )
            .collect()
        )
      )
    ).flat();

    const orders = (
      await Promise.all(
        activeShops.map((s) =>
          ctx.db
            .query("orders")
            .withIndex("by_shop_date", (q) =>
              q.eq("shopId", s._id).gte("date", dateFrom).lte("date", dateTo)
            )
            .collect()
        )
      )
    ).flat();

    const nmReports = (
      await Promise.all(
        activeShops.map((s) =>
          ctx.db.query("nmReports").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
        )
      )
    ).flat();

    const allCosts = (
      await Promise.all(
        activeShops.map((s) =>
          ctx.db.query("costs").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
        )
      )
    ).flat();
    const costMap = new Map<number, number>();
    for (const c of allCosts) costMap.set(c.nmId, c.cost);

    const allCards = (
      await Promise.all(
        activeShops.map((s) =>
          ctx.db.query("productCards").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
        )
      )
    ).flat();
    const brandByNm = new Map<number, string>();
    const articleByNm = new Map<number, string>();
    for (const c of allCards) {
      brandByNm.set(c.nmId, c.brand || "");
      articleByNm.set(c.nmId, c.vendorCode || "");
    }

    // NM report aggregation by nmId (latest data)
    const nmMap = new Map<number, { views: number; addToCart: number }>();
    for (const r of nmReports) {
      const ex = nmMap.get(r.nmId);
      if (!ex) {
        nmMap.set(r.nmId, { views: r.openCardCount, addToCart: r.addToCartCount });
      } else {
        ex.views += r.openCardCount;
        ex.addToCart += r.addToCartCount;
      }
    }

    // ── Grouping keys ──
    function finKey(f: typeof financials[number]): string {
      const dt = f.rrDt ?? f.dateFrom;
      switch (groupBy) {
        case "article": return String(f.nmId);
        case "day": return dt;
        case "week": return weekLabel(dt);
        case "month": return monthLabel(dt);
        case "store": return shopMap.get(f.shopId as string) ?? "?";
        case "brand": return brandByNm.get(f.nmId) ?? "";
        case "subject": return f.subject || "";
      }
    }

    function finSortKey(f: typeof financials[number]): string {
      const dt = f.rrDt ?? f.dateFrom;
      switch (groupBy) {
        case "day": return dt;
        case "week": return weekSortKey(dt);
        case "month": return monthSortKey(dt);
        default: return finKey(f);
      }
    }

    function orderKey(o: typeof orders[number]): string | null {
      switch (groupBy) {
        case "article": return String(o.nmId);
        case "day": return o.date;
        case "week": return weekLabel(o.date);
        case "month": return monthLabel(o.date);
        case "store": return shopMap.get(o.shopId as string) ?? "?";
        case "brand": return brandByNm.get(o.nmId) ?? "";
        case "subject": return null; // orders don't have subject
      }
    }

    // ── Aggregate ──
    const groups = new Map<string, Accum>();

    function getGroup(key: string, sortKey: string): Accum {
      let g = groups.get(key);
      if (!g) {
        g = newAccum(sortKey);
        groups.set(key, g);
      }
      return g;
    }

    for (const f of financials) {
      const key = finKey(f);
      const g = getGroup(key, finSortKey(f));
      g.nmIds.add(f.nmId);

      const isSale = f.docTypeName === "Продажа" && (f.retailAmount > 0 || f.nmId > 0);
      const isReturn = f.docTypeName === "Возврат" && f.nmId > 0;

      if (isSale) {
        g.salesSeller += f.retailPrice ?? f.retailAmount ?? 0;
        g.salesWbDisc += f.retailAmount ?? 0;
        g.forPaySales += f.ppvzForPay || 0;
        g.salesQty += 1;
        g.nmSales.set(f.nmId, (g.nmSales.get(f.nmId) ?? 0) + 1);
      }
      if (isReturn) {
        g.returnsSeller += Math.abs(f.retailPrice ?? f.retailAmount ?? 0);
        g.returnsWbDisc += Math.abs(f.retailAmount ?? 0);
        g.forPayReturns += Math.abs(f.ppvzForPay || 0);
        g.returnsQty += 1;
        g.nmReturns.set(f.nmId, (g.nmReturns.get(f.nmId) ?? 0) + 1);
      }
      g.logistics += f.deliveryRub ?? 0;
      g.storage += f.storageAmount || 0;
      g.penalties += f.penalty || 0;
      g.acceptance += f.acceptance || 0;
      g.deductions += f.deductionAmount || 0;
      g.compensation += f.additionalPayment || 0;
    }

    for (const o of orders) {
      const key = orderKey(o);
      if (key === null) continue;
      const g = getGroup(key, groupBy === "day" ? o.date : groupBy === "week" ? weekSortKey(o.date) : groupBy === "month" ? monthSortKey(o.date) : key);
      const price = o.priceWithDisc ?? o.totalPrice;
      if (o.isCancel) {
        g.cancelledRub += price;
        g.cancelledCount += o.quantity;
      } else {
        g.ordersRub += price;
        g.ordersCount += o.quantity;
      }
    }

    // ── Build rows ──
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const rows = [];

    for (const [label, g] of groups) {
      const revSeller = g.salesSeller - g.returnsSeller;
      const revWb = g.salesWbDisc - g.returnsWbDisc;
      const forPay = g.forPaySales - g.forPayReturns;
      const buyouts = g.salesQty - g.returnsQty;

      let cogs = 0;
      for (const nmId of g.nmIds) {
        const uc = costMap.get(nmId) ?? 0;
        const sold = g.nmSales.get(nmId) ?? 0;
        const ret = g.nmReturns.get(nmId) ?? 0;
        cogs += uc * (sold - ret);
      }

      const commission = revSeller - forPay;
      const grossProfit = revSeller - cogs;
      const expenses = commission + g.logistics + g.storage + g.penalties + g.acceptance + g.deductions - g.compensation;
      const profit = grossProfit - expenses;
      const pct = (v: number) => revSeller !== 0 ? r2((v / Math.abs(revSeller)) * 100) : 0;

      let views = 0;
      let addToCart = 0;
      for (const nmId of g.nmIds) {
        const nm = nmMap.get(nmId);
        if (nm) { views += nm.views; addToCart += nm.addToCart; }
      }

      rows.push({
        label,
        sortKey: g.sortKey,
        profit: r2(profit),
        profitPct: pct(profit),
        profitPerUnit: buyouts > 0 ? r2(profit / buyouts) : 0,
        roi: cogs > 0 ? r2((profit / cogs) * 100) : 0,
        views,
        cvToCart: views > 0 ? r2((addToCart / views) * 100) : 0,
        addToCart,
        cvToOrder: addToCart > 0 ? r2((g.ordersCount / addToCart) * 100) : 0,
        ordersRub: r2(g.ordersRub),
        ordersCount: g.ordersCount,
        cancelledRub: r2(g.cancelledRub),
        cancelledCount: g.cancelledCount,
        cancelRate: g.ordersCount > 0 ? r2((g.cancelledCount / g.ordersCount) * 100) : 0,
        salesSeller: r2(g.salesSeller),
        returnsSeller: r2(g.returnsSeller),
        revenueSeller: r2(revSeller),
        avgCheckSeller: buyouts > 0 ? r2(revSeller / buyouts) : 0,
        salesWbDisc: r2(g.salesWbDisc),
        returnsWbDisc: r2(g.returnsWbDisc),
        revenueWbDisc: r2(revWb),
        avgCheckWbDisc: buyouts > 0 ? r2(revWb / buyouts) : 0,
        wbDiscPct: g.salesSeller > 0 ? r2(((g.salesSeller - g.salesWbDisc) / g.salesSeller) * 100) : 0,
        salesQty: g.salesQty,
        returnsQty: g.returnsQty,
        buyoutsQty: buyouts,
        buyoutsPct: g.ordersCount > 0 ? r2((buyouts / g.ordersCount) * 100) : 0,
        returnPct: buyouts > 0 ? r2((g.returnsQty / buyouts) * 100) : 0,
        cogs: r2(cogs),
        cogsPct: pct(cogs),
        grossProfit: r2(grossProfit),
        grossProfitPct: pct(grossProfit),
        commission: r2(commission),
        commissionPct: pct(commission),
        logistics: r2(g.logistics),
        logisticsPct: pct(g.logistics),
      });
    }

    // Sort
    if (groupBy === "day" || groupBy === "week" || groupBy === "month") {
      rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    } else {
      rows.sort((a, b) => b.revenueSeller - a.revenueSeller);
    }

    return rows;
  },
});
