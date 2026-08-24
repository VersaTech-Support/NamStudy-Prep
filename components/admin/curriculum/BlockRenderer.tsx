import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { Database } from '@/types/database';

type ContentBlock = Database['public']['Tables']['topic_content']['Row'];

interface BlockRendererProps {
  block: ContentBlock;
}

export default function BlockRenderer({ block }: BlockRendererProps) {
  const content = block.content as any;

  switch (block.block_type) {
    case 'heading':
      const level = content.level || 2;
      let fontStyle: any = FONTS.h2;
      if (level === 1) fontStyle = FONTS.h1;
      else if (level === 3) fontStyle = FONTS.h3;
      else if (level >= 4) fontStyle = { ...FONTS.bodyBold, fontSize: 16 };
      
      return (
        <Text style={[fontStyle, { color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.sm }]}>
          {content.text}
        </Text>
      );

    case 'paragraph':
      return (
        <Text style={{ ...FONTS.body, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.md }}>
          {content.text}
        </Text>
      );

    case 'rich_text':
      // Basic fallback since we aren't pulling in a full HTML renderer right now.
      // In a real implementation, you'd use react-native-render-html
      return (
        <Text style={{ ...FONTS.body, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.md }}>
          {content.html || content.text}
        </Text>
      );

    case 'formula':
      // Stub for a LaTeX renderer. In reality, you'd use react-native-math-view
      return (
        <View style={styles.formulaBox}>
          <Text style={styles.formulaText}>{content.latex}</Text>
        </View>
      );

    case 'image':
      return (
        <View style={styles.imageContainer}>
          {content.url ? (
            <Image 
              source={{ uri: content.url }} 
              style={styles.image} 
              resizeMode="contain" 
            />
          ) : (
            <View style={[styles.image, { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="image-outline" size={32} color={COLORS.borderLight} />
            </View>
          )}
          {content.caption && (
            <Text style={styles.caption}>{content.caption}</Text>
          )}
        </View>
      );

    case 'callout':
      let bg = COLORS.primary + '15';
      let accent = COLORS.primary;
      let icon = 'information-circle';
      
      if (content.type === 'warning') {
        bg = COLORS.red + '15';
        accent = COLORS.red;
        icon = 'warning';
      } else if (content.type === 'tip') {
        bg = COLORS.green + '15';
        accent = COLORS.green;
        icon = 'bulb';
      }

      return (
        <View style={[styles.callout, { backgroundColor: bg, borderLeftColor: accent }]}>
          <View style={styles.calloutHeader}>
            <Ionicons name={icon as any} size={20} color={accent} />
            <Text style={[styles.calloutTitle, { color: accent }]}>
              {content.title || content.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.calloutText}>{content.text}</Text>
        </View>
      );

    case 'key_term':
      return (
        <View style={styles.keyTerm}>
          <Text style={styles.keyTermWord}>{content.term}</Text>
          <Text style={styles.keyTermDef}>{content.definition}</Text>
        </View>
      );

    case 'example':
      return (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>{content.title || 'Example'}</Text>
          <Text style={styles.exampleContent}>{content.content}</Text>
        </View>
      );

    case 'bullet_list':
    case 'numbered_list':
      const isNumbered = block.block_type === 'numbered_list';
      const items = content.items || [];
      return (
        <View style={styles.list}>
          {items.map((item: string, idx: number) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listBullet}>{isNumbered ? `${idx + 1}.` : '•'}</Text>
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    default:
      return (
        <View style={{ padding: SPACING.md, backgroundColor: '#f0f0f0', borderRadius: RADIUS.sm, marginBottom: SPACING.md }}>
          <Text style={{ ...FONTS.small, color: COLORS.textMuted }}>Unsupported Block: {block.block_type}</Text>
        </View>
      );
  }
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  formulaBox: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  formulaText: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  imageContainer: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  image: {
    width: width - SPACING.xl * 2,
    height: 200,
    borderRadius: RADIUS.md,
  },
  caption: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  callout: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 4,
    marginBottom: SPACING.md,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: SPACING.xs,
  },
  calloutTitle: {
    ...FONTS.bodyBold,
    letterSpacing: 0.5,
  },
  calloutText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  keyTerm: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
    marginBottom: SPACING.md,
  },
  keyTermWord: {
    ...FONTS.h3,
    color: COLORS.goldDark,
    marginBottom: 2,
  },
  keyTermDef: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  exampleTitle: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  exampleContent: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  list: {
    marginBottom: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  listBullet: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
    width: 16,
  },
  listText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
});
