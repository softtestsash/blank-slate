import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'CurrentWeight'>;

export function CurrentWeightScreen({ navigation, route }: Props) {
  const { name, age, sex } = route.params;
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');

  const numericWeight = parseFloat(weight);
  const canContinue = !isNaN(numericWeight) && numericWeight > 0;

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('TargetWeight', {
      name,
      age,
      sex,
      currentWeight: numericWeight,
      unit,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.heading}>Where are you{'\n'}starting from?</Text>
        <Text style={styles.sub}>
          This seeds your baseline. It won't be shown to you again — only the trend matters.
        </Text>

        <View style={styles.unitRow}>
          {(['lbs', 'kg'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitChip, unit === u && styles.unitChipActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={unit === 'lbs' ? '180' : '82'}
            placeholderTextColor="#555"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={styles.unitSuffix}>{unit}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0A0A0F' },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  step: { color: '#555', fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginBottom: 10, lineHeight: 38 },
  sub: { color: '#9E9E9E', fontSize: 15, lineHeight: 22, marginBottom: 36 },
  unitRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  unitChip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    backgroundColor: '#1A1A2E',
  },
  unitChipActive: { borderColor: '#42A5F5', backgroundColor: '#42A5F522' },
  unitText: { color: '#9E9E9E', fontSize: 15, fontWeight: '600' },
  unitTextActive: { color: '#42A5F5' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  button: {
    backgroundColor: '#42A5F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 44,
  },
  buttonDisabled: { backgroundColor: '#1A2A3E', opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backText: { color: '#555', fontSize: 14 },
});
