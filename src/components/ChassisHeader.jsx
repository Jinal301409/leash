import { Sliders, RefreshCw } from "lucide-react";

export default function ChassisHeader({
  activeTab,
  onSelectTab,
  decisionFlash, // "ALLOW" | "ASK" | "BLOCK" | null
  serverOnline,
  onOpenSettings,
  onResetDemo,
  onFocusSearch,
}) {
  const tabs = [
    { id: "hub", label: "Command Hub", badge: null },
    { id: "terminal", label: "Agent Terminal", badge: "AI" },
    { id: "ledger", label: "Purchase Ledger", badge: null },
    { id: "rules", label: "Rules Lab", badge: null },
  ];

  return (
    <header className="relative z-20 border-b-2 border-slate-700/80 bg-[#070d1a]">
      {/* Top Hardware Utility Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-2 sm:px-6">
        {/* Left: Sensor Lens + 3 Status LEDs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Round Sensor Eye */}
            <div
              className={`h-4 w-4 rounded-full border border-cyan-400 bg-cyan-500/30 ${
                decisionFlash ? "animate-ping" : "sensor-lens"
              }`}
              title="Optical Agent Status Sensor"
            />
            <span className="font-display text-sm font-bold tracking-tight text-white uppercase">
              Leash <span className="text-cyan-400">Console</span>
            </span>
            <span className="ml-1 hidden font-mono text-[10px] text-slate-400 sm:inline-block border border-slate-700/60 bg-[#0c1424] px-1.5 py-0.5">
              SECURE-SANDBOX
            </span>
          </div>

          {/* 3 Status LEDs: Green (ALLOW), Amber (ASK), Red (BLOCK) */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <div
              className={`led-indicator ${
                decisionFlash === "ALLOW" ? "lit-allow" : "off"
              }`}
              title="ALLOW Indicator"
            />
            <div
              className={`led-indicator ${
                decisionFlash === "ASK" ? "lit-ask" : "off"
              }`}
              title="ASK Indicator"
            />
            <div
              className={`led-indicator ${
                decisionFlash === "BLOCK" ? "lit-block" : "off"
              }`}
              title="BLOCK Indicator"
            />
            <span className="ml-1 font-mono text-[9px] uppercase tracking-wider text-slate-500 hidden sm:inline">
              DECISION BUS
            </span>
          </div>
        </div>

        {/* Right: Quick Action Keys + Server Heartbeat */}
        <div className="flex items-center gap-2">
          {/* Quick Search Shortcut Key */}
          <button
            onClick={onFocusSearch}
            className="hidden items-center gap-1.5 border border-slate-700 bg-[#0d1627] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-400 hover:text-white md:flex"
            title="Press / to focus search"
          >
            <span>Search</span>
            <kbd className="border border-slate-600 bg-slate-900 px-1 py-0.2 text-[9px] text-cyan-300">
              /
            </kbd>
          </button>

          {/* Server Status Prober */}
          <div
            className={`flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] ${
              serverOnline
                ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-300"
                : "border-rose-800/80 bg-rose-950/40 text-rose-300"
            }`}
            title="Heartbeat poll every 15s to /api/rules"
          >
            <span
              className={`h-1.5 w-1.5 ${
                serverOnline ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span>{serverOnline ? "SERVER ONLINE" : "OFFLINE"}</span>
          </div>

          {/* Configure Rules Modal Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 border border-slate-700 bg-[#0e172a] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition"
          >
            <Sliders className="h-3 w-3" />
            <span className="hidden sm:inline">Configure</span>
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1 border border-slate-700 bg-[#0e172a] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-amber-400 hover:text-amber-300 transition"
            title="Reset sandbox ledger and spend"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* PayPal Sandbox Notice Badge */}
          <span className="hidden border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300 lg:inline-block">
            PAYPAL SANDBOX · TEST ONLY
          </span>
        </div>
      </div>

      {/* Main Hardware Navigation Tabs */}
      <nav
        className="flex overflow-x-auto px-4 sm:px-6 pt-1 gap-1"
        aria-label="Console Navigation"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center gap-2 border-t-2 border-x border-b-0 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? "border-t-cyan-400 border-x-slate-700 bg-[#111a2e] text-white shadow-sm"
                  : "border-transparent bg-[#080e1c] text-slate-400 hover:bg-[#0c1424] hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="border border-cyan-400/60 bg-cyan-500/20 px-1 py-0.2 font-mono text-[9px] text-cyan-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
