import { useMemo } from "react";
import { LayoutList } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? `(${fmt(Math.abs(n))})` : fmt(n));

function accountBalance(
  accountId: string,
  entries: ReturnType<typeof useJournalStore.getState>["entries"]
) {
  const account = defaultAccounts.find((a) => a.id === accountId);
  if (!account) return 0;
  let debit = 0, credit = 0;
  for (const entry of entries) {
    entry.debits.forEach((l) => { if (l.accountId === accountId) debit += l.amount; });
    entry.credits.forEach((l) => { if (l.accountId === accountId) credit += l.amount; });
  }
  return account.accountType === "credit" ? credit - debit : debit - credit;
}

// ─── Row components ───────────────────────────────────────────────────────────

function LineRow({ label, amount, indent = false, contra = false }: {
  label: string; amount: number; indent?: boolean; contra?: boolean;
}) {
  if (amount === 0) return null;
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-6" : ""}`}>
      <span className={`text-sm ${contra ? "text-[var(--text-muted)] italic" : "text-[var(--text-primary)]"}`}>
        {label}
      </span>
      <span className={`font-mono text-sm ${contra ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
        {contra ? `(${fmt(Math.abs(amount))})` : fmtSigned(amount)}
      </span>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)] mt-1">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{fmtSigned(amount)}</span>
    </div>
  );
}

function TotalRow({ label, amount, highlight = false }: {
  label: string; amount: number; highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-t-2 border-[var(--border)] mt-1`}>
      <span className="text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <span className={[
        "font-mono text-sm font-bold",
        highlight
          ? amount >= 0 ? "text-emerald-400" : "text-rose-400"
          : "text-[var(--text-primary)]",
      ].join(" ")}>
        {fmtSigned(amount)}
      </span>
    </div>
  );
}

function SectionCard({ title, accent, children }: {
  title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className={`px-6 py-3 border-b border-[var(--border)] ${accent}`}>
        <h2 className="text-xs font-bold uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-6 py-4 space-y-0">{children}</div>
    </div>
  );
}

function SubSection({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] pt-3 pb-1 first:pt-0">
      {label}
    </p>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export default function BalanceSheet() {
  const entries = useJournalStore((s) => s.entries);

  const data = useMemo(() => {
    const bal = (id: string) => accountBalance(id, entries);
    const bySubCat = (subCat: string) =>
      defaultAccounts.filter((a) => a.subCategory === subCat);

    // ── Assets ──
    const currentAssets     = bySubCat("Current Assets").map((a) => ({ name: a.accountName, amount: bal(a.id) }));
    const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.amount, 0);

    const nonCurrentAssets  = bySubCat("Non-current Assets").map((a) => ({ name: a.accountName, amount: bal(a.id) }));
    const accumDepr         = bal("accumulated-depreciation"); // contra asset — store as positive number
    const totalNonCurrent   = nonCurrentAssets.reduce((s, a) => s + a.amount, 0) - accumDepr;
    const totalAssets       = totalCurrentAssets + totalNonCurrent;

    // ── Liabilities ──
    const currentLiab       = bySubCat("Current Liabilities").map((a) => ({ name: a.accountName, amount: bal(a.id) }));
    const totalCurrentLiab  = currentLiab.reduce((s, a) => s + a.amount, 0);

    const nonCurrentLiab    = bySubCat("Non-current Liabilities").map((a) => ({ name: a.accountName, amount: bal(a.id) }));
    const totalNonCurLiab   = nonCurrentLiab.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities  = totalCurrentLiab + totalNonCurLiab;

    // ── Equity ──
    const equityAccounts    = bySubCat("Equity").map((a) => ({ name: a.accountName, amount: bal(a.id) }));
    const contraEquity      = bySubCat("Contra Equity").map((a) => ({ name: a.accountName, amount: bal(a.id) }));

    // Compute net income from income statement accounts and roll into retained earnings
    const revenueAccounts   = defaultAccounts.filter((a) => a.category === "Revenue");
    const expenseAccounts   = defaultAccounts.filter((a) => a.category === "Expense");
    const totalRevenue      = revenueAccounts.reduce((s, a) => s + bal(a.id), 0);
    const totalExpenses     = expenseAccounts.reduce((s, a) => s + bal(a.id), 0);
    const netIncome         = totalRevenue - totalExpenses;

    const retainedEarnings  = bal("retained-earnings") + netIncome;

    const totalEquity =
      equityAccounts.reduce((s, a) => s + (a.name === "Retained Earnings" ? 0 : a.amount), 0) +
      retainedEarnings -
      contraEquity.reduce((s, a) => s + a.amount, 0);

    const totalLiabEquity   = totalLiabilities + totalEquity;
    const isBalanced        = Math.abs(totalAssets - totalLiabEquity) < 0.005;

    return {
      currentAssets, totalCurrentAssets,
      nonCurrentAssets, accumDepr, totalNonCurrent, totalAssets,
      currentLiab, totalCurrentLiab,
      nonCurrentLiab, totalNonCurLiab, totalLiabilities,
      equityAccounts, contraEquity, retainedEarnings, totalEquity,
      totalLiabEquity, netIncome, isBalanced,
    };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Balance Sheet</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <LayoutList size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries to display. Add journal entries first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Balance Sheet</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            As of{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className={[
          "text-xs font-semibold px-3 py-1 rounded-full border",
          data.isBalanced
            ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
            : "text-rose-400 border-rose-400/30 bg-rose-400/10",
        ].join(" ")}>
          {data.isBalanced ? "✓ Balanced" : "✗ Check entries"}
        </span>
      </div>

      {/* ── Assets ── */}
      <SectionCard title="Assets" accent="text-sky-400">
        <SubSection label="Current Assets" />
        {data.currentAssets.map((a) => (
          <LineRow key={a.name} label={a.name} amount={a.amount} indent />
        ))}
        <SubtotalRow label="Total Current Assets" amount={data.totalCurrentAssets} />

        <SubSection label="Non-current Assets" />
        {data.nonCurrentAssets.map((a) => (
          <LineRow key={a.name} label={a.name} amount={a.amount} indent />
        ))}
        {data.accumDepr > 0 && (
          <LineRow label="Accumulated Depreciation" amount={data.accumDepr} indent contra />
        )}
        <SubtotalRow label="Total Non-current Assets" amount={data.totalNonCurrent} />

        <TotalRow label="Total Assets" amount={data.totalAssets} />
      </SectionCard>

      {/* ── Liabilities ── */}
      <SectionCard title="Liabilities" accent="text-amber-400">
        <SubSection label="Current Liabilities" />
        {data.currentLiab.map((a) => (
          <LineRow key={a.name} label={a.name} amount={a.amount} indent />
        ))}
        <SubtotalRow label="Total Current Liabilities" amount={data.totalCurrentLiab} />

        <SubSection label="Non-current Liabilities" />
        {data.nonCurrentLiab.map((a) => (
          <LineRow key={a.name} label={a.name} amount={a.amount} indent />
        ))}
        <SubtotalRow label="Total Non-current Liabilities" amount={data.totalNonCurLiab} />

        <TotalRow label="Total Liabilities" amount={data.totalLiabilities} />
      </SectionCard>

      {/* ── Equity ── */}
      <SectionCard title="Stockholders' Equity" accent="text-violet-400">
        {data.equityAccounts
          .filter((a) => a.name !== "Retained Earnings")
          .map((a) => (
            <LineRow key={a.name} label={a.name} amount={a.amount} indent />
          ))}
        <LineRow label="Retained Earnings" amount={data.retainedEarnings} indent />
        {data.contraEquity.map((a) => (
          <LineRow key={a.name} label={a.name} amount={a.amount} indent contra />
        ))}
        <TotalRow label="Total Stockholders' Equity" amount={data.totalEquity} />
      </SectionCard>

      {/* ── Grand total ── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-6 py-4">
        <TotalRow
          label="Total Liabilities & Stockholders' Equity"
          amount={data.totalLiabEquity}
          highlight
        />
      </div>
    </div>
  );
}