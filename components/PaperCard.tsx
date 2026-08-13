import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';

interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
  subject?: string;
  paper_pdf_url: string;
  solution_pdf_url: string | null;
  description: string;
}

interface PaperCardProps {
  paper: Paper;
  isPro: boolean | undefined;
  isBookmarked?: boolean;
  onDownloadPaper: (paper: Paper) => void;
  onViewSolution: (paper: Paper) => void;
  onToggleBookmark?: (paper: Paper) => void;
}

export default function PaperCard({ paper, isPro, isBookmarked, onDownloadPaper, onViewSolution, onToggleBookmark }: PaperCardProps) {
  const yearColor = paper.year >= 2023 ? COLORS.primary : COLORS.accent;
  const isCambridge = paper.grade_level === 'IGCSE' || paper.grade_level === 'AS Level';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.yearBadge, { backgroundColor: yearColor + '15' }]}>
            <Text style={[styles.yearText, { color: yearColor }]}>{paper.year}</Text>
          </View>
          <View style={[styles.gradeBadge, { 
            backgroundColor: isCambridge ? COLORS.accentLight + '30' : paper.grade_level === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight 
          }]}>
            <Text style={[styles.gradeText, { 
              color: isCambridge ? COLORS.accent : paper.grade_level === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark 
            }]}>
              {paper.grade_level}
            </Text>
          </View>
          {isCambridge && (
            <View style={styles.cambridgeBadge}>
              <Ionicons name="globe-outline" size={10} color={COLORS.accent} />
              <Text style={styles.cambridgeBadgeText}>Cambridge</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {onToggleBookmark && (
            <TouchableOpacity
              style={styles.bookmarkBtn}
              onPress={() => onToggleBookmark(paper)}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isBookmarked ? 'heart' : 'heart-outline'}
                size={22}
                color={isBookmarked ? '#EF4444' : COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
          <View style={styles.paperIcon}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{paper.title}</Text>
      <Text style={styles.description}>{paper.description}</Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {/* Download Paper - Always Free */}
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => onDownloadPaper(paper)}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.white} />
          <Text style={styles.downloadBtnText}>Download Paper</Text>
        </TouchableOpacity>

        {/* View Solution - Premium */}
        <TouchableOpacity
          style={[styles.solutionBtn, isPro === true && styles.solutionBtnUnlocked]}
          onPress={() => onViewSolution(paper)}
          activeOpacity={0.7}
        >
          {!isPro && (
            <Ionicons name="lock-closed" size={14} color={COLORS.goldDark} />
          )}
          {isPro === true && (
            <Ionicons name="key" size={14} color={COLORS.white} />
          )}
          <Text style={[styles.solutionBtnText, isPro === true && styles.solutionBtnTextUnlocked]}>
            {isPro === true ? 'View Solution' : 'Solution'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bookmarkBtn: {
    padding: 4,
  },
  yearBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  yearText: {
    ...FONTS.caption,
    fontWeight: '700',
  },
  gradeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  gradeText: {
    ...FONTS.small,
    fontWeight: '700',
  },
  paperIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  downloadBtnText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  solutionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  solutionBtnUnlocked: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  solutionBtnText: {
    ...FONTS.caption,
    color: COLORS.goldDark,
    fontWeight: '700',
  },
  solutionBtnTextUnlocked: {
    color: COLORS.white,
  },
  cambridgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '12',
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  cambridgeBadgeText: {
    ...FONTS.small,
    fontWeight: '700',
    color: COLORS.accent,
    fontSize: 9,
  },
});
