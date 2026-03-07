import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ─── Component ────────────────────────────────────────────────────────────────

interface ConsistencyRingProps {
  consistency: number; // 0–100
  streak: number;
}

const SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConsistencyRing({ consistency, streak }: ConsistencyRingProps) {
  const clampedPct = Math.min(100, Math.max(0, consistency));
  const strokeDashoffset = CIRCUMFERENCE - (clampedPct / 100) * CIRCUMFERENCE;

  const label =
    streak > 0
      ? streak === 1
        ? '1 day streak'
        : `${streak} day streak`
      : `${Math.round(clampedPct / (100 / 7))}/7 this week`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consistency</Text>
      <View style={styles.ringWrapper}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#2A2A3E"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#42A5F5"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <Text style={styles.pct}>{Math.round(clampedPct)}%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: '#9E9E9E',
    fontSize: 13,
    marginTop: 8,
  },
});
