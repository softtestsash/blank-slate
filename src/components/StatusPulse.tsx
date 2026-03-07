import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { PulseStatus } from '../services/trendEngine';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PulseStatus,
  { color: string; glow: string; duration: number; label: string }
> = {
  GREEN: {
    color: '#4CAF50',
    glow: 'rgba(76, 175, 80, 0.25)',
    duration: 3000,
    label: 'Heading in the right direction',
  },
  YELLOW: {
    color: '#FFC107',
    glow: 'rgba(255, 193, 7, 0.25)',
    duration: 1500,
    label: 'Drifting from your goal',
  },
  BLUE: {
    color: '#42A5F5',
    glow: 'rgba(66, 165, 245, 0.25)',
    duration: 4000,
    label: 'Holding steady — keep going',
  },
};

const CIRCLE_SIZE = 220;
const GLOW_LAYERS = 3;

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusPulseProps {
  status: PulseStatus;
}

export function StatusPulse({ status }: StatusPulseProps) {
  const config = STATUS_CONFIG[status];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);

    scale.value = withRepeat(
      withTiming(1.12, {
        duration: config.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    opacity.value = withRepeat(
      withTiming(1, {
        duration: config.duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [status, config.duration]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Layered glow rings */}
      {Array.from({ length: GLOW_LAYERS }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.glowRing,
            {
              width: CIRCLE_SIZE + i * 30,
              height: CIRCLE_SIZE + i * 30,
              borderRadius: (CIRCLE_SIZE + i * 30) / 2,
              backgroundColor: config.glow,
            },
            i === 0 && glowStyle,
          ]}
        />
      ))}

      {/* Core circle */}
      <View
        style={[
          styles.circle,
          { backgroundColor: config.color + '22', borderColor: config.color },
        ]}
      >
        <View style={[styles.innerDot, { backgroundColor: config.color }]} />
      </View>

      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  glowRing: {
    position: 'absolute',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  label: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
