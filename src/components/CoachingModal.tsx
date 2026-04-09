import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PulseStatus } from '../services/trendEngine';
import { colors, font } from '../theme';

interface CoachingModalProps {
  visible: boolean;
  onDismiss: () => void;
  status: PulseStatus;
  explanation: string;
}

const STATUS_CONFIG: Record<PulseStatus, { color: string; label: string }> = {
  GREEN:  { color: colors.green,  label: 'On Track'  },
  YELLOW: { color: colors.yellow, label: 'Drifting'  },
  BLUE:   { color: colors.blue,   label: 'Plateau'   },
};

export function CoachingModal({ visible, onDismiss, status, explanation }: CoachingModalProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.explanation}>{explanation}</Text>

            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>Remember</Text>
              <Text style={styles.tipText}>
                Daily weight fluctuates 1–3 lbs from water, food, and sleep. Your pulse
                tracks the 7-day trend — that's the signal. Daily numbers are just noise.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 17,
    fontFamily: font.display,
    letterSpacing: 0.3,
  },
  explanation: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: font.body,
    lineHeight: 25,
    marginBottom: 20,
  },
  tipBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: font.bodySemiBold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: font.body,
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontFamily: font.bodyMedium,
  },
});
