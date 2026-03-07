import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

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
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {tag}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    backgroundColor: '#1A1A2E',
    margin: 5,
  },
  chipSelected: {
    borderColor: '#42A5F5',
    backgroundColor: '#42A5F522',
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    color: '#9E9E9E',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  labelSelected: {
    color: '#42A5F5',
  },
});
