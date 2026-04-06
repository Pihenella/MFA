# Analytics Sales Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Аналитика продаж Wildberries" page with 9 grouping tabs, 35 columns, server-side aggregation, and xlsx export — matching МП Факт layout.

**Architecture:** Single Convex query `analytics.getSalesAnalytics` aggregates financials+orders+nmReports+costs by groupBy key on server, returns typed rows. Frontend renders tabbed table with horizontal scroll, sticky first column, sort, search, totals row, and xlsx download via SheetJS (already installed).

**Tech Stack:** Convex (backend query), Next.js 16 + React 19 (frontend), xlsx 0.18.5 (export), Tailwind CSS, date-fns

---

### Task 1: Backend — Server-side aggregation query

**Files:**
- Create: `convex/analytics.ts`

- [ ] **Step 1: Create `convex/analytics.ts` with the `getSalesAnalytics` query**

This query accepts `shopId?`, `dateFrom`, `dateTo`, `groupBy` and returns aggregated rows. It fetches all needed data from DB, groups by key, and computes all 35 metrics per group.

```typescript
// convex/analytics.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

const GROUP_BY_VALUES = v.union(
  v.literal("article"),
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
  v.literal("store"),
  v.literal("brand"),
  v.literal("subject"),
);

export const getSalesAnalytics = query({
  args: {
    shopId: v.optional(v.id("shops")),
    dateFrom: v.string(),
    dateTo: v.string(),
    groupBy: GROUP_BY_VALUES,
  },
  handler: async (ctx, { shopId, dateFrom, dateTo, groupBy }) => {
    // 1. Fetch all data
    const shops = await ctx.db.query("shops").collect();
    const shopMap = new Map(shops.map((s) => [s._id, s.name]));

    // Financials
    let financials;
    if (shopId) {
      financials = await ctx.db
        .query("financials")
        .withIndex("by_shop_rrdt", (q) =>
          q.eq("shopId", shopId).gte("rrDt", dateFrom).lte("rrDt", dateTo)
        )
        .collect();
    } else {
      const results = await Promise.all(
        shops.map((s) =>
          ctx.db
            .query("financials")
            .withIndex("by_shop_rrdt", (q) =>
              q.eq("shopId", s._id).gte("rrDt", dateFrom).lte("rrDt", dateTo)
            )
            .collect()
        )
      );
      financials = results.flat();
    }

    // Orders
    let orders;
    if (shopId) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_shop_date", (q) =>
          q.eq("shopId", shopId).gte("date", dateFrom).lte("date", dateTo)
        )
        .collect();
    } else {
      const results = await Promise.all(
        shops.map((s) =>
          ctx.db
            .query("orders")
            .withIndex("by_shop_date", (q) =>
              q.eq("shopId", s._id).gte("date", dateFrom).lte("date", dateTo)
            )
            .collect()
        )
      );
      orders = results.flat();
    }

    // NM Reports (for funnel data)
    let nmReports;
    if (shopId) {
      nmReports = await ctx.db
        .query("nmReports")
        .withIndex("by_shop", (q) => q.eq("shopId", shopId))
        .collect();
    } else {
      const results = await Promise.all(
        shops.map((s) =>
          ctx.db.query("nmReports").withIndex("by_shop", (q) => q.eq("shopId", s._id)).collect()
        )
      );
      nmReports = results.flat();
    }

    // Costs
    const allCosts = shopId
      ? await ctx.db.query("costs").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()
      : await ctx.db.query("costs").collect();
    const costMap = new Map<number, number>();
    for (const c of allCosts) costMap.set(c.nmId, c.cost);

    // Product cards (for brand info)
    const allCards = shopId
      ? await ctx.db.query("productCards").withIndex("by_shop", (q) => q.eq("shopId", shopId)).collect()
      : await ctx.db.query("productCards").collect();
    const brandByNm = new Map<number, string>();
    for (const c of allCards) brandByNm.set(c.nmId, c.brand || "");

    // NM report map
    const nmMap = new Map<number, { openCardCount: number; addToCartCount: number }>();
    for (const r of nmReports) {
      const existing = nmMap.get(r.nmId);
      if (!existing) {
        nmMap.set(r.nmId, { openCardCount: r.openCardCount, addToCartCount: r.addToCartCount });
      }
    }

    // 2. Determine group key for each financial record
    function getGroupKey(f: typeof financials[number]): string {
      switch (groupBy) {
        case "article":
          return String(f.nmId);
        case "day":
          return f.rrDt ?? f.dateFrom;
        case "week": {
          const d = new Date((f.rrDt ?? f.dateFrom) + "T00:00:00Z");
          const jan1 = new Date(d.getUTCFullYear(), 0, 1);
          const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
          // Find Monday of this week
          const dayOfWeek = d.getUTCDay() || 7;
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() - dayOfWeek + 1);
          const sunday = new Date(monday);
          sunday.setUTCDate(monday.getUTCDate() + 6);
          const fmt = (dt: Date) => `${String(dt.getUTCDate()).padStart(2,"0")}.${String(dt.getUTCMonth()+1).padStart(2,"0")}`;
          return `${fmt(monday)}-${fmt(sunday)}.${String(d.getUTCFullYear()).slice(2)}`;
        }
        case "month": {
          const dt = f.rrDt ?? f.dateFrom;
          const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
          const m = parseInt(dt.slice(5, 7), 10) - 1;
          const y = dt.slice(0, 4);
          return `${months[m]} (${y})`;
        }
        case "store":
          return shopMap.get(f.shopId as any) ?? "Unknown";
        case "brand":
          return brandByNm.get(f.nmId) ?? "";
        case "subject":
          return f.subject || "";
      }
    }

    function getOrderGroupKey(o: typeof orders[number]): string {
      switch (groupBy) {
        case "article": return String(o.nmId);
        case "day": return o.date;
        case "week": {
          const d = new Date(o.date + "T00:00:00Z");
          const dayOfWeek = d.getUTCDay() || 7;
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() - dayOfWeek + 1);
          const sunday = new Date(monday);
          sunday.setUTCDate(monday.getUTCDate() + 6);
          const fmt = (dt: Date) => `${String(dt.getUTCDate()).padStart(2,"0")}.${String(dt.getUTCMonth()+1).padStart(2,"0")}`;
          return `${fmt(monday)}-${fmt(sunday)}.${String(d.getUTCFullYear()).slice(2)}`;
        }
        case "month": {
          const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
          const m = parseInt(o.date.slice(5, 7), 10) - 1;
          return `${months[m]} (${o.date.slice(0,4)})`;
        }
        case "store": return shopMap.get(o.shopId as any) ?? "Unknown";
        case "brand": return brandByNm.get(o.nmId) ?? "";
        case "subject": return "";  // orders don't have subject
      }
    }

    // 3. Group and aggregate
    type Row = {
      label: string;
      sortKey: string;
      profit: number;
      profitPercent: number;
      profitPerUnit: number;
      roi: number;
      views: number;
      cvToCart: number;
      addToCart: number;
      cvToOrder: number;
      ordersRub: number;
      ordersCount: number;
      cancelledRub: number;
      cancelledCount: number;
      cancelRate: number;
      salesSeller: number;
      returnsSeller: number;
      revenueSeller: number;
      avgCheckSeller: number;
      salesWbDisc: number;
      returnsWbDisc: number;
      revenueWbDisc: number;
      avgCheckWbDisc: number;
      wbDiscountPct: number;
      salesQty: number;
      returnsQty: number;
      buyoutsQty: number;
      buyoutsPct: number;
      returnPct: number;
      cogs: number;
      cogsPct: number;
      grossProfit: number;
      grossProfitPct: number;
      commission: number;
      commissionPct: number;
      logistics: number;
      logisticsPct: number;
    };

    const groups = new Map<string, {
      salesSeller: number; returnsSeller: number;
      salesWbDisc: number; returnsWbDisc: number;
      forPaySales: number; forPayReturns: number;
      salesQty: number; returnsQty: number;
      logistics: number; storage: number; penalties: number;
      acceptance: number; deductions: number; compensation: number;
      ordersRub: number; ordersCount: number;
      cancelledRub: number; cancelledCount: number;
      nmIds: Set<number>;
      sortKey: string;
    }>();

    function getOrCreate(key: string, sortKey?: string) {
      if (!groups.has(key)) {
        groups.set(key, {
          salesSeller: 0, returnsSeller: 0,
          salesWbDisc: 0, returnsWbDisc: 0,
          forPaySales: 0, forPayReturns: 0,
          salesQty: 0, returnsQty: 0,
          logistics: 0, storage: 0, penalties: 0,
          acceptance: 0, deductions: 0, compensation: 0,
          ordersRub: 0, ordersCount: 0,
          cancelledRub: 0, cancelledCount: 0,
          nmIds: new Set(),
          sortKey: sortKey ?? key,
        });
      }
      return groups.get(key)!;
    }

    // Aggregate financials
    for (const f of financials) {
      const key = getGroupKey(f);
      const sortKey = groupBy === "day" ? (f.rrDt ?? f.dateFrom) : groupBy === "month" ? (f.rrDt ?? f.dateFrom).slice(0,7) : key;
      const g = getOrCreate(key, sortKey);
      g.nmIds.add(f.nmId);

      const isSale = f.docTypeName === "Продажа" && (f.retailAmount > 0 || f.nmId > 0);
      const isReturn = f.docTypeName === "Возврат" && f.nmId > 0;

      if (isSale) {
        g.salesSeller += f.retailPrice ?? f.retailAmount ?? 0;
        g.salesWbDisc += f.retailAmount ?? 0;
        g.forPaySales += f.ppvzForPay || 0;
        g.salesQty += 1;
      }
      if (isReturn) {
        g.returnsSeller += Math.abs(f.retailPrice ?? f.retailAmount ?? 0);
        g.returnsWbDisc += Math.abs(f.retailAmount ?? 0);
        g.forPayReturns += Math.abs(f.ppvzForPay || 0);
        g.returnsQty += 1;
      }
      g.logistics += f.deliveryRub ?? 0;
      g.storage += f.storageAmount || 0;
      g.penalties += f.penalty || 0;
      g.acceptance += f.acceptance || 0;
      g.deductions += f.deductionAmount || 0;
      g.compensation += f.additionalPayment || 0;
    }

    // Aggregate orders
    for (const o of orders) {
      const key = getOrderGroupKey(o);
      if (!key && groupBy === "subject") continue; // orders have no subject
      const g = getOrCreate(key);
      const price = o.priceWithDisc ?? o.totalPrice;
      if (o.isCancel) {
        g.cancelledRub += price;
        g.cancelledCount += o.quantity;
      } else {
        g.ordersRub += price;
        g.ordersCount += o.quantity;
      }
    }

    // Build result rows
    const rows: Row[] = [];
    for (const [label, g] of groups) {
      const revenueSeller = g.salesSeller - g.returnsSeller;
      const revenueWbDisc = g.salesWbDisc - g.returnsWbDisc;
      const forPayTotal = g.forPaySales - g.forPayReturns;
      const buyouts = g.salesQty - g.returnsQty;

      // COGS
      let cogs = 0;
      for (const nmId of g.nmIds) {
        const unitCost = costMap.get(nmId) ?? 0;
        // Approximate: distribute evenly (exact per-group per-nm tracking not available here)
        cogs += unitCost; // simplified — will refine with per-nm counts below
      }
      // Better COGS: count per-nm sales/returns in this group
      cogs = 0;
      // We need to recount per-nm for this group — use the financials directly
      const nmSalesCount = new Map<number, number>();
      const nmReturnsCount = new Map<number, number>();
      for (const f of financials) {
        if (getGroupKey(f) !== label) continue;
        if (f.docTypeName === "Продажа" && (f.retailAmount > 0 || f.nmId > 0)) {
          nmSalesCount.set(f.nmId, (nmSalesCount.get(f.nmId) ?? 0) + 1);
        }
        if (f.docTypeName === "Возврат" && f.nmId > 0) {
          nmReturnsCount.set(f.nmId, (nmReturnsCount.get(f.nmId) ?? 0) + 1);
        }
      }
      for (const nmId of g.nmIds) {
        const unitCost = costMap.get(nmId) ?? 0;
        const sold = nmSalesCount.get(nmId) ?? 0;
        const returned = nmReturnsCount.get(nmId) ?? 0;
        cogs += unitCost * (sold - returned);
      }

      const commission = revenueSeller - forPayTotal;
      const grossProfit = revenueSeller - cogs;
      const totalExpenses = commission + g.logistics + g.storage + g.penalties + g.acceptance + g.deductions - g.compensation;
      const profit = grossProfit - totalExpenses;

      const pct = (v: number) => revenueSeller !== 0 ? (v / Math.abs(revenueSeller)) * 100 : 0;

      // Funnel: sum nmReport data for all nmIds in this group
      let views = 0;
      let addToCartTotal = 0;
      for (const nmId of g.nmIds) {
        const nm = nmMap.get(nmId);
        if (nm) {
          views += nm.openCardCount;
          addToCartTotal += nm.addToCartCount;
        }
      }

      rows.push({
        label,
        sortKey: g.sortKey,
        profit: Math.round(profit * 100) / 100,
        profitPercent: Math.round(pct(profit) * 100) / 100,
        profitPerUnit: buyouts > 0 ? Math.round((profit / buyouts) * 100) / 100 : 0,
        roi: cogs > 0 ? Math.round((profit / cogs) * 10000) / 100 : 0,
        views,
        cvToCart: views > 0 ? Math.round((addToCartTotal / views) * 10000) / 100 : 0,
        addToCart: addToCartTotal,
        cvToOrder: addToCartTotal > 0 ? Math.round((g.ordersCount / addToCartTotal) * 10000) / 100 : 0,
        ordersRub: Math.round(g.ordersRub * 100) / 100,
        ordersCount: g.ordersCount,
        cancelledRub: Math.round(g.cancelledRub * 100) / 100,
        cancelledCount: g.cancelledCount,
        cancelRate: g.ordersCount > 0 ? Math.round((g.cancelledCount / g.ordersCount) * 10000) / 100 : 0,
        salesSeller: Math.round(g.salesSeller * 100) / 100,
        returnsSeller: Math.round(g.returnsSeller * 100) / 100,
        revenueSeller: Math.round(revenueSeller * 100) / 100,
        avgCheckSeller: buyouts > 0 ? Math.round((revenueSeller / buyouts) * 100) / 100 : 0,
        salesWbDisc: Math.round(g.salesWbDisc * 100) / 100,
        returnsWbDisc: Math.round(g.returnsWbDisc * 100) / 100,
        revenueWbDisc: Math.round(revenueWbDisc * 100) / 100,
        avgCheckWbDisc: buyouts > 0 ? Math.round((revenueWbDisc / buyouts) * 100) / 100 : 0,
        wbDiscountPct: g.salesSeller > 0 ? Math.round(((g.salesSeller - g.salesWbDisc) / g.salesSeller) * 10000) / 100 : 0,
        salesQty: g.salesQty,
        returnsQty: g.returnsQty,
        buyoutsQty: buyouts,
        buyoutsPct: g.ordersCount > 0 ? Math.round((buyouts / g.ordersCount) * 10000) / 100 : 0,
        returnPct: buyouts > 0 ? Math.round((g.returnsQty / buyouts) * 10000) / 100 : 0,
        cogs: Math.round(cogs * 100) / 100,
        cogsPct: Math.round(pct(cogs) * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossProfitPct: Math.round(pct(grossProfit) * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        commissionPct: Math.round(pct(commission) * 100) / 100,
        logistics: Math.round(g.logistics * 100) / 100,
        logisticsPct: Math.round(pct(g.logistics) * 100) / 100,
      });
    }

    // Sort: by date desc for temporal, by profit desc for categorical
    if (groupBy === "day" || groupBy === "week" || groupBy === "month") {
      rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    } else {
      rows.sort((a, b) => b.revenueSeller - a.revenueSeller);
    }

    return rows;
  },
});
```

- [ ] **Step 2: Deploy and verify**

Run: `npx convex deploy --yes`
Expected: Deployed successfully

- [ ] **Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "feat: add server-side analytics aggregation query with 7 groupBy modes"
```

---

### Task 2: Frontend — Tabbed analytics table page

**Files:**
- Modify: `src/app/analytics/page.tsx` (full rewrite)

- [ ] **Step 1: Replace analytics page with tabbed table**

The page has:
- Tab bar for 7 groupBy modes (matching МП Факт: По артикулам, По магазинам, По дням, По неделям, По месяцам, По брендам, По предметам)
- PeriodSelector (reuse existing)
- Shop selector
- Horizontally scrollable table with sticky first column
- Color-coded profit/ROI cells (green positive, red negative)
- Totals row in footer
- "Скачать xlsx" button

Full implementation code — see `src/app/analytics/page.tsx` in the codebase after this task is completed.

- [ ] **Step 2: Deploy and verify**

Run: `npx convex deploy --yes` (if needed for type generation)
Expected: Page renders with tabbed table

- [ ] **Step 3: Commit**

```bash
git add src/app/analytics/page.tsx
git commit -m "feat: analytics sales page with 7 tabs, 35 columns, sort, totals"
```

---

### Task 3: XLSX Export

**Files:**
- Create: `src/lib/exportXlsx.ts`
- Modify: `src/app/analytics/page.tsx` (add download button handler)

- [ ] **Step 1: Create export utility**

Uses `xlsx` (already in package.json) to generate a spreadsheet from the table data.

- [ ] **Step 2: Wire up download button in the analytics page**

- [ ] **Step 3: Commit**

```bash
git add src/lib/exportXlsx.ts src/app/analytics/page.tsx
git commit -m "feat: xlsx export for analytics sales table"
```

---

### Task 4: Deploy and push

- [ ] **Step 1: Final deploy**

```bash
npx convex deploy --yes
```

- [ ] **Step 2: Push**

```bash
git push
```
