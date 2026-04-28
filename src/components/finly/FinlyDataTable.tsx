import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FinlyDataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: FinlyDataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  dense?: boolean;
}

export function FinlyDataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  dense = false,
}: Props<T>) {
  if (rows.length === 0 && empty) {
    return <div className="rounded-frame border border-border p-6">{empty}</div>;
  }

  return (
    <div className="overflow-hidden rounded-frame border border-border">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-murloc-teal/30 bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "text-left text-xs font-medium uppercase text-muted-foreground",
                    dense ? "px-3 py-2" : "px-4 py-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-border transition-colors last:border-0 hover:bg-muted/30",
                  index % 2 === 1 && "bg-tavern-bg/30"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "text-foreground",
                      dense ? "px-3 py-2" : "px-4 py-3",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as Record<string, unknown>)[
                            String(col.key)
                          ] ?? ""
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
