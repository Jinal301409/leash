/**
 * Industrial Hardware Decision & Status Badges.
 * Sharp rectangular chips with a colored indicator dot and uppercase mono label.
 */
export function DecisionBadge({ decision }) {
  const configs = {
    ALLOW: {
      border: "border-emerald-600/70",
      bg: "bg-emerald-950/40",
      text: "text-emerald-300",
      dot: "bg-emerald-400 shadow-[0_0_6px_#10b981]",
      label: "ALLOW",
    },
    ASK: {
      border: "border-amber-600/70",
      bg: "bg-amber-950/40",
      text: "text-amber-300",
      dot: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
      label: "ASK (APPROVAL REQ)",
    },
    BLOCK: {
      border: "border-rose-600/70",
      bg: "bg-rose-950/40",
      text: "text-rose-300",
      dot: "bg-rose-500 shadow-[0_0_6px_#ef4444]",
      label: "BLOCK (INTERCEPTED)",
    },
  };

  const c = configs[decision] || {
    border: "border-slate-700",
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    dot: "bg-slate-500",
    label: decision || "UNKNOWN",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider ${c.border} ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}

export function StatusBadge({ status }) {
  const configs = {
    PAID: {
      border: "border-emerald-500",
      bg: "bg-emerald-950/60",
      text: "text-emerald-300",
      label: "CAPTURED (PAID)",
    },
    AWAITING_PAYMENT: {
      border: "border-cyan-500",
      bg: "bg-cyan-950/60",
      text: "text-cyan-300",
      label: "READY FOR PAYPAL",
    },
    WAITING_FOR_YOU: {
      border: "border-amber-500",
      bg: "bg-amber-950/60",
      text: "text-amber-300",
      label: "PENDING SUPERVISOR",
    },
    APPROVED_BY_RULES: {
      border: "border-emerald-600",
      bg: "bg-emerald-950/50",
      text: "text-emerald-300",
      label: "RULES PASSED",
    },
    BLOCKED: {
      border: "border-rose-600",
      bg: "bg-rose-950/50",
      text: "text-rose-300",
      label: "INTERCEPTED",
    },
    DECLINED: {
      border: "border-slate-600",
      bg: "bg-slate-900/60",
      text: "text-slate-400",
      label: "DECLINED",
    },
    CANCELLED: {
      border: "border-amber-700",
      bg: "bg-amber-950/40",
      text: "text-amber-400",
      label: "CANCELLED",
    },
    PAYPAL_ERROR: {
      border: "border-rose-700",
      bg: "bg-rose-950/60",
      text: "text-rose-400",
      label: "PAYPAL ERROR",
    },
  };

  const c = configs[status] || {
    border: "border-slate-700",
    bg: "bg-slate-900/50",
    text: "text-slate-300",
    label: status || "UNKNOWN",
  };

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c.border} ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}
