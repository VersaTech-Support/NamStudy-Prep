import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { getCacheData, setCacheData } from '@/lib/cache';
import ScreenHeader from '@/components/ui/ScreenHeader';
import PaperCard from '@/components/PaperCard';
import UpgradeModal from '@/components/UpgradeModal';
import AuthModal from '@/components/AuthModal';

interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
  subject?: string | null;
  paper_pdf_url: string;
  solution_pdf_url: string | null;
  description: string | null;
}

export default function PapersScreen() {
  const params = useLocalSearchParams<{ subject?: string; grade?: string; curriculum?: 'Namibian' | 'Cambridge' }>();

  const { user, isPro, canAccessSolutions, toggleBookmark, isBookmarked } = useUser();
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [curriculumFilter, setCurriculumFilter] = useState<'Namibian' | 'Cambridge'>(params.curriculum || 'Namibian');
  const [gradeFilter, setGradeFilter] = useState<string>(params.grade || 'All');
  const [subjectFilter, setSubjectFilter] = useState<string>(params.subject || 'All');
  
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [authVisible, setAuthVisible] = useState(false);
  const [isOfflineError, setIsOfflineError] = useState(false);

  const NAMIBIAN_GRADES = ['NSSCO', 'NSSCAS'];
  const CAMBRIDGE_GRADES = ['IGCSE', 'AS Level'];
  const currentGrades = curriculumFilter === 'Namibian' ? NAMIBIAN_GRADES : CAMBRIDGE_GRADES;

  // Listen for incoming params changes (e.g. navigating from subject dashboard to already mounted tab)
  useEffect(() => {
    if (params.subject) setSubjectFilter(params.subject);
    if (params.grade) setGradeFilter(params.grade);
    if (params.curriculum) setCurriculumFilter(params.curriculum);
  }, [params.subject, params.grade, params.curriculum]);

  // Initial load effect (sets default grade if no params provided)
  useEffect(() => {
    const userIsAdmin = user?.role === 'admin' || (user as any)?.is_admin === true;
    if (!params.grade && !params.subject) {
      if (curriculumFilter === 'Namibian' && user && !userIsAdmin && user.grade_level) {
        setGradeFilter(user.grade_level);
      } else {
        setGradeFilter('All');
      }
    }
    fetchPapers();
  }, [user, curriculumFilter]);

  const handleCurriculumChange = (curr: 'Namibian' | 'Cambridge') => {
    setCurriculumFilter(curr);
    const userIsAdmin = user?.role === 'admin' || (user as any)?.is_admin === true;
    if (curr === 'Namibian' && user && !userIsAdmin && user.grade_level) {
      setGradeFilter(user.grade_level);
    } else {
      setGradeFilter('All');
    }
    setSubjectFilter('All');
    // fetchPapers will be triggered by the useEffect on curriculumFilter change
  };

  const fetchPapers = async () => {
    const cacheKey = curriculumFilter === 'Namibian' ? 'papers_list_namibian' : 'papers_list_cambridge';
    const cachedPapers = await getCacheData(cacheKey);
    if (cachedPapers && cachedPapers.length > 0) {
      setPapers(cachedPapers);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('papers')
        .select('*')
        .order('year', { ascending: false })
        .order('paper_number', { ascending: true });

      const userIsAdmin = user?.role === 'admin' || (user as any)?.is_admin === true;
      let userSubjects: string[] = [];
      
      if (user && !userIsAdmin) {
        const { data: ssData } = await supabase
          .from('student_subjects')
          .select('curriculum_subjects(name)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (ssData) {
          userSubjects = ssData.map((s: any) => s.curriculum_subjects?.name).filter(Boolean);
          setEnrolledSubjects(userSubjects);
        }
      }

      // Filter by curriculum grade levels
      const gradeLevels = curriculumFilter === 'Namibian' ? NAMIBIAN_GRADES : CAMBRIDGE_GRADES;
      query = query.in('grade_level', gradeLevels);

      // Subject filtering only for Namibian papers when user has subjects set
      if (curriculumFilter === 'Namibian' && user && !userIsAdmin && userSubjects.length > 0) {
        query = query.in('subject', userSubjects);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching papers:', error.message);
        if (!cachedPapers || cachedPapers.length === 0) {
          setIsOfflineError(true);
        }
      } else if (data) {
        setPapers(data);
        await setCacheData(cacheKey, data);
        setIsOfflineError(false);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
      if (!cachedPapers || cachedPapers.length === 0) {
        setIsOfflineError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter(p => {
    if (subjectFilter !== 'All' && p.subject !== subjectFilter) return false;
    if (gradeFilter !== 'All' && p.grade_level !== gradeFilter) return false;
    if (yearFilter && p.year !== yearFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.grade_level.toLowerCase().includes(query) ||
        (p.subject && p.subject.toLowerCase().includes(query));
    }
    return true;
  });

  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);

  const availableSubjects: string[] = enrolledSubjects.length > 0
    ? enrolledSubjects
    : [...new Set(papers.map(p => p.subject).filter((s): s is string => Boolean(s)))];

  const handleDownloadPaper = (paper: Paper) => {
    Linking.openURL(paper.paper_pdf_url).catch(() => {
      Alert.alert('Download', `Paper: ${paper.title}\n\nThe download link will open in your browser. This paper is 100% FREE!`);
    });
  };

  const handleToggleBookmark = async (paper: Paper) => {
    if (!user) {
      setAuthVisible(true);
      return;
    }
    await toggleBookmark(paper.id, 'paper', paper.title, paper as unknown as Record<string, unknown>);
  };

  const handleViewSolution = (paper: Paper) => {
    if (!user) {
      setAuthVisible(true);
      return;
    }
    if (!canAccessSolutions) {
      router.push('/payment');
      return;
    }
    if (paper.solution_pdf_url) {
      router.push({
        pathname: '/secure-viewer',
        params: { filePath: paper.solution_pdf_url }
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Paper Library" 
        subtitle={`${filteredPapers.length} papers available`} 
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
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

        {/* Curriculum Toggle */}
        <View style={styles.curriculumToggleContainer}>
          <View style={styles.curriculumToggle}>
            {(['Namibian', 'Cambridge'] as const).map(curriculum => (
              <TouchableOpacity
                key={curriculum}
                style={[
                  styles.curriculumToggleBtn,
                  curriculumFilter === curriculum && (
                    curriculum === 'Namibian'
                      ? styles.curriculumToggleBtnActiveNamibian
                      : styles.curriculumToggleBtnActiveCambridge
                  ),
                ]}
                onPress={() => setCurriculumFilter(curriculum)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={curriculum === 'Namibian' ? 'flag' : 'globe'}
                  size={16}
                  color={
                    curriculumFilter === curriculum
                      ? COLORS.white
                      : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.curriculumToggleText,
                    curriculumFilter === curriculum && styles.curriculumToggleTextActive,
                  ]}
                >
                  {curriculum === 'Namibian' ? 'Namibian Papers' : 'Cambridge Papers'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {availableSubjects.length > 1 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, subjectFilter === 'All' && styles.filterChipActive]}
                onPress={() => setSubjectFilter('All')}
              >
                <Text style={[styles.filterChipText, subjectFilter === 'All' && styles.filterChipTextActive]}>
                  All Subjects
                </Text>
              </TouchableOpacity>
              {availableSubjects.map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.filterChip, subjectFilter === sub && styles.filterChipActive]}
                  onPress={() => setSubjectFilter(subjectFilter === sub ? 'All' : sub)}
                >
                  <Text style={[styles.filterChipText, subjectFilter === sub && styles.filterChipTextActive]}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Grade Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['All', ...currentGrades].map(grade => (
              <TouchableOpacity
                key={grade}
                style={[
                  styles.filterChip,
                  gradeFilter === grade && (
                    curriculumFilter === 'Cambridge'
                      ? styles.filterChipActiveCambridge
                      : styles.filterChipActive
                  ),
                ]}
                onPress={() => setGradeFilter(grade)}
              >
                <Text style={[
                  styles.filterChipText,
                  gradeFilter === grade && styles.filterChipTextActive,
                ]}>
                  {grade === 'All' ? 'All Grades' : grade === 'NSSCO' ? 'NSSCO (Gr 10-11)' : grade === 'NSSCAS' ? 'NSSCAS (Gr 12)' : grade}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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

        <View style={styles.freeBanner}>
          <Ionicons name="gift" size={20} color={COLORS.green} />
          <View style={styles.freeBannerContent}>
            <Text style={styles.freeBannerTitle}>All Papers are 100% FREE</Text>
            <Text style={styles.freeBannerText}>Download any past exam paper at no cost</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading papers...</Text>
          </View>
        ) : filteredPapers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={isOfflineError ? "cloud-offline-outline" : "document-text-outline"} 
              size={48} 
              color={COLORS.textMuted} 
            />
            <Text style={styles.emptyTitle}>
              {isOfflineError ? "Offline Mode" : "No Papers Found"}
            </Text>
            <Text style={styles.emptyText}>
              {isOfflineError 
                ? "Connect to the internet to download your first study materials." 
                : "Try adjusting your filters or search query"}
            </Text>
          </View>
        ) : (
          <View style={styles.papersList}>
            {(() => {
              // Group papers: Subject -> Grade -> Year
              const grouped: Record<string, Record<string, Record<string, Paper[]>>> = {};
              
              filteredPapers.forEach(paper => {
                const subject = paper.subject || 'Unknown Subject';
                const grade = paper.grade_level || 'Unknown Grade';
                const year = paper.year ? paper.year.toString() : 'Unknown Year';

                if (!grouped[subject]) grouped[subject] = {};
                if (!grouped[subject][grade]) grouped[subject][grade] = {};
                if (!grouped[subject][grade][year]) grouped[subject][grade][year] = [];
                
                grouped[subject][grade][year].push(paper);
              });

              // Sort subjects alphabetically
              return Object.keys(grouped).sort().map(subject => (
                <View key={subject} style={styles.subjectGroup}>
                  <Text style={styles.subjectHeader}>{subject.toUpperCase()}</Text>
                  
                  {/* Sort grades alphabetically */}
                  {Object.keys(grouped[subject]).sort().map(grade => (
                    <View key={grade} style={styles.gradeGroup}>
                      <View style={styles.gradeHeaderContainer}>
                        <View style={styles.gradePill}>
                          <Text style={styles.gradeHeaderText}>{grade}</Text>
                        </View>
                      </View>
                      
                      {/* Sort years descending */}
                      {Object.keys(grouped[subject][grade]).sort((a, b) => {
                        if (a === 'Unknown Year') return 1;
                        if (b === 'Unknown Year') return -1;
                        return Number(b) - Number(a);
                      }).map(year => (
                        <View key={year} style={styles.yearGroup}>
                          <View style={styles.yearHeaderRow}>
                            <Text style={styles.yearHeaderText}>{year}</Text>
                            <View style={styles.yearDivider} />
                          </View>
                          
                          <View style={styles.paperCardsContainer}>
                            {/* Papers are already sorted by paper_number ascending by Supabase, 
                                but we ensure stable sort just in case */}
                            {grouped[subject][grade][year]
                              .sort((a, b) => (a.paper_number || 0) - (b.paper_number || 0))
                              .map(paper => (
                              <PaperCard
                                key={paper.id}
                                paper={paper}
                                canAccessSolutions={canAccessSolutions}
                                isBookmarked={isBookmarked(paper.id)}
                                onDownloadPaper={handleDownloadPaper}
                                onViewSolution={handleViewSolution}
                                onToggleBookmark={handleToggleBookmark}
                              />
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ));
            })()}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  searchContainer: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: SPACING.sm, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, ...FONTS.body, color: COLORS.textPrimary },
  curriculumToggleContainer: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  curriculumToggle: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 4 },
  curriculumToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: 10, borderRadius: RADIUS.sm },
  curriculumToggleBtnActiveNamibian: { backgroundColor: COLORS.primary, ...SHADOWS.sm },
  curriculumToggleBtnActiveCambridge: { backgroundColor: COLORS.accent, ...SHADOWS.sm },
  curriculumToggleText: { ...FONTS.caption, color: COLORS.textMuted, fontWeight: '600' },
  curriculumToggleTextActive: { color: COLORS.white, fontWeight: '700' },
  filterSection: { paddingTop: SPACING.lg, paddingLeft: SPACING.xl },
  filterLabel: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  filterScroll: { flexGrow: 0 },
  filterChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.white, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipActiveCambridge: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { ...FONTS.caption, color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white, fontWeight: '700' },
  freeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenLight, marginHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.green + '30' },
  freeBannerContent: { flex: 1 },
  freeBannerTitle: { ...FONTS.caption, color: COLORS.greenDark, fontWeight: '700' },
  freeBannerText: { ...FONTS.small, color: COLORS.greenDark },
  papersList: { paddingHorizontal: SPACING.xl },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: SPACING.xl },
  
  // Hierarchy Styles
  subjectGroup: {
    marginBottom: SPACING.xl,
  },
  subjectHeader: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  gradeGroup: {
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.sm,
  },
  gradeHeaderContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  gradePill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gradeHeaderText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  yearGroup: {
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  yearHeaderText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginRight: SPACING.md,
  },
  yearDivider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  paperCardsContainer: {
    gap: SPACING.md,
  },
});