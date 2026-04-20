import { ReactNode, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (string | ((row: T) => string))[];
  onRowClick?: (row: T) => void;
  emptyText?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  exportName?: string;
}

export function FinanceTable<T extends { id: string }>({
  rows, columns, searchKeys = [], onRowClick, emptyText = "No records found.",
  pageSize = 10, toolbar, exportName,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let res = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      res = res.filter(r =>
        searchKeys.some(k => {
          const v = typeof k === "function" ? k(r) : (r as any)[k];
          return String(v ?? "").toLowerCase().includes(needle);
        })
      );
    }
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      if (col?.sortValue) {
        res = [...res].sort((a, b) => {
          const av = col.sortValue!(a), bv = col.sortValue!(b);
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return res;
  }, [rows, q, columns, sortKey, sortDir, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const head = columns.map(c => c.header).join(",");
    const lines = filtered.map(r => columns.map(c => {
      const v = c.exportValue ? c.exportValue(r) : "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(","));
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportName || "export"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-2 p-3 border-b bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search…"
            className="pl-8 h-9 bg-background"
          />
        </div>
        {toolbar}
        {exportName && (
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  style={{ width: c.width }}
                  className={cn(c.sortValue && "cursor-pointer select-none")}
                  onClick={() => {
                    if (!c.sortValue) return;
                    if (sortKey === c.key) setSortDir(d => d === "asc" ? "desc" : "asc");
                    else { setSortKey(c.key); setSortDir("desc"); }
                  }}
                >
                  {c.header}{sortKey === c.key && (sortDir === "asc" ? " ↑" : " ↓")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground py-10">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : pageRows.map(row => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(c => <TableCell key={c.key}>{c.render(row)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
