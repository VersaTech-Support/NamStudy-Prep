import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function SchoolHubScreen() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'notices' | 'timetables'>('notices');
  const [loading, setLoading] = useState(true);

  const [schoolData, setSchoolData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);

  useEffect(() => {
    fetchSchoolHubData();
  }, [user?.school_id]);

  const fetchSchoolHubData = async () => {
    setLoading(true);
    
    // Fetch the specific school's theme and data if they have a school_id
    if (user?.school_id) {
      const { data: sData } = await supabase.from('schools').select('*').eq('id', user.school_id).single();
      if (sData) setSchoolData(sData);
    }

    // Fetch announcements (National: school_id is null, or matching user's school)
    let annQuery = supabase.from('school_announcements').select('*').order('created_at', { ascending: false });
    if (user?.school_id) {
      annQuery = annQuery.or(`school_id.eq.${user.school_id},school_id.is.null`);
    } else {
      annQuery = annQuery.is('school_id', null);
    }
    const { data: annData } = await annQuery;
    if (annData) setAnnouncements(annData);

    // Fetch timetables
    let timeQuery = supabase.from('school_timetables').select('*').order('exam_date', { ascending: true });
    if (user?.school_id) {
      timeQuery = timeQuery.or(`school_id.eq.${user.school_id},school_id.is.null`);
    } else {
      timeQuery = timeQuery.is('school_id', null);
    }
    const { data: timeData } = await timeQuery;
    if (timeData) setTimetables(timeData);

    setLoading(false);
  };

  const primaryColor = schoolData?.primary_color || COLORS.primary;
  const accentColor = schoolData?.accent_color || COLORS.accent;
  const schoolName = schoolData?.name || user?.school || 'National Hub';

  // Calculate countdown for the next upcoming exam
  const now = new Date();
  const nextExam = timetables.find(t => new Date(t.exam_date) >= now);
  let countdownText = '';
  if (nextExam) {
    const diff = new Date(nextExam.exam_date).getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) countdownText = 'Today!';
    else if (days === 1) countdownText = 'Tomorrow!';
    else countdownText = `${days} days away`;
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
      {/* Dynamic Header Banner */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
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
            {schoolData?.code ? (
              <View style={[styles.schoolCodeBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.schoolCodeText}>{schoolData.code}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Next Exam Countdown */}
      {Boolean(nextExam) && (
        <View style={[styles.countdownBar, { backgroundColor: accentColor + '20', borderLeftColor: accentColor }]}>
          <Ionicons name="alarm" size={18} color={accentColor} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={{ ...FONTS.caption, color: COLORS.textPrimary, fontWeight: '700' }}>
              Next Exam: {nextExam.subject_name}
            </Text>
            <Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>
              {nextExam.paper_code} — {countdownText}
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
          <Ionicons name="megaphone" size={16} color={activeTab === 'notices' ? primaryColor : COLORS.textMuted} />
          <Text style={[styles.tabText, activeTab === 'notices' && { color: primaryColor, fontWeight: '700' }]}>Notice Board</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'timetables' && { borderBottomColor: primaryColor }]} 
          onPress={() => setActiveTab('timetables')}
        >
          <Ionicons name="calendar" size={16} color={activeTab === 'timetables' ? primaryColor : COLORS.textMuted} />
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
              
              {/* Official Timetable Image Gallery */}
              <View style={styles.officialTimetableSection}>
                <Text style={styles.sectionHeaderTitle}>Official NSSCO 2026 Timetable</Text>
                <Text style={[styles.sectionHeaderSub, { marginBottom: SPACING.md }]}>Swipe to view the full Ministry schedule.</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md }}>
                  <Image source={require('@/assets/images/timetable-1.png')} style={styles.timetableImage} resizeMode="cover" />
                  <Image source={require('@/assets/images/timetable-2.png')} style={styles.timetableImage} resizeMode="cover" />
                  <Image source={require('@/assets/images/timetable-3.png')} style={styles.timetableImage} resizeMode="cover" />
                  <Image source={require('@/assets/images/timetable-4.png')} style={styles.timetableImage} resizeMode="cover" />
                </ScrollView>
              </View>

              <View style={styles.divider} />
              
              <Text style={[styles.sectionHeaderTitle, { marginBottom: SPACING.md }]}>Upcoming Exam Schedule</Text>
              {timetables.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No upcoming exams</Text>
                  <Text style={{ ...FONTS.small, color: COLORS.textMuted, textAlign: 'center' }}>Exam timetables will appear here once published.</Text>
                </View>
              ) : (
                timetables.map((exam) => {
                  const examDate = new Date(exam.exam_date);
                  const isPast = examDate < now;
                  return (
                    <View key={exam.id} style={[styles.timetableCard, isPast && { opacity: 0.5 }]}>
                      <View style={[styles.examDateBox, { backgroundColor: primaryColor + '10' }]}>
                        <Text style={[styles.examDateMonth, { color: primaryColor }]}>
                          {examDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </Text>
                        <Text style={[styles.examDateDay, { color: primaryColor }]}>
                          {examDate.getDate()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, paddingLeft: SPACING.md }}>
                        <Text style={styles.examSubject}>{exam.subject_name}</Text>
                        <Text style={styles.examPaper}>{exam.paper_code}</Text>
                        <View style={styles.examDetailsRow}>
                          {Boolean(exam.start_time) && (
                            <View style={styles.examDetail}>
                              <Ionicons name="time" size={14} color={COLORS.textMuted} />
                              <Text style={styles.examDetailText}>{exam.start_time}</Text>
                            </View>
                          )}
                          {Boolean(exam.duration) && (
                            <View style={styles.examDetail}>
                              <Ionicons name="hourglass" size={14} color={COLORS.textMuted} />
                              <Text style={styles.examDetailText}>{exam.duration}</Text>
                            </View>
                          )}
                          {Boolean(exam.venue) && (
                            <View style={styles.examDetail}>
                              <Ionicons name="location" size={14} color={COLORS.textMuted} />
                              <Text style={styles.examDetailText}>{exam.venue}</Text>
                            </View>
                          )}
                        </View>
                        {Boolean(exam.curriculum) && (
                          <View style={[styles.badge, { backgroundColor: accentColor + '20', marginTop: SPACING.xs, alignSelf: 'flex-start' }]}>
                            <Text style={[styles.badgeText, { color: accentColor }]}>{exam.curriculum}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
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
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  schoolLogoPlaceholder: {
    width: 60,
    height: 60,
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
  countdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
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
    paddingTop: SPACING.lg,
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
  timetableCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...SHADOWS.sm,
  },
  examDateBox: {
    width: 60,
    height: 70,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examDateMonth: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  examDateDay: {
    fontSize: 24,
    fontWeight: '800',
  },
  examSubject: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  examPaper: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  examDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  examDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examDetailText: {
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
