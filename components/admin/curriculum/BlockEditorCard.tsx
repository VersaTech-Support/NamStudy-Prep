import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, FONTS, SHADOWS } from '@/constants/theme';
import { Database } from '@/types/database';

type ContentBlock = Database['public']['Tables']['topic_content']['Row'];

interface BlockEditorCardProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function BlockEditorCard({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: BlockEditorCardProps) {
  const content = block.content as any;

  const updateContent = (updates: any) => {
    onChange({ content: { ...content, ...updates } });
  };

  const renderEditorFields = () => {
    switch (block.block_type) {
      case 'heading':
        return (
          <View>
            <Text style={styles.label}>Heading Text</Text>
            <TextInput
              style={styles.input}
              value={content.text || ''}
              onChangeText={(text) => updateContent({ text })}
              placeholder="e.g. Cell Structure"
            />
            <Text style={styles.label}>Level (1-6)</Text>
            <TextInput
              style={styles.input}
              value={String(content.level || 2)}
              onChangeText={(level) => updateContent({ level: parseInt(level) || 2 })}
              keyboardType="number-pad"
            />
          </View>
        );

      case 'paragraph':
      case 'rich_text':
        return (
          <View>
            <Text style={styles.label}>{block.block_type === 'rich_text' ? 'Rich Text (HTML/Markdown)' : 'Paragraph Text'}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content.text || content.html || ''}
              onChangeText={(val) => updateContent(block.block_type === 'rich_text' ? { html: val } : { text: val })}
              placeholder="Enter text here..."
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'formula':
        return (
          <View>
            <Text style={styles.label}>LaTeX Formula</Text>
            <TextInput
              style={[styles.input, { fontFamily: 'monospace' }]}
              value={content.latex || ''}
              onChangeText={(latex) => updateContent({ latex })}
              placeholder="e.g. x^2 + y^2 = r^2"
              multiline
            />
          </View>
        );

      case 'callout':
        return (
          <View>
            <Text style={styles.label}>Callout Type</Text>
            <View style={styles.typeRow}>
              {['info', 'warning', 'tip'].map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeBtn, content.type === type && styles.typeBtnActive]}
                  onPress={() => updateContent({ type })}
                >
                  <Text style={[styles.typeText, content.type === type && styles.typeTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Title (Optional)</Text>
            <TextInput
              style={styles.input}
              value={content.title || ''}
              onChangeText={(title) => updateContent({ title })}
              placeholder="e.g. Important Note"
            />
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content.text || ''}
              onChangeText={(text) => updateContent({ text })}
              placeholder="Callout text..."
              multiline
            />
          </View>
        );

      case 'image':
        return (
          <View>
            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={content.url || ''}
              onChangeText={(url) => updateContent({ url })}
              placeholder="https://..."
            />
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.input}
              value={content.caption || ''}
              onChangeText={(caption) => updateContent({ caption })}
              placeholder="Figure 1..."
            />
          </View>
        );

      case 'key_term':
        return (
          <View>
            <Text style={styles.label}>Term</Text>
            <TextInput
              style={styles.input}
              value={content.term || ''}
              onChangeText={(term) => updateContent({ term })}
              placeholder="e.g. Osmosis"
            />
            <Text style={styles.label}>Definition</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content.definition || ''}
              onChangeText={(definition) => updateContent({ definition })}
              placeholder="The movement of..."
              multiline
            />
          </View>
        );

      case 'example':
        return (
          <View>
            <Text style={styles.label}>Example Title</Text>
            <TextInput
              style={styles.input}
              value={content.title || ''}
              onChangeText={(title) => updateContent({ title })}
              placeholder="e.g. Example 1"
            />
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content.content || ''}
              onChangeText={(val) => updateContent({ content: val })}
              placeholder="Example details..."
              multiline
            />
          </View>
        );

      case 'bullet_list':
      case 'numbered_list':
        const items = content.items || [];
        return (
          <View>
            <Text style={styles.label}>List Items</Text>
            {items.map((item: string, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ marginRight: 8, color: COLORS.textMuted }}>{idx + 1}.</Text>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={item}
                  onChangeText={(val) => {
                    const newItems = [...items];
                    newItems[idx] = val;
                    updateContent({ items: newItems });
                  }}
                />
                <TouchableOpacity 
                  onPress={() => {
                    const newItems = items.filter((_: any, i: number) => i !== idx);
                    updateContent({ items: newItems });
                  }}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="close" size={20} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addItemBtn}
              onPress={() => updateContent({ items: [...items, ''] })}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        );

      // Default fallback for unhandled types - No raw JSON allowed
      default:
        return (
          <View style={{ padding: 16, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
            <Text style={{ color: '#666', fontSize: 14 }}>
              This block type ({block.block_type}) requires a specialized editor. Raw JSON editing is disabled.
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{block.block_type.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.iconBtn, isFirst && { opacity: 0.3 }]} onPress={onMoveUp} disabled={isFirst}>
            <Ionicons name="arrow-up" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, isLast && { opacity: 0.3 }]} onPress={onMoveDown} disabled={isLast}>
            <Ionicons name="arrow-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {renderEditorFields()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
  },
  body: {
    padding: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    ...FONTS.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  typeTextActive: {
    color: COLORS.white,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  addItemText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  }
});
