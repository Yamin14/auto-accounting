import { Fragment, useMemo, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";
import type { JournalEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const accountName = (id: string) =>
  defaultAccounts.find((a) => a.id === id)?.accountName ?? id;

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

const entryDebitTotal = (entry: JournalEntry) =>
  entry.debits.reduce((s, l) => s + l.amount, 0);

const entryCreditTotal = (entry: JournalEntry) =>
  entry.credits.reduce((s, l) => s + l.amount, 0);

// Everything about an entry that search can match against, lowercased once.
const entrySearchText = (entry: JournalEntry) => {
  const accountNames = [
    ...entry.debits.map((l) => accountName(l.accountId)),
    ...entry.credits.map((l) => accountName(l.accountId)),
  ];
  const amounts = [
    ...entry.debits.map((l) => l.amount),
    ...entry.credits.map((l) => l.amount),
  ];

  return [
    fmtDate(entry.date),
    entry.date,
    entry.description ?? "",
    ...accountNames,
    ...amounts.map((a) => fmt(a)),
    ...amounts.map((a) => String(a)),
  ]
    .join(" ")
    .toLowerCase();
};

const dateInputClass = [
  "w-full px-3 py-2 text-sm rounded-lg",
  "bg-[var(--bg-surface)] border border-[var(--border)]",
  "text-[var(--text-primary)]",
  "focus:outline-none focus:ring-1 focus:ring-[var(--border)]",
].join(" ");

const labelClass = "block text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1";

// ─── Journal Entries page ─────────────────────────────────────────────────────

export default function JournalEntries() {
  const entries = useJournalStore((s) => s.entries);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const invalidRange = !!from && !!to && from > to;
  const hasFilters = !!(query || from || to);

  const resetFilters = () => {
    setQuery("");
    setFrom("");
    setTo("");
  };

  const filteredEntries = useMemo(() => {
    if (invalidRange) return [];
    const q = query.trim().toLowerCase();
    const ordered = [...entries].reverse();

    return ordered.filter((entry) => {
      const day = dayOf(entry.date);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (q && !entrySearchText(entry).includes(q)) return false;
      return true;
    });
  }, [entries, query, from, to, invalidRange]);

  // Empty state (no entries at all)
  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Journal Entries</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <BookOpen size={36} strokeWidth={1.2} />
          <p className="text-sm">No journal entries yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Journal Entries</h1>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-3 py-1">
          {filteredEntries.length === entries.length
            ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
            : `${filteredEntries.length} of ${entries.length} entries`}
        </span>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by date, account, amount, or narration…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>From</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={dateInputClass}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={dateInputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between min-h-[1rem]">
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

      {/* Entries table */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-muted)]">
          <Search size={28} strokeWidth={1.2} />
          <p className="text-sm">
            {query ? `No entries match "${query}"` : "No entries match your filters"}
            {(from || to) && query ? " in this date range." : query ? "." : "."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium w-28">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                  Account
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium w-28">
                  Debit
                </th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium w-28">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const lineCount = entry.debits.length + entry.credits.length;
                const debitTotal = entryDebitTotal(entry);
                const creditTotal = entryCreditTotal(entry);

                return (
                  <Fragment key={entry.id}>
                    {/* Debit lines */}
                    {entry.debits.map((line, i) => (
                      <tr key={line.id} className="border-t border-[var(--border)]">
                        {/* Date only on the first line of the entry */}
                        {i === 0 ? (
                          <td
                            rowSpan={lineCount}
                            className="px-4 py-2.5 align-top text-sm font-medium text-[var(--text-primary)] whitespace-nowrap"
                          >
                            {fmtDate(entry.date)}
                          </td>
                        ) : null}
                        <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">
                          {accountName(line.accountId)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-[var(--text-primary)]">
                          {fmt(line.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-[var(--text-muted)]">
                          —
                        </td>
                      </tr>
                    ))}

                    {/* Credit lines */}
                    {entry.credits.map((line) => (
                      <tr key={line.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)] italic pl-8">
                          {accountName(line.accountId)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-[var(--text-muted)]">
                          —
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-[var(--text-primary)]">
                          {fmt(line.amount)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals */}
                    <tr className="border-t border-[var(--border)] font-medium">
                      <td />
                      <td className="px-4 py-2 text-right text-xs uppercase tracking-wider text-[var(--text-muted)]">
                        Total
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-[var(--text-primary)]">
                        {fmt(debitTotal)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-[var(--text-primary)]">
                        {fmt(creditTotal)}
                      </td>
                    </tr>

                    {/* Narration */}
                    <tr className="border-t border-[var(--border)] bg-[var(--bg-base)]">
                      <td colSpan={4} className="px-4 py-2 text-xs text-[var(--text-muted)] italic">
                        {entry.description ? `Narration: ${entry.description}` : "No narration"}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}