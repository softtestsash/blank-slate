// Zero-dependency store — replaces zustand to avoid its ESM/import.meta
// incompatibility with Metro's web bundler.
//
// API is intentionally compatible with the zustand usage in this codebase:
//   useAppStore()           → returns full state (destructure freely)
//   useAppStore(s => s.x)  → returns selected slice

import React from 'react';
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
  consistency: number;
}

interface AppState {
  profile: UserProfile | null;
  statusResult: StatusResult;
  ritualPhase: RitualPhase;
  checkedItems: Set<number>;
  selectedTags: string[];
  pendingMeasurementId: number | null;

  setProfile: (p: UserProfile) => void;
  setStatusResult: (r: StatusResult) => void;
  setRitualPhase: (phase: RitualPhase) => void;
  toggleChecklistItem: (id: number) => void;
  toggleTag: (tag: string) => void;
  resetRitual: () => void;
  setPendingMeasurementId: (id: number | null) => void;
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _data = {
  profile: null as UserProfile | null,
  statusResult: { status: 'BLUE' as PulseStatus, streak: 0, consistency: 0 },
  ritualPhase: 'IDLE' as RitualPhase,
  checkedItems: new Set<number>(),
  selectedTags: [] as string[],
  pendingMeasurementId: null as number | null,
};

const _listeners = new Set<() => void>();

function _set(partial: Partial<typeof _data>): void {
  _data = { ..._data, ...partial };
  _listeners.forEach((l) => l());
}

// ─── Stable action references ─────────────────────────────────────────────────

const _actions = {
  setProfile: (p: UserProfile) => _set({ profile: p }),
  setStatusResult: (r: StatusResult) => _set({ statusResult: r }),
  setRitualPhase: (phase: RitualPhase) => _set({ ritualPhase: phase }),
  toggleChecklistItem: (id: number) => {
    const next = new Set(_data.checkedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    _set({ checkedItems: next });
  },
  toggleTag: (tag: string) => {
    _set({
      selectedTags: _data.selectedTags.includes(tag)
        ? _data.selectedTags.filter((t) => t !== tag)
        : [..._data.selectedTags, tag],
    });
  },
  resetRitual: () =>
    _set({
      ritualPhase: 'IDLE',
      checkedItems: new Set<number>(),
      selectedTags: [],
      pendingMeasurementId: null,
    }),
  setPendingMeasurementId: (id: number | null) => _set({ pendingMeasurementId: id }),
};

function _snapshot(): AppState {
  return { ..._data, ..._actions };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore(): AppState;
export function useAppStore<T>(selector: (s: AppState) => T): T;
export function useAppStore<T>(selector?: (s: AppState) => T): AppState | T {
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    _listeners.add(rerender);
    return () => { _listeners.delete(rerender); };
  }, []);

  const snap = _snapshot();
  return selector ? selector(snap) : snap;
}
