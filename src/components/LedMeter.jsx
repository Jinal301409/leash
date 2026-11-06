/**
 * 16-Segment LED Level Meter.
 * Simulates a physical instrument VU/power meter.
 * 16 individual bars that illuminate across a recessed dark track.
 */
export default function LedMeter({
  value = 0,
  max = 50,
  label = "BUDGET UTILIZATION",
  color = "emerald", // "emerald" | "amber" | "rose" | "cyan"
  showReadout = true,
  segmentsCount = 16,
}) {
  const safeMax = Math.max(0.01, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const litCount = Math.round(ratio * segmentsCount);
  const percentage = Math.round(ratio * 100);

  const activeColors = {
    emerald: "bg-emerald-400 shadow-[0_0_6px_#10b981]",
    amber: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
    rose: "bg-rose-500 shadow-[0_0_6px_#ef4444]",
    cyan: "bg-cyan-400 shadow-[0_0_6px_#06b6d4]",
  };

  const activeBarClass = activeColors[color] || activeColors.cyan;

  return (
    <div className="w-full space-y-1.5 font-mono">
      {(label || showReadout) && (
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </span>
          {showReadout && (
            <span className="tabular-nums text-slate-200">
              ${value.toFixed(2)} / ${max.toFixed(2)}{" "}
              <span className="text-cyan-400">({percentage}%)</span>
            </span>
          )}
        </div>
      )}

      {/* Recessed Hardware Track with 16 Segments */}
      <div className="flex h-3.5 w-full items-center gap-[3px] border border-[#1a253b] bg-[#060b17] p-[3px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {Array.from({ length: segmentsCount }).map((_, idx) => {
          const isLit = idx < litCount;
          return (
            <div
              key={idx}
              className={`h-full flex-1 transition-all duration-150 ${
                isLit ? activeBarClass : "bg-[#0f172a]/60 opacity-30"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
