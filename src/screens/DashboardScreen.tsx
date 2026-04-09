import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { startOfWeek, endOfWeek, format } from '../utils/dateUtils';
import { useAppStore } from '../store/useAppStore';
import { StatusPulse } from '../components/StatusPulse';
import { ConsistencyRing } from '../components/ConsistencyRing';
import { TrendChart } from '../components/TrendChart';
import { CoachingModal } from '../components/CoachingModal';
import { getCurrentStatus, getStatusExplanation } from '../services/trendEngine';
import {
  getCurrentStreak,
  getWeeklyWeighInCount,
  getLastTwoEMASnapshots,
  getLastNEMASnapshots,
  getTopTagsForWeek,
  EMASnapshot,
} from '../db/db';
import { colors, font } from '../theme';

export function DashboardScreen() {
  const { profile, statusResult, setStatusResult } = useAppStore();
  const [coachingVisible, setCoachingVisible] = useState(false);
  const [coachingText, setCoachingText] = useState('');
  const [chartWidth, setChartWidth] = useState(0);
  const [trendSnapshots, setTrendSnapshots] = useState<EMASnapshot[]>([]);

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      const weekStart = format(startOfWeek(now), 'yyyy-MM-dd');
      const streak = getCurrentStreak();
      const weeklyCount = getWeeklyWeighInCount(weekStart, now.toISOString());
      const consistency = Math.round((weeklyCount / 7) * 100);
      const result = getCurrentStatus(streak, consistency);
      setStatusResult(result);

      // Trend chart — last 14 snapshots in chronological order
      const snaps = getLastNEMASnapshots(14).reverse();
      setTrendSnapshots(snaps);
    }, [setStatusResult])
  );

  function handlePulseTap() {
    const now = new Date();
    const weekStart = startOfWeek(now).toISOString();
    const weekEnd   = endOfWeek(now).toISOString();
    const topTags   = getTopTagsForWeek(weekStart, weekEnd, 3);
    const snaps     = getLastTwoEMASnapshots();
    const emaDelta  = snaps.length >= 2 ? snaps[0].ema_value - snaps[1].ema_value : 0;
    const text = getStatusExplanation(statusResult.status, topTags, emaDelta);
    setCoachingText(text);
    setCoachingVisible(true);
  }

  // Split greeting: "Good morning, " + name in italic serif
  const firstName = profile?.name?.split(' ')[0] ?? '';

  const weekLabel = format(startOfWeek(new Date()), "'Week of' MMM d").toUpperCase();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingBase}>Good morning
          {firstName ? <Text style={styles.greetingName}>, {firstName}.</Text> : '.'}
        </Text>
      </View>
      <Text style={styles.week}>{weekLabel}</Text>

      {/* Tappable pulse */}
      <TouchableOpacity onPress={handlePulseTap} activeOpacity={0.85}>
        <StatusPulse status={statusResult.status} />
        <Text style={styles.tapHint}>tap for insight</Text>
      </TouchableOpacity>

      {/* Trend chart */}
      {trendSnapshots.length >= 2 && (
        <View
          style={styles.chartContainer}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <TrendChart
              snapshots={trendSnapshots}
              status={statusResult.status}
              width={chartWidth}
              height={68}
            />
          )}
        </View>
      )}

      <View style={styles.ringRow}>
        <ConsistencyRing consistency={statusResult.consistency} streak={statusResult.streak} />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How this works</Text>
        <Text style={styles.infoText}>
          Your pulse reflects a 7-day trend toward your goal — not today's number.
          Weigh in each morning to keep your ring full. Numbers unlock on Sundays.
        </Text>
      </View>

      {statusResult.streak === 0 && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            No weigh-in yet today. Head to the Ritual tab when you're ready.
          </Text>
        </View>
      )}

      <CoachingModal
        visible={coachingVisible}
        onDismiss={() => setCoachingVisible(false)}
        status={statusResult.status}
        explanation={coachingText}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  greetingRow: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  greetingBase: {
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: font.body,
  },
  greetingName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontFamily: font.displayMedium,
  },
  week: {
    color: colors.textTertiary,
    fontSize: 11,
    fontFamily: font.bodySemiBold,
    alignSelf: 'flex-start',
    marginBottom: 8,
    letterSpacing: 1.4,
  },
  tapHint: {
    color: colors.textHint,
    fontSize: 11,
    fontFamily: font.body,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  chartContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  ringRow: {
    marginTop: 16,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginBottom: 20,
  },
  infoTitle: {
    color: colors.textTertiary,
    fontSize: 11,
    fontFamily: font.bodySemiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: font.body,
    lineHeight: 21,
  },
  nudge: {
    backgroundColor: colors.greenDim,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    width: '100%',
  },
  nudgeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: font.body,
    textAlign: 'center',
    lineHeight: 20,
  },
});
