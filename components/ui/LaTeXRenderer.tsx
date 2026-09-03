import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import katex from 'katex';
import { MathView } from '@dawsonxiong/react-native-latex-renderer';

// Import KaTeX CSS only on Web
if (Platform.OS === 'web') {
  require('katex/dist/katex.min.css');
}

interface LaTeXRendererProps {
  latex: string;
  displayMode?: boolean;
  color?: string;
  fontSize?: number;
}

export default function LaTeXRenderer({ latex, displayMode = true, color = COLORS.textPrimary, fontSize = 16 }: LaTeXRendererProps) {
  const [hasError, setHasError] = useState(false);

  // Normalization layer (handles basic escaping if needed, though usually untouched)
  const normalizedLatex = latex.trim();

  // If there's an error, gracefully fallback
  if (hasError) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>[Formula unavailable]</Text>
        <Text style={styles.errorLatex}>{normalizedLatex}</Text>
      </View>
    );
  }

  // --- Web Implementation ---
  if (Platform.OS === 'web') {
    try {
      const html = katex.renderToString(normalizedLatex, {
        displayMode,
        throwOnError: true, // we catch it ourselves
        trust: false, // safer for user content
      });

      return (
        <View style={displayMode ? styles.webDisplayContainer : styles.webInlineContainer}>
          <div
            style={{ color, fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </View>
      );
    } catch (error) {
      console.warn("KaTeX rendering error:", error);
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>[Formula unavailable]</Text>
          <Text style={styles.errorLatex}>{normalizedLatex}</Text>
        </View>
      );
    }
  }

  // --- Native Implementation ---
  return (
    <View style={displayMode ? styles.nativeDisplayContainer : styles.nativeInlineContainer}>
      <MathView
        math={displayMode ? `$$${normalizedLatex}$$` : `$${normalizedLatex}$`}
        color={color}
        fontSize={fontSize}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webDisplayContainer: {
    marginVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  webInlineContainer: {
    display: 'flex',
  },
  nativeDisplayContainer: {
    marginVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nativeInlineContainer: {
  },
  errorBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.red + '40',
    marginVertical: SPACING.xs,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorLatex: {
    color: COLORS.textMuted,
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
