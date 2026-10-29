import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Menu,
  PieChart,
  Wallet,
  X,
} from "lucide-react";
import { calculateBudget, updateBudgetShare, type BudgetShares } from "../../features/landing/moneySimulator";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" aria-label="Vestor home" className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F5F2EA]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] font-display text-[21px] font-semibold leading-none ${inverse ? "bg-[#B9E7C7] text-[#10251D]" : "bg-[#10251D] text-[#D1F0D9]"}`} aria-hidden="true">V</span>
      <span className={`font-display text-[23px] font-semibold tracking-[-0.045em] ${inverse ? "text-white" : "text-[#10251D]"}`}>Vestor</span>
    </Link>
  );
}

function HeroWorkspace({ reduceMotion }: { reduceMotion: boolean }) {
  const [view, setView] = useState<"learn" | "money" | "practice">("practice");
  const [answer, setAnswer] = useState<"need" | "want" | null>(null);
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, clipPath: "inset(8% 0 0 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-[720px]"
    >
      <div className="landing-hero-window relative border border-[#A3B39C]/35 bg-[#172F25] p-3 text-[#F4F2E9] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#D0D9CC]"><span className="h-1.5 w-1.5 rounded-full bg-[#D7F27B]" /> Vestor · interactive preview</div>
          <span className="text-[9px] text-[#BCCABD]">All values illustrative</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 border-b border-white/15 py-3 sm:gap-2.5" role="group" aria-label="Choose a product preview">
          {(["learn", "money", "practice"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`min-h-9 px-2 text-[9px] font-semibold uppercase tracking-[0.09em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F27B] sm:min-h-10 sm:text-[10px] ${view === item ? "bg-[#D7F27B] text-[#10251D]" : "border border-white/20 text-[#D5DED2] hover:border-[#D7F27B] hover:text-white"}`}>{item === "practice" ? "Paper" : item}</button>)}
        </div>
        <div aria-live="polite" className="min-h-[238px] pt-4 sm:min-h-[282px] sm:pt-5">
          {view === "practice" ? <div className="grid h-full grid-cols-[1fr_95px] gap-3 sm:grid-cols-[1fr_132px] sm:gap-5">
            <div className="min-w-0"><p className="text-[9px] text-[#C4D0C2]">SAMPLE PAPER ACCOUNT · VIRTUAL</p><p className="mt-2 font-display text-[36px] leading-none tracking-[-0.045em] sm:text-[48px]">₹1,00,000</p><p className="mt-1.5 text-[9px] text-[#C4D0C2]">Practice balance · not real cash</p>
              <svg viewBox="0 0 430 162" className="mt-3 h-[130px] w-full overflow-visible sm:h-[164px]" role="img" aria-label="Illustrative portfolio chart, not live market data">
                {[26, 62, 98, 134].map((y) => <line key={y} x1="0" x2="430" y1={y} y2={y} stroke="#DDE7D8" strokeOpacity="0.17" />)}
                <path d="M0 125 C24 119 33 94 58 102 S92 109 113 80 S148 67 167 85 S201 93 220 58 S255 64 274 49 S301 70 327 39 S360 44 380 28 S405 34 430 14" fill="none" stroke="#D7F27B" strokeWidth="3" strokeLinecap="round" className={reduceMotion ? "" : "landing-chart-line"} />
                <circle cx="430" cy="14" r="5" fill="#D7F27B" stroke="#F4F2E9" strokeWidth="2" />
                <text x="0" y="158" fill="#C4D0C2" fontSize="9">Illustrative movement · no live prices</text>
              </svg>
            </div>
            <div className="flex flex-col justify-between border-l border-white/20 pl-3 sm:pl-5"><div><p className="text-[9px] text-[#C4D0C2]">A useful next move</p><p className="mt-2 font-display text-[18px] font-semibold leading-[1.05] text-[#F4F2E9] sm:text-[22px]">Learn first.</p></div><Link to="/paper-trading" className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#D7F27B] underline underline-offset-4">Open practice <ArrowUpRight className="h-3 w-3" /></Link></div>
          </div> : null}
          {view === "money" ? <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr] sm:items-center sm:gap-8">
            <div><p className="text-[9px] text-[#C4D0C2]">SAMPLE MONTH · TAKE-HOME INCOME</p><p className="mt-2 font-display text-[36px] leading-none tracking-[-0.045em] sm:text-[48px]">₹80,000</p><p className="mt-2 text-[9px] text-[#C4D0C2]">Illustrative plan and recorded activity</p><Link to="/money" className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#D7F27B] underline underline-offset-4">Explore Money <ArrowUpRight className="h-3 w-3" /></Link></div>
            <div className="space-y-4 border-l border-white/20 pl-4 sm:pl-6">{[{name:"Essentials",value:"₹32,400",width:"68%",color:"#D7F27B"},{name:"Flexible",value:"₹14,250",width:"46%",color:"#88C6A0"},{name:"Savings",value:"₹9,000",width:"32%",color:"#CAD8F0"}].map((row)=><div key={row.name}><div className="flex justify-between gap-2 text-[10px]"><span className="text-[#E5EAE0]">{row.name}</span><span className="text-[#D0D9CC]">{row.value}</span></div><div className="mt-1.5 h-1 bg-white/15"><div className="h-full" style={{width:row.width,backgroundColor:row.color}} /></div></div>)}</div>
          </div> : null}
          {view === "learn" ? <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr] sm:items-center sm:gap-7">
            <div><p className="text-[9px] text-[#C4D0C2]">A REAL LESSON SCENARIO · NEEDS & WANTS</p><h2 className="mt-2 max-w-[390px] font-display text-[25px] leading-[1.04] tracking-[-0.035em] sm:text-[34px]">Riya’s shift ends late. How does she get home?</h2><Link to="/learn" className="mt-4 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#D7F27B] underline underline-offset-4">Explore learning <ArrowUpRight className="h-3 w-3" /></Link></div>
            <div><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={answer === "need"} onClick={() => setAnswer("need")} className={`min-h-11 px-2 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F27B] ${answer === "need" ? "bg-[#D7F27B] text-[#10251D]" : "border border-white/25 text-white hover:border-[#D7F27B]"}`}>A safe ride</button><button type="button" aria-pressed={answer === "want"} onClick={() => setAnswer("want")} className={`min-h-11 px-2 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F27B] ${answer === "want" ? "bg-[#D7F27B] text-[#10251D]" : "border border-white/25 text-white hover:border-[#D7F27B]"}`}>A premium upgrade</button></div><p aria-live="polite" className="mt-3 min-h-[48px] border-t border-white/20 pt-3 text-[10px] leading-4 text-[#D0D9CC]">{answer === "need" ? "In this situation, a safe ride after a late shift can be essential. Context matters." : answer === "want" ? "A premium upgrade may be flexible, but safety and timing change the decision." : "Choose an answer. The lesson changes with the situation."}</p></div>
          </div> : null}
        </div>
      </div>
    </motion.div>
  );
}

function LessonDemo() {
  const [choice, setChoice] = useState<"need" | "want" | null>(null);
  return (
    <div className="relative mx-auto max-w-[510px] border-y border-[#9DAB9C] bg-[#E9E8DD] p-4 sm:p-6">
      <div className="flex items-center justify-between border-b border-[#DADFD4] pb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#52705F]">Lesson preview</span>
        <span className="text-[10px] font-semibold text-[#718075]">Needs &amp; wants · 2 of 8</span>
      </div>
      <p className="mt-5 max-w-[410px] font-display text-[22px] leading-[1.12] tracking-[-0.025em] text-[#10231B] sm:text-[27px]">Riya’s shift ends late. Is a safe cab home a need or a want?</p>
      <p className="mt-2 text-xs leading-5 text-[#58675D]">Think about the situation, not just the category.</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {(["need", "want"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={choice === option} onClick={() => setChoice(option)} className={`flex min-h-12 items-center justify-between border px-3.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${choice === option ? "border-[#276448] bg-[#E3EEE4] text-[#173F2D]" : "border-[#DADFD4] bg-white text-[#35483D] hover:border-[#769583]"}`}>
            {option === "need" ? "A need" : "A want"}{choice === option ? <Check className="h-4 w-4" /> : <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
          </button>
        ))}
      </div>
      <div aria-live="polite" className={`mt-3 min-h-[42px] border-l-2 pl-3 text-[11px] leading-5 ${choice ? "border-[#4B8A65] text-[#395647]" : "border-[#C7D1C5] text-[#718075]"}`}>
        {choice === "need" ? "In this context, a safe way home after a late shift can be essential. Context matters." : choice === "want" ? "A flexible upgrade can be a want; this scenario asks you to consider Riya’s safety and timing." : "Choose an answer to reveal the lesson’s explanation."}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#DADFD4] pt-3 text-[10px] text-[#718075]">
        <span>Interactive scenario · sample lesson</span><span className="flex items-center gap-1">Step 2 <ChevronDown className="h-3 w-3 -rotate-90" /></span>
      </div>
    </div>
  );
}

function MoneyPreview() {
  const rows = [
    { label: "Planned essentials", plan: "₹35,000", actual: "₹32,400", fill: "w-[74%]", color: "bg-[#9CCDA8]" },
    { label: "Flexible spending", plan: "₹18,000", actual: "₹14,250", fill: "w-[48%]", color: "bg-[#E9C68C]" },
    { label: "Savings goals", plan: "₹12,000", actual: "₹9,000", fill: "w-[34%]", color: "bg-[#B9C7E5]" },
  ];
  return (
    <div className="relative mx-auto max-w-[550px] border border-white/15 bg-[#1B3228] p-4 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/12 pb-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B4C7BA]">Illustrative month</p><p className="mt-2 font-display text-3xl tracking-[-0.035em]">₹80,000</p><p className="mt-1 text-[10px] text-[#B4C7BA]">Example take-home income</p></div>
        <span className="flex h-9 w-9 items-center justify-center border border-white/15 text-[#CBE4D1]"><Wallet className="h-4 w-4" /></span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-[#C4D1C8]">
        <span>PLANNED</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[#9CCDA8]" /> Needs</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[#E9C68C]" /> Wants</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 bg-[#B9C7E5]" /> Savings</span>
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((row) => <div key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-[10px]"><span className="text-[#E3EBE5]">{row.label}</span><span className="text-[#B4C7BA]">Plan {row.plan}<span className="mx-1.5 text-white/25">/</span>Actual {row.actual}</span></div>
          <div className="mt-2 h-1.5 bg-white/10"><div className={`h-full ${row.color} ${row.fill}`} /></div>
        </div>)}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/12 pt-3 text-[10px]">
        <span className="text-[#B4C7BA]">Remaining after these examples</span><span className="font-semibold text-[#D4E9D8]">₹24,350</span>
      </div>
      <p className="mt-2 text-[9px] text-[#9DB1A3]">Illustrative figures · actual totals depend on your recorded transactions.</p>
    </div>
  );
}

function MarketPreview() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantityInput, setQuantityInput] = useState("2");
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const instruments = [
    { name: "Sample equity A", quote: 2450, bars: [139,121,132,104,88,106,75,91,58,74,44,61,38,48] },
    { name: "Sample equity B", quote: 1280, bars: [74,92,68,101,81,114,96,122,104,143,119,151,132,158] },
    { name: "Sample equity C", quote: 860, bars: [120,108,136,117,95,112,78,94,105,83,97,68,78,55] },
  ];
  const instrument = instruments[instrumentIndex];
  const quantity = Math.max(0, Math.min(100, Number(quantityInput) || 0));
  const estimate = quantity * instrument.quote;
  return (
    <div className="grid overflow-hidden border border-[#CBD6CA] bg-[#F8F7F1] md:grid-cols-[1.4fr_0.8fr]">
      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] text-[#687A6D]">Sample instrument · illustrative</p><p className="mt-1 text-sm font-semibold text-[#15291F]">{instrument.name}</p></div>
          <span className="border border-[#C6D2C6] px-2 py-1 text-[9px] font-semibold text-[#53695A]">SIMULATED</span>
        </div>
        <div className="mt-5 flex items-baseline gap-2"><span className="font-display text-[26px] tracking-[-0.04em] text-[#11251C]">{inr.format(instrument.quote)}</span><span className="text-[10px] font-medium text-[#4E815D]">Example quote · illustrative</span></div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose a sample instrument">
          {instruments.map((item, index) => <button key={item.name} type="button" aria-label={item.name} aria-pressed={instrumentIndex === index} onClick={() => setInstrumentIndex(index)} className={`min-h-8 border px-2.5 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${instrumentIndex === index ? "border-[#224F38] bg-[#224F38] text-white" : "border-[#C9D3C8] text-[#53695A] hover:border-[#708D76]"}`}>Sample {String.fromCharCode(65+index)}</button>)}
        </div>
        <svg viewBox="0 0 560 210" className="mt-3 h-[170px] w-full" role="img" aria-label="Illustrative candlestick chart, not market data">
          {[35, 80, 125, 170].map((y) => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#DCE2D9" strokeWidth="1" />)}
          {instrument.bars.map((close, index, bars) => {
            const open = index === 0 ? 148 : bars[index - 1];
            const high = Math.max(open, close) - 12;
            const low = Math.min(open, close) + 12;
            const bar = { x: 18 + index * 39, o: open, c: close, h: high, l: low };
            const up = bar.c < bar.o;
            return <g key={bar.x} stroke={up ? "#347A50" : "#BF715F"} fill={up ? "#68A879" : "#D88C78"}>
              <line x1={bar.x + 8} x2={bar.x + 8} y1={bar.h} y2={bar.l} strokeWidth="1.5" />
              <rect x={bar.x} y={Math.min(bar.o, bar.c)} width="16" height={Math.max(5, Math.abs(bar.o - bar.c))} />
            </g>;
          })}
          <text x="2" y="202" fill="#748378" fontSize="9">Illustrative candles · not live data</text>
        </svg>
        <p aria-live="polite" className="sr-only">{instrument.name}, example quote {inr.format(instrument.quote)}, illustrative candles only</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#DCE2D9] pt-3 text-[9px] text-[#687A6D]"><span>Portfolio practice</span><span>Positions explained</span><span>Virtual capital only</span></div>
      </div>
      <div className="border-t border-[#CBD6CA] bg-[#EFF1E9] p-4 sm:p-6 md:border-l md:border-t-0">
        <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-[#14281F]">Order preview</h3><span className="text-[9px] font-semibold uppercase tracking-wide text-[#687A6D]">Virtual</span></div>
        <div className="mt-3 flex items-center justify-between gap-3 border-y border-[#D5DDD1] py-2.5"><div><p className="text-[9px] font-semibold text-[#40594A]">Sample account · virtual cash</p><p className="mt-0.5 text-[9px] text-[#748378]">Illustrative balance · not persisted</p></div><span className="font-display text-[19px] tracking-[-0.035em] text-[#14281F]">₹1,00,000</span></div>
        <div className="mt-4 grid grid-cols-2 border border-[#CDD6CB] bg-[#E6EAE0] p-1" role="group" aria-label="Sample order side">
          {(["buy", "sell"] as const).map((option) => <button key={option} type="button" aria-pressed={side === option} onClick={() => setSide(option)} className={`min-h-9 text-[10px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${side === option ? option === "buy" ? "bg-[#276448] text-white" : "bg-[#8D493D] text-white" : "text-[#5B6C60] hover:text-[#14281F]"}`}>{option}</button>)}
        </div>
        <label htmlFor="sample-quantity" className="mt-4 block text-[10px] font-semibold text-[#53695A]">Quantity</label>
        <div className="mt-1.5 flex h-10 items-center justify-between border border-[#CDD6CB] bg-white px-3">
          <button type="button" aria-label="Reduce sample quantity" onClick={() => setQuantityInput(String(Math.max(1, quantity - 1)))} className="flex h-8 w-8 items-center justify-center text-base text-[#52685A] hover:bg-[#F1F4EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">−</button>
          <input id="sample-quantity" type="number" min="1" max="100" step="1" value={quantityInput} onChange={(event) => {
            const value = event.target.value;
            if (value === "" || /^\d{1,3}$/.test(value)) setQuantityInput(value);
          }} onBlur={() => setQuantityInput(String(Math.max(1, Math.min(100, Number(quantityInput) || 1))))} className="h-8 w-16 border-0 bg-transparent text-center text-xs font-semibold tabular-nums text-[#14281F] outline-none" />
          <button type="button" aria-label="Increase sample quantity" onClick={() => setQuantityInput(String(Math.min(100, quantity + 1)))} className="flex h-8 w-8 items-center justify-center text-base text-[#52685A] hover:bg-[#F1F4EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">+</button>
        </div>
        <div className="mt-4 flex items-center justify-between border-y border-[#D5DDD1] py-3 text-[10px]"><span className="text-[#687A6D]">Sample {side} total</span><span aria-live="polite" className="font-semibold tabular-nums text-[#14281F]">{inr.format(estimate)}</span></div>
        <p className="mt-3 text-[9px] leading-4 text-[#687A6D]">Preview only. A real paper order uses a fresh provider quote and your persisted virtual account.</p>
        <Link to="/paper-trading" className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 bg-[#10231B] px-4 text-[10px] font-semibold text-white transition-colors hover:bg-[#1B3D2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2">Try paper trading <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
    </div>
  );
}

function FinancialControlRoom() {
  const [focus, setFocus] = useState<"month" | "portfolio" | "practice">("portfolio");
  const views = {
    month: { label: "Monthly cash flow", value: "₹80,000", sub: "Illustrative take-home income", note: "Planned essentials · ₹35,000", path: "M0 136 C32 130 45 92 76 105 S119 120 147 85 S195 102 222 74 S265 88 295 60 S334 77 365 48 S402 59 430 32" },
    portfolio: { label: "Portfolio value", value: "₹1,00,000", sub: "Illustrative holdings value", note: "Example movement · no return claim", path: "M0 142 C26 133 33 101 61 110 S101 123 128 85 S166 72 190 91 S226 105 247 63 S282 70 307 54 S336 78 364 43 S397 52 430 20" },
    practice: { label: "Paper cash", value: "₹1,00,000", sub: "Simulated account · virtual only", note: "Sample balance · no broker orders", path: "M0 107 C30 113 41 82 74 90 S111 116 144 100 S181 54 211 73 S253 93 279 65 S315 85 344 55 S394 64 430 42" },
  };
  const current = views[focus];
  return (
    <section aria-labelledby="control-room-heading" className="overflow-hidden bg-[#0D1814] text-[#F4F1E8]">
      <div className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-8 border-b border-[#809487]/35 pb-9 md:grid-cols-[1fr_0.8fr] md:items-end md:gap-12">
          <h2 id="control-room-heading" className="max-w-[720px] font-display text-[clamp(2.5rem,5vw,4.6rem)] leading-[0.93] tracking-[-0.055em]">The full picture changes the next move.</h2>
          <p className="max-w-[440px] text-sm leading-6 text-[#CBD6CB]">Trace monthly cash flow. Understand what you hold. Practise a market decision with virtual money. The examples below show how those views connect.</p>
        </div>
        <div className="grid gap-8 pt-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:pt-10">
          <div className="min-w-0"><MoneyPreview /></div>
          <div className="landing-control-panel relative flex min-h-[360px] flex-col justify-between border-y border-[#819487]/45 py-5 sm:min-h-[400px] sm:py-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#CBD6CB]">Choose a view</p><span className="text-[9px] text-[#CBD6CB]">Example data · not connected</span></div>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose a financial snapshot">
                {(["month", "portfolio", "practice"] as const).map((item) => <button key={item} type="button" aria-pressed={focus === item} onClick={() => setFocus(item)} className={`min-h-9 px-3 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7F27B] ${focus === item ? "bg-[#D7F27B] text-[#10251D]" : "border border-[#829487]/55 text-[#E4EAE0] hover:border-[#D7F27B]"}`}>{item === "month" ? "Money" : item === "portfolio" ? "Investments" : "Paper trade"}</button>)}
              </div>
              <div aria-live="polite" className="mt-8">
                <p className="text-xs font-medium text-[#D7F27B]">{current.label}</p>
                <p className="mt-2 font-display text-[clamp(2.6rem,5vw,4.6rem)] leading-none tracking-[-0.06em]">{current.value}</p>
                <p className="mt-2 text-[10px] text-[#CBD6CB]">{current.sub}</p>
                <svg viewBox="0 0 430 170" className="mt-6 h-[142px] w-full" role="img" aria-label={`${current.label}, illustrative chart only`}>
                  {[30,70,110,150].map((y)=><line key={y} x1="0" x2="430" y1={y} y2={y} stroke="#D9E4D7" strokeOpacity="0.15" />)}
                  <path d={current.path} fill="none" stroke="#D7F27B" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[#819487]/35 pt-3 text-[10px]"><span className="text-[#CBD6CB]">{current.note}</span><span className="shrink-0 text-[#D7F27B]">Illustrative view</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionFlow() {
  const steps = [
    { title: "Learn the why.", text: "Work through a real money choice, then see how the concept applies.", href: "/learn", link: "Open a lesson" },
    { title: "Read your month.", text: "Review income, spending and plans from the data you choose to record or connect.", href: "/money", link: "See Money" },
    { title: "Know what you own.", text: "Track the holdings in your portfolio and see the quotes available for them.", href: "/invest", link: "View investments" },
    { title: "Practise the call.", text: "Explore a position with virtual capital. No trade is sent to a broker.", href: "/paper-trading", link: "Enter the simulator" },
  ];
  return (
    <section id="journey" aria-labelledby="decision-flow-heading" className="scroll-mt-[76px] bg-[#E8E9DC]">
      <div className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
          <h2 id="decision-flow-heading" className="max-w-[590px] font-display text-[clamp(2.5rem,5vw,4.8rem)] leading-[0.94] tracking-[-0.055em]">From money question to market decision.</h2>
          <p className="max-w-[470px] pb-1 text-sm leading-6 text-[#536259]">One useful sequence: understand a concept, put it beside your own money picture, then practise the decision without risking real cash.</p>
        </div>
        <div className="landing-decision-flow mt-12 grid border-y border-[#B9C2B3] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step,index)=><article key={step.title} className={`relative border-b border-[#B9C2B3] py-6 last:border-b-0 sm:px-5 sm:odd:border-r sm:odd:pl-0 lg:border-b-0 lg:border-l lg:pl-5 lg:odd:border-r-0 ${index===0 ? "lg:border-l-0" : ""} md:py-8`}>
            <span className="font-display text-[clamp(2.8rem,4vw,4.2rem)] leading-none tracking-[-0.06em] text-[#738570]">{String(index+1).padStart(2,"0")}</span>
            <h3 className="mt-5 font-display text-[28px] leading-none tracking-[-0.04em] text-[#10251D] sm:text-[34px]">{step.title}</h3>
            <p className="mt-3 max-w-[330px] text-xs leading-5 text-[#536259]">{step.text}</p>
            <Link to={step.href} className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold text-[#23523A] underline underline-offset-4 hover:text-[#10251D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">{step.link}<ArrowUpRight className="h-3 w-3" /></Link>
          </article>)}
        </div>
      </div>
    </section>
  );
}

function MoneySimulator() {
  const [income, setIncome] = useState(30000);
  const [shares, setShares] = useState<BudgetShares>({ needs: 50, wants: 30, savings: 20 });
  const budget = calculateBudget(income, shares);
  const segments = [
    { key: "needs", label: "Needs", color: "#397957", amount: budget.needsAmount, share: shares.needs },
    { key: "wants", label: "Wants", color: "#C99243", amount: budget.wantsAmount, share: shares.wants },
    { key: "savings", label: "Savings", color: "#667FAF", amount: budget.savingsAmount, share: shares.savings },
  ];
  return (
    <section id="simulator" className="scroll-mt-24 overflow-hidden bg-[#D7F27B]">
      <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <h2 className="max-w-[560px] font-display text-[clamp(2.7rem,5vw,5rem)] leading-[0.93] tracking-[-0.055em] text-[#10231B]">Your month is a set of choices.</h2>
          <p className="mt-5 max-w-[440px] text-sm leading-6 text-[#304533]">Move the income or category shares. See the whole plan rebalance instantly.</p>
          <div className="mt-7 flex items-center gap-3 border-t border-[#7B8D63]/45 pt-4 text-[10px] leading-4 text-[#304533]">
            <CircleHelp className="h-4 w-4 shrink-0 text-[#315B3B]" /> An educational example, not personalised financial advice. Real budgets depend on your circumstances.
          </div>
          <Link to="/register" className="mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[#315B3B] pb-1 text-xs font-bold text-[#193C2A] transition-colors hover:border-[#10231B] hover:text-[#10231B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10231B]">Continue learning inside Vestor <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="border-y border-[#82915F]/55 py-5 sm:py-7 lg:border-y-0 lg:border-l lg:pl-10">
          <div className="flex flex-col justify-between gap-4 border-b border-[#D8DED3] pb-5 sm:flex-row sm:items-end">
            <div><label htmlFor="sim-income" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#657569]">Monthly income · example</label><p aria-live="polite" className="mt-2 font-display text-[34px] leading-none tracking-[-0.04em] text-[#10231B] sm:text-[42px]">{inr.format(income)}</p></div>
            <span className="inline-flex h-fit items-center gap-1.5 border border-[#D8DED3] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#5A6C5E]"><span className="h-1.5 w-1.5 rounded-full bg-[#A5C5AA]" /> 50 / 30 / 20 starting point</span>
          </div>
          <input id="sim-income" aria-label="Monthly income in rupees" type="range" min="10000" max="150000" step="5000" value={income} onChange={(event) => setIncome(Number(event.target.value))} className="landing-range mt-5 w-full cursor-pointer" />
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-[#7A887D]"><span>₹10,000</span><span>₹1,50,000</span></div>

          <div className="mt-7 space-y-5">
            {segments.map((segment) => <div key={segment.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[115px_1fr_100px]">
              {segment.key !== "savings" ? <label htmlFor={`share-${segment.key}`} className="text-xs font-semibold text-[#31463A]">{segment.label}</label> : <span className="text-xs font-semibold text-[#31463A]">{segment.label}</span>}
              {segment.key !== "savings" ? <input id={`share-${segment.key}`} aria-label={`${segment.label} share percent`} type="range" min="0" max={segment.key === "needs" ? 100 - shares.wants : 100 - shares.needs} step="1" value={segment.share} onChange={(event) => setShares((current) => updateBudgetShare(current, segment.key as "needs" | "wants", Number(event.target.value)))} className="landing-range col-span-2 w-full cursor-pointer sm:col-span-1" style={{ accentColor: segment.color }} /> : <div className="col-span-2 flex items-center gap-3 sm:col-span-1"><div className="h-1.5 flex-1 bg-[#E2E6DE]"><div className="h-1.5" style={{ width: `${segment.share}%`, backgroundColor: segment.color }} /></div><span className="w-9 text-right text-[10px] font-semibold tabular-nums text-[#53695A]">{segment.share}%</span></div>}
              <div className="col-start-2 row-start-1 text-right sm:col-start-3">{segment.key !== "savings" ? <span className="mr-2 text-[10px] tabular-nums text-[#758176]">{segment.share}%</span> : null}<span className="text-xs font-semibold tabular-nums text-[#14281F]">{inr.format(segment.amount)}</span></div>
            </div>)}
          </div>

          <div className="mt-7 flex h-2 overflow-hidden" role="img" aria-label={`Budget split: ${shares.needs}% needs, ${shares.wants}% wants, ${shares.savings}% savings`}>
            {segments.map((segment) => <div key={segment.key} style={{ width: `${segment.share}%`, backgroundColor: segment.color }} className="transition-[width] duration-200" />)}
          </div>
          <div aria-live="polite" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#627267]"><span>Allocated: {inr.format(budget.needsAmount + budget.wantsAmount + budget.savingsAmount)}</span><span>Left unassigned: {inr.format(income - budget.needsAmount - budget.wantsAmount - budget.savingsAmount)}</span></div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.title = "Vestor — Know your money. Master your future.";
    document.documentElement.style.scrollBehavior = reduceMotion ? "auto" : "smooth";
    return () => {
      document.title = previousTitle;
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page min-h-screen bg-[#F4F1E8] text-[#10231B]">
      <header className="sticky top-0 z-40 border-b border-[#D8DDD3] bg-[#F5F2EA]">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:h-[76px] sm:px-8 lg:px-12">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            <a href="#experiences" className="landing-nav-link">Platform</a>
            <Link to="/money" className="landing-nav-link">Money</Link>
            <Link to="/learn" className="landing-nav-link">Learn</Link>
            <Link to="/invest" className="landing-nav-link">Investments</Link>
            <Link to="/paper-trading" className="landing-nav-link">Paper Trading</Link>
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            <Link to="/login" className="landing-nav-link">Sign in</Link>
            <Link to="/register" className="inline-flex min-h-10 items-center gap-2 bg-[#183B2B] px-4 text-[11px] font-semibold text-white transition-colors hover:bg-[#28583D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2">Get started <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"} className="flex h-10 w-10 items-center justify-center border border-[#D8DDD3] text-[#173A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] lg:hidden">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#D8DDD3] bg-[#F5F2EA] px-5 py-4 shadow-[0_16px_24px_-22px_rgba(16,37,29,0.5)] lg:hidden">
          <div className="mx-auto grid max-w-[700px] gap-1">
            <a href="#experiences" onClick={closeMenu} className="landing-mobile-link">Platform</a>
            <Link to="/money" onClick={closeMenu} className="landing-mobile-link">Money</Link>
            <Link to="/learn" onClick={closeMenu} className="landing-mobile-link">Learn</Link>
            <Link to="/invest" onClick={closeMenu} className="landing-mobile-link">Investments</Link>
            <Link to="/paper-trading" onClick={closeMenu} className="landing-mobile-link">Paper Trading</Link>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#D8DDD3] pt-3">
              <Link to="/login" onClick={closeMenu} className="flex min-h-11 items-center justify-center border border-[#BFCABD] text-xs font-semibold text-[#244B36]">Sign in</Link>
              <Link to="/register" onClick={closeMenu} className="flex min-h-11 items-center justify-center gap-1.5 bg-[#183B2B] text-xs font-semibold text-white">Get started <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </nav> : null}
      </header>

      <a href="#main-content" className="sr-only z-50 bg-[#10231B] px-4 py-3 text-xs font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <main id="main-content">
        <section className="landing-hero relative overflow-hidden bg-[#10251D] text-[#F4F1E8]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.13]" aria-hidden="true"><div className="landing-hero-grid absolute inset-0" /></div>
          <div className="relative mx-auto grid max-w-[1480px] items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:min-h-[calc(100svh-76px)] lg:grid-cols-[1.04fr_0.96fr] lg:gap-12 lg:px-12 lg:pb-[92px] lg:pt-[70px]">
            <div className="relative z-10 max-w-[650px]">
              <h1 className="max-w-[760px] font-display text-[clamp(3rem,5.1vw,5.2rem)] leading-[0.9] tracking-[-0.065em] text-[#F4F1E8]">Know your money.<br /><span className="text-[#D7F27B]">Master your future.</span></h1>
              <p className="mt-7 max-w-[450px] text-[15px] leading-[1.7] text-[#D0D9CC] sm:text-base">Learn financial skills, understand your investments and practise trading—all in one place.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/register" className="inline-flex min-h-[50px] items-center gap-3 bg-[#D7F27B] px-5 text-xs font-bold text-[#10251D] transition-colors hover:bg-[#E5F7B0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10251D]">Start learning <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/paper-trading" className="inline-flex min-h-[50px] items-center gap-2 border border-[#84988A] px-4 text-xs font-semibold text-[#F4F1E8] transition-colors hover:border-[#D7F27B] hover:text-[#D7F27B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#10251D]">Explore paper trading <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#708477]/50 pt-4 text-[10px] text-[#D0D9CC] sm:mt-10">
                <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-[#D7F27B]" /> Learn by doing</span>
                <span className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-[#D7F27B]" /> Understand your plan</span>
                <span className="flex items-center gap-2"><PieChart className="h-3.5 w-3.5 text-[#D7F27B]" /> Practise with virtual money</span>
              </div>
            </div>
            <HeroWorkspace reduceMotion={Boolean(reduceMotion)} />
          </div>
          <a href="#journey" aria-label="Scroll to the Vestor journey" className="absolute bottom-5 left-1/2 hidden h-9 w-9 -translate-x-1/2 items-center justify-center border border-[#84988A] text-[#D7F27B] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:flex"><ArrowDown className="h-4 w-4" /></a>
        </section>

        <FinancialControlRoom />

        <section id="experiences" className="scroll-mt-[76px] overflow-hidden bg-[#F4F1E8]">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24">
            <div><h2 className="max-w-[520px] font-display text-[clamp(2.6rem,5vw,4.7rem)] leading-[0.93] tracking-[-0.055em]">A money lesson should change how you see the day.</h2><p className="mt-5 max-w-[420px] text-sm leading-6 text-[#536259]">Try one from Vestor Learn. Choose what Riya should do, then see why the details matter.</p><Link to="/learn" className="mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[#66876F] text-xs font-semibold text-[#245439] hover:text-[#10251D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">Explore learning <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="relative lg:pl-8"><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-8 hidden font-display text-[220px] leading-none tracking-[-0.1em] text-[#E7E9DC] lg:block">?</div><LessonDemo /></div>
          </div>
        </section>

        <MoneySimulator />
        <DecisionFlow />

        <section id="markets" className="scroll-mt-[76px] overflow-hidden bg-[#101B16] text-[#F4F1E8]">
          <div className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="grid gap-7 lg:grid-cols-[1fr_0.75fr] lg:items-end lg:gap-16">
              <h2 className="max-w-[760px] font-display text-[clamp(2.8rem,6vw,6rem)] leading-[0.9] tracking-[-0.06em]">Markets move.<br /><span className="text-[#D7F27B]">Learn to read them.</span></h2>
              <p className="max-w-[410px] text-sm leading-6 text-[#D0D9CC]">Track holdings in Invest, then practise an order in a separate paper account. Change the sample instrument below; the chart and estimated order value respond.</p>
            </div>
            <div className="mt-10 grid items-start gap-10 border-t border-[#88978B]/40 pt-7 lg:grid-cols-[0.32fr_0.68fr] lg:gap-14 lg:pt-9">
              <div className="lg:sticky lg:top-28"><p className="font-display text-[30px] leading-tight tracking-[-0.04em]">Position before prediction.</p><p className="mt-3 text-xs leading-5 text-[#C1CEC2]">Paper trading uses virtual cash. It does not place orders with a real broker.</p><Link to="/invest" className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold text-[#D7F27B] underline underline-offset-4">Explore portfolio tracking <ArrowUpRight className="h-3 w-3" /></Link></div>
              <MarketPreview />
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#88978B]/40 pt-5"><span className="text-[10px] text-[#C1CEC2]">All quotes and candles on this page are illustrative, not market data.</span><Link to="/paper-trading" className="inline-flex min-h-11 items-center gap-2 bg-[#D7F27B] px-4 text-[10px] font-bold text-[#10251D] hover:bg-[#E5F7B0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Enter paper trading <ArrowUpRight className="h-4 w-4" /></Link></div>
          </div>
        </section>

        <section aria-labelledby="truth-heading" className="bg-[#F4F1E8]">
          <div className="mx-auto max-w-[1480px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="grid gap-7 border-b border-[#C5CCBF] pb-9 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-16"><h2 id="truth-heading" className="max-w-[620px] font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.93] tracking-[-0.055em]">Real understanding.<br />Clear lines around the data.</h2><p className="max-w-[450px] text-sm leading-6 text-[#536259]">Vestor shows where a number comes from and where practice ends. AI explains concepts; you stay in control of your finances.</p></div>
            <div className="grid gap-x-10 gap-y-0 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {[{title:"Learning",body:"Lessons explain money concepts and everyday choices."},{title:"Recorded money",body:"Money reflects transactions you record or connect, with categories you can review."},{title:"Tracked holdings",body:"Portfolio values depend on your holdings and available market quotes."},{title:"Virtual orders",body:"Paper trades use virtual capital and never reach a real broker."}].map((item)=><div key={item.title} className="border-b border-[#C5CCBF] py-5 sm:py-6"><h3 className="font-display text-[22px] tracking-[-0.03em] text-[#1A3A2B]">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[#536259]">{item.body}</p></div>)}
            </div>
            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-[700px] text-[11px] leading-5 text-[#536259]">Vestor AI can explain financial concepts in context. It does not execute actions or change your financial data. Market prices can be delayed or unavailable.</p><Link to="/ai" className="inline-flex min-h-10 w-fit shrink-0 items-center gap-2 border border-[#879B89] px-3.5 text-[10px] font-semibold text-[#245439] hover:bg-[#E8E9DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]">Meet Vestor AI <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          </div>
        </section>

        <section className="landing-finale relative overflow-hidden bg-[#D7F27B] text-[#10251D]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-24 font-display text-[340px] leading-none tracking-[-0.13em] text-[#10251D]/[0.06]">V</div>
          <div className="relative mx-auto grid min-h-[390px] max-w-[1480px] gap-8 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1fr_auto] md:items-end lg:min-h-[490px] lg:px-12 lg:py-24"><div><h2 className="max-w-[900px] font-display text-[clamp(3.4rem,8vw,8rem)] leading-[0.85] tracking-[-0.07em]">Your money.<br />Your next move.</h2><p className="mt-6 max-w-[490px] text-sm leading-6 text-[#304533]">Start with one question. Build from what you learn.</p></div><Link to="/register" className="inline-flex min-h-[52px] w-fit items-center gap-3 bg-[#10251D] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#294A36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10251D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#D7F27B]">Start learning <ArrowUpRight className="h-4 w-4" /></Link></div>
        </section>      </main>

      <footer className="bg-[#10231B] text-white">
        <div className="mx-auto max-w-[1440px] px-5 pb-6 pt-9 sm:px-8 lg:px-12 lg:pt-11">
          <div className="grid gap-8 border-b border-white/15 pb-8 sm:grid-cols-[1fr_auto] sm:items-start">
            <div><Brand inverse /><p className="mt-3 max-w-[320px] text-[11px] leading-5 text-[#B0C1B5]">Financial literacy, money tools and investment practice in one place.</p></div>
            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-3 text-[11px] sm:grid-cols-3">
              <Link to="/money" className="footer-link">Money</Link><Link to="/learn" className="footer-link">Learn</Link><Link to="/invest" className="footer-link">Investments</Link><Link to="/paper-trading" className="footer-link">Paper Trading</Link><Link to="/ai" className="footer-link">Vestor AI</Link><Link to="/login" className="footer-link">Sign in</Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2 pt-4 text-[9px] leading-4 text-[#91A497] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Vestor</span><span>Educational information only. Investment decisions remain yours.</span></div>
        </div>
      </footer>
    </div>
  );
}
