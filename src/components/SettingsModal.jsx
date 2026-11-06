import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sliders, RotateCcw, Plus, AlertCircle, Check } from "lucide-react";

export default function SettingsModal({ isOpen, onClose, rules, onSave, onResetDefaults }) {
  const [dailyLimit, setDailyLimit] = useState(50);
  const [askAbove, setAskAbove] = useState(25);
  const [categories, setCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rules) {
      setDailyLimit(rules.daily_limit ?? 50);
      setAskAbove(rules.ask_above ?? 25);
      setCategories(rules.blocked_categories || []);
      setKeywords(rules.blocked_keywords || []);
    }
  }, [rules, isOpen]);

  if (!isOpen) return null;

  function removeCategory(catToRemove) {
    setCategories(categories.filter((c) => c !== catToRemove));
  }

  function addCategory() {
    const clean = newCategory.trim().toLowerCase();
    if (!clean) return;
    if (categories.includes(clean)) {
      setError(`"${clean}" is already in the blocked categories list.`);
      return;
    }
    setCategories([...categories, clean]);
    setNewCategory("");
    setError("");
  }

  function removeKeyword(kwToRemove) {
    setKeywords(keywords.filter((k) => k !== kwToRemove));
  }

  function addKeyword() {
    const clean = newKeyword.trim().toLowerCase();
    if (!clean) return;
    if (keywords.includes(clean)) {
      setError(`"${clean}" is already in the blocked keywords list.`);
      return;
    }
    setKeywords([...keywords, clean]);
    setNewKeyword("");
    setError("");
  }

  async function handleSave() {
    const dl = parseFloat(dailyLimit);
    const aa = parseFloat(askAbove);

    if (isNaN(dl) || dl <= 0) {
      setError("Daily spending limit must be a positive number.");
      return;
    }
    if (isNaN(aa) || aa <= 0) {
      setError("Approval threshold must be a positive number.");
      return;
    }
    if (aa > dl) {
      setError(`Approval threshold ($${aa.toFixed(2)}) cannot exceed the daily limit ($${dl.toFixed(2)}).`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        daily_limit: dl,
        ask_above: aa,
        blocked_categories: categories,
        blocked_keywords: keywords,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update rules.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError("");
    try {
      await onResetDefaults();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to reset rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="w-full max-w-xl max-h-[90vh] overflow-y-auto border-2 border-slate-700 bg-[#080e1c] p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold uppercase text-white">
                  Configure Spending Leash
                </h2>
                <p className="font-mono text-[11px] text-slate-400">
                  DETERMINISTIC PYTHON GUARDRAIL PARAMETERS
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 transition"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-200 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Controls */}
          <div className="space-y-4 font-mono">
            {/* Budget Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Daily Spending Cap ($)
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <span className="absolute left-3 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full border border-slate-700 bg-[#050914] pl-7 pr-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Hard stop: purchases exceeding this are blocked.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Ask-Above Threshold ($)
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <span className="absolute left-3 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={askAbove}
                    onChange={(e) => setAskAbove(e.target.value)}
                    className="w-full border border-slate-700 bg-[#050914] pl-7 pr-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Items priced higher require supervisor confirmation.</p>
              </div>
            </div>

            {/* Blocked Categories */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Blocked Categories
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">Purchases matching these categories will be blocked instantly.</p>
              <div className="flex flex-wrap gap-1.5 p-2 border border-slate-800 bg-[#050914] min-h-[44px] items-center">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1.5 border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="hover:text-rose-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {categories.length === 0 && (
                  <span className="text-xs text-slate-600 italic px-1">No categories blocked</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Add category (e.g. jewelry, luxury)..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                  className="flex-1 border border-slate-700 bg-[#050914] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="flex items-center gap-1 border border-slate-700 bg-[#0d1627] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Blocked Keywords */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Blocked Item Keywords (Token Scanning)
              </label>
              <p className="text-[10px] text-slate-500 mb-1.5">If the product title contains any of these words, it will be intercepted.</p>
              <div className="flex flex-wrap gap-1.5 p-2 border border-slate-800 bg-[#050914] max-h-32 overflow-y-auto items-center">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="flex items-center gap-1.5 border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-amber-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Add keyword (e.g. drone, crypto)..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  className="flex-1 border border-slate-700 bg-[#050914] px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="flex items-center gap-1 border border-slate-700 bg-[#0d1627] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={saving}
              onClick={handleReset}
              className="flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-700 px-4 py-2 font-display text-xs font-semibold uppercase text-slate-300 hover:text-white hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex items-center gap-1.5 border-2 border-cyan-400 bg-cyan-500 px-4 py-2 font-display text-xs font-bold uppercase text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : <><Check className="h-3.5 w-3.5" /> Save Policies</>}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
