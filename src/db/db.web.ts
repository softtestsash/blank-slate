// Web localStorage shim — Metro picks this file instead of db.ts when bundling
// for web. All data persists in localStorage as JSON. API is identical to db.ts.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  name: string;
  sex: 'male' | 'female' | 'prefer_not_to_say';
  age: number;
  current_weight: number;
  target_weight: number;
  unit: 'lbs' | 'kg';
  created_at: string;
}

export interface MeasurementRow {
  id: number;
  raw_weight: number;
  timestamp: string;
  ritual_complete: number;
  notes?: string;
}

export interface EMASnapshot {
  id: number;
  ema_value: number;
  recorded_at: string;
}

export interface WeeklySummary {
  id: number;
  week_start: string;
  average_weight: number;
  delta_from_prior: number | null;
  measurement_count: number;
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
}

export interface WeighInCount {
  count: number;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ─── No-op DB handle ─────────────────────────────────────────────────────────

export function getDB(): null {
  return null;
}

export function initDB(): void {
  console.log('[DB] web localStorage mode — SQLite disabled');
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  return lsGet<UserProfile | null>('bs_profile', null);
}

export function insertProfile(
  name: string,
  sex: string,
  age: number,
  currentWeight: number,
  targetWeight: number,
  unit: 'lbs' | 'kg'
): void {
  const profile: UserProfile = {
    id: 1,
    name,
    sex: sex as UserProfile['sex'],
    age,
    current_weight: currentWeight,
    target_weight: targetWeight,
    unit,
    created_at: new Date().toISOString(),
  };
  lsSet('bs_profile', profile);
}

// ─── Measurements ─────────────────────────────────────────────────────────────

export function insertMeasurement(
  rawWeight: number,
  timestamp: string,
  ritualComplete: boolean,
  notes?: string
): number {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  const id = Date.now();
  rows.push({ id, raw_weight: rawWeight, timestamp, ritual_complete: ritualComplete ? 1 : 0, notes });
  lsSet('bs_measurements', rows);
  return id;
}

export function insertContextTags(measurementId: number, tags: string[]): void {
  const existing = lsGet<{ measurement_id: number; tag: string }[]>('bs_context_tags', []);
  for (const tag of tags) {
    existing.push({ measurement_id: measurementId, tag });
  }
  lsSet('bs_context_tags', existing);
}

export function getLastNMeasurements(n: number): MeasurementRow[] {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  return [...rows].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, n);
}

export function getMeasurementsForWeek(weekStart: string, weekEnd: string): MeasurementRow[] {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  return rows
    .filter((r) => r.timestamp >= weekStart && r.timestamp < weekEnd)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ─── EMA Snapshots ────────────────────────────────────────────────────────────

export function insertEMASnapshot(emaValue: number): void {
  const snaps = lsGet<EMASnapshot[]>('bs_ema_snapshots', []);
  snaps.push({ id: Date.now(), ema_value: emaValue, recorded_at: new Date().toISOString() });
  lsSet('bs_ema_snapshots', snaps);
}

function _sortedSnapshots(): EMASnapshot[] {
  const snaps = lsGet<EMASnapshot[]>('bs_ema_snapshots', []);
  return [...snaps].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
}

export function getLastTwoEMASnapshots(): EMASnapshot[] {
  return _sortedSnapshots().slice(0, 2);
}

export function getLastNEMASnapshots(n: number): EMASnapshot[] {
  return _sortedSnapshots().slice(0, n);
}

// ─── Weekly Summaries ─────────────────────────────────────────────────────────

export function upsertWeeklySummary(
  weekStart: string,
  averageWeight: number,
  deltaFromPrior: number | null,
  measurementCount: number
): void {
  const summaries = lsGet<Record<string, WeeklySummary>>('bs_weekly_summaries', {});
  summaries[weekStart] = {
    id: Date.now(),
    week_start: weekStart,
    average_weight: averageWeight,
    delta_from_prior: deltaFromPrior,
    measurement_count: measurementCount,
    created_at: new Date().toISOString(),
  };
  lsSet('bs_weekly_summaries', summaries);
}

export function getPriorWeeklySummary(weekStart: string): WeeklySummary | null {
  const summaries = lsGet<Record<string, WeeklySummary>>('bs_weekly_summaries', {});
  const prior = Object.values(summaries)
    .filter((s) => s.week_start < weekStart)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
  return prior ?? null;
}

// ─── Checklist Items ──────────────────────────────────────────────────────────

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 1, label: 'Just woke up', description: 'Before any food, drink, or exercise', is_active: 1, sort_order: 1 },
  { id: 2, label: 'Used the bathroom', description: 'Empty bladder for consistency', is_active: 1, sort_order: 2 },
  { id: 3, label: 'Wearing minimal clothing', description: 'Same outfit each time (e.g. light pyjamas)', is_active: 1, sort_order: 3 },
  { id: 4, label: 'No intense workout yet', description: 'Avoids water retention spikes', is_active: 1, sort_order: 4 },
];

export function getChecklistItems(): ChecklistItem[] {
  return DEFAULT_CHECKLIST;
}

// ─── Consistency / Streak ─────────────────────────────────────────────────────

export function getWeeklyWeighInCount(weekStart: string, now: string): number {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  const days = new Set(
    rows
      .filter((r) => r.timestamp >= weekStart && r.timestamp <= now)
      .map((r) => r.timestamp.slice(0, 10))
  );
  return days.size;
}

export function getCurrentStreak(): number {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  const days = [...new Set(rows.map((r) => r.timestamp.slice(0, 10)))].sort().reverse();
  if (days.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (days[i] === expected.toISOString().slice(0, 10)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getTopTagsForWeek(weekStart: string, weekEnd: string, n = 3): string[] {
  const measurements = lsGet<MeasurementRow[]>('bs_measurements', []);
  const weekIds = new Set(
    measurements
      .filter((r) => r.timestamp >= weekStart && r.timestamp < weekEnd)
      .map((r) => r.id)
  );
  const allTags = lsGet<{ measurement_id: number; tag: string }[]>('bs_context_tags', []);
  const counts: Record<string, number> = {};
  for (const { measurement_id, tag } of allTags) {
    if (weekIds.has(measurement_id)) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag]) => tag);
}

// ─── Habit Heatmap ───────────────────────────────────────────────────────────

export function getLast28DayPresence(): string[] {
  const rows = lsGet<MeasurementRow[]>('bs_measurements', []);
  return [...new Set(rows.map((r) => r.timestamp.slice(0, 10)))];
}
