import { Check, X } from "lucide-react";
import LedMeter from "./LedMeter";

export default function RuleTraceDeck({ trace = [], price = 0, askAbove = 25, dailyLimit = 50, spentToday = 0 }) {
  const checkLabels = {
    price_validity: "1. Price Validity Check",
    blocked_category: "2. Prohibited Category Check",
    blocked_keyword: "3. Banned Keyword Token Check",
    daily_limit: "4. Daily Spending Cap Check",
    approval_threshold: "5. Human Approval Threshold Check",
  };

  return (
    <div className="space-y-4 border border-slate-700/80 bg-[#070d1a] p-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
          Rule Trace Engine Audit
        </span>
        <span className="font-mono text-[10px] text-cyan-400">
          5 DETERMINISTIC GATES
        </span>
      </div>

      {/* Mini Meters for Threshold & Daily Limit */}
      <div className="space-y-3 bg-[#0a1122] p-3 border border-slate-800/80">
        <LedMeter
          value={price}
          max={askAbove}
          label="ITEM PRICE VS. APPROVAL THRESHOLD"
          color={price > askAbove ? "amber" : "emerald"}
          segmentsCount={12}
        />
        <LedMeter
          value={spentToday + price}
          max={dailyLimit}
          label="PROJECTED DAILY BUDGET UTILIZATION"
          color={spentToday + price > dailyLimit ? "rose" : "cyan"}
          segmentsCount={12}
        />
      </div>

      {/* 5-Stage Checklist */}
      <div className="space-y-1.5 font-mono text-[11px]">
        {trace.map((step, idx) => {
          const isPassed = step.status === "passed";
          return (
            <div
              key={idx}
              className={`flex items-start justify-between border p-2 transition-colors ${
                isPassed
                  ? "border-emerald-900/60 bg-emerald-950/20 text-emerald-200"
                  : "border-rose-900/60 bg-rose-950/20 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center text-white ${
                    isPassed ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {isPassed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </span>
                <span className="font-semibold">
                  {checkLabels[step.check] || step.check}
                </span>
              </div>

              <div className="text-right">
                <span
                  className={`font-bold uppercase ${
                    isPassed ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {step.status}
                </span>
                <p className="text-[10px] text-slate-400 max-w-[200px] sm:max-w-xs truncate">
                  {step.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
