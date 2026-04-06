import * as XLSX from "xlsx";

type Column = { key: string; label: string; group: string; unit?: string; neg?: boolean };

export function exportAnalyticsXlsx(
  rows: Record<string, any>[],
  columns: Column[],
  tabLabel: string,
  totals: Record<string, number>,
  showProduct?: boolean,
) {
  const prefixHeaders = showProduct
    ? ["Товар", "Арт.WB", "Арт.поставщика"]
    : ["Группировка"];

  const header = [...prefixHeaders, ...columns.map((c) => c.label)];

  const data = rows.map((row) => {
    const prefix = showProduct
      ? [row.productName || row.label || "", row.nmId || "", row.supplierArticle || ""]
      : [row.label || ""];
    return [
      ...prefix,
      ...columns.map((col) => {
        const val = Number(row[col.key]) || 0;
        return col.neg && val > 0 ? -val : val;
      }),
    ];
  });

  const totalsPrefix = showProduct
    ? [`Итого (${rows.length})`, "", ""]
    : [`Итого (${rows.length})`];
  const totalsRow = [
    ...totalsPrefix,
    ...columns.map((col) => {
      const val = totals[col.key] ?? 0;
      return col.neg && val > 0 ? -val : val;
    }),
  ];

  const wsData = [header, ...data, totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    ...(showProduct ? [{ wch: 40 }, { wch: 12 }, { wch: 15 }] : [{ wch: 30 }]),
    ...columns.map(() => ({ wch: 16 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (tabLabel || "Аналитика").slice(0, 31));
  XLSX.writeFile(wb, `Аналитика продаж ${tabLabel} ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
