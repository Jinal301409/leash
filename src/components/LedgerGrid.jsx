import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, colorSchemeDark, themeQuartz } from "ag-grid-community";
import { Download } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withPart(colorSchemeDark).withParams({
  backgroundColor: "rgba(15, 23, 42, 0.5)",
  foregroundColor: "#e2e8f0",
  headerBackgroundColor: "rgba(30, 41, 59, 0.8)",
  borderColor: "rgba(148, 163, 184, 0.15)",
  accentColor: "#38bdf8",
  fontSize: 14,
});

const BADGE = {
  ALLOW: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  ASK: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  BLOCK: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

const STATUS_COLOR = {
  PAID: "text-emerald-300 font-semibold",
  BLOCKED: "text-rose-300",
  WAITING_FOR_YOU: "text-amber-300 font-medium",
  AWAITING_PAYMENT: "text-sky-300",
};

function ItemCell({ data }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      <span className="truncate font-medium text-white" title={data.item}>
        {data.item}
      </span>
      <span className="truncate text-xs text-slate-400">
        {data.category}
        {data.store ? ` · ${data.store}` : ""}
      </span>
    </div>
  );
}

function DecisionCell({ value }) {
  return (
    <div className="flex h-full items-center">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[value] || ""}`}>
        {value}
      </span>
    </div>
  );
}

function StatusCell({ value }) {
  return (
    <div className={`flex h-full items-center text-sm ${STATUS_COLOR[value] || "text-slate-300"}`}>
      {String(value).replaceAll("_", " ").toLowerCase()}
    </div>
  );
}

function ActionCell({ data, context }) {
  if (data.status === "WAITING_FOR_YOU") {
    return (
      <div className="flex h-full items-center gap-2">
        <button
          onClick={() => context.act("approve", data.id)}
          className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          Approve
        </button>
        <button
          onClick={() => context.act("decline", data.id)}
          className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          Decline
        </button>
      </div>
    );
  }
  if (data.status === "AWAITING_PAYMENT" && data.approve_link) {
    return (
      <div className="flex h-full items-center">
        <a
          href={data.approve_link}
          className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400 transition shadow"
        >
          Pay with PayPal
        </a>
      </div>
    );
  }
  return null;
}

const columnDefs = [
  {
    headerName: "Time (UTC)",
    field: "created",
    width: 130,
    valueFormatter: (p) => String(p.value).replace("T", " ").slice(5, 16),
  },
  { headerName: "Item", field: "item", flex: 2, minWidth: 220, cellRenderer: ItemCell },
  {
    headerName: "Price",
    field: "price",
    width: 100,
    valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`,
  },
  { headerName: "Decision", field: "decision", width: 120, cellRenderer: DecisionCell },
  { headerName: "Status", field: "status", width: 170, cellRenderer: StatusCell },
  { headerName: "Why", field: "reason", flex: 3, minWidth: 260, tooltipField: "reason" },
  {
    headerName: "Action",
    colId: "action",
    width: 190,
    sortable: false,
    cellRenderer: ActionCell,
  },
];

const defaultColDef = { sortable: true, resizable: true, enableCellChangeFlash: true };

export default function LedgerGrid({ entries, onAct, onExportToast }) {
  function exportCSV() {
    if (!entries || entries.length === 0) return;

    const headers = ["ID", "Time", "User Request", "Item", "Price USD", "Category", "Store", "Decision", "Reason", "Status", "PayPal Order ID"];
    const rows = entries.map((e) => [
      `"${e.id || ""}"`,
      `"${e.created || ""}"`,
      `"${(e.request || "").replace(/"/g, '""')}"`,
      `"${(e.item || "").replace(/"/g, '""')}"`,
      Number(e.price || 0).toFixed(2),
      `"${e.category || ""}"`,
      `"${e.store || ""}"`,
      `"${e.decision || ""}"`,
      `"${(e.reason || "").replace(/"/g, '""')}"`,
      `"${e.status || ""}"`,
      `"${e.order_id || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leash-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onExportToast) {
      onExportToast("Ledger exported to CSV successfully.");
    }
  }

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Agent Ledger & Audit Trail</h2>
          <p className="text-xs text-slate-400">Deterministic record of all agent purchase requests and guardrail outcomes</p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5 text-sky-400" /> Export CSV
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p className="text-sm">No ledger entries recorded yet.</p>
          <p className="mt-1 text-xs text-slate-600">Send your agent a shopping request above or select a 1-click test scenario.</p>
        </div>
      ) : (
        <div style={{ height: 420 }} className="rounded-xl overflow-hidden">
          <AgGridReact
            theme={theme}
            rowData={entries}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={62}
            animateRows
            context={{ act: onAct }}
            autoSizeStrategy={{ type: "fitGridWidth" }}
          />
        </div>
      )}
    </div>
  );
}