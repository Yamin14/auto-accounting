import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? `(${fmt(Math.abs(n))})` : fmt(n));

type Entries = ReturnType<typeof useJournalStore.getState>["entries"];

/**
 * Direct method: cash flow = sum of cash-side movements.
 * For each entry, we look at lines that touch Cash and Cash Equivalents,
 * then attribute the other side's account to the correct section.
 */
function buildCashFlows(entries: Entries) {
  const operating: { label: string; amount: number }[] = [];
  const investing:  { label: string; amount: number }[] = [];
  const financing:  { label: string; amount: number }[] = [];

  const cashId = "cash-and-equivalents";

  for (const entry of entries) {
    // Determine cash movement in this entry
    const cashDebit  = entry.debits.find((l)  => l.accountId === cashId);
    const cashCredit = entry.credits.find((l) => l.accountId === cashId);
    if (!cashDebit && !cashCredit) continue;

    // Net cash effect (positive = inflow, negative = outflow)
    const cashEffect = (cashDebit?.amount ?? 0) - (cashCredit?.amount ?? 0);

    // Find the counterpart account(s) to label and classify
    const counterpartLines = cashDebit
      ? entry.credits.filter((l) => l.accountId !== cashId)
      : entry.debits.filter((l) => l.accountId !== cashId);

    for (const line of counterpartLines) {
      const account = defaultAccounts.find((a) => a.id === line.accountId);
      if (!account) continue;

      const section = account.cashFlowSection;
      const label   = account.accountName;
      // Prorate cash effect if there are multiple counterpart lines
      const prorated = counterpartLines.length > 1
        ? cashEffect * (line.amount / counterpartLines.reduce((s, l) => s + l.amount, 0))
        : cashEffect;

      if (section === "Operating")  operating.push({ label, amount: prorated });
      if (section === "Investing")  investing.push({ label, amount: prorated });
      if (section === "Financing")  financing.push({ label, amount: prorated });
      // null cashFlowSection accounts are excluded from the statement
    }
  }

  const total = (arr: { amount: number }[]) => arr.reduce((s, i) => s + i.amount, 0);

  const openingCash = 0; // Could be made configurable later
  const netOperating = total(operating);
  const netInvesting  = total(investing);
  const netFinancing  = total(financing);
  const netChange     = netOperating + netInvesting + netFinancing;
  const closingCash   = openingCash + netChange;

  return { operating, investing, financing, netOperating, netInvesting, netFinancing, netChange, openingCash, closingCash };
}

// ─── Row components ───────────────────────────────────────────────────────────

function LineRow({ label, amount }: { label: string; amount: number }) {
  if (amount === 0) return null;
  return (
    <div className="flex items-center justify-between py-2 pl-6">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <span className="font-mono text-sm text-[var(--text-primary)]">{fmtSigned(amount)}</span>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-t border-[var(--border)] mt-1">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
      <span className={[
        "font-mono text-sm font-semibold",
        amount >= 0 ? "text-emerald-400" : "text-rose-400",
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

function EmptySection() {
  return (
    <p className="text-xs text-[var(--text-muted)] italic pl-6 py-2">
      No transactions in this section.
    </p>
  );
}

// ─── Cash Flow Statement ──────────────────────────────────────────────────────

export default function CashFlowStatement() {
  const entries = useJournalStore((s) => s.entries);

  const cf = useMemo(() => buildCashFlows(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
          Statement of Cash Flows
        </h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <ArrowLeftRight size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries to display. Add journal entries first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Statement of Cash Flows
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Direct Method · For the period ended{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Operating ── */}
      <SectionCard title="Operating Activities" accent="text-sky-400">
        {cf.operating.length === 0 ? (
          <EmptySection />
        ) : (
          cf.operating.map((item, i) => (
            <LineRow key={i} label={item.label} amount={item.amount} />
          ))
        )}
        <SubtotalRow label="Net Cash from Operating Activities" amount={cf.netOperating} />
      </SectionCard>

      {/* ── Investing ── */}
      <SectionCard title="Investing Activities" accent="text-amber-400">
        {cf.investing.length === 0 ? (
          <EmptySection />
        ) : (
          cf.investing.map((item, i) => (
            <LineRow key={i} label={item.label} amount={item.amount} />
          ))
        )}
        <SubtotalRow label="Net Cash from Investing Activities" amount={cf.netInvesting} />
      </SectionCard>

      {/* ── Financing ── */}
      <SectionCard title="Financing Activities" accent="text-violet-400">
        {cf.financing.length === 0 ? (
          <EmptySection />
        ) : (
          cf.financing.map((item, i) => (
            <LineRow key={i} label={item.label} amount={item.amount} />
          ))
        )}
        <SubtotalRow label="Net Cash from Financing Activities" amount={cf.netFinancing} />
      </SectionCard>

      {/* ── Reconciliation ── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-6 py-4 space-y-0">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--text-secondary)]">Opening Cash Balance</span>
          <span className="font-mono text-sm text-[var(--text-primary)]">{fmt(cf.openingCash)}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
          <span className="text-sm text-[var(--text-secondary)]">Net Increase / (Decrease) in Cash</span>
          <span className={`font-mono text-sm font-semibold ${cf.netChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtSigned(cf.netChange)}
          </span>
        </div>
        <div className="flex items-center justify-between py-3 border-t-2 border-[var(--border)] mt-1">
          <span className="text-sm font-bold text-[var(--text-primary)]">Closing Cash Balance</span>
          <span className={`font-mono text-sm font-bold ${cf.closingCash >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtSigned(cf.closingCash)}
          </span>
        </div>
      </div>
    </div>
  );
}