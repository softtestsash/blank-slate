import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

interface TagChipProps {
  tag: string;
  emoji: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}

export function TagChip({ tag, emoji, selected, onToggle }: TagChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => onToggle(tag)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>{tag}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    margin: 4,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  emoji: {
    fontSize: 15,
    marginRight: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: font.body,
    textTransform: 'capitalize',
  },
  labelSelected: {
    color: colors.accent,
    fontFamily: font.bodyMedium,
  },
});
