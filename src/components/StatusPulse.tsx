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
import { colors, font } from '../theme';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PulseStatus,
  { color: string; glow: string; duration: number; label: string }
> = {
  GREEN: {
    color:    colors.green,
    glow:     colors.greenGlow,
    duration: 3200,
    label:    'heading in the right direction',
  },
  YELLOW: {
    color:    colors.yellow,
    glow:     colors.yellowGlow,
    duration: 1600,
    label:    'drifting from your goal',
  },
  BLUE: {
    color:    colors.blue,
    glow:     colors.blueGlow,
    duration: 4500,
    label:    'holding steady — keep going',
  },
};

const CIRCLE_SIZE = 200;

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusPulseProps {
  status: PulseStatus;
}

export function StatusPulse({ status }: StatusPulseProps) {
  const cfg = STATUS_CONFIG[status];

  // Outer glow breathes slowly
  const outerScale   = useSharedValue(1);
  const outerOpacity = useSharedValue(0.3);
  // Middle ring breathes at half speed
  const midScale     = useSharedValue(1);
  // Inner highlight pulses inversely
  const innerOpacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(outerScale);
    cancelAnimation(outerOpacity);
    cancelAnimation(midScale);
    cancelAnimation(innerOpacity);

    outerScale.value = withRepeat(
      withTiming(1.18, { duration: cfg.duration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    outerOpacity.value = withRepeat(
      withTiming(0.85, { duration: cfg.duration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    midScale.value = withRepeat(
      withTiming(1.09, { duration: cfg.duration * 1.3, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    innerOpacity.value = withRepeat(
      withTiming(0.4, { duration: cfg.duration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, [status, cfg.duration]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: outerOpacity.value,
  }));
  const midStyle = useAnimatedStyle(() => ({
    transform: [{ scale: midScale.value }],
  }));
  const innerDotStyle = useAnimatedStyle(() => ({
    opacity: innerOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Outer glow */}
      <Animated.View style={[styles.outerGlow, { backgroundColor: cfg.glow }, outerStyle]} />
      {/* Middle ring */}
      <Animated.View style={[styles.midRing, { backgroundColor: cfg.glow }, midStyle]} />

      {/* Core circle */}
      <View style={[styles.circle, { borderColor: cfg.color + '60', backgroundColor: cfg.color + '14' }]}>
        {/* Bright center highlight */}
        <Animated.View style={[styles.innerHighlight, { backgroundColor: cfg.color }, innerDotStyle]} />
        {/* Solid core dot */}
        <View style={[styles.coreDot, { backgroundColor: cfg.color }]} />
      </View>

      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 28,
  },
  outerGlow: {
    position: 'absolute',
    width:  CIRCLE_SIZE + 80,
    height: CIRCLE_SIZE + 80,
    borderRadius: (CIRCLE_SIZE + 80) / 2,
  },
  midRing: {
    position: 'absolute',
    width:  CIRCLE_SIZE + 36,
    height: CIRCLE_SIZE + 36,
    borderRadius: (CIRCLE_SIZE + 36) / 2,
    opacity: 0.6,
  },
  circle: {
    width:  CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerHighlight: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.15,
  },
  coreDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  label: {
    marginTop: 28,
    fontSize: 18,
    fontFamily: font.displayItalic,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
