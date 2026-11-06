import { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { Search, Download, LayoutGrid, Table, Filter } from "lucide-react";
import { DecisionBadge, StatusBadge } from "./Badges";
import LedMeter from "./LedMeter";

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function LedgerDeck({
  entries = [],
  onAct,
  onSelectEntry,
  onExportToast,
}) {
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDecision, setFilterDecision] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [gridApi, setGridApi] = useState(null);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.item?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.request?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDecision =
      filterDecision === "ALL" || e.decision === filterDecision;

    const matchesCategory =
      filterCategory === "ALL" || e.category === filterCategory;

    return matchesSearch && matchesDecision && matchesCategory;
  });

  const categories = [
    "ALL",
    ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean))),
  ];

  // AG Grid Column Definitions
  const colDefs = [
    {
      field: "created",
      headerName: "TIMESTAMP",
      width: 140,
      cellRenderer: (params) => (
        <span className="font-mono text-xs text-slate-400">
          {params.value
            ? new Date(params.value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "JUST NOW"}
        </span>
      ),
    },
    {
      field: "item",
      headerName: "PRODUCT / PROPOSAL",
      flex: 2,
      minWidth: 200,
      cellRenderer: (params) => (
        <div
          className="cursor-pointer truncate font-medium text-slate-200 hover:text-cyan-400"
          onClick={() => onSelectEntry && onSelectEntry(params.data)}
        >
          {params.value}
        </div>
      ),
    },
    {
      field: "price",
      headerName: "PRICE (USD)",
      width: 120,
      cellRenderer: (params) => (
        <span className="font-mono font-bold text-cyan-300 tabular-nums">
          ${Number(params.value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      field: "category",
      headerName: "CATEGORY",
      width: 130,
      cellRenderer: (params) => (
        <span className="font-mono text-xs uppercase text-slate-400">
          {params.value}
        </span>
      ),
    },
    {
      field: "decision",
      headerName: "DECISION",
      width: 140,
      cellRenderer: (params) => <DecisionBadge decision={params.value} />,
    },
    {
      field: "status",
      headerName: "STATUS",
      width: 160,
      cellRenderer: (params) => <StatusBadge status={params.value} />,
    },
    {
      headerName: "ACTIONS",
      width: 140,
      cellRenderer: (params) => {
        const row = params.data;
        if (row.status === "WAITING_FOR_YOU" && onAct) {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAct("approve", row.id)}
                className="bg-emerald-950/80 border border-emerald-600 px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-emerald-800"
              >
                APPROVE
              </button>
              <button
                onClick={() => onAct("decline", row.id)}
                className="bg-rose-950/80 border border-rose-600 px-2 py-0.5 font-mono text-[10px] text-rose-300 hover:bg-rose-800"
              >
                DECLINE
              </button>
            </div>
          );
        }
        if (row.status === "AWAITING_PAYMENT" && row.approve_link) {
          return (
            <a
              href={row.approve_link}
              target="_blank"
              rel="noreferrer"
              className="bg-cyan-950/80 border border-cyan-500 px-2 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-cyan-800"
            >
              PAYPAL ↗
            </a>
          );
        }
        return (
          <button
            onClick={() => onSelectEntry && onSelectEntry(row)}
            className="border border-slate-700 bg-[#0e172a] px-2 py-0.5 font-mono text-[10px] text-slate-400 hover:border-slate-500 hover:text-white"
          >
            INSPECT
          </button>
        );
      },
    },
  ];

  function exportCsv() {
    if (gridApi) {
      gridApi.exportDataAsCsv({ fileName: "leash_agent_ledger.csv" });
      onExportToast && onExportToast("Ledger exported as CSV.");
    }
  }

  return (
    <div className="space-y-4 border-2 border-slate-800 bg-[#080e1c] p-4 sm:p-5">
      {/* Explorer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Search Bar */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            id="ledger-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, items, categories..."
            className="w-full border border-slate-700 bg-[#060b17] py-1.5 pl-9 pr-3 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Filter Keys */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Decision Filters */}
          <div className="flex items-center border border-slate-700 bg-[#060b17] p-0.5 font-mono text-[11px]">
            {["ALL", "ALLOW", "ASK", "BLOCK"].map((dec) => (
              <button
                key={dec}
                onClick={() => setFilterDecision(dec)}
                className={`px-2.5 py-1 uppercase transition ${
                  filterDecision === dec
                    ? "bg-[#142036] text-cyan-400 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {dec}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-700 bg-[#060b17] px-2.5 py-1.5 font-mono text-xs text-slate-300 focus:border-cyan-400 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-white">
                {c.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Table / Card View Mode Switch */}
          <div className="flex items-center border border-slate-700 bg-[#060b17] p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1 ${
                viewMode === "table"
                  ? "bg-[#142036] text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
              title="AG Grid Table Mode"
            >
              <Table className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1 ${
                viewMode === "cards"
                  ? "bg-[#142036] text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Hardware Cards Mode"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 border border-slate-700 bg-[#0d1627] px-3 py-1.5 font-mono text-xs text-slate-300 hover:border-cyan-400 hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Result Counter */}
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
        <span>
          SHOWING <strong className="text-white">{filteredEntries.length}</strong> OF{" "}
          <strong className="text-white">{entries.length}</strong> PROPOSALS
        </span>
        <span className="text-[10px] text-slate-500">
          SPONSOR ENGINE: AG GRID COMMUNITY V36
        </span>
      </div>

      {/* AG Grid Table View */}
      {viewMode === "table" && (
        <div
          className="ag-theme-quartz-dark w-full border border-slate-800"
          style={{ height: "460px" }}
        >
          <AgGridReact
            rowData={filteredEntries}
            columnDefs={colDefs}
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
            rowHeight={48}
            headerHeight={40}
          />
        </div>
      )}

      {/* Hardware Card Grid Mode */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry && onSelectEntry(entry)}
              className="cursor-pointer border-2 border-slate-800 bg-[#091122] p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <DecisionBadge decision={entry.decision} />
                <span className="font-mono text-base font-bold text-cyan-300 tabular-nums">
                  ${Number(entry.price || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 border border-slate-800 bg-[#050914] p-1 flex items-center justify-center">
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.item}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-mono text-[9px] text-slate-600">PHOTO</span>
                  )}
                </div>
                <div className="truncate">
                  <h4 className="font-display text-xs font-bold text-slate-200 truncate">
                    {entry.item}
                  </h4>
                  <p className="font-mono text-[10px] text-slate-400">
                    Category: {entry.category}
                  </p>
                </div>
              </div>

              <p className="font-mono text-[11px] text-slate-400 line-clamp-2">
                {entry.reason}
              </p>

              <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                <StatusBadge status={entry.status} />
                <span className="font-mono text-[10px] text-cyan-400">Inspect &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
