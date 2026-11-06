export default function ChassisFooter() {
  return (
    <footer className="mt-16 border-t-2 border-slate-800 bg-[#060a14] py-6 px-4 text-center sm:px-6">
      <div className="mx-auto max-w-6xl space-y-3">
        {/* Hardware Status Strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] text-slate-400">
          <span className="text-slate-300 font-semibold">LEASH PLATFORM ARCHITECTURE:</span>
          <span>PAYPAL SANDBOX ORDERS V2</span>
          <span className="text-slate-600">|</span>
          <span>GOOGLE GEMINI</span>
          <span className="text-slate-600">|</span>
          <span>CHANNEL3 CATALOG</span>
          <span className="text-slate-600">|</span>
          <span>AG GRID</span>
          <span className="text-slate-600">|</span>
          <span>RENDER CLOUD</span>
        </div>

        {/* Sponsor & Safety Clarification */}
        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
          SECURE AGENTIC COMMERCE DEMONSTRATION · TEST MONEY ONLY · NO REAL-WORLD FUNDS ARE CHARGED
        </p>

        <p className="text-xs text-slate-500">
          Built for <strong className="text-slate-300">Build What's Next with PayPal and AI</strong> on Devpost. MIT License.
        </p>
      </div>
    </footer>
  );
}
