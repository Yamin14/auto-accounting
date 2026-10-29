import { useState, useMemo } from "react";
import { Search, Layers, X } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";
import type { Account, JournalEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Compare on the YYYY-MM-DD part so the "to" date is inclusive of the whole day
const dayOf = (iso: string) => iso.slice(0, 10);

interface LedgerLine {
  date: string;
  entryId: string;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
  isOpening?: boolean;
}

function buildLedger(
  account: Account,
  entries: JournalEntry[],
  from: string,
  to: string
): LedgerLine[] {
  const lines: LedgerLine[] = [];
  let balance = 0;
  let opening = 0;

  // Sort entries oldest first
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const entry of sorted) {
    const day = dayOf(entry.date);
    if (to && day > to) break; // sorted, so nothing later can match

    const debitLine = entry.debits.find((l) => l.accountId === account.id);
    const creditLine = entry.credits.find((l) => l.accountId === account.id);
    if (!debitLine && !creditLine) continue;

    const debit = debitLine?.amount ?? 0;
    const credit = creditLine?.amount ?? 0;

    // Balance direction follows normal balance of account
    balance += account.accountType === "debit" ? debit - credit : credit - debit;

    // Before the range: roll into the opening balance, don't list
    if (from && day < from) {
      opening = balance;
      continue;
    }

    lines.push({
      date: entry.date,
      entryId: entry.id,
      description: entry.description,
      debit,
      credit,
      balance,
    });
  }

  // Carry-forward row so running balances stay correct for the chosen range
  if (from && lines.length > 0 && opening !== 0) {
    lines.unshift({
      date: from,
      entryId: "opening",
      description: "Opening balance",
      debit: 0,
      credit: 0,
      balance: opening,
      isOpening: true,
    });
  }

  return lines;
}

// ─── Single account ledger table ──────────────────────────────────────────────

function AccountLedger({
  account,
  entries,
  from,
  to,
}: {
  account: Account;
  entries: JournalEntry[];
  from: string;
  to: string;
}) {
  const lines = buildLedger(account, entries, from, to);
  if (lines.length === 0) return null;

  const finalBalance = lines[lines.length - 1]?.balance ?? 0;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Account header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{account.accountName}</p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            {account.category} · {account.subCategory}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Balance</p>
          <p
            className={[
              "font-mono text-sm font-semibold mt-0.5",
              finalBalance >= 0 ? "text-emerald-400" : "text-rose-400",
            ].join(" ")}
          >
            {fmt(Math.abs(finalBalance))}
            <span className="text-[10px] font-normal ml-1 text-[var(--text-muted)]">
              {account.accountType === "debit" ? "Dr" : "Cr"}
            </span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="text-left px-5 py-2.5 font-medium">Date</th>
              <th className="text-left px-4 py-2.5 font-medium">Description</th>
              <th className="text-right px-4 py-2.5 font-medium">Debit</th>
              <th className="text-right px-4 py-2.5 font-medium">Credit</th>
              <th className="text-right px-5 py-2.5 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={`${line.entryId}-${i}`}
                className={[
                  "border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors",
                  line.isOpening ? "bg-[var(--bg-hover)]/40" : "",
                ].join(" ")}
              >
                <td className="px-5 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                  {line.isOpening ? "—" : fmtDate(line.date)}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)] italic max-w-[200px] truncate">
                  {line.description || "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                  {line.debit > 0 ? fmt(line.debit) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                  {line.credit > 0 ? fmt(line.credit) : "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-[var(--text-primary)]">
                  {fmt(Math.abs(line.balance))}
                  <span className="text-[10px] text-[var(--text-muted)] ml-1">
                    {line.balance >= 0 ? "Dr" : "Cr"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Ledger page ──────────────────────────────────────────────────────────────

const controlClass = [
  "w-full px-3 py-2 text-sm rounded-lg",
  "bg-[var(--bg-surface)] border border-[var(--border)]",
  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "transition-all duration-150",
].join(" ");

const labelClass = "block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1";

export default function Ledger() {
  const entries = useJournalStore((s) => s.entries);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [accountId, setAccountId] = useState("");

  // Only show accounts that have at least one entry
  const activeAccountIds = useMemo(() => {
    const ids = new Set<string>();
    entries.forEach((e) => {
      e.debits.forEach((l) => ids.add(l.accountId));
      e.credits.forEach((l) => ids.add(l.accountId));
    });
    return ids;
  }, [entries]);

  const activeAccounts = useMemo(
    () => defaultAccounts.filter((a) => activeAccountIds.has(a.id)),
    [activeAccountIds]
  );

  // Dependent dropdown options
  const categories = useMemo(
    () => Array.from(new Set(activeAccounts.map((a) => a.category))),
    [activeAccounts]
  );

  const subCategories = useMemo(
    () =>
      Array.from(
        new Set(
          activeAccounts
            .filter((a) => !category || a.category === category)
            .map((a) => a.subCategory)
        )
      ),
    [activeAccounts, category]
  );

  const accountOptions = useMemo(
    () =>
      activeAccounts.filter(
        (a) =>
          (!category || a.category === category) &&
          (!subCategory || a.subCategory === subCategory)
      ),
    [activeAccounts, category, subCategory]
  );

  const filteredAccounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return accountOptions.filter(
      (a) =>
        (!accountId || a.id === accountId) &&
        (q === "" ||
          a.accountName.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q))
    );
  }, [accountOptions, accountId, search]);

  const handleCategory = (v: string) => {
    setCategory(v);
    setSubCategory("");
    setAccountId("");
  };

  const handleSubCategory = (v: string) => {
    setSubCategory(v);
    setAccountId("");
  };

  const hasFilters = !!(search || from || to || category || subCategory || accountId);

  const resetFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setCategory("");
    setSubCategory("");
    setAccountId("");
  };

  const invalidRange = !!from && !!to && from > to;

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Ledger</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <Layers size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries to display. Add journal entries first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ledger</h1>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${controlClass} pl-8`}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>From</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={controlClass}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={controlClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(e) => handleCategory(e.target.value)}
              className={controlClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sub-category</label>
            <select
              value={subCategory}
              onChange={(e) => handleSubCategory(e.target.value)}
              className={controlClass}
            >
              <option value="">All sub-categories</option>
              {subCategories.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={controlClass}
            >
              <option value="">All accounts</option>
              {accountOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-rose-400">
            {invalidRange ? "“From” date must be before “To” date." : ""}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={12} /> Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Account ledgers */}
      {filteredAccounts.length === 0 || invalidRange ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-muted)]">
          <p className="text-sm">No accounts match your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <AccountLedger
              key={account.id}
              account={account}
              entries={entries}
              from={from}
              to={to}
            />
          ))}
        </div>
      )}
    </div>
  );
}