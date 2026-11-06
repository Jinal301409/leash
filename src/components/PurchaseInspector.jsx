import { useState } from "react";
import { ExternalLink, Check, X, ShieldAlert, ArrowRight } from "lucide-react";
import { DecisionBadge, StatusBadge } from "./Badges";
import RuleTraceDeck from "./RuleTraceDeck";

/**
 * Purchase Inspector Bay.
 * Displays real product photograph, price, store, decision badge,
 * 5-stage rule trace, and interactive PayPal / approval actions.
 */
export default function PurchaseInspector({
  entry,
  rules,
  spentToday = 0,
  onAct,
  onClose,
}) {
  const [showTraceDetails, setShowTraceDetails] = useState(true);

  if (!entry) {
    return (
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center border-2 border-dashed border-slate-800 bg-[#070d1a] p-8 text-center font-mono">
        <ShieldAlert className="h-10 w-10 text-slate-600 mb-3" />
        <span className="font-display text-sm font-bold uppercase text-slate-300">
          Inspector Bay Inactive
        </span>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Select or transmit a shopping request from the terminal to inspect the AI proposal and live rule trace.
        </p>
      </div>
    );
  }

  const {
    id,
    item,
    price,
    category,
    store,
    image,
    buy_url,
    decision,
    reason,
    status,
    approve_link,
    trace,
  } = entry;

  return (
    <div className="space-y-4 border-2 border-slate-700 bg-[#091122] p-5 shadow-xl">
      {/* Inspector Bay Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-cyan-400">
            [INSPECTION BAY]
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            ID: {id?.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DecisionBadge decision={decision} />
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white font-mono text-xs p-1"
              title="Close Inspector (ESC)"
            >
              [ESC]
            </button>
          )}
        </div>
      </div>

      {/* Product Image & Key Specs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-center">
        {/* Product Photo with Hardware Bezel */}
        <div className="sm:col-span-4 aspect-square border border-slate-700 bg-[#050914] p-2 flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={item}
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center font-mono text-[10px] text-slate-500">
              [NO PHOTO]
            </div>
          )}
        </div>

        {/* Item Metadata */}
        <div className="sm:col-span-8 space-y-2">
          <h3 className="font-display text-base font-bold text-white line-clamp-2">
            {item}
          </h3>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-2xl font-black text-cyan-300 tabular-nums">
              ${Number(price || 0).toFixed(2)}
            </span>
            <span className="font-mono text-xs uppercase text-slate-400">
              USD · {store || "Channel3 Network"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
            <span>Category: <strong className="text-slate-200">{category}</strong></span>
            {buy_url && (
              <>
                <span>·</span>
                <a
                  href={buy_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                >
                  Merchant Offer <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>

          <div className="pt-1">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Evaluation Reason */}
      <div className="border border-slate-800 bg-[#060b17] p-3 font-mono text-xs">
        <span className="font-bold uppercase text-slate-400">Rule Engine Verdict: </span>
        <span className={decision === "BLOCK" ? "text-rose-300" : "text-slate-200"}>
          {reason}
        </span>
      </div>

      {/* Rule Trace Deck */}
      {trace && trace.length > 0 && (
        <RuleTraceDeck
          trace={trace}
          price={Number(price || 0)}
          askAbove={rules?.ask_above || 25}
          dailyLimit={rules?.daily_limit || 50}
          spentToday={spentToday}
        />
      )}

      {/* Interactive Action Controls */}
      <div className="border-t border-slate-800 pt-4 space-y-2">
        {/* ASK: Manual Supervisor Approval */}
        {status === "WAITING_FOR_YOU" && onAct && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAct("approve", id)}
              className="flex-1 border border-emerald-600 bg-emerald-950/70 py-2.5 px-4 font-display text-xs font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-900 transition flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>Supervisor Approve</span>
            </button>
            <button
              onClick={() => onAct("decline", id)}
              className="flex-1 border border-rose-800 bg-rose-950/50 py-2.5 px-4 font-display text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-900 transition flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              <span>Decline Purchase</span>
            </button>
          </div>
        )}

        {/* ALLOW or Approved ASK: Ready for PayPal Sandbox */}
        {status === "AWAITING_PAYMENT" && approve_link && (
          <a
            href={approve_link}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 border-2 border-cyan-400 bg-cyan-500 py-3 px-4 font-display text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20"
          >
            <span>Review & Pay with PayPal Sandbox</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        )}

        {/* Already Paid Banner */}
        {status === "PAID" && (
          <div className="border border-emerald-500 bg-emerald-950/40 p-3 text-center font-mono text-xs text-emerald-300">
            ✓ ORDER CAPTURED VIA PAYPAL SANDBOX ORDERS V2
          </div>
        )}
      </div>
    </div>
  );
}
