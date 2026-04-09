import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/AppNavigator';
import { colors, font } from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'NameAge'>;
type Sex = 'male' | 'female' | 'prefer_not_to_say';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export function NameAgeScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('prefer_not_to_say');

  const canContinue = name.trim().length > 0 && parseInt(age, 10) > 0;

  function handleNext() {
    if (!canContinue) return;
    navigation.navigate('CurrentWeight', { name: name.trim(), age: parseInt(age, 10), sex });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.heading}>Let's get started.</Text>
        <Text style={styles.sub}>
          We'll never show you a number on a normal day. Let's set up your profile.
        </Text>

        <Text style={styles.fieldLabel}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Alex"
          placeholderTextColor={colors.textHint}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Your age</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 32"
          placeholderTextColor={colors.textHint}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          returnKeyType="done"
        />

        <Text style={styles.fieldLabel}>Sex</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sexChip, sex === opt.value && styles.sexChipActive]}
              onPress={() => setSex(opt.value)}
            >
              <Text style={[styles.sexChipText, sex === opt.value && styles.sexChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext} disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  step: { color: colors.textTertiary, fontSize: 11, fontFamily: font.bodySemiBold, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: colors.textPrimary, fontSize: 32, fontFamily: font.display, marginBottom: 10 },
  sub: { color: colors.textSecondary, fontSize: 15, fontFamily: font.body, lineHeight: 22, marginBottom: 36 },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontFamily: font.bodyMedium, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: font.body,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  sexChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.card,
  },
  sexChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  sexChipText: { color: colors.textSecondary, fontSize: 14, fontFamily: font.body },
  sexChipTextActive: { color: colors.accent, fontFamily: font.bodyMedium },
  button: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 44,
  },
  buttonDisabled: { backgroundColor: colors.card, opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontFamily: font.bodySemiBold },
});
