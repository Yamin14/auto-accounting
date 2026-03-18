import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JournalEntry, EntryLine } from "../types";

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: Omit<JournalEntry, "id" | "date">) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<Omit<JournalEntry, "id" | "date">>) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
            },
          ],
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
    }),
    { name: "aa-journal" }
  )
);

// ─── Selector helpers (use in components to avoid recomputing) ────────────────

/** Total debits for a single entry */
export const totalDebits = (lines: EntryLine[]) =>
  lines.reduce((sum, l) => sum + l.amount, 0);

/** Total credits for a single entry */
export const totalCredits = (lines: EntryLine[]) =>
  lines.reduce((sum, l) => sum + l.amount, 0);

/** Whether an entry is balanced */
export const isBalanced = (entry: Pick<JournalEntry, "debits" | "credits">) =>
  totalDebits(entry.debits) === totalCredits(entry.credits);