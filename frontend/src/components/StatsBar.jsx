import { motion } from "motion/react";

export default function StatsBar({ rules, spent, entries }) {
  if (!rules) return null;

  const pct = Math.min(100, (spent / rules.daily_limit) * 100);
  const counts = { ALLOW: 0, ASK: 0, BLOCK: 0 };
  entries.forEach((e) => {
    if (counts[e.decision] !== undefined) counts[e.decision] += 1;
  });
  const bar =
    pct > 85
      ? "from-rose-500 to-orange-400"
      : pct > 60
      ? "from-amber-400 to-orange-400"
      : "from-emerald-400 to-sky-400";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">Spent today</p>
        <p className="mt-1 text-2xl font-bold">
          ${spent.toFixed(2)}
          <span className="text-sm font-normal text-slate-500"> / ${rules.daily_limit.toFixed(2)}</span>
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">Agent decisions</p>
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

      <div className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">Your guardrails</p>
        <p className="mt-2 text-sm text-slate-300">
          Ask me above <span className="font-semibold text-amber-300">${rules.ask_above.toFixed(2)}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rules.blocked_categories.map((c) => (
            <span key={c} className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs text-rose-300">
              no {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}