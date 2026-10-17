import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { act, getLedger, getRules, sendRequest } from "./api";
import Splash from "./components/Splash";
import RequestBox from "./components/RequestBox";
import DecisionCard from "./components/DecisionCard";
import StatsBar from "./components/StatsBar";
import LedgerGrid from "./components/LedgerGrid";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [rules, setRules] = useState(null);
  const [entries, setEntries] = useState([]);
  const [spent, setSpent] = useState(0);
  const [latestId, setLatestId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const data = await getLedger();
    setEntries(data.entries);
    setSpent(data.spent_today);
  }, []);

  useEffect(() => {
    getRules()
      .then(setRules)
      .catch(() => setError("Could not reach the Leash server."));
    refresh().catch(() => {});
    const timer = setTimeout(() => setBooting(false), 2600);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function handleSend(text) {
    setLoading(true);
    setError("");
    try {
      const entry = await sendRequest(text);
      setLatestId(entry.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAct(kind, id) {
    try {
      await act(kind, id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  const latest = entries.find((e) => e.id === latestId);

  return (
    <>
      <AnimatePresence>{booting && <Splash key="splash" />}</AnimatePresence>
      <div className="aurora" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400">
              <ShieldCheck className="h-6 w-6 text-slate-950" />
            </div>
            <span className="text-xl font-bold tracking-tight">Leash</span>
          </div>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
            PayPal Sandbox · test money only
          </span>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.7 }}
          className="mt-12 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Let your AI agent shop.
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-emerald-300 bg-clip-text text-transparent">
              Keep the leash.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            The AI proposes purchases. Plain-code rules decide what is allowed, what needs your
            approval, and what is blocked, before any money moves through PayPal.
          </p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.7 }}
          className="mt-10 space-y-6"
        >
          <RequestBox onSend={handleSend} loading={loading} />

          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {latest && !loading && (
              <DecisionCard key={latest.id} entry={latest} onAct={handleAct} />
            )}
          </AnimatePresence>

          <StatsBar rules={rules} spent={spent} entries={entries} />
          <LedgerGrid entries={entries} onAct={handleAct} />
        </motion.div>

        <footer className="mt-12 text-center text-xs text-slate-500">
          Built with PayPal Sandbox, Google Gemini, Channel3 and AG Grid. No real money is ever used.
        </footer>
      </main>
    </>
  );
}