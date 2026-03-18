// ─── Account ──────────────────────────────────────────────────────────────────

export type AccountType = "debit" | "credit";

export type AccountCategory = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export type FinancialStatement = "Balance Sheet" | "Income Statement";

export type CashFlowSection = "Operating" | "Investing" | "Financing" | null;

export interface Account {
  id: string;
  accountName: string;
  subCategory: string;
  editable: boolean;
  accountType: AccountType;
  category: AccountCategory;
  financialStatement: FinancialStatement;
  cashFlowSection: CashFlowSection;
}

// ─── Journal Entry ────────────────────────────────────────────────────────────

export interface EntryLine {
  id: string;
  accountId: string;
  amount: number;
}

export interface JournalEntry {
  id: string;
  date: string;          // ISO date string, auto-generated
  description?: string;
  debits: EntryLine[];
  credits: EntryLine[];
}

// ─── Form state (used only in NewEntry, not stored) ───────────────────────────

export interface EntryLineForm {
  id: string;
  accountId: string;
  amount: string;        // string while editing, parsed to number on save
}

export interface JournalEntryForm {
  description: string;
  debits: EntryLineForm[];
  credits: EntryLineForm[];
}