import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { startOfWeek, format } from '../utils/dateUtils';
import { useAppStore } from '../store/useAppStore';
import { StatusPulse } from '../components/StatusPulse';
import { ConsistencyRing } from '../components/ConsistencyRing';
import { getCurrentStatus } from '../services/trendEngine';
import { getCurrentStreak, getWeeklyWeighInCount } from '../db/db';

// No weight values are imported or stored in this screen — Golden Rule enforced.

export function DashboardScreen() {
  const { profile, statusResult, setStatusResult } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      // Recompute status every time tab is focused
      const now = new Date();
      const weekStart = format(startOfWeek(now), 'yyyy-MM-dd');
      const streak = getCurrentStreak();
      const weeklyCount = getWeeklyWeighInCount(weekStart, now.toISOString());
      const consistency = Math.round((weeklyCount / 7) * 100);

      const result = getCurrentStatus(streak, consistency);
      setStatusResult(result);
    }, [setStatusResult])
  );

  const greeting = profile?.name ? `Good morning, ${profile.name}.` : 'Good morning.';

  const weekLabel = format(
    startOfWeek(new Date()),
    "'Week of' MMM d"
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.week}>{weekLabel}</Text>

      <StatusPulse status={statusResult.status} />

      <View style={styles.ringRow}>
        <ConsistencyRing
          consistency={statusResult.consistency}
          streak={statusResult.streak}
        />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  week: {
    color: '#555',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ringRow: {
    marginTop: 8,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    width: '100%',
    marginBottom: 20,
  },
  infoTitle: {
    color: '#9E9E9E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    color: '#757575',
    fontSize: 14,
    lineHeight: 21,
  },
  nudge: {
    backgroundColor: '#1A2A1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A4A3E',
    width: '100%',
  },
  nudgeText: {
    color: '#9E9E9E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
