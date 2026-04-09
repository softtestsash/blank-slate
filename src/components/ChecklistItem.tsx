import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

interface ChecklistItemProps {
  id: number;
  label: string;
  description: string | null;
  checked: boolean;
  onToggle: (id: number) => void;
}

export function ChecklistItem({ id, label, description, checked, onToggle }: ChecklistItemProps) {
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
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: 5,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowChecked: {
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenDim,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontFamily: font.bodySemiBold,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: font.body,
  },
  labelChecked: {
    color: colors.textSecondary,
  },
  description: {
    color: colors.textTertiary,
    fontSize: 12,
    fontFamily: font.body,
    marginTop: 2,
  },
});
