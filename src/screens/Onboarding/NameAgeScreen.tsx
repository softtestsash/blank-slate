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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/AppNavigator';

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
    navigation.navigate('CurrentWeight', {
      name: name.trim(),
      age: parseInt(age, 10),
      sex,
    });
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
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.heading}>Let's get started.</Text>
        <Text style={styles.sub}>
          We'll never show you a number on a normal day. Let's set up your profile.
        </Text>

        <Text style={styles.fieldLabel}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Alex"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Your age</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 32"
          placeholderTextColor="#555"
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
              <Text
                style={[
                  styles.sexChipText,
                  sex === opt.value && styles.sexChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0A0A0F' },
  container: {
    flexGrow: 1,
    padding: 28,
    justifyContent: 'center',
  },
  step: { color: '#555', fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  heading: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginBottom: 10 },
  sub: { color: '#9E9E9E', fontSize: 15, lineHeight: 22, marginBottom: 36 },
  fieldLabel: { color: '#9E9E9E', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    fontSize: 17,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  sexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  sexChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    backgroundColor: '#1A1A2E',
  },
  sexChipActive: { borderColor: '#42A5F5', backgroundColor: '#42A5F522' },
  sexChipText: { color: '#9E9E9E', fontSize: 14 },
  sexChipTextActive: { color: '#42A5F5', fontWeight: '600' },
  button: {
    backgroundColor: '#42A5F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 44,
  },
  buttonDisabled: { backgroundColor: '#1A2A3E', opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
