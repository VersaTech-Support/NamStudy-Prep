import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

interface LoadingStateProps {
  text?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function LoadingState({ 
  text = 'Loading...', 
  color = COLORS.primary,
  style 
}: LoadingStateProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  text: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
});
