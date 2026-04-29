import { query } from "./_generated/server";
import { v } from "convex/values";
import { ensureShopAccess, listUserShopIds } from "./lib/helpers";

const GROUP_BY = v.union(
  v.literal("article"),
  v.literal("size"),
  v.literal("store"),
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
  v.literal("brand"),
  v.literal("subject"),
  v.literal("group"),
);

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function fmtD(dt: Date) {
  return `${String(dt.getUTCDate()).padStart(2, "0")}.${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weekLabel(ds: string): string {
  const d = new Date(ds + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - dow + 1);
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  return `${fmtD(mon)}-${fmtD(sun)}.${String(d.getUTCFullYear()).slice(2)}`;
}

function weekSort(ds: string): string {
  const d = new Date(ds + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - dow + 1);
  return mon.toISOString().slice(0, 10);
}

function monthLabel(ds: string): string {
  return `${MONTHS[parseInt(ds.slice(5, 7), 10) - 1]} (${ds.slice(0, 4)})`;
}

type Acc = {
  salesSeller: number; returnsSeller: number;
  salesWbDisc: number; returnsWbDisc: number;
  forPaySales: number; forPayReturns: number;
  salesQty: number; returnsQty: number;
  logistics: number; storage: number; penalties: number;
  acceptance: number; deductions: number; compensation: number;
  ordersRub: number; ordersCount: number;
  cancelledRub: number; cancelledCount: number;
  nmIds: Set<number>;
  nmSales: Map<number, number>;
  nmReturns: Map<number, number>;
  taxBaseByShop: Map<string, number>;
  sortKey: string;
  // For article/size tabs
  supplierArticle: string;
  productName: string;
  imageUrl: string;
  nmId: number;
};

function newAcc(sortKey: string): Acc {
  return {
    salesSeller: 0, returnsSeller: 0, salesWbDisc: 0, returnsWbDisc: 0,
    forPaySales: 0, forPayReturns: 0, salesQty: 0, returnsQty: 0,
    logistics: 0, storage: 0, penalties: 0, acceptance: 0, deductions: 0, compensation: 0,
    ordersRub: 0, ordersCount: 0, cancelledRub: 0, cancelledCount: 0,
    nmIds: new Set(), nmSales: new Map(), nmReturns: new Map(), taxBaseByShop: new Map(),
    sortKey, supplierArticle: "", productName: "", imageUrl: "", nmId: 0,
  };
}

function taxRateFraction(ratePercent: number | undefined): number {
  const value = ratePercent ?? 6;
  if (!Number.isFinite(value)) return 0.06;
  return Math.max(0, Math.min(100, value)) / 100;
}

export const getSalesAnalytics = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
    groupBy: GROUP_BY,
  },
  handler: async (ctx, { shopId, dateFrom, dateTo, groupBy }) => {
    let userShopIds: Awaited<ReturnType<typeof listUserShopIds>>;
    if (shopId) {
      await ensureShopAccess(ctx, shopId);
      userShopIds = [shopId];
    } else {
      userShopIds = await listUserShopIds(ctx);
      if (userShopIds.length === 0) return [];
    }
    const allShops = await Promise.all(userShopIds.map((id) => ctx.db.get(id)));
    const active = allShops.filter((s): s is NonNullable<typeof s> => s !== null);
    const shopMap = new Map(active.map((s) => [s._id as string, s.name]));
    const shopTaxRateMap = new Map(
      active.map((s) => [s._id as string, taxRateFraction(s.taxRatePercent)])
    );

    // Fetch data in parallel
    const [financials, orders, nmReports, allCosts, allCards] = await Promise.all([
      Promise.all(active.map((s) =>
        ctx.db.query("financials").withIndex("by_shop_rrdt", (q) =>
          q.eq("shopId", s._id).gte("rrDt", dateFrom).lte("rrDt", dateTo)
        ).collect()
      )).then((r) => r.flat()),

      Promise.all(active.map((s) =>
        ctx.db.query("orders").withIndex("by_shop_date", (q) =>
          q.eq("shopId", s._id).gte("date", dateFrom).lte("date", dateTo)
        ).collect()
      )).then((r) => r.flat()),

      // NmReports — сначала ищем записи с точным periodStart = dateFrom (запрошенные через fetchAnalytics).
      // Если нет — берём все и дедупликуем по последней дате.
      Promise.all(active.map(async (s) => {
        const exact = await ctx.db.query("nmReports")
          .withIndex("by_shop_period", (q) => q.eq("shopId", s._id).eq("periodStart", dateFrom))
          .collect();
        if (exact.length > 0) return exact;
        return ctx.db.query("nmReports").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect();
      })).then((r) => r.flat()),

      Promise.all(active.map((s) =>
        ctx.db.query("costs").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
      )).then((r) => r.flat()),

      Promise.all(active.map((s) =>
        ctx.db.query("productCards").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
      )).then((r) => r.flat()),
    ]);

    const costMap = new Map<number, number>();
    for (const c of allCosts) costMap.set(c.nmId, c.cost);

    const cardInfo = new Map<number, { brand: string; title: string; photo: string; vendorCode: string; subjectName: string }>();
    for (const c of allCards) {
      cardInfo.set(c.nmId, {
        brand: c.brand || "",
        title: c.title || "",
        photo: c.photos?.[0] ?? "",
        vendorCode: c.vendorCode || "",
        subjectName: c.subjectName || "",
      });
    }

    // Дедупликация nmReports: берём запись с самым свежим periodEnd для каждого nmId
    const nmMap = new Map<number, { views: number; cart: number }>();
    const nmSeen = new Map<number, string>(); // nmId → best periodEnd
    for (const r of nmReports) {
      const prevEnd = nmSeen.get(r.nmId) ?? "";
      const thisEnd = r.periodEnd ?? "";
      if (thisEnd >= prevEnd) {
        nmMap.set(r.nmId, { views: r.openCardCount, cart: r.addToCartCount });
        nmSeen.set(r.nmId, thisEnd);
      }
    }

    // Grouping key functions
    function fKey(f: typeof financials[number]): string {
      const dt = f.rrDt ?? f.dateFrom;
      switch (groupBy) {
        case "article": case "size": case "group": return String(f.nmId);
        case "day": return dt;
        case "week": return weekLabel(dt);
        case "month": return monthLabel(dt);
        case "store": return shopMap.get(f.shopId as string) ?? "?";
        case "brand": return cardInfo.get(f.nmId)?.brand ?? "";
        case "subject": return f.subject || cardInfo.get(f.nmId)?.subjectName || "";
      }
    }
    function fSort(f: typeof financials[number]): string {
      const dt = f.rrDt ?? f.dateFrom;
      switch (groupBy) {
        case "day": return dt;
        case "week": return weekSort(dt);
        case "month": return dt.slice(0, 7);
        default: return fKey(f);
      }
    }
    function oKey(o: typeof orders[number]): string | null {
      switch (groupBy) {
        case "article": case "size": case "group": return String(o.nmId);
        case "day": return o.date;
        case "week": return weekLabel(o.date);
        case "month": return monthLabel(o.date);
        case "store": return shopMap.get(o.shopId as string) ?? "?";
        case "brand": return cardInfo.get(o.nmId)?.brand ?? "";
        case "subject": return null;
      }
    }
    function oSort(o: typeof orders[number]): string {
      switch (groupBy) {
        case "day": return o.date;
        case "week": return weekSort(o.date);
        case "month": return o.date.slice(0, 7);
        default: return oKey(o) ?? "";
      }
    }

    // Aggregate
    const groups = new Map<string, Acc>();
    function get(key: string, sk: string): Acc {
      let g = groups.get(key);
      if (!g) { g = newAcc(sk); groups.set(key, g); }
      return g;
    }

    for (const f of financials) {
      const key = fKey(f);
      const g = get(key, fSort(f));
      g.nmIds.add(f.nmId);

      // Set article info for article/size/group tabs
      if ((groupBy === "article" || groupBy === "size" || groupBy === "group") && !g.nmId) {
        g.nmId = f.nmId;
        g.supplierArticle = f.supplierArticle || "";
        const card = cardInfo.get(f.nmId);
        if (card) {
          g.productName = card.title;
          g.imageUrl = card.photo;
          if (!g.supplierArticle) g.supplierArticle = card.vendorCode;
        }
      }

      const isSale = f.docTypeName === "Продажа" && (f.retailAmount > 0 || (f.retailPrice ?? 0) > 0);
      const isReturn = f.docTypeName === "Возврат" && f.nmId > 0;

      if (isSale) {
        g.salesSeller += f.retailPrice ?? f.retailAmount ?? 0;
        g.salesWbDisc += f.retailAmount ?? 0;
        g.forPaySales += f.ppvzForPay || 0;
        g.salesQty += 1;
        g.nmSales.set(f.nmId, (g.nmSales.get(f.nmId) ?? 0) + 1);
        const shopKey = f.shopId as string;
        g.taxBaseByShop.set(shopKey, (g.taxBaseByShop.get(shopKey) ?? 0) + (f.retailAmount ?? 0));
      }
      if (isReturn) {
        g.returnsSeller += Math.abs(f.retailPrice ?? f.retailAmount ?? 0);
        g.returnsWbDisc += Math.abs(f.retailAmount ?? 0);
        g.forPayReturns += Math.abs(f.ppvzForPay || 0);
        g.returnsQty += 1;
        g.nmReturns.set(f.nmId, (g.nmReturns.get(f.nmId) ?? 0) + 1);
        const shopKey = f.shopId as string;
        g.taxBaseByShop.set(shopKey, (g.taxBaseByShop.get(shopKey) ?? 0) - Math.abs(f.retailAmount ?? 0));
      }
      g.logistics += f.deliveryRub ?? 0;
      g.storage += f.storageAmount || 0;
      g.penalties += f.penalty || 0;
      g.acceptance += f.acceptance || 0;
      g.deductions += f.deductionAmount || 0;
      g.compensation += f.additionalPayment || 0;
    }

    for (const o of orders) {
      const key = oKey(o);
      if (key === null) continue;
      const g = get(key, oSort(o));
      const price = o.priceWithDisc ?? o.totalPrice;
      if (o.isCancel) { g.cancelledRub += price; g.cancelledCount += o.quantity; }
      else { g.ordersRub += price; g.ordersCount += o.quantity; }
    }

    // Build rows
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const rows = [];

    for (const [label, g] of groups) {
      const revS = g.salesSeller - g.returnsSeller;
      const revW = g.salesWbDisc - g.returnsWbDisc;
      const forPay = g.forPaySales - g.forPayReturns;
      const buyouts = g.salesQty - g.returnsQty;

      let cogs = 0;
      for (const nmId of g.nmIds) {
        const uc = costMap.get(nmId) ?? 0;
        cogs += uc * ((g.nmSales.get(nmId) ?? 0) - (g.nmReturns.get(nmId) ?? 0));
      }

      const commission = revS - forPay;
      const grossProfit = revS - cogs;
      const expenses = commission + g.logistics + g.storage + g.penalties + g.acceptance + g.deductions - g.compensation;
      const tax = [...g.taxBaseByShop.entries()].reduce(
        (sum, [sid, revenue]) => sum + revenue * (shopTaxRateMap.get(sid) ?? 0.06),
        0,
      );
      const profitBeforeTax = grossProfit - expenses;
      const profit = profitBeforeTax - tax;
      const pct = (v: number) => revS !== 0 ? r2((v / Math.abs(revS)) * 100) : 0;

      let views = 0, cart = 0;
      for (const nmId of g.nmIds) {
        const nm = nmMap.get(nmId);
        if (nm) { views += nm.views; cart += nm.cart; }
      }

      rows.push({
        label,
        sortKey: g.sortKey,
        // Article info
        nmId: g.nmId,
        supplierArticle: g.supplierArticle,
        productName: g.productName,
        imageUrl: g.imageUrl,
        // Прибыль
        profit: r2(profit),
        profitPct: pct(profit),
        profitPerUnit: buyouts > 0 ? r2(profit / buyouts) : 0,
        roi: cogs > 0 ? r2((profit / cogs) * 100) : 0,
        // Воронка
        views,
        cvToCart: views > 0 ? r2((cart / views) * 100) : 0,
        addToCart: cart,
        cvToOrder: cart > 0 ? r2((g.ordersCount / cart) * 100) : 0,
        // Заказы
        ordersRub: r2(g.ordersRub),
        ordersCount: g.ordersCount,
        cancelledRub: r2(g.cancelledRub),
        cancelledCount: g.cancelledCount,
        cancelRate: g.ordersCount > 0 ? r2((g.cancelledCount / g.ordersCount) * 100) : 0,
        // Выручка продавца
        salesSeller: r2(g.salesSeller),
        returnsSeller: r2(g.returnsSeller),
        revenueSeller: r2(revS),
        avgCheckSeller: buyouts > 0 ? r2(revS / buyouts) : 0,
        // Со скидкой WB
        salesWbDisc: r2(g.salesWbDisc),
        returnsWbDisc: r2(g.returnsWbDisc),
        revenueWbDisc: r2(revW),
        avgCheckWbDisc: buyouts > 0 ? r2(revW / buyouts) : 0,
        wbDiscPct: g.salesSeller > 0 ? r2(((g.salesSeller - g.salesWbDisc) / g.salesSeller) * 100) : 0,
        // Количество
        salesQty: g.salesQty,
        returnsQty: g.returnsQty,
        buyoutsQty: buyouts,
        buyoutsPct: g.ordersCount > 0 ? r2((buyouts / g.ordersCount) * 100) : 0,
        returnPct: buyouts > 0 ? r2((g.returnsQty / buyouts) * 100) : 0,
        // Себестоимость
        cogs: r2(cogs),
        cogsPct: pct(cogs),
        grossProfit: r2(grossProfit),
        grossProfitPct: pct(grossProfit),
        // Расходы
        commission: r2(commission),
        commissionPct: pct(commission),
        logistics: r2(g.logistics),
        logisticsPct: pct(g.logistics),
      });
    }

    if (groupBy === "day" || groupBy === "week" || groupBy === "month") {
      rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    } else {
      rows.sort((a, b) => b.revenueSeller - a.revenueSeller);
    }

    return rows;
  },
});
