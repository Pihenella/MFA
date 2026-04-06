import * as XLSX from "xlsx";

type Column = {
  key: string;
  label: string;
  group: string;
  unit?: string;
  invert?: boolean;
};

export function exportAnalyticsXlsx(
  rows: Record<string, any>[],
  columns: Column[],
  tabLabel: string,
  totals: Record<string, number>,
) {
  // Build header row
  const header = ["Группировка", ...columns.map((c) => c.label)];

  // Build data rows
  const data = rows.map((row) => [
    row.label || "",
    ...columns.map((col) => {
      const val = Number(row[col.key]) || 0;
      if (col.invert && val > 0) return -val;
      return val;
    }),
  ]);

  // Totals row
  const totalsRow = [
    `Итого (${rows.length})`,
    ...columns.map((col) => {
      const val = totals[col.key] ?? 0;
      if (col.invert && val > 0) return -val;
      return val;
    }),
  ];

  const wsData = [header, ...data, totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 30 },
    ...columns.map(() => ({ wch: 16 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabLabel || "Аналитика");
  XLSX.writeFile(wb, `Аналитика продаж ${tabLabel} ${new Date().toISOString().slice(0, 10)}.xlsx`);
}
