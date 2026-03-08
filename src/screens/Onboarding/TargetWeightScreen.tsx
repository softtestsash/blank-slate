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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'TargetWeight'>;

const COLOR_LEGEND = [
  { color: '#4CAF50', label: 'Green', desc: 'Moving toward your goal, or within 1 lb and stable' },
  { color: '#FFC107', label: 'Yellow', desc: 'Drifting away from your target' },
  { color: '#42A5F5', label: 'Blue', desc: 'Holding steady — progress is there, keep going' },
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
        ? '↓ Lose weight'
        : numericTarget > currentWeight
        ? '↑ Gain weight'
        : '→ Maintain'
      : null;

  async function handleFinish() {
    if (!canContinue) return;
    console.log('[Onboarding] handleFinish — saving profile');

    insertProfile(name, sex, age, currentWeight, numericTarget, unit);
    insertEMASnapshot(currentWeight);
    await AsyncStorage.setItem('hasOnboarded', 'true');

    // On native: read back the row we just inserted.
    // On web: SQLite is disabled so getProfile() returns null — build the
    // profile object directly from form data so the store still updates and
    // AppNavigator switches to MainTabs.
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
            placeholderTextColor="#555"
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
  flex: { flex: 1, backgroundColor: '#0A0A0F' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  step: { color: '#555', fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginBottom: 10, lineHeight: 38 },
  sub: { color: '#9E9E9E', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    textAlign: 'center',
  },
  unitSuffix: { color: '#555', fontSize: 20, fontWeight: '600' },
  goalHint: { color: '#9E9E9E', fontSize: 14, marginBottom: 28, fontStyle: 'italic' },
  legend: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  legendTitle: { color: '#9E9E9E', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3, marginRight: 12 },
  legendText: { flex: 1 },
  legendLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  legendDesc: { color: '#757575', fontSize: 13, lineHeight: 18 },
  button: {
    backgroundColor: '#42A5F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#1A2A3E', opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backText: { color: '#555', fontSize: 14 },
});
