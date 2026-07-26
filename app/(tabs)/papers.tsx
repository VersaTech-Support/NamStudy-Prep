import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/app/constants/theme';
import { useUser } from '@/app/context/UserContext';
import { supabase } from '@/app/lib/supabase';
import PaperCard from '@/app/components/PaperCard';
import UpgradeModal from '@/app/components/UpgradeModal';
import AuthModal from '@/app/components/AuthModal';

interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
  paper_pdf_url: string;
  solution_pdf_url: string | null;
  description: string;
}

export default function PapersScreen() {
  const { user, isVIP } = useUser();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<'All' | 'NSSCO' | 'NSSCAS'>('All');
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .order('year', { ascending: false })
      .order('paper_number', { ascending: true });
    
    if (data) setPapers(data);
    setLoading(false);
  };

  const filteredPapers = papers.filter(p => {
    if (gradeFilter !== 'All' && p.grade_level !== gradeFilter) return false;
    if (yearFilter && p.year !== yearFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query) ||
             p.grade_level.toLowerCase().includes(query);
    }
    return true;
  });

  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);

  const handleDownloadPaper = (paper: Paper) => {
    Linking.openURL(paper.paper_pdf_url).catch(() => {
      Alert.alert('Download', `Paper: ${paper.title}\n\nThe download link will open in your browser. This paper is 100% FREE!`);
    });
  };

  const handleViewSolution = (paper: Paper) => {
    if (!user) {
      setAuthVisible(true);
      return;
    }
    if (!isVIP) {
      setUpgradeVisible(true);
      return;
    }
    if (paper.solution_pdf_url) {
      Linking.openURL(paper.solution_pdf_url).catch(() => {
        Alert.alert('Solution', `Opening step-by-step solution for: ${paper.title}`);
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Paper Library</Text>
          <Text style={styles.headerSubtitle}>
            {filteredPapers.length} papers available
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search papers..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Grade Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Grade Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['All', 'NSSCO', 'NSSCAS'] as const).map(grade => (
              <TouchableOpacity
                key={grade}
                style={[styles.filterChip, gradeFilter === grade && styles.filterChipActive]}
                onPress={() => setGradeFilter(grade)}
              >
                <Text style={[styles.filterChipText, gradeFilter === grade && styles.filterChipTextActive]}>
                  {grade === 'All' ? 'All Grades' : grade === 'NSSCO' ? 'NSSCO (Gr 10-11)' : 'NSSCAS (Gr 12)'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Year Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !yearFilter && styles.filterChipActive]}
              onPress={() => setYearFilter(null)}
            >
              <Text style={[styles.filterChipText, !yearFilter && styles.filterChipTextActive]}>All Years</Text>
            </TouchableOpacity>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={[styles.filterChip, yearFilter === year && styles.filterChipActive]}
                onPress={() => setYearFilter(yearFilter === year ? null : year)}
              >
                <Text style={[styles.filterChipText, yearFilter === year && styles.filterChipTextActive]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Free Banner */}
        <View style={styles.freeBanner}>
          <Ionicons name="gift" size={20} color={COLORS.green} />
          <View style={styles.freeBannerContent}>
            <Text style={styles.freeBannerTitle}>All Papers are 100% FREE</Text>
            <Text style={styles.freeBannerText}>Download any past exam paper at no cost</Text>
          </View>
        </View>

        {/* Papers List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading papers...</Text>
          </View>
        ) : filteredPapers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Papers Found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters or search query</Text>
          </View>
        ) : (
          <View style={styles.papersList}>
            {filteredPapers.map(paper => (
              <PaperCard
                key={paper.id}
                paper={paper}
                isVIP={isVIP}
                onDownloadPaper={handleDownloadPaper}
                onViewSolution={handleViewSolution}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  headerContent: {},
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...FONTS.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollView: {
    flex: 1,
  },
  // Search
  searchContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  // Filters
  filterSection: {
    paddingTop: SPACING.lg,
    paddingLeft: SPACING.xl,
  },
  filterLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  // Free Banner
  freeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.green + '30',
  },
  freeBannerContent: {
    flex: 1,
  },
  freeBannerTitle: {
    ...FONTS.caption,
    color: COLORS.greenDark,
    fontWeight: '700',
  },
  freeBannerText: {
    ...FONTS.small,
    color: COLORS.greenDark,
  },
  // Papers
  papersList: {
    paddingHorizontal: SPACING.xl,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
