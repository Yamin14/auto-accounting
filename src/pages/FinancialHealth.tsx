import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { useJournalStore } from "../store/journalStore";
import defaultAccounts from "../data/defaultAccounts";
import type { AccountCategory } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type RatioStatus = "good" | "warn" | "bad" | "neutral";

interface Ratio {
  name: string;
  value: number | null;
  formatted: string;
  status: RatioStatus;
  benchmark: string;
  description: string;
}

type Category = "liquidity" | "profitability" | "leverage" | "efficiency";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const fmtX = (n: number) => `${n.toFixed(2)}x`;

const fmtDays = (n: number) => `${Math.round(n)} days`;

const safeDiv = (num: number, den: number): number | null =>
  den === 0 ? null : num / den;

// ─── Account balance aggregation ──────────────────────────────────────────────

function useBalances() {
  const entries = useJournalStore((s) => s.entries);

  return useMemo(() => {
    // Raw debits & credits per account
    const raw = new Map<string, { debit: number; credit: number }>();

    for (const entry of entries) {
      for (const l of entry.debits) {
        const cur = raw.get(l.accountId) ?? { debit: 0, credit: 0 };
        raw.set(l.accountId, { ...cur, debit: cur.debit + l.amount });
      }
      for (const l of entry.credits) {
        const cur = raw.get(l.accountId) ?? { debit: 0, credit: 0 };
        raw.set(l.accountId, { ...cur, credit: cur.credit + l.amount });
      }
    }

    // Net balance per account using normal balance convention:
    // Asset/Expense: debit normal  → balance = debit - credit
    // Liability/Equity/Revenue: credit normal → balance = credit - debit
    const DEBIT_NORMAL: AccountCategory[] = ["Asset", "Expense"];

    const balances = new Map<string, number>();
    for (const account of defaultAccounts) {
      const r = raw.get(account.id);
      if (!r) continue;
      const net = DEBIT_NORMAL.includes(account.category)
        ? r.debit - r.credit
        : r.credit - r.debit;
      balances.set(account.id, net);
    }

    // Aggregate by category
    const sumCategory = (cat: AccountCategory) => {
      let total = 0;
      for (const account of defaultAccounts) {
        if (account.category !== cat) continue;
        total += balances.get(account.id) ?? 0;
      }
      return total;
    };

    // Aggregate by account name keywords (case-insensitive substring match)
    const sumByKeyword = (...keywords: string[]) => {
      let total = 0;
      for (const account of defaultAccounts) {
        const name = account.accountName.toLowerCase();
        if (keywords.some((k) => name.includes(k.toLowerCase()))) {
          total += balances.get(account.id) ?? 0;
        }
      }
      return total;
    };

    const totalAssets      = sumCategory("Asset");
    const totalLiabilities = sumCategory("Liability");
    const totalEquity      = sumCategory("Equity");
    const totalRevenue     = sumCategory("Revenue");
    const totalExpenses    = sumCategory("Expense");

    // Current (short-term) splits — keyword-based; adapt to your account names
    const currentAssets      = sumByKeyword("cash", "receivable", "inventory", "prepaid", "current");
    const currentLiabilities = sumByKeyword("payable", "accrued", "current liabilit", "short-term", "unearned");
    const cash               = sumByKeyword("cash");
    const inventory          = sumByKeyword("inventory");
    const cogs               = sumByKeyword("cost of goods", "cogs", "cost of sales");
    const grossProfit        = totalRevenue - cogs;
    const netProfit          = totalRevenue - totalExpenses;
    const operatingExpenses  = totalExpenses - cogs;
    const operatingProfit    = grossProfit - operatingExpenses;
    const receivables        = sumByKeyword("receivable");
    const payables           = sumByKeyword("payable");
    const totalDebt          = sumByKeyword("loan", "debt", "borrowing", "note payable", "mortgage");
    const quickAssets        = currentAssets - inventory;

    return {
      totalAssets, totalLiabilities, totalEquity,
      totalRevenue, totalExpenses,
      currentAssets, currentLiabilities,
      cash, inventory, cogs, grossProfit,
      netProfit, operatingProfit,
      receivables, payables, totalDebt,
      quickAssets,
      hasData: entries.length > 0,
    };
  }, [entries]);
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusColor(s: RatioStatus) {
  return {
    good:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
    warn:    "text-amber-400  bg-amber-400/10  border-amber-400/25",
    bad:     "text-rose-400   bg-rose-400/10   border-rose-400/25",
    neutral: "text-sky-400    bg-sky-400/10    border-sky-400/25",
  }[s];
}

function statusIcon(s: RatioStatus) {
  return { good: "✓", warn: "△", bad: "✗", neutral: "–" }[s];
}

// ─── Mini Bar Chart (SVG, no dependency) ─────────────────────────────────────

interface BarDatum { label: string; value: number; color: string }

function MiniBarChart({ data, unit = "" }: { data: BarDatum[]; unit?: string }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const W = 320, PAD = 32, BAR_H = 28, GAP = 10;
  const totalH = data.length * (BAR_H + GAP) + PAD + 20;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} style={{ display: "block" }}>
      {data.map((d, i) => {
        const y = PAD + i * (BAR_H + GAP);
        const barW = Math.max((Math.abs(d.value) / max) * (W - 90), 4);
        return (
          <g key={d.label}>
            <text x={0} y={y + BAR_H / 2 + 5} fontSize={11} fill="var(--text-muted)" fontFamily="inherit">
              {d.label}
            </text>
            <rect x={90} y={y} width={barW} height={BAR_H} rx={4} fill={d.color} opacity={0.85} />
            <text x={95 + barW} y={y + BAR_H / 2 + 5} fontSize={11} fill="var(--text-primary)" fontFamily="inherit" fontWeight={500}>
              {d.value.toFixed(2)}{unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Mini Donut Chart ─────────────────────────────────────────────────────────

interface DonutSlice { label: string; value: number; color: string }

function MiniDonut({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((s, d) => s + Math.max(d.value, 0), 0) || 1;
  const R = 52, cx = 80, cy = 68, stroke = 22;
  let cumAngle = -Math.PI / 2;

  const arcs = slices.map((s) => {
    const angle = (Math.max(s.value, 0) / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle);
    const y1 = cy + R * Math.sin(cumAngle);
    // eslint-disable-next-line react-hooks/immutability
    cumAngle += angle;
    const x2 = cx + R * Math.cos(cumAngle);
    const y2 = cy + R * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...s, d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`, pct: (s.value / total * 100).toFixed(1) };
  });

  return (
    <svg width="100%" viewBox="0 0 260 140" style={{ display: "block" }}>
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={stroke} strokeLinecap="butt" opacity={0.9} />
      ))}
      {/* legend */}
      {arcs.map((a, i) => (
        <g key={i} transform={`translate(150, ${20 + i * 28})`}>
          <rect width={10} height={10} rx={2} fill={a.color} />
          <text x={16} y={10} fontSize={11} fill="var(--text-primary)" fontFamily="inherit">{a.label}</text>
          <text x={16} y={24} fontSize={10} fill="var(--text-muted)" fontFamily="inherit">{a.pct}%</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Ratio Card ───────────────────────────────────────────────────────────────

function RatioCard({ ratio }: { ratio: Ratio }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 hover:border-[var(--border-hover)] transition-colors">
      <p className="text-[11px] text-[var(--text-muted)] leading-tight">{ratio.name}</p>
      <p className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight">
        {ratio.value === null ? <span className="text-lg text-[var(--text-muted)]">—</span> : ratio.formatted}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(ratio.status)}`}>
          {statusIcon(ratio.status)} {ratio.status === "good" ? "Good" : ratio.status === "warn" ? "Watch" : ratio.status === "bad" ? "Poor" : "N/A"}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">{ratio.benchmark}</span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-snug border-t border-[var(--border)] pt-2 mt-auto">{ratio.description}</p>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { id: Category; label: string }[] = [
  { id: "liquidity",     label: "Liquidity" },
  { id: "profitability", label: "Profitability" },
  { id: "leverage",      label: "Leverage" },
  { id: "efficiency",    label: "Efficiency" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialHealth() {
  const [activeTab, setActiveTab] = useState<Category>("liquidity");
  const b = useBalances();

  // ── Ratio computation ────────────────────────────────────────────────────────

  const ratios = useMemo(() => {
    const { currentAssets, currentLiabilities, cash, quickAssets, inventory,
            totalAssets, totalLiabilities, totalEquity,
            totalRevenue, cogs, grossProfit, netProfit, operatingProfit,
            receivables, payables } = b;

    // Liquidity
    const currentRatio  = safeDiv(currentAssets, currentLiabilities);
    const quickRatio    = safeDiv(quickAssets, currentLiabilities);
    const cashRatio     = safeDiv(cash, currentLiabilities);
    const nwc           = currentAssets - currentLiabilities;

    // Profitability
    const grossMargin   = safeDiv(grossProfit, totalRevenue);
    const netMargin     = safeDiv(netProfit, totalRevenue);
    const opMargin      = safeDiv(operatingProfit, totalRevenue);
    const roa           = safeDiv(netProfit, totalAssets);
    const roe           = safeDiv(netProfit, totalEquity);

    // Leverage
    const debtToEquity  = safeDiv(totalLiabilities, totalEquity);
    const debtToAssets  = safeDiv(totalLiabilities, totalAssets);
    const equityMult    = safeDiv(totalAssets, totalEquity);

    // Efficiency
    const assetTurnover = safeDiv(totalRevenue, totalAssets);
    const invTurnover   = cogs > 0 ? safeDiv(cogs, inventory) : null;
    const recTurnover   = safeDiv(totalRevenue, receivables);
    const dso           = recTurnover ? 365 / recTurnover : null;
    const dpo           = payables > 0 && cogs > 0 ? (payables / cogs) * 365 : null;
    const dio           = invTurnover ? 365 / invTurnover : null;
    const ccc           = (dio !== null && dso !== null && dpo !== null) ? dio + dso - dpo : null;

    const mkRatio = (
      name: string,
      value: number | null,
      formatted: string,
      status: RatioStatus,
      benchmark: string,
      description: string
    ): Ratio => ({ name, value, formatted, status, benchmark, description });

    const liqStatus = (v: number | null, good: number, warn: number): RatioStatus =>
      v === null ? "neutral" : v >= good ? "good" : v >= warn ? "warn" : "bad";

    const pctStatus = (v: number | null, good: number, warn: number): RatioStatus =>
      v === null ? "neutral" : v >= good ? "good" : v >= warn ? "warn" : "bad";

    const ratioStatus = (v: number | null, good: number, warn: number, higherBetter = true): RatioStatus => {
      if (v === null) return "neutral";
      if (higherBetter) return v >= good ? "good" : v >= warn ? "warn" : "bad";
      return v <= good ? "good" : v <= warn ? "warn" : "bad";
    };

    return {
      liquidity: [
        mkRatio("Current Ratio", currentRatio,
          currentRatio !== null ? fmtX(currentRatio) : "—",
          liqStatus(currentRatio, 2, 1),
          "Benchmark ≥ 2.0",
          "Ability to pay short-term obligations with current assets."),

        mkRatio("Quick Ratio", quickRatio,
          quickRatio !== null ? fmtX(quickRatio) : "—",
          liqStatus(quickRatio, 1, 0.5),
          "Benchmark ≥ 1.0",
          "Like the current ratio but excludes inventory — a stricter liquidity test."),

        mkRatio("Cash Ratio", cashRatio,
          cashRatio !== null ? fmtX(cashRatio) : "—",
          liqStatus(cashRatio, 0.5, 0.2),
          "Benchmark ≥ 0.5",
          "Most conservative: only cash against current liabilities."),

        mkRatio("Net Working Capital", nwc,
          fmt2(nwc),
          nwc > 0 ? "good" : nwc === 0 ? "warn" : "bad",
          "Should be positive",
          "Current assets minus current liabilities — the liquidity buffer."),
      ],

      profitability: [
        mkRatio("Gross Profit Margin", grossMargin,
          grossMargin !== null ? fmtPct(grossMargin) : "—",
          pctStatus(grossMargin, 0.4, 0.2),
          "Benchmark ≥ 40%",
          "Revenue remaining after deducting cost of goods sold."),

        mkRatio("Net Profit Margin", netMargin,
          netMargin !== null ? fmtPct(netMargin) : "—",
          pctStatus(netMargin, 0.1, 0.05),
          "Benchmark ≥ 10%",
          "Bottom-line profit as a percentage of revenue."),

        mkRatio("Operating Margin", opMargin,
          opMargin !== null ? fmtPct(opMargin) : "—",
          pctStatus(opMargin, 0.15, 0.08),
          "Benchmark ≥ 15%",
          "Profit from core operations before interest and tax."),

        mkRatio("Return on Assets (ROA)", roa,
          roa !== null ? fmtPct(roa) : "—",
          pctStatus(roa, 0.1, 0.05),
          "Benchmark ≥ 10%",
          "How efficiently assets generate net profit."),

        mkRatio("Return on Equity (ROE)", roe,
          roe !== null ? fmtPct(roe) : "—",
          pctStatus(roe, 0.15, 0.08),
          "Benchmark ≥ 15%",
          "Net profit relative to shareholders' equity."),
      ],

      leverage: [
        mkRatio("Debt-to-Equity Ratio", debtToEquity,
          debtToEquity !== null ? fmtX(debtToEquity) : "—",
          ratioStatus(debtToEquity, 1, 2, false),
          "Benchmark ≤ 1.0",
          "Total liabilities divided by equity — measures financial leverage."),

        mkRatio("Debt-to-Assets Ratio", debtToAssets,
          debtToAssets !== null ? fmtX(debtToAssets) : "—",
          ratioStatus(debtToAssets, 0.5, 0.7, false),
          "Benchmark ≤ 0.5",
          "Proportion of assets financed by liabilities."),

        mkRatio("Equity Multiplier", equityMult,
          equityMult !== null ? fmtX(equityMult) : "—",
          ratioStatus(equityMult, 2, 3, false),
          "Benchmark ≤ 2.0",
          "Total assets relative to equity — part of the DuPont framework."),
      ],

      efficiency: [
        mkRatio("Asset Turnover", assetTurnover,
          assetTurnover !== null ? fmtX(assetTurnover) : "—",
          ratioStatus(assetTurnover, 0.5, 0.3, true),
          "Benchmark ≥ 0.5x",
          "Revenue generated per unit of total assets."),

        mkRatio("Inventory Turnover", invTurnover,
          invTurnover !== null ? fmtX(invTurnover) : "—",
          ratioStatus(invTurnover, 4, 2, true),
          "Benchmark 4–8x",
          "How many times inventory is sold and replaced in the period."),

        mkRatio("Receivables Turnover", recTurnover,
          recTurnover !== null ? fmtX(recTurnover) : "—",
          ratioStatus(recTurnover, 8, 4, true),
          "Higher is better",
          "How quickly the business collects its receivables."),

        mkRatio("Days Sales Outstanding", dso,
          dso !== null ? fmtDays(dso) : "—",
          ratioStatus(dso, 45, 60, false),
          "Benchmark ≤ 45 days",
          "Average days to collect payment after a sale."),

        mkRatio("Days Inventory Outstanding", dio,
          dio !== null ? fmtDays(dio) : "—",
          ratioStatus(dio, 30, 60, false),
          "Benchmark ≤ 30 days",
          "Average days company holds inventory before selling it."),

        mkRatio("Days Payable Outstanding", dpo,
          dpo !== null ? fmtDays(dpo) : "—",
          ratioStatus(dpo, 30, 15, true),
          "Ideally DPO > DSO",
          "Average days taken to pay suppliers."),

        mkRatio("Cash Conversion Cycle", ccc,
          ccc !== null ? fmtDays(ccc) : "—",
          ratioStatus(ccc, 30, 60, false),
          "Lower is better",
          "Days from paying for inventory to collecting cash from customers."),
      ],
    };
  }, [b]);

  // ── Chart data per tab ────────────────────────────────────────────────────────

  const chartContent = useMemo(() => {
    const { totalAssets, totalLiabilities, totalEquity,
            totalRevenue, grossProfit, netProfit, operatingProfit,
            currentAssets, currentLiabilities, cash, inventory, receivables } = b;

    return {
      liquidity: {
        bars: [
          { label: "Current Assets",  value: currentAssets,      color: "#34d399" },
          { label: "Current Liab.",   value: currentLiabilities, color: "#f87171" },
          { label: "Cash",            value: cash,               color: "#60a5fa" },
          { label: "Inventory",       value: inventory,          color: "#a78bfa" },
          { label: "Receivables",     value: receivables,        color: "#fb923c" },
        ] as BarDatum[],
        donut: null,
      },
      profitability: {
        bars: [
          { label: "Revenue",         value: totalRevenue,    color: "#60a5fa" },
          { label: "Gross Profit",    value: grossProfit,     color: "#34d399" },
          { label: "Op. Profit",      value: operatingProfit, color: "#a78bfa" },
          { label: "Net Profit",      value: netProfit,       color: "#fb923c" },
        ] as BarDatum[],
        donut: null,
      },
      leverage: {
        bars: null,
        donut: [
          { label: "Equity",       value: Math.max(totalEquity, 0),      color: "#34d399" },
          { label: "Liabilities",  value: Math.max(totalLiabilities, 0), color: "#f87171" },
        ] as DonutSlice[],
      },
      efficiency: {
        bars: [
          { label: "Total Assets",    value: totalAssets,       color: "#60a5fa" },
          { label: "Revenue",         value: totalRevenue,      color: "#34d399" },
          { label: "Receivables",     value: receivables,       color: "#a78bfa" },
          { label: "Inventory",       value: inventory,         color: "#fb923c" },
        ] as BarDatum[],
        donut: null,
      },
    };
  }, [b]);

  // ── Overall health score ───────────────────────────────────────────────────

  const healthScore = useMemo(() => {
    const all = [
      ...ratios.liquidity,
      ...ratios.profitability,
      ...ratios.leverage,
      ...ratios.efficiency,
    ].filter((r) => r.value !== null);
    if (all.length === 0) return null;
    const good = all.filter((r) => r.status === "good").length;
    const pct  = good / all.length;
    if (pct >= 0.7) return { label: "Healthy",  cls: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" };
    if (pct >= 0.4) return { label: "Fair",     cls: "text-amber-400  border-amber-400/30  bg-amber-400/10" };
    return               { label: "At Risk",   cls: "text-rose-400   border-rose-400/30   bg-rose-400/10" };
  }, [ratios]);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!b.hasData) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Financial Health</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <Activity size={36} strokeWidth={1.2} />
          <p className="text-sm">No entries yet. Add journal entries to calculate ratios.</p>
        </div>
      </div>
    );
  }

  const activeRatios = ratios[activeTab];
  const activeChart  = chartContent[activeTab];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Financial Health</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Calculated from your chart of accounts ·{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {healthScore && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${healthScore.cls}`}>
            {healthScore.label}
          </span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors rounded-t border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-[var(--text-primary)] border-[var(--text-primary)]"
                : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Ratio cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {activeRatios.map((ratio) => (
          <RatioCard key={ratio.name} ratio={ratio} />
        ))}
      </div>

      {/* ── Chart section ── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          {activeTab === "liquidity"     && "Balance Breakdown"}
          {activeTab === "profitability" && "Income Statement Breakdown"}
          {activeTab === "leverage"      && "Capital Structure"}
          {activeTab === "efficiency"    && "Key Account Balances"}
        </p>

        {activeChart.donut ? (
          <MiniDonut slices={activeChart.donut} />
        ) : activeChart.bars ? (
          <MiniBarChart data={activeChart.bars} />
        ) : null}

        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-snug">
          {activeTab === "liquidity"     && "Shows the composition of your current assets and liabilities. A healthy buffer means current assets well exceed current liabilities."}
          {activeTab === "profitability" && "Traces how revenue flows down to gross, operating, and net profit. Each step shows the cost impact of COGS, operating expenses, and other items."}
          {activeTab === "leverage"      && "Your capital structure — how much of total assets is financed by equity versus liabilities. A higher equity share generally signals lower financial risk."}
          {activeTab === "efficiency"    && "Key balances that drive efficiency ratios. Revenue relative to assets reflects how hard assets are working; receivables and inventory levels affect the cash conversion cycle."}
        </p>
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-[11px] text-[var(--text-muted)] text-center pb-2">
        Ratios are computed from your current journal entries. Benchmarks are general guidelines — industry norms vary.
      </p>
    </div>
  );
}