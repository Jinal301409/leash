import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

export default function Splash() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.6 }}
    >
      <div className="aurora" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <g transform="rotate(-90 60 60)">
              <motion.circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="url(#ring)"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              />
            </g>
          </svg>

          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-2 -ml-1.5 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_#34d399]" />
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 160, damping: 12 }}
          >
            <ShieldCheck className="h-14 w-14 text-sky-300" />
          </motion.div>
        </div>

        <div className="mt-8 flex text-4xl font-extrabold tracking-tight">
          {"Leash".split("").map((letter, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        <motion.p
          className="mt-2 text-sm text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          A spending leash for AI agents
        </motion.p>

        <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}