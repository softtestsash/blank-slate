import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAppStore, RitualPhase } from '../store/useAppStore';
import { ChecklistItem } from '../components/ChecklistItem';
import { TagChip } from '../components/TagChip';
import {
  getChecklistItems,
  insertMeasurement,
  insertContextTags,
  ChecklistItem as ChecklistItemType,
} from '../db/db';
import { startScan, stopScan } from '../services/bleListener';
import { recordWeightAndUpdateEMA } from '../services/trendEngine';

const TAGS = [
  { tag: 'salty food', emoji: '🧂' },
  { tag: 'alcohol', emoji: '🍷' },
  { tag: 'workout', emoji: '💪' },
  { tag: 'period', emoji: '🌙' },
  { tag: 'travel', emoji: '✈️' },
  { tag: 'stress', emoji: '😤' },
  { tag: 'illness', emoji: '🤒' },
  { tag: 'poor sleep', emoji: '😴' },
];

export function RitualScreen() {
  const {
    ritualPhase,
    checkedItems,
    selectedTags,
    pendingMeasurementId,
    setRitualPhase,
    toggleChecklistItem,
    toggleTag,
    setPendingMeasurementId,
    resetRitual,
  } = useAppStore();

  const [checklistItems, setChecklistItems] = React.useState<ChecklistItemType[]>([]);
  const [bleStatusText, setBleStatusText] = React.useState('Searching for your scale…');
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setChecklistItems(getChecklistItems());
  }, []);

  // Animate success circle when COMPLETE
  useEffect(() => {
    if (ritualPhase === 'COMPLETE') {
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        resetRitual();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [ritualPhase]);

  // Clean up BLE if user navigates away mid-scan
  useEffect(() => {
    return () => {
      if (ritualPhase === 'AWAITING_SCALE') stopScan();
    };
  }, [ritualPhase]);

  const allChecked =
    checklistItems.length > 0 &&
    checklistItems.every((item) => checkedItems.has(item.id));

  function handleStartScale() {
    setRitualPhase('AWAITING_SCALE');
    startScan({
      onStatus: (status) => {
        const labels: Record<string, string> = {
          scanning: 'Searching for your scale…',
          connecting: 'Found it — connecting…',
          receiving: 'Reading your weight…',
          stable: 'Got it!',
          error: 'Could not connect. Try again.',
        };
        setBleStatusText(labels[status] ?? status);
      },
      onWeightStable: (weightKg) => {
        // Golden Rule: raw weight never stored in state — goes straight to DB.
        const id = insertMeasurement(weightKg, new Date().toISOString(), true);
        recordWeightAndUpdateEMA(weightKg);
        setPendingMeasurementId(id);
        setRitualPhase('TAGGING');
      },
      onError: (err) => {
        setBleStatusText(`Error: ${err}`);
      },
    });
  }

  function handleFinishTagging() {
    if (pendingMeasurementId !== null && selectedTags.length > 0) {
      insertContextTags(pendingMeasurementId, selectedTags);
    }
    setRitualPhase('COMPLETE');
  }

  // ─── Phase: IDLE ──────────────────────────────────────────────────────────
  if (ritualPhase === 'IDLE') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.idleEmoji}>🌅</Text>
        <Text style={styles.idleTitle}>Morning Ritual</Text>
        <Text style={styles.idleSub}>
          A consistent weigh-in routine is what makes the trend trustworthy.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setRitualPhase('CHECKLIST')}
        >
          <Text style={styles.buttonText}>Begin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Phase: CHECKLIST ─────────────────────────────────────────────────────
  if (ritualPhase === 'CHECKLIST') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.phaseLabel}>Checklist</Text>
          <Text style={styles.phaseTitle}>Ready to weigh in?</Text>
          <Text style={styles.phaseSub}>Tick each box before stepping on the scale.</Text>
          {checklistItems.map((item) => (
            <ChecklistItem
              key={item.id}
              id={item.id}
              label={item.label}
              description={item.description}
              checked={checkedItems.has(item.id)}
              onToggle={toggleChecklistItem}
            />
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !allChecked && styles.buttonDisabled]}
            onPress={handleStartScale}
            disabled={!allChecked}
          >
            <Text style={styles.buttonText}>Step on Scale →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Phase: AWAITING_SCALE ────────────────────────────────────────────────
  if (ritualPhase === 'AWAITING_SCALE') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#42A5F5" style={styles.spinner} />
        <Text style={styles.scanText}>{bleStatusText}</Text>
        <TouchableOpacity style={styles.cancelLink} onPress={() => {
          stopScan();
          setRitualPhase('CHECKLIST');
        }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Phase: TAGGING ───────────────────────────────────────────────────────
  if (ritualPhase === 'TAGGING') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.phaseLabel}>Context</Text>
          <Text style={styles.phaseTitle}>Anything relevant{'\n'}today?</Text>
          <Text style={styles.phaseSub}>
            Tags help explain any unusual swings. Skip if nothing applies.
          </Text>
          <View style={styles.tagGrid}>
            {TAGS.map((t) => (
              <TagChip
                key={t.tag}
                tag={t.tag}
                emoji={t.emoji}
                selected={selectedTags.includes(t.tag)}
                onToggle={toggleTag}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleFinishTagging}>
            <Text style={styles.buttonText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Phase: COMPLETE ──────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, styles.centered]}>
      <Animated.View
        style={[styles.successCircle, { transform: [{ scale: successScale }] }]}
      >
        <Text style={styles.successCheck}>✓</Text>
      </Animated.View>
      <Text style={styles.successTitle}>Logged.</Text>
      <Text style={styles.successSub}>Your trend will update momentarily.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0F' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  scrollContent: { padding: 24, paddingBottom: 120 },

  // IDLE
  idleEmoji: { fontSize: 48, marginBottom: 20 },
  idleTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 12 },
  idleSub: { color: '#9E9E9E', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 40 },

  // Phase headers
  phaseLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  phaseTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 8, lineHeight: 34 },
  phaseSub: { color: '#9E9E9E', fontSize: 14, lineHeight: 20, marginBottom: 24 },

  // Awaiting scale
  spinner: { marginBottom: 24 },
  scanText: { color: '#9E9E9E', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  cancelLink: { marginTop: 8 },
  cancelText: { color: '#555', fontSize: 14 },

  // Tags
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  // Footer button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0A0A0F',
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
  },
  button: {
    backgroundColor: '#42A5F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#1A2A3E', opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Complete
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  successCheck: { color: '#fff', fontSize: 40, fontWeight: '700' },
  successTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  successSub: { color: '#9E9E9E', fontSize: 15 },
});
