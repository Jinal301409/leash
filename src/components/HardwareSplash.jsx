import { motion } from "motion/react";
import { ShieldCheck, Cpu, Terminal } from "lucide-react";

export default function HardwareSplash({ onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.8, duration: 0.4 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050811] text-slate-100 select-none pointer-events-none"
    >
      <div className="relative flex flex-col items-center space-y-6 max-w-sm px-4 text-center">
        {/* Recessed Sensor Lens Loader */}
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border-2 border-cyan-400 bg-cyan-950/40 sensor-lens flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.5)]">
            <ShieldCheck className="h-10 w-10 text-cyan-300 animate-pulse" />
          </div>
          {/* Rotating Calibration Ring */}
          <div className="absolute inset-[-8px] rounded-full border border-dashed border-cyan-500/40 animate-[spin_8s_linear_infinite]" />
        </div>

        {/* Console Boot Sequence Text */}
        <div className="space-y-1.5 font-mono">
          <h2 className="font-display text-lg font-black uppercase tracking-wider text-white">
            Leash <span className="text-cyan-400">Control Console</span>
          </h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            INITIALIZING HARDWARE ENCLAVE v2.4
          </p>
        </div>

        {/* 16-Segment Boot Meter */}
        <div className="w-64 space-y-1 font-mono">
          <div className="flex h-2.5 w-full items-center gap-[2px] border border-slate-700 bg-[#060b17] p-[2px]">
            {Array.from({ length: 16 }).map((_, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0.2, backgroundColor: "#0f172a" }}
                animate={{ opacity: 1, backgroundColor: "#06b6d4" }}
                transition={{ delay: idx * 0.08, duration: 0.1 }}
                className="h-full flex-1 shadow-[0_0_4px_#06b6d4]"
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 uppercase">
            <span>DETERMINISTIC KERNEL</span>
            <span>READY</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
