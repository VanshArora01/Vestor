import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDownToLine, Check, MoveUpRight } from "lucide-react";
import { StatusChip } from "../../components/ui/StatusChip";
import { calculateBudget, updateBudgetShare, type BudgetShares } from "../../features/landing/moneySimulator";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function spotlight(event: PointerEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--vl-pointer-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--vl-pointer-y", `${event.clientY - bounds.top}px`);
}

function AnimatedAmount({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const amount = useMotionValue(value);
  const formatted = useTransform(amount, (current) => rupees.format(Math.round(current)));

  useEffect(() => {
    const controls = animate(amount, value, {
      duration: reduced ? 0 : 0.55,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [amount, reduced, value]);

  return <motion.span>{formatted}</motion.span>;
}

function MonthBeat({ day }: { day: number }) {
  const beat = day < 3 ? 0 : day < 12 ? 1 : day < 30 ? 2 : 3;
  const reduceMotion = useReducedMotion();
  const [incomeConfirmed, setIncomeConfirmed] = useState(false);

  return (
    <motion.div
      key={beat}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32 }}
      className="vl-story-scene"
      aria-live="polite"
    >
      {beat === 0 ? (
        <>
          <h3>Salary lands. One tap.</h3>
          <p>Sample income is ready to confirm. Your month starts with what arrived.</p>
          <div className="vl-story-detail">
            {incomeConfirmed ? (
              <StatusChip status="SYNCED" label="Income confirmed" icon={false} className="border-white/25 text-[#8FE388]" />
            ) : (
              <button type="button" className="vl-confirm-income" onClick={() => setIncomeConfirmed(true)}>
                Confirm income
              </button>
            )}
            <strong>+ ₹80,000</strong>
          </div>
        </>
      ) : null}
      {beat === 1 ? (
        <>
          <h3>You said ₹10,000. We checked.</h3>
          <p>Your plan stays as planned. Bank-verified transfers stay as evidence.</p>
          <div className="vl-transfer-pair">
            <div className="vl-transfer-cell"><span>Planned transfer</span><strong>₹10,000</strong></div>
            <div className="vl-transfer-cell"><span>Bank verified · sample</span><strong>₹8,500</strong></div>
          </div>
        </>
      ) : null}
      {beat === 2 ? (
        <>
          <h3>One payment Vestor can’t read.</h3>
          <p>It stays uncategorised until you decide what it was.</p>
          <div className="vl-story-detail">
            <span>UPI-RAHUL K · sample</span>
            <a className="vl-story-jump" href="#unclear-payment">
              Assign ₹1,200 <MoveUpRight size={13} aria-hidden="true" />
            </a>
          </div>
        </>
      ) : null}
      {beat === 3 ? (
        <>
          <h3>The report writes itself.</h3>
          <p>A sample month, made readable. Print the report or save it as a PDF.</p>
          <div id="vl-report" className="vl-report" aria-label="Sample month report preview">
            <strong>Month in review</strong>
            <div className="vl-report-lines" aria-hidden="true">
              <i className="vl-report-line" style={{ width: "84%" }} />
              <i className="vl-report-line" style={{ width: "63%" }} />
              <i className="vl-report-line" style={{ width: "72%" }} />
            </div>
            <div className="vl-report-bars" aria-hidden="true">
              {[30, 48, 36, 54, 41, 47, 29].map((height, index) => (
                <i key={index} style={{ height: `${height}px` }} />
              ))}
            </div>
            <button type="button" className="vl-button vl-button-dark" onClick={() => window.print()}>
              <ArrowDownToLine size={15} aria-hidden="true" />
              Download PDF
            </button>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}

export function MonthStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [day, setDay] = useState(1);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progress = useTransform(scrollYProgress, [0, 1], [0.02, 1]);
  const safeToSpend = Math.max(15_800, 32_800 - (day - 1) * 590);
  const reduceMotion = useReducedMotion();

  useMotionValueEvent(scrollYProgress, "change", (scrollProgress) => {
    if (reduceMotion) return;
    const nextDay = Math.min(30, Math.max(1, Math.floor(scrollProgress * 29) + 1));
    setDay((current) => current === nextDay ? current : nextDay);
  });

  useEffect(() => {
    if (reduceMotion) setDay(30);
  }, [reduceMotion]);

  return (
    <section
      id="month"
      ref={sectionRef}
      className="vl-month"
      aria-labelledby="vl-month-title"
      onPointerMove={spotlight}
    >
      <div className="vl-month-spacer">
        <div className="vl-sticky-story vl-wrap">
          <div className="vl-story-heading">
            <h2 id="vl-month-title" className="vl-serif vl-section-title">A month in Vestor.</h2>
            <p>Scroll the calendar. See a sample month take shape, one decision at a time.</p>
          </div>
          <div className="vl-story-layout">
            <div className="vl-story-metric">
              <span className="vl-story-day">DAY {day} / 30 · SAMPLE</span>
              <span className="vl-story-safe"><AnimatedAmount value={safeToSpend} /></span>
              <span className="vl-story-safe-label">Safe to spend · sample</span>
              <div className="vl-day-strip" aria-label={`Sample day ${day} of 30`}>
                {Array.from({ length: 30 }, (_, index) => (
                  <span key={index + 1} className={`vl-day-tick ${index + 1 === day ? "is-current" : ""}`}>
                    {index === 0 || (index + 1) % 5 === 0 ? index + 1 : ""}
                  </span>
                ))}
              </div>
              <div className="vl-progress-track" aria-hidden="true">
                <motion.div className="vl-progress-bar" style={{ scaleX: reduceMotion ? 1 : progress }} />
              </div>
            </div>
            <MonthBeat day={day} />
          </div>
        </div>
      </div>
      <div className="vl-story-scenes-mobile vl-wrap" aria-label="Sample month milestones">
        {[
          ["Day 1", "Salary lands. One tap.", "Confirm the sample income that arrived.", null],
          ["Day 3", "You said ₹10,000. We checked.", "See the planned transfer beside bank-verified evidence.", null],
          ["Day 12", "One payment Vestor can’t read.", "Choose a category for a sample UPI payment.", "#unclear-payment"],
          ["Day 30", "The report writes itself.", "Print the sample month report or save it as a PDF.", "#vl-report"],
        ].map(([label, title, copy]) => (
          <motion.article
            className="vl-story-mobile-beat"
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
          >
            <span>{label} · SAMPLE</span>
            <h3 className="vl-serif">{title}</h3>
            <p>{copy}</p>
            {label === "Day 12" ? <a className="vl-story-jump" href="#unclear-payment">Assign sample payment <MoveUpRight size={13} aria-hidden="true" /></a> : null}
            {label === "Day 30" ? <button type="button" className="vl-story-jump" onClick={() => window.print()}>Download PDF <ArrowDownToLine size={13} aria-hidden="true" /></button> : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

type Bucket = "Food" | "Transport" | "People";

const initialTotals: Record<Bucket, number> = {
  Food: 8_200,
  Transport: 3_400,
  People: 2_400,
};

export function PaymentAssignment() {
  const [assigned, setAssigned] = useState<Bucket | null>(null);
  const [hovered, setHovered] = useState<Bucket | null>(null);
  const reduceMotion = useReducedMotion();
  const totals = { ...initialTotals };
  if (assigned) totals[assigned] += 1_200;

  function assign(bucket: Bucket) {
    setAssigned(bucket);
    setHovered(null);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>, bucket: Bucket) {
    event.preventDefault();
    assign(bucket);
  }

  return (
    <motion.section
      id="unclear-payment"
      className="vl-payment"
      aria-labelledby="vl-payment-title"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="vl-wrap vl-payment-grid">
        <div>
          <h2 id="vl-payment-title" className="vl-serif">Some payments need your call.</h2>
          <p className="vl-section-copy">Sample payment. Drag it into a bucket, or tap a bucket to assign it. Vestor keeps your choice for this payee.</p>
        </div>
        <div className="vl-payment-demo">
          <p>Unclear payment · sample</p>
          <button
            type="button"
            draggable={!assigned}
            onDragStart={(event) => event.dataTransfer.setData("text/plain", "UPI-RAHUL K")}
            onClick={() => {
              if (assigned) setAssigned(null);
            }}
            className={`vl-payment-chip ${assigned ? "is-assigned" : ""}`}
            aria-label={assigned ? "Assigned UPI Rahul K, click to reassign" : "UPI Rahul K, 1200 rupees. Drag or choose a bucket"}
          >
            {assigned ? <Check size={14} aria-hidden="true" /> : <MoveUpRight size={14} aria-hidden="true" />}
            UPI-RAHUL K · ₹1,200
          </button>
          <div className="vl-bucket-list" role="group" aria-label="Assign payment to a category">
            {(Object.keys(initialTotals) as Bucket[]).map((bucket) => (
              <button
                type="button"
                key={bucket}
                className={`vl-drop-bucket ${hovered === bucket ? "is-target" : ""}`}
                onClick={() => assign(bucket)}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setHovered(bucket)}
                onDragLeave={() => setHovered(null)}
                onDrop={(event) => handleDrop(event, bucket)}
              >
                <span>{bucket}</span>
                <strong>{rupees.format(totals[bucket])}</strong>
              </button>
            ))}
          </div>
          <p className="vl-remembered" aria-live="polite">
            {assigned ? "Vestor remembers this payee." : "Choose where this sample payment belongs."}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

const comparison = [
  { plan: "Rent", planned: "₹20,000", bank: "Rent", observed: "₹20,000" },
  { plan: "Food", planned: "₹10,000", bank: "Food", observed: "₹12,400", mismatch: true },
  { plan: "Transport", planned: "₹4,000", bank: "Transport", observed: "₹3,200" },
];

export function PlanEvidence() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="plan-evidence"
      className="vl-plan vl-dark"
      aria-labelledby="vl-plan-title"
      onPointerMove={spotlight}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="vl-wrap">
        <div className="vl-plan-head">
          <h2 id="vl-plan-title" className="vl-serif">Plan vs evidence.</h2>
          <p>Same sample categories. Two separate records. The lines show where they match—and where they don’t.</p>
        </div>
        <div className="vl-compare">
          <svg className="vl-compare-lines" viewBox="0 0 1000 190" preserveAspectRatio="none" aria-hidden="true">
            <path d="M470 25 C520 25 520 25 570 25 M470 85 C520 85 520 85 570 85 M470 145 C520 145 520 145 570 145" fill="none" stroke="#8FE388" strokeOpacity=".56" strokeWidth="1" />
          </svg>
          <div className="vl-compare-column">
            <h3>What you planned · sample</h3>
            {comparison.map((row) => (
              <div key={row.plan} className={`vl-compare-row ${row.mismatch ? "is-mismatch" : ""}`}>
                <span>{row.plan}</span><strong>{row.planned}</strong>
              </div>
            ))}
          </div>
          <div className="vl-compare-column">
            <h3>What the bank saw · sample</h3>
            {comparison.map((row) => (
              <div key={row.bank} className={`vl-compare-row ${row.mismatch ? "is-mismatch" : ""}`}>
                <span>{row.bank}</span><strong>{row.observed}</strong>
              </div>
            ))}
          </div>
        </div>
        <p className="vl-plan-note">Your plan is what you meant. Transactions are what happened. Vestor never edits one to match the other.</p>
      </div>
    </motion.section>
  );
}

const salary = 80_000;

export function LearningSlider() {
  const [shares, setShares] = useState<BudgetShares>({ needs: 50, wants: 30, savings: 20 });
  const reduceMotion = useReducedMotion();
  const budget = calculateBudget(salary, shares);
  const segments = [
    { key: "needs", label: "Needs", color: "#2E9E3F", amount: budget.needsAmount, share: shares.needs },
    { key: "wants", label: "Wants", color: "#A88645", amount: budget.wantsAmount, share: shares.wants },
    { key: "savings", label: "Savings", color: "#0F1A12", amount: budget.savingsAmount, share: shares.savings },
  ] as const;
  const circumference = 2 * Math.PI * 48;
  let offset = 0;

  return (
    <motion.section
      id="learn"
      className="vl-learning"
      aria-labelledby="vl-learning-title"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="vl-wrap vl-learning-grid">
        <div>
          <h2 id="vl-learning-title" className="vl-serif">Learn it with ₹80,000.</h2>
          <p className="vl-section-copy">Change the sample split. Every lesson uses your own numbers.</p>
        </div>
        <div className="vl-budget-demo">
          <div className="vl-budget-top">
            <span className="vl-preview-label">SAMPLE MONTHLY SALARY</span>
            <strong className="vl-budget-salary">{rupees.format(salary)}</strong>
          </div>
          <div className="vl-budget-body">
            <svg className="vl-donut" viewBox="0 0 120 120" role="img" aria-label={`Sample budget split: ${shares.needs}% needs, ${shares.wants}% wants, ${shares.savings}% savings`}>
              <circle cx="60" cy="60" r="48" fill="none" stroke="#cbd7c8" strokeWidth="13" />
              {segments.map((segment) => {
                const length = circumference * segment.share / 100;
                const circle = (
                  <circle
                    key={segment.key}
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="13"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              })}
            </svg>
            <div className="vl-budget-controls">
              {segments.map((segment) => (
                <label key={segment.key} className="vl-budget-control">
                  <span>{segment.label}</span>
                  {segment.key === "savings" ? (
                    <span>{segment.share}%</span>
                  ) : (
                    <input
                      type="range"
                      min="0"
                      max={segment.key === "needs" ? 100 - shares.wants : 100 - shares.needs}
                      value={segment.share}
                      aria-label={`${segment.label} share`}
                      onChange={(event) => setShares((current) => updateBudgetShare(current, segment.key, Number(event.target.value)))}
                    />
                  )}
                  <strong>{rupees.format(segment.amount)}</strong>
                </label>
              ))}
            </div>
          </div>
          <p className="vl-learning-caption">Every lesson uses your own numbers. Sample figures shown here.</p>
        </div>
      </div>
    </motion.section>
  );
}

export function YourData() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="your-data"
      className="vl-data vl-dark"
      aria-labelledby="vl-data-title"
      onPointerMove={spotlight}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="vl-wrap vl-data-grid">
        <h2 id="vl-data-title" className="vl-serif">Your numbers stay yours.</h2>
        <div className="vl-data-copy">
          <p>Bank access is read-only through the RBI Account Aggregator consent framework. You can revoke consent any time.</p>
          <p>AI explains what your numbers mean. It does not calculate them or change your financial records.</p>
        </div>
      </div>
    </motion.section>
  );
}

export function RoadmapAndFooter() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <motion.section
        className="vl-roadmap"
        aria-labelledby="vl-roadmap-title"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
      >
        <div className="vl-wrap">
          <div className="vl-roadmap-heading">
            <h2 id="vl-roadmap-title" className="vl-serif">Coming next</h2>
            <span>On the roadmap</span>
          </div>
          <div className="vl-roadmap-list">
            <div className="vl-roadmap-item">Spending forecast <span>Coming next</span></div>
            <div className="vl-roadmap-item">“Can I afford it?” simulator <span>Coming next</span></div>
          </div>
        </div>
      </motion.section>
      <section className="vl-final vl-dark" onPointerMove={spotlight} aria-labelledby="vl-final-title">
        <div className="vl-wrap">
          <div className="vl-final-content">
            <div>
              <h2 id="vl-final-title" className="vl-serif">See your month in <span className="vl-marked">60 seconds<svg viewBox="0 0 250 14" aria-hidden="true"><path d="M4 10 C52 1 152 2 246 7" /></svg></span>.</h2>
              <p>No signup needed to explore this sample month.</p>
            </div>
            <a className="vl-button" href="/register">Try the demo <MoveUpRight size={15} aria-hidden="true" /></a>
          </div>
          <footer className="vl-footer">
            <span>Vestor · Learn. Manage. Invest.</span>
            <span>Final-year project, PCTE Institute of Engineering and Technology.</span>
          </footer>
        </div>
      </section>
      <div className="vl-print-report" aria-hidden="true">
        <h1>Vestor · Sample month in review</h1>
        <p>Sample figures for illustration only.</p>
        <table>
          <thead><tr><th>Plan</th><th>Planned</th><th>Bank evidence</th></tr></thead>
          <tbody>
            {comparison.map((row) => <tr key={row.plan}><td>{row.plan}</td><td>{row.planned}</td><td>{row.observed}</td></tr>)}
          </tbody>
        </table>
        <p>Plan and transaction records stay separate.</p>
      </div>
    </>
  );
}

export default function LandingSections() {
  return (
    <>
      <MonthStory />
      <PaymentAssignment />
      <PlanEvidence />
      <LearningSlider />
      <YourData />
      <RoadmapAndFooter />
    </>
  );
}
