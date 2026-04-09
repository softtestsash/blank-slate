import {
  getLastTwoEMASnapshots,
  insertEMASnapshot,
  getProfile,
  EMASnapshot,
} from '../db/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PulseStatus = 'GREEN' | 'YELLOW' | 'BLUE';

export interface StatusResult {
  status: PulseStatus;
  streak: number;
  consistency: number; // 0–100
}

// ─── EMA Computation ─────────────────────────────────────────────────────────

const EMA_PERIOD = 7;
const ALPHA = 2 / (EMA_PERIOD + 1); // 0.25

/**
 * Compute next EMA value.
 * @param newWeight  Latest raw weight reading (any consistent unit).
 * @param prevEMA    Previous EMA value. Pass newWeight on first reading.
 */
export function computeEMA(newWeight: number, prevEMA: number): number {
  return ALPHA * newWeight + (1 - ALPHA) * prevEMA;
}

// ─── Status Classification ───────────────────────────────────────────────────

/**
 * Classify the pulse status based on goal-oriented trend analysis.
 *
 * GREEN  – Moving toward target weight, OR within 1 lb and stable.
 * YELLOW – Drifting away from target weight.
 * BLUE   – Plateau (no significant movement, not yet at target).
 */
export function classifyStatus(
  currentEMA: number,
  prevEMA: number,
  targetWeight: number,
  unit: 'lbs' | 'kg' = 'lbs'
): PulseStatus {
  const toleranceLbs = 1.0;
  const tolerance = unit === 'lbs' ? toleranceLbs : toleranceLbs * 0.453592;
  const plateauThresholdPct = 0.2; // < 0.2% change = plateau

  const goalDirection: 'lose' | 'gain' = targetWeight < currentEMA ? 'lose' : 'gain';
  const withinTarget = Math.abs(currentEMA - targetWeight) <= tolerance;

  const deltaPct =
    prevEMA !== 0
      ? ((currentEMA - prevEMA) / prevEMA) * 100
      : 0;

  const isPlateaued = Math.abs(deltaPct) < plateauThresholdPct;

  const movingToward =
    (goalDirection === 'lose' && deltaPct < -plateauThresholdPct) ||
    (goalDirection === 'gain' && deltaPct > plateauThresholdPct);

  const movingAway =
    (goalDirection === 'lose' && deltaPct > plateauThresholdPct) ||
    (goalDirection === 'gain' && deltaPct < -plateauThresholdPct);

  if (movingToward || (withinTarget && isPlateaued)) return 'GREEN';
  if (movingAway) return 'YELLOW';
  return 'BLUE'; // plateau, not at target yet
}

// ─── Full Status Resolution ───────────────────────────────────────────────────

/**
 * Compute and return the current status from the DB.
 * Falls back to BLUE when there is insufficient data.
 */
export function getCurrentStatus(
  streak: number,
  consistency: number
): StatusResult {
  const profile = getProfile();
  const snapshots: EMASnapshot[] = getLastTwoEMASnapshots();

  if (!profile || snapshots.length === 0) {
    return { status: 'BLUE', streak, consistency };
  }

  const currentEMA = snapshots[0].ema_value;
  const prevEMA = snapshots.length >= 2 ? snapshots[1].ema_value : currentEMA;

  const status = classifyStatus(
    currentEMA,
    prevEMA,
    profile.target_weight,
    profile.unit as 'lbs' | 'kg'
  );

  return { status, streak, consistency };
}

// ─── Coaching Explanations ────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation of the current pulse status.
 * Takes into account top tags from the week and the EMA delta.
 */
export function getStatusExplanation(
  status: PulseStatus,
  topTags: string[],
  emaDelta: number
): string {
  const hasWaterTags = topTags.some((t) => t === 'salty food' || t === 'alcohol');
  const hasWorkout   = topTags.includes('workout');
  const hasStress    = topTags.includes('stress') || topTags.includes('poor sleep');

  let main = '';
  let detail = '';

  switch (status) {
    case 'GREEN':
      main = 'Your trend is moving toward your goal.';
      if (hasWorkout) {
        detail = 'Consistent movement is paying off.';
      } else {
        detail = 'Keep your morning ritual consistent and the trend will hold.';
      }
      break;

    case 'YELLOW':
      main = "Your trend has drifted slightly away from your goal.";
      if (hasWaterTags) {
        detail =
          'You tagged salty food or alcohol this week. This is most likely water retention — not fat. Sodium and alcohol cause your body to hold fluid temporarily. It usually passes in 24–48 hours.';
      } else if (hasStress) {
        detail =
          'Stress and poor sleep raise cortisol, which can cause temporary water retention and slow your trend. Focus on recovery this week.';
      } else {
        detail =
          'Small drifts are normal. One week does not define the trend. Stay consistent with your ritual and it will self-correct.';
      }
      break;

    case 'BLUE':
      main = "You're in a plateau — no significant movement yet.";
      detail =
        'Plateaus are a normal part of the process. Your body is adjusting. Keep weighing in every morning; the trend will resume. Consistency is the only lever you control.';
      break;
  }

  // Override detail if a large spike correlates with water-weight tags
  if (Math.abs(emaDelta) > 0.15 && hasWaterTags && status !== 'GREEN') {
    detail =
      'This looks like water retention, not fat. Salty food and alcohol can temporarily add 1–3 lbs of fluid. Give it 48 hours — the trend will correct itself.';
  }

  return detail ? `${main}\n\n${detail}` : main;
}

// ─── Record New Weight ───────────────────────────────────────────────────────

/**
 * Called after a successful BLE weigh-in.
 * Computes and persists a new EMA snapshot.
 * Returns the new EMA value (NOT the raw weight — callers should not surface it).
 */
export function recordWeightAndUpdateEMA(rawWeight: number): number {
  const snapshots = getLastTwoEMASnapshots();
  const prevEMA = snapshots.length > 0 ? snapshots[0].ema_value : rawWeight;
  const newEMA = computeEMA(rawWeight, prevEMA);
  insertEMASnapshot(newEMA);
  return newEMA; // EMA only — raw weight stays in the measurements table
}
