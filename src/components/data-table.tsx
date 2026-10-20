"use client";
import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
export function DataTable<T extends { id: string }>({
  data,
  columns,
  onOpen,
  selection,
  onSelection,
  label = "Kayıtlar",
}: {
  data: T[];
  columns: ColumnDef<T>[];
  onOpen?: (row: T) => void;
  selection?: RowSelectionState;
  onSelection?: (s: RowSelectionState) => void;
  label?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [visibility, setVisibility] = useState<VisibilityState>({}),
    [internalSelection, setInternalSelection] = useState<RowSelectionState>({});
  const rowSelection = selection ?? internalSelection;
  // React Compiler does not memoize TanStack Table; this component is intentionally uncompiled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      (onSelection ?? setInternalSelection)(next);
    },
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    autoResetPageIndex: true,
  });
  return (
    <section className="table-panel">
      <div className="table-meta">
        <span>{data.length} kayıt</span>
        <details>
          <summary>Sütunlar</summary>
          <div className="column-menu">
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={c.getIsVisible()}
                    onChange={c.getToggleVisibilityHandler()}
                  />
                  {typeof c.columnDef.header === "string"
                    ? c.columnDef.header
                    : c.id}
                </label>
              ))}
          </div>
        </details>
      </div>
      <div className="table-scroll">
        <table aria-label={label}>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {onSelection && (
                  <th>
                    <input
                      aria-label="Sayfadaki siparişleri seç"
                      type="checkbox"
                      ref={(el) => {
                        if (el)
                          el.indeterminate = table.getIsSomePageRowsSelected();
                      }}
                      checked={table.getIsAllPageRowsSelected()}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                  </th>
                )}
                {g.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={
                      h.column.getIsSorted() === "asc"
                        ? "ascending"
                        : h.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <button
                      className="sort"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc"
                        ? " ↑"
                        : h.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </button>
                  </th>
                ))}
                {onOpen && (
                  <th>
                    <span className="sr-only">Detay</span>
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} data-selected={r.getIsSelected()}>
                {onSelection && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${r.id} seç`}
                      checked={r.getIsSelected()}
                      onChange={r.getToggleSelectedHandler()}
                    />
                  </td>
                )}
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
                {onOpen && (
                  <td>
                    <button
                      className="row-open"
                      onClick={() => onOpen(r.original)}
                      aria-label={`${r.id} detay`}
                    >
                      Aç ↗
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={columns.length + 2} className="empty">
                  Bu filtrelerle eşleşen kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="table-footer">
        <span>
          {table.getState().pagination.pageIndex + 1} /{" "}
          {Math.max(1, table.getPageCount())} sayfa
        </span>
        <div>
          <select
            aria-label="Sayfa başına kayıt"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            <option value={20}>20 kayıt</option>
            <option value={50}>50 kayıt</option>
            <option value={100}>100 kayıt</option>
          </select>
          <button
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            ← Önceki
          </button>
          <button
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Sonraki →
          </button>
        </div>
      </footer>
    </section>
  );
}
