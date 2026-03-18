import { useMemo } from "react";
import { Scale } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";
import type { AccountCategory } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORY_ORDER: AccountCategory[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
];

const CATEGORY_COLOR: Record<AccountCategory, string> = {
  Asset:     "text-sky-400",
  Liability: "text-amber-400",
  Equity:    "text-violet-400",
  Revenue:   "text-emerald-400",
  Expense:   "text-rose-400",
};

interface TrialBalanceLine {
  accountId: string;
  accountName: string;
  category: AccountCategory;
  debit: number;
  credit: number;
}

// ─── Trial Balance page ───────────────────────────────────────────────────────

export default function TrialBalance() {
  const entries = useJournalStore((s) => s.entries);

  const lines = useMemo<TrialBalanceLine[]>(() => {
    // Accumulate raw debits and credits per account (no netting)
    const totals = new Map<string, { debit: number; credit: number }>();

    for (const entry of entries) {
      for (const l of entry.debits) {
        const cur = totals.get(l.accountId) ?? { debit: 0, credit: 0 };
        totals.set(l.accountId, { ...cur, debit: cur.debit + l.amount });
      }
      for (const l of entry.credits) {
        const cur = totals.get(l.accountId) ?? { debit: 0, credit: 0 };
        totals.set(l.accountId, { ...cur, credit: cur.credit + l.amount });
      }
    }

    // Map to display lines, ordered by category
    const result: TrialBalanceLine[] = [];
    for (const category of CATEGORY_ORDER) {
      const accounts = defaultAccounts.filter(
        (a) => a.category === category && totals.has(a.id)
      );
      for (const account of accounts) {
        const { debit, credit } = totals.get(account.id)!;
        result.push({
          accountId: account.id,
          accountName: account.accountName,
          category: account.category,
          debit,
          credit,
        });
      }
    }

    return result;
  }, [entries]);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Trial Balance</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <Scale size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries to display. Add journal entries first.</p>
        </div>
      </div>
    );
  }

  // Group lines by category for section rendering
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = lines.filter((l) => l.category === cat);
    return acc;
  }, {} as Record<AccountCategory, TrialBalanceLine[]>);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Trial Balance</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            As of{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={[
            "text-xs font-semibold px-3 py-1 rounded-full border",
            isBalanced
              ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
              : "text-rose-400 border-rose-400/30 bg-rose-400/10",
          ].join(" ")}
        >
          {isBalanced ? "✓ Balanced" : "✗ Unbalanced"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
          <span>Account</span>
          <span className="w-28 text-right">Debit</span>
          <span className="w-28 text-right">Credit</span>
        </div>

        {/* Category sections */}
        {CATEGORY_ORDER.map((category) => {
          const catLines = grouped[category];
          if (catLines.length === 0) return null;

          return (
            <div key={category} className="border-b border-[var(--border)] last:border-0">
              {/* Category label */}
              <div className="px-5 py-2 bg-[var(--bg-base)]">
                <span
                  className={[
                    "text-[10px] font-semibold uppercase tracking-widest",
                    CATEGORY_COLOR[category],
                  ].join(" ")}
                >
                  {category}
                </span>
              </div>

              {/* Account rows */}
              {catLines.map((line) => (
                <div
                  key={line.accountId}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-sm text-[var(--text-primary)]">{line.accountName}</span>
                  <span className="w-28 text-right font-mono text-sm text-[var(--text-primary)]">
                    {line.debit > 0 ? fmt(line.debit) : "—"}
                  </span>
                  <span className="w-28 text-right font-mono text-sm text-[var(--text-primary)]">
                    {line.credit > 0 ? fmt(line.credit) : "—"}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Totals row */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-4 border-t-2 border-[var(--border)] bg-[var(--bg-base)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span>
          <span
            className={[
              "w-28 text-right font-mono text-sm font-semibold",
              isBalanced ? "text-emerald-400" : "text-rose-400",
            ].join(" ")}
          >
            {fmt(totalDebit)}
          </span>
          <span
            className={[
              "w-28 text-right font-mono text-sm font-semibold",
              isBalanced ? "text-emerald-400" : "text-rose-400",
            ].join(" ")}
          >
            {fmt(totalCredit)}
          </span>
        </div>
      </div>

      {/* Imbalance note */}
      {!isBalanced && totalDebit > 0 && (
        <p className="text-xs text-rose-400 text-center">
          Difference of{" "}
          <span className="font-mono font-semibold">
            {fmt(Math.abs(totalDebit - totalCredit))}
          </span>{" "}
          — check your journal entries for errors.
        </p>
      )}
    </div>
  );
}