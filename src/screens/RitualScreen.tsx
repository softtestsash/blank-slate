import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { ChecklistItem } from '../components/ChecklistItem';
import { TagChip } from '../components/TagChip';
import { NoteInput } from '../components/NoteInput';
import {
  getChecklistItems, insertMeasurement, insertContextTags,
  ChecklistItem as ChecklistItemType,
} from '../db/db';
import { startScan, stopScan, scanAllDevices } from '../services/bleListener';
import { recordWeightAndUpdateEMA } from '../services/trendEngine';
import { colors, font } from '../theme';

const TAGS = [
  { tag: 'salty food',   emoji: '🧂' },
  { tag: 'alcohol',      emoji: '🍷' },
  { tag: 'workout',      emoji: '💪' },
  { tag: 'period',       emoji: '🌙' },
  { tag: 'travel',       emoji: '✈️' },
  { tag: 'stress',       emoji: '😤' },
  { tag: 'illness',      emoji: '🤒' },
  { tag: 'poor sleep',   emoji: '😴' },
  { tag: 'big meal',     emoji: '🍽️' },
  { tag: 'dehydrated',   emoji: '💧' },
  { tag: 'great sleep',  emoji: '⭐' },
  { tag: 'social event', emoji: '🎉' },
  { tag: 'hormones',     emoji: '🔄' },
  { tag: 'medications',  emoji: '💊' },
];

export function RitualScreen() {
  const {
    ritualPhase, checkedItems, selectedTags, ritualNotes,
    setRitualPhase, toggleChecklistItem, toggleTag, resetRitual, setRitualNotes,
  } = useAppStore();

  const [checklistItems, setChecklistItems] = React.useState<ChecklistItemType[]>([]);
  const [bleStatusText, setBleStatusText] = React.useState('Searching for your scale…');
  const successScale = useRef(new Animated.Value(0)).current;

  const pendingWeight    = useRef<number | null>(null);
  const pendingTimestamp = useRef<string | null>(null);

  useEffect(() => { setChecklistItems(getChecklistItems()); }, []);

  useEffect(() => {
    if (ritualPhase === 'COMPLETE') {
      Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      const timer = setTimeout(() => resetRitual(), 2200);
      return () => clearTimeout(timer);
    }
  }, [ritualPhase]);

  useEffect(() => {
    return () => { if (ritualPhase === 'AWAITING_SCALE') stopScan(); };
  }, [ritualPhase]);

  const allChecked = checklistItems.length > 0 && checklistItems.every((item) => checkedItems.has(item.id));

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
        pendingWeight.current    = weightKg;
        pendingTimestamp.current = new Date().toISOString();
        recordWeightAndUpdateEMA(weightKg);
        setRitualPhase('TAGGING');
      },
      onError: (err) => { setBleStatusText(`Error: ${err}`); },
    });
  }

  function handleDebugScan() {
    scanAllDevices().catch((e) => console.error('[BLE Debug]', e));
  }

  function handleFinishTagging() { setRitualPhase('NOTES'); }

  function handleFinishNotes() {
    if (pendingWeight.current !== null && pendingTimestamp.current !== null) {
      const notes = ritualNotes.trim() || undefined;
      const id = insertMeasurement(pendingWeight.current, pendingTimestamp.current, true, notes);
      if (id !== -1 && selectedTags.length > 0) insertContextTags(id, selectedTags);
      pendingWeight.current = null;
      pendingTimestamp.current = null;
    }
    setRitualPhase('COMPLETE');
  }

  // ─── IDLE ────────────────────────────────────────────────────────────────────
  if (ritualPhase === 'IDLE') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.idleEmoji}>🌅</Text>
        <Text style={styles.idleTitle}>Morning Ritual</Text>
        <Text style={styles.idleSub}>
          A consistent weigh-in routine is what makes the trend trustworthy.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => setRitualPhase('CHECKLIST')}>
          <Text style={styles.buttonText}>Begin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── CHECKLIST ───────────────────────────────────────────────────────────────
  if (ritualPhase === 'CHECKLIST') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.phaseLabel}>Checklist</Text>
          <Text style={styles.phaseTitle}>Ready to weigh in?</Text>
          <Text style={styles.phaseSub}>Tick each box before stepping on the scale.</Text>
          {checklistItems.map((item) => (
            <ChecklistItem
              key={item.id} id={item.id} label={item.label}
              description={item.description} checked={checkedItems.has(item.id)}
              onToggle={toggleChecklistItem}
            />
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !allChecked && styles.buttonDisabled]}
            onPress={handleStartScale} disabled={!allChecked}
          >
            <Text style={styles.buttonText}>Step on Scale →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── AWAITING_SCALE ──────────────────────────────────────────────────────────
  if (ritualPhase === 'AWAITING_SCALE') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
        <Text style={styles.scanText}>{bleStatusText}</Text>
        <TouchableOpacity style={styles.cancelLink} onPress={() => { stopScan(); setRitualPhase('CHECKLIST'); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <TouchableOpacity style={styles.debugBtn} onPress={handleDebugScan}>
            <Text style={styles.debugText}>Debug: Scan All Devices</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─── TAGGING ─────────────────────────────────────────────────────────────────
  if (ritualPhase === 'TAGGING') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.phaseLabel}>Context</Text>
          <Text style={styles.phaseTitle}>Anything relevant{'\n'}today?</Text>
          <Text style={styles.phaseSub}>Tags help explain any unusual swings. Skip if nothing applies.</Text>
          <View style={styles.tagGrid}>
            {TAGS.map((t) => (
              <TagChip
                key={t.tag} tag={t.tag} emoji={t.emoji}
                selected={selectedTags.includes(t.tag)} onToggle={toggleTag}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleFinishTagging}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── NOTES ───────────────────────────────────────────────────────────────────
  if (ritualPhase === 'NOTES') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.phaseLabel}>Note</Text>
          <Text style={styles.phaseTitle}>Anything to log?</Text>
          <Text style={styles.phaseSub}>
            Capture what you ate or how you feel. Helps you spot patterns over time.
          </Text>
          <NoteInput
            value={ritualNotes}
            onChangeText={setRitualNotes}
            placeholder="e.g. big pasta dinner last night, birthday cake, felt dehydrated…"
          />
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleFinishNotes}>
            <Text style={styles.buttonText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── COMPLETE ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, styles.centered]}>
      <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
        <Text style={styles.successCheck}>✓</Text>
      </Animated.View>
      <Text style={styles.successTitle}>Logged.</Text>
      <Text style={styles.successSub}>Your trend will update momentarily.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  scrollContent: { padding: 24, paddingBottom: 120 },

  idleEmoji: { fontSize: 48, marginBottom: 20 },
  idleTitle: { color: colors.textPrimary, fontSize: 30, fontFamily: font.display, marginBottom: 12 },
  idleSub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body, lineHeight: 22, textAlign: 'center', marginBottom: 40 },

  phaseLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  phaseTitle: { color: colors.textPrimary, fontSize: 30, fontFamily: font.display, marginBottom: 8, lineHeight: 36 },
  phaseSub: { color: colors.textSecondary, fontSize: 14, fontFamily: font.body, lineHeight: 20, marginBottom: 24 },

  spinner: { marginBottom: 24 },
  scanText: { color: colors.textSecondary, fontSize: 16, fontFamily: font.body, textAlign: 'center', marginBottom: 20 },
  cancelLink: { marginTop: 8 },
  cancelText: { color: colors.textTertiary, fontSize: 14, fontFamily: font.body },
  debugBtn: { marginTop: 28, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  debugText: { color: colors.textHint, fontSize: 12 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.borderSubtle,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: colors.card, opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontFamily: font.bodySemiBold },

  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 28, elevation: 10,
  },
  successCheck: { color: colors.white, fontSize: 38, fontFamily: font.bodySemiBold },
  successTitle: { color: colors.textPrimary, fontSize: 28, fontFamily: font.display, marginBottom: 10 },
  successSub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body },
});
