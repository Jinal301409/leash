import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";
          const isSuccess = !isError && !isWarning;

          const border = isError
            ? "border-rose-500/40 bg-slate-900/90 text-rose-200"
            : isWarning
            ? "border-amber-500/40 bg-slate-900/90 text-amber-200"
            : "border-emerald-500/40 bg-slate-900/90 text-emerald-200";

          const Icon = isError ? AlertTriangle : isWarning ? Info : CheckCircle2;
          const iconColor = isError ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400";

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md ${border}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                <p className="text-xs font-medium text-slate-200">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
