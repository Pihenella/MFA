export type CostRow = {
  nmId: number;
  supplierArticle: string;
  cost: number;
};

export type CatalogRow = {
  nmId: number;
  supplierArticle: string;
  subject: string;
};

const NM_ID_ALIASES = ["nmid", "nm_id", "артикул wb", "номенклатура", "артикулwb"];
const ARTICLE_ALIASES = ["supplierarticle", "артикул поставщика", "артикул", "sa_name", "supplier_article"];
const COST_ALIASES = ["cost", "себестоимость", "цена закупки", "закупочная цена"];
const REALIZATION_MARKERS = ["realizationreport_id", "rr_dt", "retail_amount"];

function findColumn(headers: string[], aliases: string[]): string | null {
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (aliases.includes(normalized)) return header;
  }
  return null;
}

/**
 * Parse a simple cost file (CSV/Excel) with auto-detection of column names.
 * Supports both English and Russian column names.
 */
export function parseSimpleCostFile(rows: Record<string, unknown>[]): CostRow[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const nmIdCol = findColumn(headers, NM_ID_ALIASES);
  const articleCol = findColumn(headers, ARTICLE_ALIASES);
  const costCol = findColumn(headers, COST_ALIASES);

  if (!nmIdCol && !articleCol) return [];
  if (!costCol) return [];

  const result: CostRow[] = [];
  for (const row of rows) {
    const nmIdRaw = nmIdCol ? row[nmIdCol] : undefined;
    const nmId = Number(nmIdRaw);
    if (!nmIdRaw || isNaN(nmId) || nmId <= 0) continue;

    const costRaw = costCol ? row[costCol] : undefined;
    if (costRaw === undefined || costRaw === null || costRaw === "") continue;
    const cost = typeof costRaw === "string"
      ? Number(costRaw.replace(/\s/g, "").replace(",", "."))
      : Number(costRaw);
    if (isNaN(cost) || cost < 0) continue;

    const article = articleCol ? String(row[articleCol] ?? "") : "";

    result.push({ nmId, supplierArticle: article, cost });
  }

  return result;
}

/**
 * Detect if the file is a WB realization report by checking for marker columns.
 */
export function isRealizationReport(rows: Record<string, unknown>[]): boolean {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());
  const matchCount = REALIZATION_MARKERS.filter((m) => headers.includes(m)).length;
  return matchCount >= 2;
}

/**
 * Parse a WB realization report to extract the product catalog
 * (nmId + article + subject) for subsequent cost entry.
 */
export function parseRealizationReport(rows: Record<string, unknown>[]): CatalogRow[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const nmIdCol = findColumn(headers, ["nm_id", ...NM_ID_ALIASES]);
  const articleCol = findColumn(headers, ["sa_name", ...ARTICLE_ALIASES]);
  const subjectCol = findColumn(headers, ["subject_name", "предмет", "subject"]);

  if (!nmIdCol) return [];

  const seen = new Set<number>();
  const result: CatalogRow[] = [];

  for (const row of rows) {
    const nmId = Number(row[nmIdCol]);
    if (isNaN(nmId) || nmId <= 0 || seen.has(nmId)) continue;
    seen.add(nmId);

    result.push({
      nmId,
      supplierArticle: articleCol ? String(row[articleCol] ?? "") : "",
      subject: subjectCol ? String(row[subjectCol] ?? "") : "",
    });
  }

  return result;
}
