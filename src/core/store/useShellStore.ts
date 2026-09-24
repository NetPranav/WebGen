"use client";

import { create } from "zustand";

/**
 * ============================================================================
 * SHELL STORE — Global Editor Shell UI State
 * ============================================================================
 * Manages editor-wide modal state, active panel tracking, and notification
 * preferences used by shell-level components like CollaboratorAvatarStack.
 * Architecture Ref: ROADMAP.md §Phase 9
 * ============================================================================
 */

export interface ShellStoreState {
  /** Currently open modal id, or null if none */
  activeModalId: string | null;

  /** Whether the left sidebar is collapsed */
  sidebarCollapsed: boolean;

  /** Currently active panel index in the dock */
  activePanelIndex: number;

  // Actions
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setActivePanelIndex: (index: number) => void;
}

export const useShellStore = create<ShellStoreState>((set) => ({
  activeModalId: null,
  sidebarCollapsed: false,
  activePanelIndex: 0,

  openModal: (modalId) => set({ activeModalId: modalId }),

  closeModal: () => set({ activeModalId: null }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActivePanelIndex: (index) => set({ activePanelIndex: index }),
}));
