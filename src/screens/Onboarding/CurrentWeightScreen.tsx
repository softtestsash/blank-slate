import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/AppNavigator';
import { colors, font } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'CurrentWeight'>;

export function CurrentWeightScreen({ navigation, route }: Props) {
  const { name, age, sex } = route.params;
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');

  const numericWeight = parseFloat(weight);
  const canContinue = !isNaN(numericWeight) && numericWeight > 0;

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('TargetWeight', { name, age, sex, currentWeight: numericWeight, unit });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={unit === 'lbs' ? '180' : '82'}
            placeholderTextColor={colors.textHint}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={styles.unitSuffix}>{unit}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext} disabled={!canContinue}
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
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  step: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: colors.textPrimary, fontSize: 32, fontFamily: font.display, marginBottom: 10, lineHeight: 40 },
  sub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body, lineHeight: 22, marginBottom: 36 },
  unitRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  unitChip: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.card,
  },
  unitChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  unitText: { color: colors.textSecondary, fontSize: 15, fontFamily: font.bodyMedium },
  unitTextActive: { color: colors.accent },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  button: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 44,
  },
  buttonDisabled: { backgroundColor: colors.card, opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontFamily: font.bodySemiBold },
  backLink: { alignItems: 'center', marginTop: 20 },
  backText: { color: colors.textTertiary, fontSize: 14, fontFamily: font.body },
});
