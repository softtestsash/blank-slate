import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface ChecklistItemProps {
  id: number;
  label: string;
  description: string | null;
  checked: boolean;
  onToggle: (id: number) => void;
}

export function ChecklistItem({
  id,
  label,
  description,
  checked,
  onToggle,
}: ChecklistItemProps) {
  return (
    <TouchableOpacity
      style={[styles.row, checked && styles.rowChecked]}
      onPress={() => onToggle(id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 6,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  rowChecked: {
    borderColor: '#4CAF5066',
    backgroundColor: '#4CAF5011',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '500',
  },
  labelChecked: {
    color: '#9E9E9E',
  },
  description: {
    color: '#757575',
    fontSize: 12,
    marginTop: 2,
  },
});
