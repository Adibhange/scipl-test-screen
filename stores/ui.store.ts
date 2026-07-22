import { create } from "zustand";

interface UiState {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	activeAdminTab: string;
	setActiveAdminTab: (tab: string) => void;
	isSyncing: boolean;
	setIsSyncing: (syncing: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
	sidebarOpen: true,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	activeAdminTab: "candidates",
	setActiveAdminTab: (tab) => set({ activeAdminTab: tab }),
	isSyncing: false,
	setIsSyncing: (syncing) => set({ isSyncing: syncing }),
}));
