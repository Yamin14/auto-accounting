import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
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

const entryTotal = (entry: JournalEntry) =>
  entry.debits.reduce((s, l) => s + l.amount, 0);

// ─── Expanded detail row ──────────────────────────────────────────────────────

function EntryDetail({ entry }: { entry: JournalEntry }) {
  return (
    <div className="px-6 pb-5 pt-1 space-y-3 bg-[var(--bg-base)] border-t border-[var(--border)]">
      {/* Ledger-style lines */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden text-sm">
        {/* Debits */}
        {entry.debits.map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0"
          >
            <span className="text-[var(--text-primary)]">{accountName(line.accountId)}</span>
            <div className="flex gap-16 text-right">
              <span className="font-mono text-[var(--text-primary)] w-24">{fmt(line.amount)}</span>
              <span className="font-mono text-[var(--text-muted)] w-24">—</span>
            </div>
          </div>
        ))}
        {/* Credits */}
        {entry.credits.map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0 pl-10"
          >
            <span className="text-[var(--text-secondary)] italic">{accountName(line.accountId)}</span>
            <div className="flex gap-16 text-right">
              <span className="font-mono text-[var(--text-muted)] w-24">—</span>
              <span className="font-mono text-[var(--text-primary)] w-24">{fmt(line.amount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {entry.description && (
        <p className="text-xs text-[var(--text-muted)] italic px-1">
          Memo: {entry.description}
        </p>
      )}

      {/* Column labels */}
      <div className="flex justify-end gap-16 text-[10px] uppercase tracking-wider text-[var(--text-muted)] pr-1">
        <span className="w-24 text-right">Debit</span>
        <span className="w-24 text-right">Credit</span>
      </div>
    </div>
  );
}

// ─── Journal Entries page ─────────────────────────────────────────────────────

export default function JournalEntries() {
  const entries = useJournalStore((s) => s.entries);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Empty state
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
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        <span>Date / Description</span>
        <span>Accounts</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {/* Entry rows */}
      <div className="space-y-2">
        {[...entries].reverse().map((entry) => {
          const isOpen = expanded.has(entry.id);
          const total = entryTotal(entry);
          const accountNames = [
            ...entry.debits.map((l) => accountName(l.accountId)),
            ...entry.credits.map((l) => accountName(l.accountId)),
          ];

          return (
            <div
              key={entry.id}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden"
            >
              {/* Summary row */}
              <button
                onClick={() => toggle(entry.id)}
                className="w-full text-left px-4 py-3.5 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center hover:bg-[var(--bg-hover)] transition-colors"
              >
                {/* Date + description */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {fmtDate(entry.date)}
                  </p>
                  {entry.description ? (
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {entry.description}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]/50 italic mt-0.5">No memo</p>
                  )}
                </div>

                {/* Accounts pill list */}
                <div className="hidden sm:flex flex-wrap gap-1 max-w-xs justify-end">
                  {accountNames.slice(0, 3).map((name, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[var(--bg-base)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-muted)] truncate max-w-[120px]"
                    >
                      {name}
                    </span>
                  ))}
                  {accountNames.length > 3 && (
                    <span className="text-[10px] bg-[var(--bg-base)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
                      +{accountNames.length - 3}
                    </span>
                  )}
                </div>

                {/* Total */}
                <span className="font-mono text-sm text-[var(--text-primary)] text-right">
                  {fmt(total)}
                </span>

                {/* Chevron */}
                <span className="text-[var(--text-muted)]">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && <EntryDetail entry={entry} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}