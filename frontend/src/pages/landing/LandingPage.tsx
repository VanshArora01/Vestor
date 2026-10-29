import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";
import { HeroCard } from "../../components/ui/HeroCard";
import "./LandingPage.css";

const LandingSections = lazy(() => import("./LandingSections"));

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const sampleTransactions = [
  { day: "01", merchant: "Salary", amount: "+ ₹80,000", category: "Income" },
  { day: "03", merchant: "Swiggy", amount: "− ₹650", category: "Food" },
  { day: "07", merchant: "Uber", amount: "− ₹1,200", category: "Transport" },
  { day: "10", merchant: "Rent", amount: "− ₹20,000", category: "Rent" },
];

const safeToSpendSteps = [90_950, 90_300, 89_100, 69_100];

function MarkedWord({ children }: { children: string }) {
  return (
    <span className="vl-marked">
      {children}
      <svg viewBox="0 0 250 14" aria-hidden="true">
        <path d="M4 10 C52 1 152 2 246 7" />
      </svg>
    </span>
  );
}

function CountedRupees({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const amount = useMotionValue(value);
  const formatted = useTransform(amount, (current) => inr.format(Math.round(current)));

  useEffect(() => {
    const controls = animate(amount, value, {
      duration: reduced ? 0 : 0.65,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [amount, reduced, value]);

  return <motion.span>{formatted}</motion.span>;
}

function HeroLedger() {
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduced) {
      setActiveIndex(sampleTransactions.length - 1);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % sampleTransactions.length);
    }, 1750);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const activeCounts = [
    { label: "Food", count: activeIndex >= 1 ? 1 : 0 },
    { label: "Transport", count: activeIndex >= 2 ? 1 : 0 },
    { label: "Rent", count: activeIndex >= 3 ? 1 : 0 },
    { label: "Income", count: activeIndex >= 0 ? 1 : 0 },
  ];

  return (
    <HeroCard className="vl-hero-card vl-ledger !p-0">
      <div className="vl-hero-card-head">
        <span>OCTOBER <i aria-hidden="true">/</i> SAMPLE MONTH</span>
        <span>DAY {sampleTransactions[activeIndex].day} / 30</span>
      </div>
      <div className="vl-hero-card-body">
        <div className="vl-ledger-main">
          <div className="vl-ledger-balance">
            <span className="vl-preview-label">Safe to spend</span>
            <strong className="vl-hero-number">
              <CountedRupees value={safeToSpendSteps[activeIndex]} />
            </strong>
          </div>
          <div className="vl-transaction-list" aria-label="Sample transactions">
            {sampleTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.merchant}
                className={`vl-transaction ${activeIndex === index ? "is-active" : ""} ${activeIndex < index ? "is-next" : ""}`}
                initial={false}
                animate={{
                  opacity: activeIndex === index ? 1 : activeIndex < index ? 0.36 : 0.68,
                  y: activeIndex === index ? 0 : activeIndex < index ? 4 : 0,
                }}
                transition={{ duration: reduced ? 0 : 0.24 }}
              >
                <span className="vl-transaction-day">{transaction.day}</span>
                <strong>{transaction.merchant}</strong>
                <span className="vl-transaction-amount">{transaction.amount}</span>
                <span className="vl-category-chip">{transaction.category}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="vl-bucket-summary" aria-label="Sample category counts">
          {activeCounts.map((bucket) => (
            <span className="vl-bucket-chip" key={bucket.label}>
              {bucket.label}
              <motion.strong
                key={`${bucket.label}-${bucket.count}`}
                initial={reduced ? false : { opacity: 0.4, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.22 }}
              >
                {bucket.count}
              </motion.strong>
            </span>
          ))}
        </div>
      </div>
    </HeroCard>
  );
}

export function LandingPage() {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    const updateScroll = () => setScrolled(window.scrollY > 0);

    document.title = "Vestor — A month, live.";
    document.documentElement.style.scrollBehavior = reduced ? "auto" : "smooth";
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });

    return () => {
      document.title = previousTitle;
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      window.removeEventListener("scroll", updateScroll);
    };
  }, [reduced]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="vestor-landing">
      <header className={`vl-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="vl-nav-inner">
          <Link to="/" className="vl-brand" aria-label="Vestor home">
            <span className="vl-brand-mark" aria-hidden="true">V</span>
            <span className="vl-brand-name">Vestor</span>
          </Link>
          <nav className="vl-nav-links" aria-label="Main navigation">
            <a className="vl-nav-link" href="#month">How it works</a>
            <a className="vl-nav-link" href="#plan-evidence">Plan vs evidence</a>
            <a className="vl-nav-link" href="#learn">Learn</a>
            <a className="vl-nav-link" href="#your-data">Your data</a>
          </nav>
          <div className="vl-nav-actions">
            <Link to="/login" className="vl-button vl-button-ghost">Sign in</Link>
            <Link to="/register" className="vl-button">Try demo</Link>
          </div>
          <button
            type="button"
            className="vl-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="vl-mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        {menuOpen ? (
          <nav id="vl-mobile-navigation" className="vl-mobile-nav" aria-label="Mobile navigation">
            <a href="#month" onClick={closeMenu}>How it works</a>
            <a href="#plan-evidence" onClick={closeMenu}>Plan vs evidence</a>
            <a href="#learn" onClick={closeMenu}>Learn</a>
            <a href="#your-data" onClick={closeMenu}>Your data</a>
            <div className="vl-mobile-actions">
              <Link to="/login" onClick={closeMenu} className="vl-button vl-button-ghost">Sign in</Link>
              <Link to="/register" onClick={closeMenu} className="vl-button">Try demo</Link>
            </div>
          </nav>
        ) : null}
      </header>

      <a className="sr-only focus:not-sr-only" href="#vl-main">Skip to content</a>
      <main id="vl-main">
        <section className="vl-wrap vl-hero" aria-labelledby="vl-hero-title">
          <div className="vl-hero-copy">
            <h1 id="vl-hero-title" className="vl-serif">
              Know your<br />
              money.<br />
              Master your<br />
              <MarkedWord>future.</MarkedWord>
            </h1>
            <p className="vl-hero-sub">Vestor reads your bank feed, sorts every rupee, and tells you what’s safe to spend. No spreadsheet.</p>
            <div className="vl-hero-actions">
              <Link to="/register" className="vl-button">Try the demo</Link>
              <a href="#month" className="vl-button vl-button-ghost">See how it works</a>
            </div>
            <p className="vl-hero-note">Sample data · No real accounts or transactions</p>
          </div>
          <HeroLedger />
        </section>

        <Suspense fallback={<div className="vl-wrap py-12 text-sm text-[#526553]" role="status">Loading the sample month…</div>}>
          <LandingSections />
        </Suspense>
      </main>
    </div>
  );
}
