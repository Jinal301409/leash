import { useState } from "react";
import { motion } from "motion/react";
import { Check, ExternalLink, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

const LOOKS = {
  ALLOW: {
    icon: ShieldCheck,
    label: "Allowed by your rules",
    border: "border-emerald-400/40",
    glow: "shadow-emerald-500/20",
    text: "text-emerald-300",
    bg: "bg-emerald-500/15",
  },
  ASK: {
    icon: ShieldAlert,
    label: "Needs your approval",
    border: "border-amber-400/40",
    glow: "shadow-amber-500/20",
    text: "text-amber-300",
    bg: "bg-amber-500/15",
  },
  BLOCK: {
    icon: ShieldX,
    label: "Blocked by your rules",
    border: "border-rose-400/40",
    glow: "shadow-rose-500/20",
    text: "text-rose-300",
    bg: "bg-rose-500/15",
  },
};

export default function DecisionCard({ entry, onAct }) {
  const [busy, setBusy] = useState(false);
  const look = LOOKS[entry.decision] || LOOKS.ASK;
  const Icon = look.icon;

  async function run(kind) {
    setBusy(true);
    try {
      await onAct(kind, entry.id);
    } finally {
      setBusy(false);
    }
  }

  const blocked = entry.status === "BLOCKED";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: blocked ? [0, -10, 10, -8, 8, 0] : 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        default: { type: "spring", stiffness: 220, damping: 20 },
        x: { duration: 0.5 },
      }}
      className={`glass rounded-2xl border p-6 shadow-xl ${look.border} ${look.glow}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 10 }}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${look.bg}`}
          >
            <Icon className={`h-8 w-8 ${look.text}`} />
          </motion.div>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-wide ${look.text}`}>
              {look.label}
            </p>
            <h2 className="mt-1 text-xl font-bold">{entry.item}</h2>
            <p className="text-sm text-slate-400">Category: {entry.category}</p>
          </div>
        </div>
        <p className="text-3xl font-extrabold">${Number(entry.price).toFixed(2)}</p>
      </div>

      <p className="mt-4 rounded-lg bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
        <span className="font-semibold">Why: </span>
        {entry.reason}
      </p>
      {entry.note && <p className="mt-2 text-xs italic text-slate-500">Agent's note: {entry.note}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {entry.status === "WAITING_FOR_YOU" && (
          <>
            <motion.button
              disabled={busy}
              onClick={() => run("approve")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              Approve
            </motion.button>
            <motion.button
              disabled={busy}
              onClick={() => run("decline")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-60"
            >
              Decline
            </motion.button>
          </>
        )}

        {entry.status === "AWAITING_PAYMENT" && entry.approve_link && (
          <motion.a
            href={entry.approve_link}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="pulse-glow flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Pay with PayPal <ExternalLink className="h-4 w-4" />
          </motion.a>
        )}

        {entry.status === "PAID" && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 12 }}
            className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300"
          >
            <Check className="h-4 w-4" /> Paid (sandbox)
          </motion.span>
        )}

        {["DECLINED", "CANCELLED", "PAYPAL_ERROR", "PAYMENT_FAILED"].includes(entry.status) && (
          <span className="text-sm text-slate-400">
            Status: {entry.status.replaceAll("_", " ").toLowerCase()}
          </span>
        )}
      </div>
    </motion.div>
  );
}