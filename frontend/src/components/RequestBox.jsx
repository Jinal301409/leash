import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Check, CreditCard, Send, ShieldCheck, Sparkles } from "lucide-react";

const EXAMPLES = [
  "Get me a notebook under $15",
  "A birthday gift for my sister, around $35",
  "Buy me noise cancelling headphones",
  "Wireless earbuds as a gift, around $20",
];

const STEPS = [
  { icon: Bot, text: "The AI agent is choosing an item" },
  { icon: ShieldCheck, text: "Leash is checking your rules" },
  { icon: CreditCard, text: "Getting PayPal ready" },
];

export default function RequestBox({ onSend, loading }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) {
      setStep(0);
      return;
    }
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    return () => clearInterval(timer);
  }, [loading]);

  function submit(value) {
    const clean = value.trim();
    if (!clean || loading) return;
    onSend(clean);
    setText("");
  }

  return (
    <div className="glass rounded-2xl p-5 shadow-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-2 pl-4 focus-within:border-sky-400/60 focus-within:ring-2 focus-within:ring-sky-400/20"
      >
        <Sparkles className="h-5 w-5 shrink-0 text-sky-300" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell your agent what to buy..."
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-slate-500"
        />
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send to agent
        </motion.button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <motion.button
            key={example}
            type="button"
            disabled={loading}
            onClick={() => submit(example)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 hover:border-sky-400/50 hover:text-white disabled:opacity-50"
          >
            {example}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {loading && (
          <motion.ul
            key="steps"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <motion.li
                  key={s.text}
                  animate={{ opacity: i <= step ? 1 : 0.35, x: active ? 6 : 0 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      done ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className={active ? "text-white" : "text-slate-400"}>{s.text}</span>
                  {active && (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="h-1.5 w-1.5 rounded-full bg-sky-300"
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ repeat: Infinity, duration: 1, delay: dot * 0.2 }}
                        />
                      ))}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}