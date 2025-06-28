import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { WhatsAppWindow } from "@/types";
import { mockWindows } from "@/lib/mock-data";

interface WindowStore {
  windows: WhatsAppWindow[];
  activeWindow: WhatsAppWindow | null;
  
  // Actions
  setWindows: (windows: WhatsAppWindow[]) => void;
  addWindow: (window: WhatsAppWindow) => void;
  updateWindow: (id: string, updates: Partial<WhatsAppWindow>) => void;
  removeWindow: (id: string) => void;
  setActiveWindow: (window: WhatsAppWindow | null) => void;
  getWindowById: (id: string) => WhatsAppWindow | undefined;
  getWindowByAccountId: (accountId: string) => WhatsAppWindow | undefined;
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      windows: mockWindows,
      activeWindow: null,

      setWindows: (windows) => set({ windows }),
      
      addWindow: (window) =>
        set((state) => ({
          windows: [...state.windows, window],
        })),

      updateWindow: (id, updates) =>
        set((state) => ({
          windows: state.windows.map((window) =>
            window.id === id ? { ...window, ...updates } : window
          ),
        })),

      removeWindow: (id) =>
        set((state) => ({
          windows: state.windows.filter((window) => window.id !== id),
          activeWindow:
            state.activeWindow?.id === id ? null : state.activeWindow,
        })),

      setActiveWindow: (window) => set({ activeWindow: window }),

      getWindowById: (id) => {
        const { windows } = get();
        return windows.find((window) => window.id === id);
      },

      getWindowByAccountId: (accountId) => {
        const { windows } = get();
        return windows.find((window) => window.accountId === accountId);
      },
    }),
    {
      name: "window-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
); 