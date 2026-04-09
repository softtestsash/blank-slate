import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { PulseStatus } from '../services/trendEngine';
import { EMASnapshot } from '../db/db';
import { colors } from '../theme';

interface TrendChartProps {
  snapshots: EMASnapshot[]; // chronological order (oldest first)
  status: PulseStatus;
  width: number;
  height?: number;
}

const STATUS_COLOR: Record<PulseStatus, string> = {
  GREEN:  colors.green,
  YELLOW: colors.yellow,
  BLUE:   colors.blue,
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function TrendChart({ snapshots, status, width, height = 80 }: TrendChartProps) {
  if (snapshots.length < 2) return null;

  const color = STATUS_COLOR[status];
  const padH = 4;
  const padV = 8;
  const values = snapshots.map((s) => s.ema_value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const points = snapshots.map((s, i) => ({
    x: padH + (i / (snapshots.length - 1)) * (width - padH * 2),
    y: padV + (1 - (s.ema_value - minV) / range) * (height - padV * 2),
  }));

  const linePath = buildSmoothPath(points);

  // Area fill path: line path + close to bottom
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
