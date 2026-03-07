// GOLDEN RULE: raw_weight is NEVER surfaced directly to the user.
// All user-facing queries must go through ema_snapshots or weekly_summaries.

export const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS user_profile (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  sex             TEXT    NOT NULL DEFAULT 'prefer_not_to_say',
  age             INTEGER NOT NULL,
  current_weight  REAL    NOT NULL,
  target_weight   REAL    NOT NULL,
  unit            TEXT    NOT NULL DEFAULT 'lbs',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS measurements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_weight      REAL    NOT NULL,
  timestamp       TEXT    NOT NULL,
  ritual_complete INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS context_tags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  measurement_id  INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  tag             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS ema_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ema_value       REAL    NOT NULL,
  recorded_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start        TEXT    NOT NULL UNIQUE,
  average_weight    REAL    NOT NULL,
  delta_from_prior  REAL,
  measurement_count INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT    NOT NULL,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO checklist_items (id, label, description, sort_order) VALUES
  (1, 'Just woke up',             'Before any food, drink, or exercise',         1),
  (2, 'Used the bathroom',        'Empty bladder for consistency',                2),
  (3, 'Wearing minimal clothing', 'Same outfit each time (e.g. light pyjamas)',   3),
  (4, 'No intense workout yet',   'Avoids water retention spikes',                4);

CREATE INDEX IF NOT EXISTS idx_measurements_timestamp  ON measurements(timestamp);
CREATE INDEX IF NOT EXISTS idx_context_tags_measurement ON context_tags(measurement_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week    ON weekly_summaries(week_start);
CREATE INDEX IF NOT EXISTS idx_ema_snapshots_recorded   ON ema_snapshots(recorded_at);
`;
