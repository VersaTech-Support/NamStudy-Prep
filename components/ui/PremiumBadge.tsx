import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

interface PremiumBadgeProps {
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

export default function PremiumBadge({ size = 'small', style }: PremiumBadgeProps) {
  const isSmall = size === 'small';
  
  return (
    <View style={[
      styles.container, 
      isSmall ? styles.containerSmall : styles.containerMedium,
      style
    ]}>
      <Ionicons 
        name="diamond" 
        size={isSmall ? 10 : 14} 
        color={COLORS.goldDark} 
      />
      <Text style={[
        styles.text,
        isSmall ? styles.textSmall : styles.textMedium
      ]}>
        PRO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  containerSmall: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  containerMedium: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  text: {
    ...FONTS.caption,
    color: COLORS.goldDark,
    fontWeight: '800',
  },
  textSmall: {
    fontSize: 9,
  },
  textMedium: {
    fontSize: 11,
  },
});
