import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SHADOWS, GRADIENTS } from '@/constants/theme';

interface GradientCardProps {
  children: React.ReactNode;
  gradient?: readonly [string, string];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function GradientCard({ 
  children, 
  gradient = GRADIENTS.primary, 
  onPress,
  style 
}: GradientCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      onPress={onPress} 
      activeOpacity={0.9} 
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    padding: 20, // default padding, can be overridden by children
  },
});
