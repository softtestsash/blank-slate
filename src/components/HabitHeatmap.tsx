import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, font } from '../theme';

interface HabitHeatmapProps {
  presentDays: string[];
}

const CELL = 34;
const GAP  = 4;
const COLS = 7;
const ROWS = 4;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getGridDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const daysToSunday = day === 0 ? 0 : 7 - day;
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + daysToSunday);

  const dates: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(gridEnd);
    d.setDate(gridEnd.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function HabitHeatmap({ presentDays }: HabitHeatmapProps) {
  const grid = getGridDates();
  const presentSet = new Set(presentDays);
  const today = new Date().toISOString().slice(0, 10);

  const svgWidth  = COLS * (CELL + GAP) - GAP;
  const svgHeight = ROWS * (CELL + GAP) - GAP;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        {DAY_LABELS.map((l, i) => (
          <Text key={i} style={styles.dayLabel}>{l}</Text>
        ))}
      </View>

      <Svg width={svgWidth} height={svgHeight}>
        {grid.map((date, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const x = col * (CELL + GAP);
          const y = row * (CELL + GAP);
          const isPresent = presentSet.has(date);
          const isToday   = date === today;
          const isFuture  = date > today;

          const fill    = isFuture ? colors.bg : isPresent ? colors.green : colors.card;
          const opacity = isFuture ? 0.35 : 1;

          return (
            <Rect
              key={date}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={7}
              fill={fill}
              opacity={opacity}
              stroke={isToday ? colors.accent : 'transparent'}
              strokeWidth={isToday ? 1.5 : 0}
            />
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
          <Text style={styles.legendText}>weighed in</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.card }]} />
          <Text style={styles.legendText}>missed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: GAP,
  },
  dayLabel: {
    width: CELL,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 11,
    fontFamily: font.bodyMedium,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontFamily: font.body,
  },
});
