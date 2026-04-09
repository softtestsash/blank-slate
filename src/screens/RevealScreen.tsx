import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { colors, font } from '../theme';
import {
  startOfWeek,
  endOfWeek,
  nextSunday,
  format,
  differenceInHours,
  differenceInMinutes,
} from '../utils/dateUtils';
import {
  getMeasurementsForWeek,
  getPriorWeeklySummary,
  upsertWeeklySummary,
  getTopTagsForWeek,
  getProfile,
  getLast28DayPresence,
} from '../db/db';
import { HabitHeatmap } from '../components/HabitHeatmap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const start = startOfWeek(now); // Monday
  const end = endOfWeek(now);     // Sunday 23:59:59
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
  };
}

function getCountdown(): string {
  const now = new Date();
  const next = nextSunday(now);
  next.setHours(7, 0, 0, 0); // 7 AM Sunday

  const hours = differenceInHours(next, now);
  const minutes = differenceInMinutes(next, now) % 60;

  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  return `${hours}h ${minutes}m`;
}

// ─── Reveal data types ────────────────────────────────────────────────────────

interface RevealData {
  averageWeight: number;
  delta: number | null; // vs prior week, positive = heavier
  measurementCount: number;
  topTags: string[];
  weekLabel: string;
  unit: 'lbs' | 'kg';
  targetWeight: number;
  heatmapDays: string[];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function RevealScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [opened, setOpened] = useState(false);
  const envelopeScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sunday = isSunday();
    setIsUnlocked(sunday);

    if (sunday) {
      const data = buildRevealData();
      setRevealData(data);
    }
  }, []);

  function buildRevealData(): RevealData {
    const profile = getProfile();
    const { weekStart, weekEnd } = getWeekBounds();
    const weekStartLabel = format(startOfWeek(new Date()), 'MMM d');
    const weekEndLabel = format(endOfWeek(new Date()), 'MMM d');

    const measurements = getMeasurementsForWeek(weekStart, weekEnd);
    const count = measurements.length;

    let avg = 0;
    if (count > 0) {
      avg = measurements.reduce((sum, m) => sum + m.raw_weight, 0) / count;
    }

    // Convert to lbs if needed
    const displayWeight =
      profile?.unit === 'lbs' ? avg * 2.20462 : avg;
    const displayTarget =
      profile?.unit === 'lbs'
        ? (profile?.target_weight ?? 0)
        : (profile?.target_weight ?? 0);

    // Prior week delta
    const prior = getPriorWeeklySummary(weekStart);
    let delta: number | null = null;
    if (prior) {
      const priorDisplay =
        profile?.unit === 'lbs' ? prior.average_weight * 2.20462 : prior.average_weight;
      delta = displayWeight - priorDisplay;
    }

    // Upsert summary (idempotent — safe to call on re-renders)
    upsertWeeklySummary(weekStart, avg, prior ? avg - prior.average_weight : null, count);

    const topTags = getTopTagsForWeek(weekStart, weekEnd, 3);
    const heatmapDays = getLast28DayPresence();

    return {
      averageWeight: Math.round(displayWeight * 10) / 10,
      delta: delta !== null ? Math.round(delta * 10) / 10 : null,
      measurementCount: count,
      topTags,
      weekLabel: `${weekStartLabel} – ${weekEndLabel}`,
      unit: profile?.unit ?? 'lbs',
      targetWeight: displayTarget,
      heatmapDays,
    };
  }

  function handleOpenEnvelope() {
    Animated.sequence([
      Animated.timing(envelopeScale, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(envelopeScale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOpened(true);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }

  // ─── Locked state ─────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.lockTitle}>Weekly Reveal</Text>
        <Text style={styles.lockSub}>
          Your weekly average unlocks every Sunday morning.
        </Text>
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>Unlocks in</Text>
          <Text style={styles.countdown}>{getCountdown()}</Text>
        </View>
        <Text style={styles.lockNote}>
          Keep weighing in daily to make Sunday's reveal meaningful.
        </Text>
      </View>
    );
  }

  // ─── Envelope (pre-open) ──────────────────────────────────────────────────
  if (!opened) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.unlockLabel}>Sunday Reveal</Text>
        <Text style={styles.unlockSub}>
          {revealData?.weekLabel ?? ''}
        </Text>
        <Animated.View style={{ transform: [{ scale: envelopeScale }] }}>
          <TouchableOpacity
            style={styles.envelope}
            onPress={handleOpenEnvelope}
            activeOpacity={0.8}
          >
            <Text style={styles.envelopeEmoji}>📬</Text>
            <Text style={styles.envelopeHint}>Tap to open</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ─── Revealed content ─────────────────────────────────────────────────────
  if (!revealData) return null;

  const towardGoal =
    revealData.delta !== null
      ? revealData.averageWeight < revealData.targetWeight
        ? revealData.delta <= 0
        : revealData.delta >= 0
      : null;

  const deltaColor =
    towardGoal === true ? '#4CAF50' : towardGoal === false ? '#FFC107' : '#9E9E9E';

  const lbsToGo = Math.abs(revealData.averageWeight - revealData.targetWeight);
  const hitTarget = lbsToGo < 1;

  return (
    <Animated.ScrollView
      style={[styles.screen, { opacity: contentOpacity }]}
      contentContainerStyle={styles.revealContent}
    >
      <Text style={styles.revealTitle}>This Week</Text>
      <Text style={styles.revealWeek}>{revealData.weekLabel}</Text>

      {/* Habit heatmap — 4-week weigh-in presence grid */}
      <View style={styles.heatmapCard}>
        <Text style={styles.infoCardTitle}>Your Last 28 Days</Text>
        <HabitHeatmap presentDays={revealData.heatmapDays} />
      </View>

      {/* THE ONE PLACE A NUMBER IS SHOWN */}
      <View style={styles.weightBox}>
        <Text style={styles.weightLabel}>Weekly Average</Text>
        <Text style={styles.weightValue}>
          {revealData.averageWeight}{' '}
          <Text style={styles.weightUnit}>{revealData.unit}</Text>
        </Text>
        {revealData.delta !== null && (
          <Text style={[styles.delta, { color: deltaColor }]}>
            {revealData.delta >= 0 ? '▲' : '▼'}{' '}
            {Math.abs(revealData.delta)} {revealData.unit} vs last week
          </Text>
        )}
      </View>

      {/* Progress toward target */}
      <View style={[styles.infoCard, hitTarget && styles.infoCardGreen]}>
        <Text style={styles.infoCardTitle}>Goal Progress</Text>
        <Text style={styles.infoCardText}>
          {hitTarget
            ? "You've hit your target weight! 🎉"
            : `${lbsToGo.toFixed(1)} ${revealData.unit} to go`}
        </Text>
      </View>

      {/* Weigh-in count */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Consistency</Text>
        <Text style={styles.infoCardText}>
          You weighed in {revealData.measurementCount}/7 days this week
        </Text>
      </View>

      {/* Top tags */}
      {revealData.topTags.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Common Factors</Text>
          <Text style={styles.infoCardText}>
            {revealData.topTags.join('  ·  ')}
          </Text>
        </View>
      )}

      <Text style={styles.footnote}>
        Numbers disappear again on Monday. Enjoy them while they last.
      </Text>
    </Animated.ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Locked
  lockEmoji: { fontSize: 48, marginBottom: 20 },
  lockTitle: { color: colors.textPrimary, fontSize: 28, fontFamily: font.display, marginBottom: 10 },
  lockSub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  countdownBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    width: '100%',
  },
  countdownLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  countdown: { color: colors.textPrimary, fontSize: 42, fontFamily: font.display },
  lockNote: { color: colors.textTertiary, fontSize: 13, fontFamily: font.body, textAlign: 'center', lineHeight: 18 },

  // Envelope
  unlockLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  unlockSub: { color: colors.textSecondary, fontSize: 16, fontFamily: font.displayItalic, marginBottom: 40 },
  envelope: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  envelopeEmoji: { fontSize: 60, marginBottom: 10 },
  envelopeHint: { color: colors.textTertiary, fontSize: 13, fontFamily: font.body },

  // Reveal
  revealContent: { padding: 24, paddingBottom: 60 },
  revealTitle: { color: colors.textPrimary, fontSize: 30, fontFamily: font.display, marginBottom: 4 },
  revealWeek: { color: colors.textSecondary, fontSize: 16, fontFamily: font.displayItalic, marginBottom: 28 },
  weightBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  weightLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 },
  weightValue: { color: colors.textPrimary, fontSize: 68, fontFamily: font.display, lineHeight: 76 },
  weightUnit: { fontSize: 26, fontFamily: font.displayItalic, color: colors.textSecondary },
  delta: { fontSize: 16, fontFamily: font.bodyMedium, marginTop: 12 },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCardGreen: { borderColor: colors.greenBorder, backgroundColor: colors.greenDim },
  infoCardTitle: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  infoCardText: { color: colors.textPrimary, fontSize: 17, fontFamily: font.bodyMedium },
  footnote: { color: colors.textHint, fontSize: 12, fontFamily: font.displayItalic, textAlign: 'center', marginTop: 24 },
  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    alignItems: 'center',
  },
});
