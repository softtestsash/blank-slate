import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, TouchableOpacity, Easing,
} from 'react-native';
import { colors, font } from '../theme';
import {
  startOfWeek, endOfWeek, nextSunday, format,
  differenceInHours, differenceInMinutes,
} from '../utils/dateUtils';
import {
  getMeasurementsForWeek, getPriorWeeklySummary, upsertWeeklySummary,
  getTopTagsForWeek, getProfile, getLast28DayPresence,
} from '../db/db';
import { HabitHeatmap } from '../components/HabitHeatmap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  return {
    weekStart: startOfWeek(now).toISOString(),
    weekEnd:   endOfWeek(now).toISOString(),
  };
}

function getParsedCountdown(): { main: string; sub: string } {
  const now  = new Date();
  const next = nextSunday(now);
  next.setHours(7, 0, 0, 0);
  const hours   = differenceInHours(next, now);
  const minutes = differenceInMinutes(next, now) % 60;
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return { main: String(days), sub: days === 1 ? 'day' : 'days' };
  }
  if (hours >= 1) return { main: `${hours}h`, sub: `${minutes}m` };
  return { main: String(minutes), sub: 'min' };
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const VAULT_OUTER = 240;
const VAULT_INNER = 188;
const ENV_ORB     = 196;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevealData {
  averageWeight:    number;
  delta:            number | null;
  measurementCount: number;
  topTags:          string[];
  weekLabel:        string;
  unit:             'lbs' | 'kg';
  targetWeight:     number;
  heatmapDays:      string[];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function RevealScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [opened,     setOpened]     = useState(false);

  const envelopeScale  = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const vaultScale     = useRef(new Animated.Value(1)).current;
  const vaultOpacity   = useRef(new Animated.Value(0.35)).current;
  const orbGlow        = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const sunday = isSunday();
    setIsUnlocked(sunday);
    if (sunday) setRevealData(buildRevealData());
  }, []);

  // Vault ring slow breath (locked)
  useEffect(() => {
    if (isUnlocked) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(vaultScale,   { toValue: 1.04, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(vaultOpacity, { toValue: 0.70, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(vaultScale,   { toValue: 1,    duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(vaultOpacity, { toValue: 0.35, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    vaultScale.setValue(1);
    vaultOpacity.setValue(0.35);
    anim.start();
    return () => anim.stop();
  }, [isUnlocked]);

  // Envelope orb pulse (Sunday, pre-reveal)
  useEffect(() => {
    if (!isUnlocked || opened) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, { toValue: 1,   duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 0.6, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isUnlocked, opened]);

  function buildRevealData(): RevealData {
    const profile       = getProfile();
    const { weekStart, weekEnd } = getWeekBounds();
    const weekStartLabel = format(startOfWeek(new Date()), 'MMM d');
    const weekEndLabel   = format(endOfWeek(new Date()), 'MMM d');
    const measurements  = getMeasurementsForWeek(weekStart, weekEnd);
    const count         = measurements.length;
    const avg           = count > 0 ? measurements.reduce((s, m) => s + m.raw_weight, 0) / count : 0;
    const displayWeight = profile?.unit === 'lbs' ? avg * 2.20462 : avg;
    const displayTarget = profile?.target_weight ?? 0;
    const prior         = getPriorWeeklySummary(weekStart);
    let delta: number | null = null;
    if (prior) {
      const priorDisplay = profile?.unit === 'lbs' ? prior.average_weight * 2.20462 : prior.average_weight;
      delta = displayWeight - priorDisplay;
    }
    upsertWeeklySummary(weekStart, avg, prior ? avg - prior.average_weight : null, count);
    return {
      averageWeight:    Math.round(displayWeight * 10) / 10,
      delta:            delta !== null ? Math.round(delta * 10) / 10 : null,
      measurementCount: count,
      topTags:          getTopTagsForWeek(weekStart, weekEnd, 3),
      weekLabel:        `${weekStartLabel} – ${weekEndLabel}`,
      unit:             profile?.unit ?? 'lbs',
      targetWeight:     displayTarget,
      heatmapDays:      getLast28DayPresence(),
    };
  }

  function handleOpenEnvelope() {
    Animated.sequence([
      Animated.timing(envelopeScale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(envelopeScale, { toValue: 0,    duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setOpened(true);
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  }

  // ─── Locked ───────────────────────────────────────────────────────────────────
  if (!isUnlocked) {
    const { main, sub } = getParsedCountdown();
    return (
      <View style={styles.lockedScreen}>
        <View style={styles.lockedUpper}>

          {/* Vault ring — countdown lives inside the orb */}
          <View style={styles.vaultWrapper}>
            <Animated.View style={[
              styles.vaultOuterRing,
              { transform: [{ scale: vaultScale }], opacity: vaultOpacity },
            ]} />
            <View style={styles.vaultInnerRing} />
            <View style={styles.vaultCountdown}>
              <Text style={styles.vaultMain}>{main}</Text>
              <Text style={styles.vaultSub}>{sub}</Text>
            </View>
          </View>

          <View style={styles.lockedTextBlock}>
            <Text style={styles.lockedEyebrow}>WEEKLY REVEAL</Text>
            <Text style={styles.lockedTitle}>Sealed until{'\n'}Sunday.</Text>
            <View style={styles.lockedRule} />
            <Text style={styles.lockedSub}>
              Your weekly average unlocks every Sunday morning.
            </Text>
          </View>
        </View>

        <View style={styles.lockedFooter}>
          <Text style={styles.lockedNote}>
            Weigh in daily to make Sunday's reveal meaningful.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Envelope (Sunday, pre-reveal) ────────────────────────────────────────────
  if (!opened) {
    return (
      <View style={styles.envelopeScreen}>
        <View style={styles.envelopeUpper}>
          <Text style={styles.envelopeEyebrow}>SUNDAY REVEAL</Text>
          <Text style={styles.envelopeWeek}>{revealData?.weekLabel ?? ''}</Text>

          <Animated.View style={{ transform: [{ scale: envelopeScale }] }}>
            <TouchableOpacity
              style={styles.envelopeOrb}
              onPress={handleOpenEnvelope}
              activeOpacity={0.9}
            >
              <Animated.View style={[styles.envelopeOrbGlow, { opacity: orbGlow }]} />
              <View style={styles.envelopeOrbMid} />
              <View style={styles.envelopeOrbCore} />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.envelopeHint}>tap to reveal</Text>
        </View>
      </View>
    );
  }

  // ─── Revealed ────────────────────────────────────────────────────────────────
  if (!revealData) return null;

  const towardGoal = revealData.delta !== null
    ? (revealData.averageWeight < revealData.targetWeight ? revealData.delta <= 0 : revealData.delta >= 0)
    : null;
  const deltaColor = towardGoal === true ? colors.green : towardGoal === false ? colors.yellow : colors.textTertiary;
  const lbsToGo   = Math.abs(revealData.averageWeight - revealData.targetWeight);
  const hitTarget  = lbsToGo < 1;

  return (
    <Animated.ScrollView
      style={[styles.screen, { opacity: contentOpacity }]}
      contentContainerStyle={styles.revealContent}
    >
      <Text style={styles.revealEyebrow}>SUNDAY REVEAL</Text>
      <Text style={styles.revealTitle}>This Week</Text>
      <Text style={styles.revealWeek}>{revealData.weekLabel}</Text>

      {/* Hero: weekly average */}
      <View style={styles.weightBox}>
        <Text style={styles.weightLabel}>Weekly Average</Text>
        <View style={styles.weightRow}>
          <Text style={styles.weightValue}>{revealData.averageWeight}</Text>
          <Text style={styles.weightUnit}>{revealData.unit}</Text>
        </View>
        {revealData.delta !== null && (
          <View style={[
            styles.deltaChip,
            { borderColor: deltaColor + '55', backgroundColor: deltaColor + '14' },
          ]}>
            <Text style={[styles.deltaText, { color: deltaColor }]}>
              {revealData.delta >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(revealData.delta)} {revealData.unit} vs last week
            </Text>
          </View>
        )}
      </View>

      {/* Heatmap */}
      <View style={styles.heatmapCard}>
        <Text style={styles.infoCardTitle}>Last 28 Days</Text>
        <HabitHeatmap presentDays={revealData.heatmapDays} />
      </View>

      {/* Goal progress */}
      <View style={[styles.infoCard, hitTarget && styles.infoCardGreen]}>
        <Text style={styles.infoCardTitle}>Goal Progress</Text>
        <Text style={styles.infoCardText}>
          {hitTarget
            ? "You've hit your target weight."
            : `${lbsToGo.toFixed(1)} ${revealData.unit} to go`}
        </Text>
      </View>

      {/* Consistency */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Consistency</Text>
        <Text style={styles.infoCardText}>
          {revealData.measurementCount}/7 days this week
        </Text>
      </View>

      {/* Top tags */}
      {revealData.topTags.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Common Factors</Text>
          <Text style={styles.infoCardText}>{revealData.topTags.join('  ·  ')}</Text>
        </View>
      )}

      <Text style={styles.footnote}>
        Numbers disappear again on Monday.{'\n'}Enjoy them while they last.
      </Text>
    </Animated.ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  // ── Locked ──────────────────────────────────────────────────────────────────
  lockedScreen:  { flex: 1, backgroundColor: colors.bg },
  lockedUpper:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 44 },

  vaultWrapper: {
    width:  VAULT_OUTER,
    height: VAULT_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultOuterRing: {
    position: 'absolute',
    width: VAULT_OUTER, height: VAULT_OUTER,
    borderRadius: VAULT_OUTER / 2,
    borderWidth: 1.5,
    borderColor: colors.accent,
    top: 0, left: 0,
  },
  vaultInnerRing: {
    position: 'absolute',
    width: VAULT_INNER, height: VAULT_INNER,
    borderRadius: VAULT_INNER / 2,
    borderWidth: 1,
    borderColor: colors.accent + '38',
    backgroundColor: 'rgba(200, 131, 30, 0.04)',
    top:  (VAULT_OUTER - VAULT_INNER) / 2,
    left: (VAULT_OUTER - VAULT_INNER) / 2,
  },
  vaultCountdown: { alignItems: 'center' },
  vaultMain: {
    color: colors.textPrimary,
    fontSize: 66,
    fontFamily: font.display,
    lineHeight: 70,
  },
  vaultSub: {
    color: colors.accent,
    fontSize: 16,
    fontFamily: font.displayItalic,
    letterSpacing: 0.4,
    marginTop: 2,
  },

  lockedTextBlock: { alignItems: 'center' },
  lockedEyebrow: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  lockedTitle: {
    color: colors.textPrimary,
    fontSize: 38,
    fontFamily: font.displayItalic,
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 18,
  },
  lockedRule: {
    width: 36, height: 1,
    backgroundColor: colors.accent,
    opacity: 0.4,
    marginBottom: 14,
  },
  lockedSub: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: font.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  lockedFooter: { padding: 32, alignItems: 'center' },
  lockedNote: {
    color: colors.textHint,
    fontSize: 13,
    fontFamily: font.displayItalic,
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Envelope ────────────────────────────────────────────────────────────────
  envelopeScreen: { flex: 1, backgroundColor: colors.bg },
  envelopeUpper:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  envelopeEyebrow: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  envelopeWeek: {
    color: colors.textSecondary,
    fontSize: 18,
    fontFamily: font.displayItalic,
  },
  envelopeOrb: {
    width: ENV_ORB, height: ENV_ORB,
    borderRadius: ENV_ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeOrbGlow: {
    position: 'absolute',
    width: ENV_ORB, height: ENV_ORB,
    borderRadius: ENV_ORB / 2,
    backgroundColor: 'rgba(200, 131, 30, 0.20)',
    top: 0, left: 0,
  },
  envelopeOrbMid: {
    position: 'absolute',
    width: 126, height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(200, 131, 30, 0.30)',
    borderWidth: 1,
    borderColor: colors.accent + '66',
    top:  (ENV_ORB - 126) / 2,
    left: (ENV_ORB - 126) / 2,
  },
  envelopeOrbCore: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    opacity: 0.88,
  },
  envelopeHint: {
    color: colors.textTertiary,
    fontSize: 13,
    fontFamily: font.displayItalic,
    letterSpacing: 0.3,
  },

  // ── Revealed ────────────────────────────────────────────────────────────────
  revealContent: { padding: 24, paddingBottom: 64 },
  revealEyebrow: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  revealTitle: {
    color: colors.textPrimary,
    fontSize: 34,
    fontFamily: font.display,
    marginBottom: 4,
  },
  revealWeek: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: font.displayItalic,
    marginBottom: 28,
  },

  weightBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderWarm,
    marginBottom: 12,
  },
  weightLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  weightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  weightValue: { color: colors.textPrimary, fontSize: 72, fontFamily: font.display, lineHeight: 78 },
  weightUnit:  { fontSize: 22, fontFamily: font.displayItalic, color: colors.textSecondary, marginBottom: 10 },
  deltaChip: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  deltaText: { fontSize: 14, fontFamily: font.bodyMedium },

  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCardGreen: { borderColor: colors.greenBorder, backgroundColor: colors.greenDim },
  infoCardTitle: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoCardText:  { color: colors.textPrimary, fontSize: 17, fontFamily: font.bodyMedium },
  footnote: {
    color: colors.textHint,
    fontSize: 12,
    fontFamily: font.displayItalic,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 19,
  },
});
