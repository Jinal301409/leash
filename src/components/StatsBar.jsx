import { motion } from "motion/react";
import { DollarSign, ShieldAlert, ShieldCheck, Sliders, TrendingUp } from "lucide-react";

export default function StatsBar({ rules, spent, entries, onOpenSettings }) {
  if (!rules) return null;

  const dailyLimit = rules.daily_limit || 50;
  const pct = Math.min(100, (spent / dailyLimit) * 100);

  const counts = { ALLOW: 0, ASK: 0, BLOCK: 0 };
  let totalSavedFromBlocks = 0;
  const categoryTotals = {};

  entries.forEach((e) => {
    if (counts[e.decision] !== undefined) counts[e.decision] += 1;
    if (e.decision === "BLOCK") {
      totalSavedFromBlocks += Number(e.price) || 0;
    }
    const cat = e.category || "other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.price) || 0);
  });

  const totalRequests = entries.length;
  const approvalRate = totalRequests > 0 ? Math.round(((counts.ALLOW + (entries.filter(e => e.status === "PAID").length)) / totalRequests) * 100) : 0;

  const bar =
    pct > 85
      ? "from-rose-500 to-orange-400"
      : pct > 60
      ? "from-amber-400 to-orange-400"
      : "from-emerald-400 to-sky-400";

  return (
    <div className="space-y-4">
      {/* Top 3 Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Spent Today */}
        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Spent today</p>
          <p className="mt-1 text-2xl font-bold text-white">
            ${spent.toFixed(2)}
            <span className="text-sm font-normal text-slate-500"> / ${dailyLimit.toFixed(2)}</span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            ${Math.max(0, dailyLimit - spent).toFixed(2)} remaining in today's allowance
          </p>
        </div>

        {/* Decisions Tally */}
        <div className="glass rounded-2xl p-5 border border-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Agent decisions</p>
          <div className="mt-3 flex justify-between text-center">
            {[
              ["Allowed", counts.ALLOW, "text-emerald-300"],
              ["Asked", counts.ASK, "text-amber-300"],
              ["Blocked", counts.BLOCK, "text-rose-300"],
            ].map(([label, value, color]) => (
              <div key={label}>
                <motion.p
                  key={value}
                  initial={{ scale: 1.5, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-3xl font-extrabold ${color}`}
                >
                  {value}
                </motion.p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Your Guardrails */}
        <div className="glass rounded-2xl p-5 border border-slate-800 relative">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Active guardrails</p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition"
              >
                <Sliders className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Ask me above <span className="font-semibold text-amber-300">${rules.ask_above.toFixed(2)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {rules.blocked_categories.map((c) => (
              <span key={c} className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] text-rose-300">
                no {c}
              </span>
            ))}
            {rules.blocked_keywords && rules.blocked_keywords.length > 0 && (
              <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-400">
                +{rules.blocked_keywords.length} keywords
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Impact & Category Summary Bar */}
      {entries.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Saved by Leash</p>
                <p className="text-sm font-bold text-emerald-300">${totalSavedFromBlocks.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Violations Intercepted</p>
                <p className="text-sm font-bold text-rose-300">{counts.BLOCK} attempts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Approval Rate</p>
                <p className="text-sm font-bold text-sky-300">{approvalRate}%</p>
              </div>
            </div>
          </div>

          {/* Category Chips Breakdown */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Activity by category:</span>
            {Object.entries(categoryTotals).map(([cat, total]) => (
              <span
                key={cat}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 font-medium"
              >
                {cat}: <span className="text-white">${total.toFixed(2)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}