"use client";
import { createPortal } from "react-dom";
import { Fragment, useState, type ReactNode } from "react";
import { Columns3, MoreHorizontal } from "lucide-react";
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
  type PaginationState,
} from "@tanstack/react-table";
export type DataTableLayout = {
  sorting: SortingState;
  visibility: VisibilityState;
  pageSize: number;
};
export function DataTable<T extends { id: string }>({
  data,
  columns,
  onOpen,
  selection,
  onSelection,
  label = "Kayıtlar",
  layout,
  onLayoutChange,
  disabled = false,
  expandedId,
  renderExpanded,
  toolsId,
  toolsContainer,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  onOpen?: (row: T) => void;
  selection?: RowSelectionState;
  onSelection?: (s: RowSelectionState) => void;
  label?: string;
  layout?: DataTableLayout;
  onLayoutChange?: (layout: DataTableLayout) => void;
  disabled?: boolean;
  expandedId?: string | null;
  renderExpanded?: (row: T) => ReactNode;
  toolsId?: string;
  toolsContainer?: HTMLElement | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [visibility, setVisibility] = useState<VisibilityState>({}),
    [internalSelection, setInternalSelection] = useState<RowSelectionState>({});
  const rowSelection = selection ?? internalSelection;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: layout?.pageSize ?? 20,
  });
  const currentSorting = layout?.sorting ?? sorting;
  const currentVisibility = layout?.visibility ?? visibility;
  const currentPagination = {
    ...pagination,
    pageSize: layout?.pageSize ?? pagination.pageSize,
  };
  // React Compiler does not memoize TanStack Table; this component is intentionally uncompiled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: currentSorting,
      columnVisibility: currentVisibility,
      rowSelection,
      pagination: currentPagination,
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(currentSorting) : updater;
      if (layout && onLayoutChange)
        onLayoutChange({ ...layout, sorting: next });
      else setSorting(next);
    },
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(currentVisibility) : updater;
      if (layout && onLayoutChange)
        onLayoutChange({ ...layout, visibility: next });
      else setVisibility(next);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(currentPagination) : updater;
      setPagination(next);
      if (layout && onLayoutChange && next.pageSize !== layout.pageSize)
        onLayoutChange({ ...layout, pageSize: next.pageSize });
    },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      (onSelection ?? setInternalSelection)(next);
    },
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });
  const columnPicker = (
    <details className="table-column-picker">
      <summary>
        <Columns3 size={16} /> Sütunlar
      </summary>
      <div className="column-menu">
        {table
          .getAllLeafColumns()
          .filter((c) => c.getCanHide())
          .map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={c.getIsVisible()}
                disabled={disabled}
                onChange={c.getToggleVisibilityHandler()}
              />
              {typeof c.columnDef.header === "string"
                ? c.columnDef.header
                : c.id}
            </label>
          ))}
      </div>
    </details>
  );
  return (
    <section className={`table-panel${toolsId ? " table-panel-ledger" : ""}`}>
      <div className="table-meta">
        <span>{data.length} kayıt</span>
        {toolsContainer
          ? createPortal(columnPicker, toolsContainer)
          : columnPicker}
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
                      disabled={disabled}
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
                      disabled={disabled || !h.column.getCanSort()}
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
              <Fragment key={r.id}>
                <tr
                  data-selected={r.getIsSelected()}
                  data-expanded={expandedId === r.id}
                >
                  {onSelection && (
                    <td>
                      <input
                        type="checkbox"
                        disabled={disabled}
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
                        disabled={disabled}
                        onClick={() => onOpen(r.original)}
                        aria-label={`${r.id} detay`}
                      >
                        {renderExpanded ? <MoreHorizontal size={17} /> : "Aç ↗"}
                      </button>
                    </td>
                  )}
                </tr>
                {expandedId === r.id && renderExpanded && (
                  <tr className="expanded-table-row">
                    <td
                      colSpan={
                        r.getVisibleCells().length +
                        (onSelection ? 1 : 0) +
                        (onOpen ? 1 : 0)
                      }
                    >
                      {renderExpanded(r.original)}
                    </td>
                  </tr>
                )}
              </Fragment>
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
            disabled={disabled}
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            <option value={20}>20 kayıt</option>
            <option value={50}>50 kayıt</option>
            <option value={100}>100 kayıt</option>
          </select>
          <button
            disabled={disabled || !table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            ← Önceki
          </button>
          <button
            disabled={disabled || !table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Sonraki →
          </button>
        </div>
      </footer>
    </section>
  );
}
