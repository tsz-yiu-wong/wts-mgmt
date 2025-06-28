import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Account } from "@/types";
import { mockAccounts } from "@/lib/mock-data";

interface AccountStore {
  accounts: Account[];
  selectedAccount: Account | null;
  
  // Actions
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  selectAccount: (account: Account | null) => void;
  getAccountById: (id: string) => Account | undefined;
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set, get) => ({
      accounts: mockAccounts,
      selectedAccount: null,

      setAccounts: (accounts) => set({ accounts }),
      
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id === id ? { ...account, ...updates } : account
          ),
        })),

      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((account) => account.id !== id),
          selectedAccount:
            state.selectedAccount?.id === id ? null : state.selectedAccount,
        })),

      selectAccount: (account) => set({ selectedAccount: account }),

      getAccountById: (id) => {
        const { accounts } = get();
        return accounts.find((account) => account.id === id);
      },
    }),
    {
      name: "account-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
); 