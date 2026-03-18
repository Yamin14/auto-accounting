import { useEffect, useRef, type JSX } from "react";
import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import {
  PlusSquare,
  BookOpen,
  Layers,
  Scale,
  TrendingUp,
  LayoutList,
  ArrowLeftRight,
  Sun,
  Moon,
  Menu,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import type { Alert } from "../store/uiStore";

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "New Entry",              path: "/new-entry",        Icon: PlusSquare    },
  { label: "Journal Entries",        path: "/journal-entries",  Icon: BookOpen      },
  { label: "Ledger",                 path: "/ledger",           Icon: Layers        },
  { label: "Trial Balance",          path: "/trial-balance",    Icon: Scale         },
  { label: "Income Statement",       path: "/income-statement", Icon: TrendingUp    },
  { label: "Balance Sheet",          path: "/balance-sheet",    Icon: LayoutList    },
  { label: "Statement of Cash Flow", path: "/cash-flow",        Icon: ArrowLeftRight},
];

// ─── Alert icon map ────────────────────────────────────────────────────────────
const ALERT_ICON: Record<Alert["type"], JSX.Element> = {
  success: <CheckCircle  size={16} className="text-emerald-400 shrink-0" />,
  error:   <XCircle      size={16} className="text-rose-400    shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400  shrink-0" />,
  info:    <Info          size={16} className="text-sky-400    shrink-0" />,
};

const ALERT_BAR: Record<Alert["type"], string> = {
  success: "bg-emerald-500",
  error:   "bg-rose-500",
  warning: "bg-amber-500",
  info:    "bg-sky-500",
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen, toggleSidebar, alerts, dismissAlert } =
    useUIStore();

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && overlayRef.current === e.target) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setSidebarOpen]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans transition-colors duration-300">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Wordmark */}
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-[var(--accent)]">Auto</span>Account
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            ref={overlayRef}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          className={[
            "fixed lg:static inset-y-0 left-0 top-14 z-20",
            "w-60 shrink-0 flex flex-col",
            "bg-[var(--bg-surface)] border-r border-[var(--border)]",
            "transform transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            <ul className="space-y-0.5 px-2">
              {NAV_ITEMS.map(({ label, path, Icon }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                        "transition-colors duration-150 group relative",
                        isActive
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-r-full" />
                        )}
                        <Icon size={17} className="shrink-0" />
                        <span className="flex-1 leading-none">{label}</span>
                        {isActive && <ChevronRight size={14} className="opacity-50" />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="px-4 py-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--text-muted)]">
              AutoAccount v1.0
            </p>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-base)]">
          <Outlet />
        </main>
      </div>

      {/* ── Alert Stack ───────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            role="alert"
            className={[
              "flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg",
              "bg-[var(--bg-surface)] border border-[var(--border)]",
              "animate-slide-in text-sm",
            ].join(" ")}
          >
            {/* Left color bar */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${ALERT_BAR[alert.type]}`} />

            <span className="relative">{ALERT_ICON[alert.type]}</span>
            <p className="flex-1 text-[var(--text-primary)] leading-snug">{alert.message}</p>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}