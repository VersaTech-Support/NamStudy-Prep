import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SchoolHubScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'notices' | 'timetables'>('notices');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const [schoolData, setSchoolData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchSchoolHubData();
  }, [user?.school_id]);

  const fetchSchoolHubData = async () => {
    setLoading(true);
    
    let currentSchoolId = user?.school_id;

    // Fetch the specific school's theme and data
    if (currentSchoolId) {
      const { data: sData } = await supabase.from('schools').select('*').eq('id', currentSchoolId).single();
      if (sData) setSchoolData(sData);
    } else if (user?.school) {
      // Fallback: search by name if they haven't been linked by UUID yet
      const { data: sData } = await supabase.from('schools').select('*').ilike('name', user.school).single();
      if (sData) {
        setSchoolData(sData);
        currentSchoolId = sData.id;
        if (user?.id) {
          // Silently update the user profile so it's linked permanently
          supabase.from('users').update({ school_id: sData.id }).eq('id', user.id).then();
        }
      }
    }

    // Fetch announcements (National: school_id is null, or matching user's school)
    let annQuery = supabase.from('school_announcements').select('*').order('created_at', { ascending: false });
    if (currentSchoolId) {
      annQuery = annQuery.or(`school_id.eq.${currentSchoolId},school_id.is.null`);
    } else {
      annQuery = annQuery.is('school_id', null);
    }
    const { data: annData } = await annQuery;
    if (annData) setAnnouncements(annData);

    // Fetch timetables
    let timeQuery = supabase.from('school_timetables').select('*').order('exam_date', { ascending: true });
    if (currentSchoolId) {
      timeQuery = timeQuery.or(`school_id.eq.${currentSchoolId},school_id.is.null`);
    } else {
      timeQuery = timeQuery.is('school_id', null);
    }
    const { data: timeData } = await timeQuery;
    if (timeData) setTimetables(timeData);

    // Fetch enrolled subjects to personalize the Next Exam widget
    if (user) {
      const { data: ssData } = await supabase
        .from('student_subjects')
        .select('curriculum_subjects(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (ssData) {
        const subjects = ssData.map((s: any) => s.curriculum_subjects?.name).filter(Boolean);
        setEnrolledSubjects(subjects);
      }
    }

    setLoading(false);
  };

  const primaryColor = schoolData?.primary_color || COLORS.primary;
  const accentColor = schoolData?.accent_color || COLORS.accent;
  const schoolName = schoolData?.name || user?.school || 'National Hub';

  // Determine user permissions and grade aliases
  const isStaff = user?.role === 'admin' || user?.role === 'teacher' || user?.is_school_admin;
  const userGrade = user?.grade_level || 'NSSCO';
  const isNSSCO = !userGrade || userGrade.includes('NSSCO') || userGrade.includes('Grade 11') || userGrade.includes('Grade 10') || userGrade.includes('IGCSE');
  const isNSSCAS = !userGrade || userGrade.includes('NSSCAS') || userGrade.includes('Grade 12') || userGrade.includes('AS Level');

  // Filter timetables based on the curriculum
  const visibleTimetables = timetables.filter(exam => {
    if (isStaff) return true;
    if (!exam.curriculum) return true;
    if (exam.curriculum === 'NSSCO' && isNSSCO) return true;
    if (exam.curriculum === 'NSSCAS' && isNSSCAS) return true;
    if (exam.curriculum === userGrade) return true;
    return false;
  });

  // Calculate countdown for the next upcoming exam
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day for accurate day counting
  
  // Only consider exams for subjects the user is actually taking (if we have that data)
  const upcomingExams = visibleTimetables.filter(t => {
    const isFuture = new Date(t.exam_date) >= now;
    if (enrolledSubjects.length === 0) return isFuture; // Fallback if no enrolled subjects
    return isFuture && enrolledSubjects.includes(t.subject_name);
  });
  
  const nextExamDateStr = upcomingExams.length > 0 ? upcomingExams[0].exam_date : null;
  const nextExams = nextExamDateStr ? upcomingExams.filter(t => t.exam_date === nextExamDateStr) : [];
  
  let countdownText = '';
  let nextExamSubjectString = '';
  let nextExamPaperString = '';

  if (nextExams.length > 0 && nextExamDateStr) {
    const diff = new Date(nextExamDateStr).getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) countdownText = 'Today!';
    else if (days === 1) countdownText = 'Tomorrow!';
    else countdownText = `${days} days away`;

    // Group by subject
    const subjectsMap: Record<string, string[]> = {};
    nextExams.forEach(exam => {
      if (!subjectsMap[exam.subject_name]) subjectsMap[exam.subject_name] = [];
      subjectsMap[exam.subject_name].push(exam.paper_code);
    });
    
    const subjectNames = Object.keys(subjectsMap);
    nextExamSubjectString = subjectNames.join(' & ');
    
    if (subjectNames.length === 1) {
      nextExamPaperString = subjectsMap[subjectNames[0]].join(' & ');
    } else {
      nextExamPaperString = subjectNames.map(sub => `${sub}: ${subjectsMap[sub].join(' & ')}`).join(' • ');
    }
  }

  if (!user) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
        <Text style={{ ...FONTS.body, color: COLORS.textMuted, marginTop: SPACING.md }}>Sign in to access your School Hub</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <LinearGradient 
        colors={[primaryColor, accentColor]} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 16 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My School Hub</Text>
        </View>
        <View style={styles.schoolInfoRow}>
          {schoolData?.logo_url ? (
            <Image source={{ uri: schoolData.logo_url }} style={styles.schoolLogo} />
          ) : (
            <View style={[styles.schoolLogoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="school" size={24} color={COLORS.white} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.schoolName}>{schoolName}</Text>
            {schoolData?.code && (
              <View style={[styles.schoolCodeBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={styles.schoolCodeText}>{schoolData.code}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Next Exam Countdown (Overlapping Header) */}
      {nextExams.length > 0 && (
        <View style={styles.countdownCard}>
          <View style={[styles.countdownIconBg, { backgroundColor: accentColor + '15' }]}>
            <Ionicons name="alarm-outline" size={24} color={accentColor} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>
              Next Exam: {nextExamSubjectString}
            </Text>
            <Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>
              {nextExamPaperString} — {countdownText}
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notices' && { borderBottomColor: primaryColor }]} 
          onPress={() => setActiveTab('notices')}
        >
          <Text style={[styles.tabText, activeTab === 'notices' && { color: primaryColor, fontWeight: '700' }]}>Notice Board</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'timetables' && { borderBottomColor: primaryColor }]} 
          onPress={() => setActiveTab('timetables')}
        >
          <Text style={[styles.tabText, activeTab === 'timetables' && { color: primaryColor, fontWeight: '700' }]}>Timetables</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xxl }} size="large" color={primaryColor} />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


          {/* NOTICE BOARD TAB */}
          {activeTab === 'notices' && (
            <View style={styles.tabSection}>
              {announcements.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No announcements yet</Text>
                  <Text style={{ ...FONTS.small, color: COLORS.textMuted, textAlign: 'center' }}>Check back later for exam news and school updates.</Text>
                </View>
              ) : (
                announcements.map((ann) => (
                  <View key={ann.id} style={[styles.card, ann.is_urgent && { borderLeftWidth: 3, borderLeftColor: COLORS.red }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs, flexWrap: 'wrap' }}>
                        {ann.school_id ? (
                          <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
                            <Text style={[styles.badgeText, { color: primaryColor }]}>School</Text>
                          </View>
                        ) : (
                          <View style={[styles.badge, { backgroundColor: COLORS.gold + '20' }]}>
                            <Text style={[styles.badgeText, { color: COLORS.goldDark }]}>National</Text>
                          </View>
                        )}
                        {ann.is_urgent ? (
                          <View style={[styles.badge, { backgroundColor: COLORS.redLight }]}>
                            <Text style={[styles.badgeText, { color: COLORS.red }]}>URGENT</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.cardTitle}>{ann.title}</Text>
                      <Text style={styles.cardContent} numberOfLines={3}>{ann.content}</Text>
                      <Text style={styles.dateText}>{new Date(ann.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TIMETABLES TAB */}
          {activeTab === 'timetables' && (
            <View style={styles.tabSection}>
              {/* Official Timetable Image Galleries */}
              {(() => {
                const showNSSCO = isStaff || isNSSCO;
                const showNSSCAS = isStaff || isNSSCAS;

                return (
                  <>
                    {showNSSCO && (
                      <View style={styles.officialTimetableSection}>
                        <Text style={styles.sectionHeaderTitle}>Official NSSCO 2026 Timetable</Text>
                        <Text style={[styles.sectionHeaderSub, { marginBottom: SPACING.md }]}>Swipe to view the full Ministry schedule.</Text>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md }}>
                  <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCO/timetable-1.png'))} activeOpacity={0.8}>
                    <Image source={require('@/assets/images/timetables/NSSCO/timetable-1.png')} style={styles.timetableImage} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCO/timetable-2.png'))} activeOpacity={0.8}>
                    <Image source={require('@/assets/images/timetables/NSSCO/timetable-2.png')} style={styles.timetableImage} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCO/timetable-3.png'))} activeOpacity={0.8}>
                    <Image source={require('@/assets/images/timetables/NSSCO/timetable-3.png')} style={styles.timetableImage} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCO/timetable-4.png'))} activeOpacity={0.8}>
                    <Image source={require('@/assets/images/timetables/NSSCO/timetable-4.png')} style={styles.timetableImage} resizeMode="cover" />
                  </TouchableOpacity>
                        </ScrollView>
                      </View>
                    )}

                    {showNSSCO && showNSSCAS && <View style={styles.divider} />}

                    {/* Official NSSCAS Timetable Image Gallery */}
                    {showNSSCAS && (
                      <View style={styles.officialTimetableSection}>
                        <Text style={styles.sectionHeaderTitle}>Official NSSCAS 2026 Timetable</Text>
                        <Text style={[styles.sectionHeaderSub, { marginBottom: SPACING.md }]}>Swipe to view the full Ministry schedule.</Text>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md }}>
                          <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCAS/AStimetable_1.png'))} activeOpacity={0.8}>
                            <Image source={require('@/assets/images/timetables/NSSCAS/AStimetable_1.png')} style={styles.timetableImage} resizeMode="cover" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCAS/AStimetable_2.png'))} activeOpacity={0.8}>
                            <Image source={require('@/assets/images/timetables/NSSCAS/AStimetable_2.png')} style={styles.timetableImage} resizeMode="cover" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setSelectedImage(require('@/assets/images/timetables/NSSCAS/AStimetable_3.png'))} activeOpacity={0.8}>
                            <Image source={require('@/assets/images/timetables/NSSCAS/AStimetable_3.png')} style={styles.timetableImage} resizeMode="cover" />
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    )}
                  </>
                );
              })()}

              <View style={styles.divider} />
              
              <Text style={[styles.sectionHeaderTitle, { marginBottom: SPACING.md }]}>Upcoming Exam Schedule</Text>
              {visibleTimetables.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No upcoming exams</Text>
                  <Text style={{ ...FONTS.small, color: COLORS.textMuted, textAlign: 'center' }}>Exam timetables will appear here once published.</Text>
                </View>
              ) : (
                (() => {
                  const parseTime = (timeStr: string) => {
                    if (!timeStr) return 0;
                    const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (!match) return 0;
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const ampm = match[3].toUpperCase();
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                  };

                  const groupedTimetables = visibleTimetables.reduce((acc, exam) => {
                    const dateStr = exam.exam_date; 
                    if (!acc[dateStr]) acc[dateStr] = [];
                    acc[dateStr].push(exam);
                    return acc;
                  }, {} as Record<string, any[]>);

                  const sortedDates = Object.keys(groupedTimetables).sort();
                  const today = new Date();
                  today.setHours(0,0,0,0);

                  return sortedDates.map(dateStr => {
                    const exams = groupedTimetables[dateStr].sort((a: any, b: any) => parseTime(a.start_time) - parseTime(b.start_time));
                    const dateObj = new Date(dateStr);
                    const isPast = dateObj < today;

                    return (
                      <View key={dateStr} style={[styles.dateGroup, isPast && { opacity: 0.5 }]}>
                        <View style={[styles.dateHeader, { backgroundColor: primaryColor + '15' }]}>
                          <Ionicons name="calendar" size={16} color={primaryColor} />
                          <Text style={[styles.dateHeaderText, { color: primaryColor }]}>
                            {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </Text>
                        </View>
                        
                        <View style={styles.dateExamsContainer}>
                          {exams.map((exam: any, index: number) => (
                            <View key={exam.id} style={[styles.examRow, index < exams.length - 1 && styles.examRowBorder]}>
                              <View style={styles.timeCol}>
                                <Text style={styles.timeText}>{exam.start_time || 'TBA'}</Text>
                                {Boolean(exam.duration) && (
                                  <Text style={styles.durationText}>{exam.duration}</Text>
                                )}
                              </View>
                              
                              <View style={styles.examInfoCol}>
                                <Text style={styles.examSubjectText}>{exam.subject_name}</Text>
                                <View style={styles.examSubRow}>
                                  <Text style={styles.examPaperText}>{exam.paper_code}</Text>
                                  {Boolean(exam.curriculum) && (
                                    <View style={[styles.badge, { backgroundColor: accentColor + '20', paddingVertical: 1, paddingHorizontal: 6 }]}>
                                      <Text style={[styles.badgeText, { color: accentColor }]}>{exam.curriculum}</Text>
                                    </View>
                                  )}
                                </View>
                                {Boolean(exam.venue) && (
                                  <View style={styles.venueRow}>
                                    <Ionicons name="location" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.venueText}>{exam.venue}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  });
                })()
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={40} color={COLORS.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={selectedImage} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl + SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
  },
  schoolInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  schoolLogo: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  schoolLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolName: {
    ...FONTS.h3,
    color: COLORS.white,
    marginBottom: 4,
  },
  schoolCodeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schoolCodeText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '700',
  },

  // Countdown Card
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginTop: -SPACING.xl, // Overlap the header
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  countdownIconBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...FONTS.body,
    color: COLORS.textMuted,
  },

  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },

  tabSection: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardContent: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  dateText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  dateHeaderText: {
    ...FONTS.bodyBold,
  },
  dateExamsContainer: {
    paddingHorizontal: SPACING.md,
  },
  examRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
  },
  examRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  timeCol: {
    width: 80,
    borderRightWidth: 2,
    borderRightColor: COLORS.borderLight,
    paddingRight: SPACING.md,
    marginRight: SPACING.md,
    justifyContent: 'center',
  },
  timeText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  durationText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  examInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  examSubjectText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  examSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  examPaperText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  officialTimetableSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeaderTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  sectionHeaderSub: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timetableImage: {
    width: 280,
    height: 400,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
});
