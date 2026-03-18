import { useState, useCallback } from "react";
import { PlusCircle, Trash2, AlertCircle } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import { useUIStore } from "../store/uiStore";
import defaultAccounts from "../data/defaultAccounts";
import type { AccountCategory, EntryLineForm } from "../types";

// ─── Accounts grouped by category ────────────────────────────────────────────

const CATEGORY_ORDER: AccountCategory[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
];

const groupedAccounts = CATEGORY_ORDER.reduce((acc, category) => {
  acc[category] = defaultAccounts.filter((a) => a.category === category);
  return acc;
}, {} as Record<AccountCategory, typeof defaultAccounts>);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyLine = (): EntryLineForm => ({
  id: crypto.randomUUID(),
  accountId: "",
  amount: "",
});

const parsedAmount = (v: string) => parseFloat(v) || 0;

const lineTotal = (lines: EntryLineForm[]) =>
  lines.reduce((sum, l) => sum + parsedAmount(l.amount), 0);

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Account select dropdown (grouped) ───────────────────────────────────────

function AccountSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "flex-1 min-w-0 rounded-lg px-3 py-2 text-sm",
        "bg-[var(--bg-base)] border border-[var(--border)]",
        "text-[var(--text-primary)] focus:outline-none",
        "focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent",
        "transition-all duration-150",
        !value && "text-[var(--text-muted)]",
      ].join(" ")}
    >
      <option value="" disabled>
        Select account…
      </option>
      {CATEGORY_ORDER.map((category) => (
        <optgroup key={category} label={category}>
          {groupedAccounts[category].map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.accountName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ─── A single debit or credit line ───────────────────────────────────────────

function EntryLineRow({
  line,
  indent,
  onAccountChange,
  onAmountChange,
  onRemove,
  canRemove,
}: {
  line: EntryLineForm;
  indent: boolean;
  onAccountChange: (id: string, accountId: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${indent ? "pl-8" : ""}`}>
      <AccountSelect
        value={line.accountId}
        onChange={(accountId) => onAccountChange(line.id, accountId)}
      />
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={line.amount}
        onChange={(e) => onAmountChange(line.id, e.target.value)}
        className={[
          "w-32 shrink-0 rounded-lg px-3 py-2 text-sm text-right",
          "bg-[var(--bg-base)] border border-[var(--border)]",
          "text-[var(--text-primary)] focus:outline-none",
          "focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent",
          "transition-all duration-150",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
        ].join(" ")}
      />
      <button
        onClick={() => onRemove(line.id)}
        disabled={!canRemove}
        className={[
          "p-1.5 rounded-md transition-colors shrink-0",
          canRemove
            ? "text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-400/10"
            : "text-[var(--border)] cursor-not-allowed",
        ].join(" ")}
        aria-label="Remove line"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── NewEntry page ─────────────────────────────────────────────────────────────

export default function NewEntry() {
  const addEntry = useJournalStore((s) => s.addEntry);
  const pushAlert = useUIStore((s) => s.pushAlert);

  const [debits, setDebits] = useState<EntryLineForm[]>([emptyLine()]);
  const [credits, setCredits] = useState<EntryLineForm[]>([emptyLine()]);
  const [description, setDescription] = useState("");

  // ── Line mutators ────────────────────────────────────────────────────────

  const updateAccount = useCallback(
    (side: "debits" | "credits") => (id: string, accountId: string) => {
      const setter = side === "debits" ? setDebits : setCredits;
      setter((prev) =>
        prev.map((l) => (l.id === id ? { ...l, accountId } : l))
      );
    },
    []
  );

  const updateAmount = useCallback(
    (side: "debits" | "credits") => (id: string, amount: string) => {
      const setter = side === "debits" ? setDebits : setCredits;
      setter((prev) =>
        prev.map((l) => (l.id === id ? { ...l, amount } : l))
      );
    },
    []
  );

  const removeLine = useCallback(
    (side: "debits" | "credits") => (id: string) => {
      const setter = side === "debits" ? setDebits : setCredits;
      setter((prev) => prev.filter((l) => l.id !== id));
    },
    []
  );

  const addLine = (side: "debits" | "credits") => {
    const setter = side === "debits" ? setDebits : setCredits;
    setter((prev) => [...prev, emptyLine()]);
  };

  // ── Totals & balance ─────────────────────────────────────────────────────

  const debitTotal = lineTotal(debits);
  const creditTotal = lineTotal(credits);
  const balanced = debitTotal > 0 && debitTotal === creditTotal;
  const hasAmountMismatch = debitTotal > 0 && creditTotal > 0 && debitTotal !== creditTotal;

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    // Validate: all lines must have an account selected
    const allFilled = [...debits, ...credits].every(
      (l) => l.accountId && parsedAmount(l.amount) > 0
    );
    if (!allFilled) {
      pushAlert("warning", "Please fill in all account and amount fields.");
      return;
    }
    if (!balanced) {
      pushAlert("error", "Entry is not balanced. Total debits must equal total credits.");
      return;
    }

    addEntry({
      description: description.trim() || undefined,
      debits: debits.map((l) => ({
        id: crypto.randomUUID(),
        accountId: l.accountId,
        amount: parsedAmount(l.amount),
      })),
      credits: credits.map((l) => ({
        id: crypto.randomUUID(),
        accountId: l.accountId,
        amount: parsedAmount(l.amount),
      })),
    });

    pushAlert("success", "Journal entry saved successfully.");

    // Reset form
    setDebits([emptyLine()]);
    setCredits([emptyLine()]);
    setDescription("");
  };

  const handleClear = () => {
    setDebits([emptyLine()]);
    setCredits([emptyLine()]);
    setDescription("");
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">New Journal Entry</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Entry card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-6">

        {/* Column headers */}
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          <span className="flex-1">Account</span>
          <span className="w-32 text-right pr-8">Amount</span>
        </div>

        {/* ── Debits ── */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Debits
          </h2>
          {debits.map((line) => (
            <EntryLineRow
              key={line.id}
              line={line}
              indent={false}
              onAccountChange={updateAccount("debits")}
              onAmountChange={updateAmount("debits")}
              onRemove={removeLine("debits")}
              canRemove={debits.length > 1}
            />
          ))}
          <button
            onClick={() => addLine("debits")}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity mt-1"
          >
            <PlusCircle size={13} />
            Add debit line
          </button>
        </section>

        <div className="border-t border-[var(--border)]" />

        {/* ── Credits (indented) ── */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] pl-8">
            Credits
          </h2>
          {credits.map((line) => (
            <EntryLineRow
              key={line.id}
              line={line}
              indent={true}
              onAccountChange={updateAccount("credits")}
              onAmountChange={updateAmount("credits")}
              onRemove={removeLine("credits")}
              canRemove={credits.length > 1}
            />
          ))}
          <div className="pl-8">
            <button
              onClick={() => addLine("credits")}
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity mt-1"
            >
              <PlusCircle size={13} />
              Add credit line
            </button>
          </div>
        </section>

        <div className="border-t border-[var(--border)]" />

        {/* ── Totals row ── */}
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-[var(--text-muted)]">Totals</span>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Debit</p>
              <p className="font-mono text-[var(--text-primary)]">{fmt(debitTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Credit</p>
              <p className="font-mono text-[var(--text-primary)]">{fmt(creditTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Status</p>
              <p
                className={[
                  "text-xs font-semibold",
                  balanced
                    ? "text-emerald-400"
                    : hasAmountMismatch
                    ? "text-rose-400"
                    : "text-[var(--text-muted)]",
                ].join(" ")}
              >
                {balanced ? "✓ Balanced" : hasAmountMismatch ? "✗ Unbalanced" : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Imbalance warning ── */}
        {hasAmountMismatch && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-400/10 border border-rose-400/20 px-3 py-2.5 text-sm text-rose-400">
            <AlertCircle size={15} className="shrink-0" />
            <span>
              Difference of{" "}
              <span className="font-mono font-semibold">
                {fmt(Math.abs(debitTotal - creditTotal))}
              </span>
            </span>
          </div>
        )}

        {/* ── Description ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Description <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a memo or note for this entry…"
            rows={2}
            className={[
              "w-full rounded-lg px-3 py-2 text-sm resize-none",
              "bg-[var(--bg-base)] border border-[var(--border)]",
              "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent",
              "transition-all duration-150",
            ].join(" ")}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleClear}
          className={[
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "border border-[var(--border)] text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)]",
          ].join(" ")}
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          className={[
            "px-5 py-2 rounded-lg text-sm font-semibold transition-all",
            "bg-[var(--accent)] text-white",
            "hover:opacity-90 active:scale-[0.98]",
            !balanced && "opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          Save Entry
        </button>
      </div>
    </div>
  );
}