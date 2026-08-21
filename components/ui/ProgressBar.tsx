import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { COLORS } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ProgressBar({ 
  progress, 
  color = COLORS.primary, 
  trackColor = COLORS.borderLight, 
  height = 8,
  style
}: ProgressBarProps) {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const percentage = `${clampedProgress * 100}%` as DimensionValue;

  return (
    <View style={[styles.container, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}>
      <View 
        style={[
          styles.fill, 
          { 
            width: percentage, 
            backgroundColor: color,
            borderRadius: height / 2 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
