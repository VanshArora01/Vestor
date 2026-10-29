import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type {
  AssetSearchItem,
  CreateInvestmentPayload,
  InvestAssetType,
} from "../../../types/invest";
import { useAssetSearch } from "../hooks/useInvest";
import { assetTypeLabel, formatInr, toIsoDate } from "../utils/format";

interface AddInvestmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateInvestmentPayload) => Promise<unknown>;
  onSuccessMessage?: (message: string) => void;
}

type Step = "type" | "asset" | "details" | "review";

const TYPES: { type: InvestAssetType; label: string; blurb: string }[] = [
  { type: "stock", label: "Stocks", blurb: "Listed equities" },
  { type: "mutual_fund", label: "Mutual Funds", blurb: "MFAPI-backed schemes" },
  { type: "etf", label: "ETFs", blurb: "Exchange-traded funds" },
  { type: "gold", label: "Gold", blurb: "Physical / grams" },
  { type: "fd", label: "Fixed Deposit", blurb: "Deterministic estimate" },
  { type: "other", label: "Other", blurb: "PPF, NPS, manual" },
];

const INSTRUMENT = new Set(["stock", "mutual_fund", "etf"]);

export function AddInvestmentDialog({
  isOpen,
  onClose,
  onSubmit,
  onSuccessMessage,
}: AddInvestmentDialogProps) {
  const [step, setStep] = useState<Step>("type");
  const [assetType, setAssetType] = useState<InvestAssetType | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssetSearchItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [tradedOn, setTradedOn] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [amount, setAmount] = useState("");
  const [fdPrincipal, setFdPrincipal] = useState("");
  const [fdRate, setFdRate] = useState("");
  const [fdStart, setFdStart] = useState(toIsoDate(new Date()));
  const [fdMaturity, setFdMaturity] = useState("");
  const [fdCompounding, setFdCompounding] = useState<"simple" | "monthly" | "quarterly" | "yearly">(
    "quarterly",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchType = assetType && INSTRUMENT.has(assetType) ? assetType : undefined;
  const { data: searchData, isFetching: searching } = useAssetSearch(
    step === "asset" ? query : "",
    searchType,
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const estimated = useMemo(() => {
    const q = Number(quantity);
    const p = Number(unitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return null;
    return (q * p).toFixed(2);
  }, [quantity, unitPrice]);

  if (!isOpen) return null;

  function reset() {
    setStep("type");
    setAssetType(null);
    setQuery("");
    setSelected(null);
    setQuantity("");
    setUnitPrice("");
    setTradedOn(toIsoDate(new Date()));
    setNotes("");
    setDisplayName("");
    setAmount("");
    setFdPrincipal("");
    setFdRate("");
    setFdStart(toIsoDate(new Date()));
    setFdMaturity("");
    setFdCompounding("quarterly");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function chooseType(type: InvestAssetType) {
    setAssetType(type);
    setSelected(null);
    setQuery("");
    setError(null);
    if (INSTRUMENT.has(type)) setStep("asset");
    else setStep("details");
  }

  function validateDetails(): string | null {
    if (!assetType) return "Choose an investment type";
    if (INSTRUMENT.has(assetType)) {
      if (!selected) return "Select an asset";
      if (!quantity || Number(quantity) <= 0) return "Enter a valid quantity";
      if (!unitPrice || Number(unitPrice) <= 0) return "Enter a valid buy price";
    } else if (assetType === "gold") {
      if (!quantity || Number(quantity) <= 0) return "Enter grams";
      if (!unitPrice || Number(unitPrice) <= 0) return "Enter price per gram";
    } else if (assetType === "fd") {
      if (!displayName.trim()) return "Enter a display name";
      if (!fdPrincipal || Number(fdPrincipal) <= 0) return "Enter FD principal";
      if (!fdRate || Number(fdRate) <= 0) return "Enter interest rate";
      if (!fdStart || !fdMaturity) return "Enter FD dates";
      if (fdMaturity <= fdStart) return "Maturity must be after start date";
    } else {
      if (!displayName.trim()) return "Enter a display name";
      if ((!amount || Number(amount) <= 0) && (!quantity || !unitPrice)) {
        return "Enter an amount, or quantity and price";
      }
    }
    if (!tradedOn) return "Enter the investment date";
    return null;
  }

  async function handleSubmit() {
    const validation = validateDetails();
    if (validation || !assetType) {
      setError(validation);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateInvestmentPayload = {
        asset_type: assetType === "other" ? "other" : assetType,
        traded_on: tradedOn,
        notes: notes.trim() || undefined,
      };
      if (INSTRUMENT.has(assetType) && selected) {
        payload.asset_id = selected.id;
        payload.quantity = quantity;
        payload.unit_price = unitPrice;
      } else if (assetType === "gold") {
        payload.quantity = quantity;
        payload.unit_price = unitPrice;
        payload.gold_unit = "grams";
        payload.display_name = displayName.trim() || "Gold";
      } else if (assetType === "fd") {
        payload.display_name = displayName.trim();
        payload.fd_principal = fdPrincipal;
        payload.fd_interest_rate = fdRate;
        payload.fd_start_date = fdStart;
        payload.fd_maturity_date = fdMaturity;
        payload.fd_compounding = fdCompounding;
      } else {
        payload.display_name = displayName.trim();
        if (amount) payload.amount = amount;
        if (quantity) payload.quantity = quantity;
        if (unitPrice) payload.unit_price = unitPrice;
      }
      const result = (await onSubmit(payload)) as {
        holding?: { display_name: string };
        transaction?: { amount: string; quantity: string | null };
      };
      const name = result?.holding?.display_name ?? selected?.name ?? displayName;
      const qty = result?.transaction?.quantity;
      const invested = result?.transaction?.amount;
      const qtyPart =
        qty && Number(qty) > 0
          ? ` · ${Number(qty).toLocaleString("en-IN")} ${
              assetType === "gold" ? "g" : assetType === "mutual_fund" ? "units" : "shares"
            }`
          : "";
      onSuccessMessage?.(
        invested
          ? `Investment added — ${name}${qtyPart} · ${formatInr(invested)}`
          : `Investment added — ${name}${qtyPart}`,
      );
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add investment"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
        <button type="button" className="absolute inset-0 bg-ink-950/40" aria-label="Close" onClick={handleClose} />
        <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-950">Add Investment</h2>
              <p className="text-xs text-ink-500">
                {step === "type" && "Choose type"}
                {step === "asset" && "Search instrument"}
                {step === "details" && "Enter details"}
                {step === "review" && "Confirm"}
              </p>
            </div>
            <Button variant="ghost" type="button" onClick={handleClose} className="!px-2">
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {step === "type" ? (
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => chooseType(t.type)}
                    className="rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-teal-700/40 hover:bg-teal-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30"
                  >
                    <p className="text-sm font-semibold text-ink-950">{t.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{t.blurb}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "asset" && assetType ? (
              <div>
                <Input
                  label={`Search ${assetTypeLabel(assetType).toLowerCase()}s`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, symbol, or ISIN"
                  autoFocus
                />
                <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                  {searching ? (
                    <li className="px-2 py-3 text-sm text-ink-400">Searching…</li>
                  ) : null}
                  {(searchData?.items ?? []).map((item) => {
                    const active = selected?.id === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 ${
                            active ? "bg-accent-soft text-accent" : "hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs opacity-80">
                            {[item.symbol, item.exchange, assetTypeLabel(item.asset_type)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                  {query.trim() && !searching && (searchData?.items.length ?? 0) === 0 ? (
                    <li className="px-2 py-3 text-sm text-ink-400">No matches</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {step === "details" && assetType ? (
              <div className="space-y-3">
                {selected ? (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-ink-950">{selected.name}</p>
                    <p className="text-xs text-ink-500">
                      {[selected.symbol, selected.exchange].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ) : null}
                {!INSTRUMENT.has(assetType) && assetType !== "gold" ? (
                  <Input
                    label="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                ) : null}
                {assetType === "gold" ? (
                  <Input
                    label="Display name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                ) : null}
                {assetType !== "fd" && assetType !== "other" ? (
                  <>
                    <Input
                      label={assetType === "gold" ? "Quantity (grams)" : "Quantity"}
                      type="number"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    <Input
                      label={assetType === "gold" ? "Price per gram" : "Buy price"}
                      type="number"
                      min="0"
                      step="any"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </>
                ) : null}
                {assetType === "other" ? (
                  <>
                    <Input
                      label="Amount"
                      type="number"
                      min="0"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Quantity (optional)"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <Input
                        label="Unit price (optional)"
                        type="number"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                {assetType === "fd" ? (
                  <>
                    <Input
                      label="Principal"
                      type="number"
                      value={fdPrincipal}
                      onChange={(e) => setFdPrincipal(e.target.value)}
                    />
                    <Input
                      label="Annual interest rate (%)"
                      type="number"
                      value={fdRate}
                      onChange={(e) => setFdRate(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Start date"
                        type="date"
                        value={fdStart}
                        onChange={(e) => setFdStart(e.target.value)}
                      />
                      <Input
                        label="Maturity date"
                        type="date"
                        value={fdMaturity}
                        onChange={(e) => setFdMaturity(e.target.value)}
                      />
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-ink-700">Compounding</span>
                      <select
                        className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm"
                        value={fdCompounding}
                        onChange={(e) =>
                          setFdCompounding(e.target.value as typeof fdCompounding)
                        }
                      >
                        <option value="simple">Simple</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </label>
                  </>
                ) : null}
                <Input
                  label="Date"
                  type="date"
                  value={tradedOn}
                  onChange={(e) => setTradedOn(e.target.value)}
                />
                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {estimated ? (
                  <p className="text-sm text-ink-500">
                    Estimated amount{" "}
                    <span className="font-semibold tabular-nums text-ink-900">
                      {formatInr(estimated)}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "review" && assetType ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Type</dt>
                  <dd className="font-semibold text-ink-950">{assetTypeLabel(assetType)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Asset</dt>
                  <dd className="text-right font-semibold text-ink-950">
                    {selected?.name ?? displayName}
                  </dd>
                </div>
                {quantity ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Quantity</dt>
                    <dd className="tabular-nums font-semibold text-ink-950">{quantity}</dd>
                  </div>
                ) : null}
                {unitPrice ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Buy price</dt>
                    <dd className="tabular-nums font-semibold text-ink-950">
                      {formatInr(unitPrice, { decimals: 2 })}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Total</dt>
                  <dd className="tabular-nums font-semibold text-ink-950">
                    {formatInr(estimated ?? amount ?? fdPrincipal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Date</dt>
                  <dd className="font-semibold text-ink-950">{tradedOn}</dd>
                </div>
              </dl>
            ) : null}

            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setError(null);
                if (step === "asset") setStep("type");
                else if (step === "details")
                  setStep(INSTRUMENT.has(assetType ?? "") ? "asset" : "type");
                else if (step === "review") setStep("details");
                else handleClose();
              }}
            >
              Back
            </Button>
            {step === "asset" ? (
              <Button type="button" disabled={!selected} onClick={() => setStep("details")}>
                Continue
              </Button>
            ) : null}
            {step === "details" ? (
              <Button
                type="button"
                onClick={() => {
                  const v = validateDetails();
                  if (v) setError(v);
                  else {
                    setError(null);
                    setStep("review");
                  }
                }}
              >
                Review
              </Button>
            ) : null}
            {step === "review" ? (
              <Button type="button" isLoading={isSubmitting} onClick={handleSubmit}>
                Add Investment
              </Button>
            ) : null}
          </div>
        </div>
      </div>
  );
}
