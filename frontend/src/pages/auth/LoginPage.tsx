import { LoginForm } from "../../features/auth/components/LoginForm";
import { ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#F4F6F5] text-ink-950">
      {/* ── Left Calm Brand Showcase Panel (Desktop) ─────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0A1615] text-white p-12 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white font-display font-bold text-xl shadow-xs">
            V
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">Vestor</span>
        </div>

        {/* Center Hero Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-900/60 border border-teal-700/50 px-3 py-1 font-sans text-xs font-semibold text-teal-300">
            <Sparkles className="h-3.5 w-3.5 text-accent-soft" />
            <span>AI-Powered Financial Intelligence</span>
          </div>

          <h2 className="font-display text-4xl font-bold leading-tight">
            Clear numbers. Confident choices. No guesswork.
          </h2>

          <p className="font-sans text-sm text-slate-300 leading-relaxed">
            Consolidate your accounts, verify your monthly cash flow, build resilient goals, and learn practical wealth creation with real numbers.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Automated reconciliation with bank-grade Setu AA consent",
              "Conservative deterministic forecasting without hallucinated advice",
              "Interactive Duolingo-style learning journeys designed for India",
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 font-sans text-xs text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-accent-soft flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer accreditation */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400 font-sans border-t border-slate-800/80 pt-6">
          <ShieldCheck className="h-4 w-4 text-accent-soft" />
          <span>SEBI & RBI investor awareness framework aligned</span>
        </div>
      </div>

      {/* ── Right Form Column ───────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white font-display font-bold text-lg">
              V
            </div>
            <span className="font-display text-xl font-bold text-ink-950">Vestor</span>
          </div>

          {/* Login Card */}
          <div className="rounded-[24px] border border-slate-200/90 bg-white p-7 sm:p-9 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
