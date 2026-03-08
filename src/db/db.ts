import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { SCHEMA } from './schema';

// expo-sqlite runs on iOS and Android only.
// On web we return safe empty defaults so the UI still renders for testing.
const IS_NATIVE = Platform.OS !== 'web';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('blankslate.db');
  }
  return _db;
}

export function initDB(): void {
  if (!IS_NATIVE) return;
  getDB().execSync(SCHEMA);
}

// ─── User Profile ────────────────────────────────────────────────────────────

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

export function getProfile(): UserProfile | null {
  if (!IS_NATIVE) return null;
  return getDB().getFirstSync<UserProfile>(
    'SELECT * FROM user_profile ORDER BY id DESC LIMIT 1'
  ) ?? null;
}

export function insertProfile(
  name: string,
  sex: string,
  age: number,
  currentWeight: number,
  targetWeight: number,
  unit: 'lbs' | 'kg'
): void {
  if (!IS_NATIVE) return;
  getDB().runSync(
    'INSERT INTO user_profile (name, sex, age, current_weight, target_weight, unit) VALUES (?, ?, ?, ?, ?, ?)',
    [name, sex, age, currentWeight, targetWeight, unit]
  );
}

// ─── Measurements ────────────────────────────────────────────────────────────

export function insertMeasurement(
  rawWeight: number,
  timestamp: string,
  ritualComplete: boolean
): number {
  if (!IS_NATIVE) return -1;
  const result = getDB().runSync(
    'INSERT INTO measurements (raw_weight, timestamp, ritual_complete) VALUES (?, ?, ?)',
    [rawWeight, timestamp, ritualComplete ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export function insertContextTags(measurementId: number, tags: string[]): void {
  if (!IS_NATIVE) return;
  const db = getDB();
  for (const tag of tags) {
    db.runSync(
      'INSERT INTO context_tags (measurement_id, tag) VALUES (?, ?)',
      [measurementId, tag]
    );
  }
}

export interface MeasurementRow {
  id: number;
  raw_weight: number;
  timestamp: string;
  ritual_complete: number;
}

export function getLastNMeasurements(n: number): MeasurementRow[] {
  if (!IS_NATIVE) return [];
  return getDB().getAllSync<MeasurementRow>(
    'SELECT * FROM measurements ORDER BY timestamp DESC LIMIT ?',
    [n]
  );
}

// Measurements between two ISO dates (inclusive), for weekly reveal only.
export function getMeasurementsForWeek(
  weekStart: string,
  weekEnd: string
): MeasurementRow[] {
  if (!IS_NATIVE) return [];
  return getDB().getAllSync<MeasurementRow>(
    "SELECT * FROM measurements WHERE timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC",
    [weekStart, weekEnd]
  );
}

// ─── EMA Snapshots ───────────────────────────────────────────────────────────

export interface EMASnapshot {
  id: number;
  ema_value: number;
  recorded_at: string;
}

export function insertEMASnapshot(emaValue: number): void {
  if (!IS_NATIVE) return;
  getDB().runSync(
    'INSERT INTO ema_snapshots (ema_value) VALUES (?)',
    [emaValue]
  );
}

export function getLastTwoEMASnapshots(): EMASnapshot[] {
  if (!IS_NATIVE) return [];
  return getDB().getAllSync<EMASnapshot>(
    'SELECT * FROM ema_snapshots ORDER BY recorded_at DESC LIMIT 2'
  );
}

// ─── Weekly Summaries ────────────────────────────────────────────────────────

export interface WeeklySummary {
  id: number;
  week_start: string;
  average_weight: number;
  delta_from_prior: number | null;
  measurement_count: number;
  created_at: string;
}

export function upsertWeeklySummary(
  weekStart: string,
  averageWeight: number,
  deltaFromPrior: number | null,
  measurementCount: number
): void {
  if (!IS_NATIVE) return;
  getDB().runSync(
    `INSERT INTO weekly_summaries (week_start, average_weight, delta_from_prior, measurement_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(week_start) DO UPDATE SET
       average_weight    = excluded.average_weight,
       delta_from_prior  = excluded.delta_from_prior,
       measurement_count = excluded.measurement_count`,
    [weekStart, averageWeight, deltaFromPrior, measurementCount]
  );
}

export function getPriorWeeklySummary(weekStart: string): WeeklySummary | null {
  if (!IS_NATIVE) return null;
  return getDB().getFirstSync<WeeklySummary>(
    'SELECT * FROM weekly_summaries WHERE week_start < ? ORDER BY week_start DESC LIMIT 1',
    [weekStart]
  ) ?? null;
}

// ─── Checklist Items ─────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: number;
  label: string;
  description: string | null;
  is_active: number;
  sort_order: number;
}

export function getChecklistItems(): ChecklistItem[] {
  if (!IS_NATIVE) return [];
  return getDB().getAllSync<ChecklistItem>(
    'SELECT * FROM checklist_items WHERE is_active = 1 ORDER BY sort_order ASC'
  );
}

// ─── Consistency / Streak Helpers ────────────────────────────────────────────

export interface WeighInCount {
  count: number;
}

// Returns number of distinct days with a measurement in the current week (Mon-today).
export function getWeeklyWeighInCount(weekStart: string, now: string): number {
  if (!IS_NATIVE) return 0;
  const row = getDB().getFirstSync<WeighInCount>(
    `SELECT COUNT(DISTINCT date(timestamp)) as count
     FROM measurements
     WHERE timestamp >= ? AND timestamp <= ?`,
    [weekStart, now]
  );
  return row?.count ?? 0;
}

// Returns current consecutive-day streak ending today.
export function getCurrentStreak(): number {
  if (!IS_NATIVE) return 0;
  const rows = getDB().getAllSync<{ day: string }>(
    `SELECT DISTINCT date(timestamp) as day
     FROM measurements
     ORDER BY day DESC
     LIMIT 30`
  );
  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (rows[i].day === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Returns top N most-used tags this week.
export function getTopTagsForWeek(weekStart: string, weekEnd: string, n = 3): string[] {
  if (!IS_NATIVE) return [];
  const rows = getDB().getAllSync<{ tag: string }>(
    `SELECT ct.tag
     FROM context_tags ct
     JOIN measurements m ON ct.measurement_id = m.id
     WHERE m.timestamp >= ? AND m.timestamp < ?
     GROUP BY ct.tag
     ORDER BY COUNT(*) DESC
     LIMIT ?`,
    [weekStart, weekEnd, n]
  );
  return rows.map(r => r.tag);
}
