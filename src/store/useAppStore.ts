import { create } from 'zustand';
import { UserProfile } from '../db/db';
import { PulseStatus } from '../services/trendEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RitualPhase =
  | 'IDLE'
  | 'CHECKLIST'
  | 'AWAITING_SCALE'
  | 'TAGGING'
  | 'COMPLETE';

export interface StatusResult {
  status: PulseStatus;
  streak: number;
  consistency: number; // 0–100
}

// ─── Store Shape ─────────────────────────────────────────────────────────────

interface AppState {
  // ── Profile ──────────────────────────────────────────────────────────────
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;

  // ── Status (never contains raw weight) ───────────────────────────────────
  statusResult: StatusResult;
  setStatusResult: (r: StatusResult) => void;

  // ── Ritual state machine ─────────────────────────────────────────────────
  ritualPhase: RitualPhase;
  checkedItems: Set<number>;
  selectedTags: string[];

  setRitualPhase: (phase: RitualPhase) => void;
  toggleChecklistItem: (id: number) => void;
  toggleTag: (tag: string) => void;
  resetRitual: () => void;

  // ── Pending measurement ID (set after BLE reading, cleared after tagging) -
  pendingMeasurementId: number | null;
  setPendingMeasurementId: (id: number | null) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  // Profile
  profile: null,
  setProfile: (p) => set({ profile: p }),

  // Status — default to BLUE (neutral/unknown) until first EMA is computed
  statusResult: { status: 'BLUE', streak: 0, consistency: 0 },
  setStatusResult: (r) => set({ statusResult: r }),

  // Ritual
  ritualPhase: 'IDLE',
  checkedItems: new Set<number>(),
  selectedTags: [],
  pendingMeasurementId: null,

  setRitualPhase: (phase) => set({ ritualPhase: phase }),

  toggleChecklistItem: (id) =>
    set((state) => {
      const next = new Set(state.checkedItems);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { checkedItems: next };
    }),

  toggleTag: (tag) =>
    set((state) => {
      const exists = state.selectedTags.includes(tag);
      return {
        selectedTags: exists
          ? state.selectedTags.filter((t) => t !== tag)
          : [...state.selectedTags, tag],
      };
    }),

  resetRitual: () =>
    set({
      ritualPhase: 'IDLE',
      checkedItems: new Set<number>(),
      selectedTags: [],
      pendingMeasurementId: null,
    }),

  setPendingMeasurementId: (id) => set({ pendingMeasurementId: id }),
}));
