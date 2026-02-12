import { create } from 'zustand';

interface UIState {
  showSplash: boolean;
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  notesModalOpen: boolean;
  initialLibraryTab: 'import' | 'library';

  setShowSplash: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setAIPanelOpen: (open: boolean) => void;
  setNotesModalOpen: (open: boolean) => void;
  setInitialLibraryTab: (tab: 'import' | 'library') => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showSplash: true,
  sidebarOpen: false,
  aiPanelOpen: false,
  notesModalOpen: false,
  initialLibraryTab: 'import',

  setShowSplash: (showSplash) => set({ showSplash }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setAIPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),
  setNotesModalOpen: (notesModalOpen) => set({ notesModalOpen }),
  setInitialLibraryTab: (initialLibraryTab) => set({ initialLibraryTab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
}));
