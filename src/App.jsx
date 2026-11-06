import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { act, getLedger, getRules, resetDemo, resetRules, sendRequest, updateRules } from "./api";
import HardwareSplash from "./components/HardwareSplash";
import BlueprintWatermark from "./components/BlueprintWatermark";
import ChassisHeader from "./components/ChassisHeader";
import ChassisFooter from "./components/ChassisFooter";
import CommandHub from "./components/CommandHub";
import AgentTerminal from "./components/AgentTerminal";
import LedgerDeck from "./components/LedgerDeck";
import RulesLab from "./components/RulesLab";
import SettingsModal from "./components/SettingsModal";
import Toast from "./components/Toast";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState("hub"); // "hub" | "terminal" | "ledger" | "rules"
  const [rules, setRules] = useState(null);
  const [entries, setEntries] = useState([]);
  const [spent, setSpent] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [decisionFlash, setDecisionFlash] = useState(null); // "ALLOW" | "ASK" | "BLOCK"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast notification helper
  const addToast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync hash with active tab (hash routing without router library)
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      if (["hub", "terminal", "ledger", "rules"].includes(hash)) {
        setActiveTab(hash);
      }
    }
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    window.location.hash = `#/${tabId}`;
  }, []);

  // Global Keyboard Shortcuts: "/" to focus search, "ESC" to close inspector/settings
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        selectTab("ledger");
        setTimeout(() => {
          const searchInput = document.getElementById("ledger-search-input");
          if (searchInput) searchInput.focus();
        }, 100);
      } else if (e.key === "Escape") {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (selectedEntry) {
          setSelectedEntry(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, selectedEntry, selectTab]);

  // Fetch Ledger
  const refreshLedger = useCallback(async () => {
    try {
      const data = await getLedger();
      setEntries(data.entries);
      setSpent(data.spent_today);
      if (data.entries?.length > 0 && !selectedEntry) {
        setSelectedEntry(data.entries[0]);
      }
      setServerOnline(true);
    } catch {
      setServerOnline(false);
    }
  }, [selectedEntry]);

  // Fetch Rules & Poll Heartbeat
  const refreshRules = useCallback(async () => {
    try {
      const r = await getRules();
      setRules(r);
      setServerOnline(true);
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshRules();
    refreshLedger();

    // Heartbeat poll every 15s to /api/rules
    const interval = setInterval(() => {
      refreshRules();
      refreshLedger();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshRules, refreshLedger]);

  // Dispatch shopping request
  async function handleSendRequest(text) {
    setLoading(true);
    try {
      const entry = await sendRequest(text);
      setSelectedEntry(entry);
      setDecisionFlash(entry.decision);
      setTimeout(() => setDecisionFlash(null), 3000);
      await refreshLedger();

      if (entry.decision === "ALLOW") {
        addToast("Decision: ALLOW. PayPal Sandbox order created.", "success");
      } else if (entry.decision === "ASK") {
        addToast("Decision: ASK. Approval required before payment.", "warning");
      } else {
        addToast(`Decision: BLOCK. ${entry.reason}`, "error");
      }
    } catch (e) {
      addToast(e.message || "Failed to process agent request", "error");
    } finally {
      setLoading(false);
    }
  }

  // Act on an entry (Approve or Decline)
  async function handleAct(kind, id) {
    try {
      const updated = await act(kind, id);
      setSelectedEntry(updated.entry);
      await refreshLedger();
      if (kind === "approve") {
        addToast("Purchase approved! PayPal Sandbox order ready.", "success");
      } else {
        addToast("Purchase declined by supervisor.", "warning");
      }
    } catch (e) {
      addToast(e.message, "error");
    }
  }

  // Reset demo
  async function handleReset() {
    try {
      await resetDemo();
      setSelectedEntry(null);
      await refreshLedger();
      addToast("Demo ledger cleared for your private session.", "success");
    } catch (e) {
      addToast(e.message, "error");
    }
  }

  // Save rules
  async function handleSaveRules(newRules) {
    try {
      const updated = await updateRules(newRules);
      setRules(updated);
      addToast("Spending leash policies updated.", "success");
    } catch (e) {
      addToast(e.message, "error");
    }
  }

  // Reset rules
  async function handleResetRules() {
    try {
      const defaultR = await resetRules();
      setRules(defaultR);
      addToast("Restored default spending policies.", "success");
    } catch (e) {
      addToast(e.message, "error");
    }
  }

  return (
    <div className="relative min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      <AnimatePresence>
        {booting && <HardwareSplash key="splash" onComplete={() => setBooting(false)} />}
      </AnimatePresence>

      {/* Background Rotating Blueprint Watermark */}
      <BlueprintWatermark />

      <div className="relative z-10">
        {/* Chassis Header with Status LEDs & Hash Tabs */}
        <ChassisHeader
          activeTab={activeTab}
          onSelectTab={selectTab}
          decisionFlash={decisionFlash}
          serverOnline={serverOnline}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onResetDemo={handleReset}
          onFocusSearch={() => {
            selectTab("ledger");
            setTimeout(() => {
              const el = document.getElementById("ledger-search-input");
              if (el) el.focus();
            }, 100);
          }}
        />

        {/* Main Console Workspace */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {activeTab === "hub" && (
            <CommandHub
              rules={rules}
              spent={spent}
              entries={entries}
              onSendRequest={handleSendRequest}
              onInspectEntry={(entry) => {
                setSelectedEntry(entry);
                selectTab("terminal");
              }}
              onNavigateTab={selectTab}
            />
          )}

          {activeTab === "terminal" && (
            <AgentTerminal
              rules={rules}
              spent={spent}
              activeEntry={selectedEntry}
              loading={loading}
              onSendRequest={handleSendRequest}
              onAct={handleAct}
            />
          )}

          {activeTab === "ledger" && (
            <LedgerDeck
              entries={entries}
              onAct={handleAct}
              onSelectEntry={(entry) => {
                setSelectedEntry(entry);
                selectTab("terminal");
              }}
              onExportToast={(msg) => addToast(msg, "success")}
            />
          )}

          {activeTab === "rules" && (
            <RulesLab
              rules={rules}
              spent={spent}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onSelectScenario={(query) => {
                handleSendRequest(query);
                selectTab("terminal");
              }}
              loading={loading}
            />
          )}
        </main>
      </div>

      {/* Chassis Footer Strip */}
      <ChassisFooter />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rules={rules}
        onSave={handleSaveRules}
        onResetDefaults={handleResetRules}
      />

      {/* Floating Action Feedback Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}