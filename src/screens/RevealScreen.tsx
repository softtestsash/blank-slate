import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  startOfWeek,
  endOfWeek,
  nextSunday,
  format,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns';
import {
  getMeasurementsForWeek,
  getPriorWeeklySummary,
  upsertWeeklySummary,
  getTopTagsForWeek,
  getProfile,
} from '../db/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(now, { weekStartsOn: 1 });     // Sunday 23:59:59
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
    const weekStartLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d');
    const weekEndLabel = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d');

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

    return {
      averageWeight: Math.round(displayWeight * 10) / 10,
      delta: delta !== null ? Math.round(delta * 10) / 10 : null,
      measurementCount: count,
      topTags,
      weekLabel: `${weekStartLabel} – ${weekEndLabel}`,
      unit: profile?.unit ?? 'lbs',
      targetWeight: displayTarget,
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
  screen: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Locked
  lockEmoji: { fontSize: 52, marginBottom: 20 },
  lockTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 10 },
  lockSub: { color: '#9E9E9E', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  countdownBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 24,
    width: '100%',
  },
  countdownLabel: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  countdown: { color: '#FFFFFF', fontSize: 36, fontWeight: '700' },
  lockNote: { color: '#555', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Envelope
  unlockLabel: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  unlockSub: { color: '#9E9E9E', fontSize: 16, marginBottom: 40 },
  envelope: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  envelopeEmoji: { fontSize: 60, marginBottom: 10 },
  envelopeHint: { color: '#9E9E9E', fontSize: 13 },

  // Reveal
  revealContent: { padding: 24, paddingBottom: 60 },
  revealTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  revealWeek: { color: '#555', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 28 },
  weightBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 16,
  },
  weightLabel: { color: '#9E9E9E', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  weightValue: { color: '#FFFFFF', fontSize: 52, fontWeight: '700' },
  weightUnit: { fontSize: 24, fontWeight: '400', color: '#9E9E9E' },
  delta: { fontSize: 16, fontWeight: '600', marginTop: 10 },
  infoCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  infoCardGreen: { borderColor: '#4CAF5066', backgroundColor: '#4CAF5011' },
  infoCardTitle: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  infoCardText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  footnote: { color: '#333', fontSize: 12, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});
