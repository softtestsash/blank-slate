import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/AppNavigator';
import { insertProfile, insertEMASnapshot, getProfile, UserProfile } from '../../db/db';
import { useAppStore } from '../../store/useAppStore';
import { colors, font } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'TargetWeight'>;

const COLOR_LEGEND = [
  { color: colors.green, label: 'Green', desc: 'Moving toward your goal, or within 1 lb and stable' },
  { color: colors.yellow, label: 'Amber', desc: 'Drifting away from your target' },
  { color: colors.blue, label: 'Blue', desc: 'Holding steady — progress is there, keep going' },
];

export function TargetWeightScreen({ navigation, route }: Props) {
  const { name, age, sex, currentWeight, unit } = route.params;
  const [target, setTarget] = useState('');
  const setProfile = useAppStore((s) => s.setProfile);

  const numericTarget = parseFloat(target);
  const canContinue = !isNaN(numericTarget) && numericTarget > 0;

  const goalDirection =
    canContinue
      ? numericTarget < currentWeight
        ? '↓ lose weight'
        : numericTarget > currentWeight
        ? '↑ gain weight'
        : '→ maintain'
      : null;

  async function handleFinish() {
    if (!canContinue) return;
    console.log('[Onboarding] handleFinish — saving profile');

    insertProfile(name, sex, age, currentWeight, numericTarget, unit);
    insertEMASnapshot(currentWeight);
    await AsyncStorage.setItem('hasOnboarded', 'true');

    const saved: UserProfile = getProfile() ?? {
      id: 0,
      name,
      sex: sex as UserProfile['sex'],
      age,
      current_weight: currentWeight,
      target_weight: numericTarget,
      unit,
      created_at: new Date().toISOString(),
    };

    console.log('[Onboarding] setProfile →', saved.name);
    setProfile(saved);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.heading}>What's your{'\n'}goal weight?</Text>
        <Text style={styles.sub}>
          We'll use this to color your daily pulse — no numbers, just direction.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={unit === 'lbs' ? '160' : '73'}
            placeholderTextColor={colors.textHint}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={styles.unitSuffix}>{unit}</Text>
        </View>

        {goalDirection ? (
          <Text style={styles.goalHint}>{goalDirection}</Text>
        ) : null}

        {/* Color legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>What the colors mean</Text>
          {COLOR_LEGEND.map((item) => (
            <View key={item.color} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.legendLabel, { color: item.color }]}>
                  {item.label}
                </Text>
                <Text style={styles.legendDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Start my journey →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  step: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: colors.textPrimary, fontSize: 32, fontFamily: font.display, marginBottom: 10, lineHeight: 40 },
  sub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body, lineHeight: 22, marginBottom: 28 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    fontSize: 48,
    fontFamily: font.display,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  unitSuffix: { color: colors.textTertiary, fontSize: 20, fontFamily: font.displayItalic },
  goalHint: { color: colors.textSecondary, fontSize: 14, fontFamily: font.displayItalic, marginBottom: 28 },
  legend: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendTitle: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 12 },
  legendText: { flex: 1 },
  legendLabel: { fontSize: 14, fontFamily: font.bodySemiBold, marginBottom: 2 },
  legendDesc: { color: colors.textTertiary, fontSize: 13, fontFamily: font.body, lineHeight: 18 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: colors.card, opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontFamily: font.bodySemiBold },
  backLink: { alignItems: 'center', marginTop: 20 },
  backText: { color: colors.textTertiary, fontSize: 14, fontFamily: font.body },
});
