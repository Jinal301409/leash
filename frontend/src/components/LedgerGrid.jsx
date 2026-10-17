import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, colorSchemeDark, themeQuartz } from "ag-grid-community";

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
  ALLOW: "bg-emerald-500/20 text-emerald-300",
  ASK: "bg-amber-500/20 text-amber-300",
  BLOCK: "bg-rose-500/20 text-rose-300",
};

const STATUS_COLOR = {
  PAID: "text-emerald-300",
  BLOCKED: "text-rose-300",
  WAITING_FOR_YOU: "text-amber-300",
  AWAITING_PAYMENT: "text-sky-300",
};

function ItemCell({ data }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      <span className="truncate font-medium" title={data.item}>
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
          className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950"
        >
          Approve
        </button>
        <button
          onClick={() => context.act("decline", data.id)}
          className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold"
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
          className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white"
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
    headerName: "Time",
    field: "created",
    width: 120,
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
    width: 200,
    sortable: false,
    cellRenderer: ActionCell,
  },
];

const defaultColDef = { sortable: true, resizable: true, enableCellChangeFlash: true };

export default function LedgerGrid({ entries, onAct }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-3 text-lg font-bold">Agent ledger</h2>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Nothing yet. Send your agent a request above, or tap one of the examples.
        </p>
      ) : (
        <div style={{ height: 420 }}>
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