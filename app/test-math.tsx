import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import LaTeXRenderer from '@/components/ui/LaTeXRenderer';
import { COLORS, SPACING, FONTS } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEST_FORMULAS = [
  { title: 'Basic Arithmetic', latex: 'x^2 + 2x + 1' },
  { title: 'Fractions', latex: '\\frac{a}{b}' },
  { title: 'Square Roots', latex: '\\sqrt{x^2 + y^2}' },
  { title: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { title: 'Integrals', latex: '\\int_0^\\infty e^{-x^2}\\,dx' },
  { title: 'Summation', latex: '\\sum_{i=1}^{n} i' },
  { title: 'Greek Letters', latex: '\\alpha + \\beta + \\gamma' },
  { title: 'Matrices', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { title: 'Trigonometry', latex: '\\sin(x), \\cos(x), \\tan(x)' },
  { title: 'Limits', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x}' },
  { title: 'Malformed (Should Catch Gracefully)', latex: '\\frac{' },
];

export default function TestMathScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>LaTeX Renderer Test</Text>
      
      {TEST_FORMULAS.map((item, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <LaTeXRenderer latex={item.latex} displayMode={true} />
          
          <Text style={styles.title}>Inline:</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: COLORS.textPrimary }}>The formula </Text>
            <LaTeXRenderer latex={item.latex} displayMode={false} color={COLORS.primary} />
            <Text style={{ color: COLORS.textPrimary }}> is inline.</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  title: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
});
