import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? `(${fmt(Math.abs(n))})` : fmt(n));

/** Net balance for an account across all entries (credit-normal accounts return positive when credited) */
function accountBalance(accountId: string, entries: ReturnType<typeof useJournalStore.getState>["entries"]) {
  const account = defaultAccounts.find((a) => a.id === accountId);
  if (!account) return 0;
  let debit = 0, credit = 0;
  for (const entry of entries) {
    entry.debits.forEach((l) => { if (l.accountId === accountId) debit += l.amount; });
    entry.credits.forEach((l) => { if (l.accountId === accountId) credit += l.amount; });
  }
  return account.accountType === "credit" ? credit - debit : debit - credit;
}

function sumAccounts(ids: string[], entries: ReturnType<typeof useJournalStore.getState>["entries"]) {
  return ids.reduce((s, id) => s + accountBalance(id, entries), 0);
}

// ─── Row components ───────────────────────────────────────────────────────────

function LineRow({ label, amount, indent = false, muted = false }: {
  label: string; amount: number; indent?: boolean; muted?: boolean;
}) {
  if (amount === 0) return null;
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-8" : ""}`}>
      <span className={`text-sm ${muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
        {label}
      </span>
      <span className={`font-mono text-sm ${muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
        {fmtSigned(amount)}
      </span>
    </div>
  );
}

function SubtotalRow({ label, amount, highlight = false }: {
  label: string; amount: number; highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-t border-[var(--border)] mt-1 ${highlight ? "border-t-2" : ""}`}>
      <span className={`text-sm font-semibold ${highlight ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
        {label}
      </span>
      <span className={[
        "font-mono text-sm font-semibold",
        highlight
          ? amount >= 0 ? "text-emerald-400" : "text-rose-400"
          : "text-[var(--text-primary)]",
      ].join(" ")}>
        {fmtSigned(amount)}
      </span>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] pt-2 pb-1">
      {label}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border)] my-2" />;
}

// ─── Income Statement ─────────────────────────────────────────────────────────

export default function IncomeStatement() {
  const entries = useJournalStore((s) => s.entries);

  const data = useMemo(() => {
    const ids = (subCats: string[]) =>
      defaultAccounts
        .filter((a) => subCats.includes(a.subCategory))
        .map((a) => a.id);

    // Revenue
    const salesRevenue      = sumAccounts(ids(["Revenue"]), entries);
    const contraRevenue     = sumAccounts(ids(["Contra Revenue"]), entries);
    const netRevenue        = salesRevenue - contraRevenue;

    // COGS
    const cogs              = sumAccounts(ids(["COGS"]), entries);
    const grossProfit       = netRevenue - cogs;

    // Operating expenses
    const opExpenseAccounts = defaultAccounts.filter((a) => a.subCategory === "Operating Expenses");
    const opExpenses        = opExpenseAccounts.map((a) => ({
      name: a.accountName,
      amount: accountBalance(a.id, entries),
    }));
    const totalOpEx         = opExpenses.reduce((s, e) => s + e.amount, 0);
    const operatingIncome   = grossProfit - totalOpEx;

    // Non-operating
    const nonOpAccounts     = defaultAccounts.filter((a) => a.subCategory === "Non-operating Expenses");
    const nonOpItems        = nonOpAccounts.map((a) => ({
      name: a.accountName,
      amount: accountBalance(a.id, entries),
    }));
    const totalNonOp        = nonOpItems.reduce((s, e) => s + e.amount, 0);
    const incomeBeforeTax   = operatingIncome + totalNonOp;

    // Tax
    const incomeTax         = sumAccounts(ids(["Tax Expenses"]), entries);
    const netIncome         = incomeBeforeTax - incomeTax;

    // OCI
    const ociAccounts       = defaultAccounts.filter((a) => a.subCategory === "Other Comprehensive Income");
    const ociItems          = ociAccounts.map((a) => ({
      name: a.accountName,
      amount: accountBalance(a.id, entries),
    }));
    const totalOCI          = ociItems.reduce((s, e) => s + e.amount, 0);
    const totalComprehensive = netIncome + totalOCI;

    return {
      salesRevenue, contraRevenue, netRevenue,
      cogs, grossProfit,
      opExpenses, totalOpEx, operatingIncome,
      nonOpItems, totalNonOp, incomeBeforeTax,
      incomeTax, netIncome,
      ociItems, totalOCI, totalComprehensive,
    };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Income Statement</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <TrendingUp size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries to display. Add journal entries first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Income Statement</h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          For the period ended{" "}
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-6 py-5 space-y-1">

        {/* ── Revenue ── */}
        <SectionHeader label="Revenue" />
        <LineRow label="Sales Revenue" amount={data.salesRevenue} />
        <LineRow label="Sales Returns and Allowances" amount={-data.contraRevenue} indent muted />
        <SubtotalRow label="Net Revenue" amount={data.netRevenue} />

        <Divider />

        {/* ── COGS ── */}
        <SectionHeader label="Cost of Goods Sold" />
        <LineRow label="Cost of Goods Sold" amount={-data.cogs} indent />
        <SubtotalRow label="Gross Profit" amount={data.grossProfit} />

        <Divider />

        {/* ── Operating Expenses ── */}
        <SectionHeader label="Operating Expenses" />
        {data.opExpenses.map((e) => e.amount > 0 && (
          <LineRow key={e.name} label={e.name} amount={-e.amount} indent />
        ))}
        <SubtotalRow label="Operating Income" amount={data.operatingIncome} />

        {/* ── Non-operating ── */}
        {data.nonOpItems.some((e) => e.amount !== 0) && (
          <>
            <Divider />
            <SectionHeader label="Non-operating Items" />
            {data.nonOpItems.map((e) => e.amount !== 0 && (
              <LineRow key={e.name} label={e.name} amount={e.amount} indent />
            ))}
            <SubtotalRow label="Income Before Tax" amount={data.incomeBeforeTax} />
          </>
        )}

        <Divider />

        {/* ── Tax ── */}
        {data.incomeTax !== 0 && (
          <>
            <SectionHeader label="Tax" />
            <LineRow label="Income Tax Expense" amount={-data.incomeTax} indent />
            <Divider />
          </>
        )}

        {/* ── Net Income ── */}
        <SubtotalRow label="Net Income" amount={data.netIncome} highlight />

        {/* ── OCI ── */}
        {data.ociItems.some((e) => e.amount !== 0) && (
          <>
            <Divider />
            <SectionHeader label="Other Comprehensive Income" />
            {data.ociItems.map((e) => e.amount !== 0 && (
              <LineRow key={e.name} label={e.name} amount={e.amount} indent />
            ))}
            <SubtotalRow label="Total Comprehensive Income" amount={data.totalComprehensive} highlight />
          </>
        )}
      </div>
    </div>
  );
}