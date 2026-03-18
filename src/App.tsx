import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useUIStore } from "./store/uiStore";
import Layout from "./components/Layout";

// Pages
import NewEntry from "./pages/NewEntry";
import JournalEntries from "./pages/JournalEntries";
import Ledger from "./pages/Ledger";
import TrialBalance from "./pages/TrialBalance";
import IncomeStatement from "./pages/IncomeStatement";
import BalanceSheet from "./pages/BalanceSheet";
import CashFlowStatement from "./pages/CashFlowStatement";
import NotFound from "./components/NotFound";

export default function App() {
  const theme = useUIStore((s) => s.theme);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/new-entry" replace />} />
          <Route path="new-entry" element={<NewEntry />} />
          <Route path="journal-entries" element={<JournalEntries />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="trial-balance" element={<TrialBalance />} />
          <Route path="income-statement" element={<IncomeStatement />} />
          <Route path="balance-sheet" element={<BalanceSheet />} />
          <Route path="cash-flow" element={<CashFlowStatement />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}