import { create } from "zustand";

export type AlertType = "success" | "error" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

interface UIState {
  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Alerts
  alerts: Alert[];
  pushAlert: (type: AlertType, message: string) => void;
  dismissAlert: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Theme
  theme: (localStorage.getItem("aa-theme") as "light" | "dark") ?? "dark",
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("aa-theme", next);
      return { theme: next };
    }),

  // Sidebar
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Alerts
  alerts: [],
  pushAlert: (type, message) =>
    set((state) => {
      const id = crypto.randomUUID();
      // Auto-dismiss after 4 seconds
      setTimeout(
        () =>
          set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
        4000
      );
      return { alerts: [...state.alerts, { id, type, message }] };
    }),
  dismissAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
}));