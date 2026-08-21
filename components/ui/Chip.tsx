import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '@/constants/theme';

interface ChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Chip({ label, isActive = false, onPress, style }: ChipProps) {
  const Container = onPress ? TouchableOpacity : (View as any);
  
  return (
    <TouchableOpacity 
      style={[
        styles.chip, 
        isActive ? styles.chipActive : styles.chipInactive,
        style
      ]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[
        styles.text,
        isActive ? styles.textActive : styles.textInactive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipInactive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  text: {
    ...FONTS.caption,
    fontWeight: '600',
  },
  textActive: {
    color: COLORS.white,
  },
  textInactive: {
    color: COLORS.textSecondary,
  },
});
