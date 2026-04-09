import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { colors, font } from '../theme';

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function getSpeechRecognition(): any {
  if (Platform.OS !== 'web') return null;
  try {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  } catch {
    return null;
  }
}

export function NoteInput({ value, onChangeText, placeholder }: NoteInputProps) {
  const [listening, setListening] = useState(false);
  const SR = getSpeechRecognition();
  const hasVoice = SR !== null;

  function startVoice() {
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      onChangeText(value ? `${value} ${transcript}` : transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'e.g. big pasta dinner, birthday cake…'}
        placeholderTextColor={colors.textHint}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        returnKeyType="done"
      />
      {hasVoice && (
        <TouchableOpacity
          style={[styles.micBtn, listening && styles.micBtnActive]}
          onPress={startVoice}
          disabled={listening}
        >
          <Text style={styles.micIcon}>{listening ? '⏺' : '🎙'}</Text>
          <Text style={[styles.micLabel, listening && { color: colors.accent }]}>
            {listening ? 'Listening…' : 'Dictate'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: font.body,
    lineHeight: 22,
    padding: 16,
    minHeight: 96,
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  micBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  micIcon: { fontSize: 15 },
  micLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: font.bodyMedium,
  },
});
