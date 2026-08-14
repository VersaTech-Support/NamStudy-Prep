import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

interface SchoolRecord {
  id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  created_at: string;
}

interface SchoolUser {
  id: string;
  name: string;
  email: string;
  grade_level: string;
  role?: string;
  is_admin: boolean;
  is_school_admin?: boolean;
  subscription_status: string;
  subjects?: string[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  author_id: string | null;
  created_at: string;
}

interface TimetableEntry {
  id: string;
  curriculum: string | null;
  subject_name: string;
  paper_code: string;
  exam_date: string;
  start_time: string;
  duration: string;
  venue: string;
}

type TabName = 'overview' | 'learners' | 'teachers' | 'content';

export default function SchoolDetailsScreen() {
  const { isAdmin } = useUser();
  const router = useRouter();
  const { schoolId } = useLocalSearchParams<{ schoolId: string }>();

  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);

  const [learnerSearch, setLearnerSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  useEffect(() => {
    if (schoolId) fetchSchoolDetails();
  }, [schoolId]);

  const fetchSchoolDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [schoolRes, usersRes, announcementsRes, timetablesRes] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('users').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('school_announcements').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
        supabase.from('school_timetables').select('*').eq('school_id', schoolId).order('exam_date', { ascending: true }),
      ]);

      if (schoolRes.error) {
        setError('School not found.');
        setLoading(false);
        return;
      }

      if (usersRes.error || announcementsRes.error || timetablesRes.error) {
        setError('Failed to load school data. Please try again.');
        setLoading(false);
        return;
      }

      setSchool(schoolRes.data);
      setSchoolUsers(usersRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      setTimetables(timetablesRes.data || []);
    } catch (err) {
      console.error('School details fetch error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Admin guard
  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="shield-outline" size={48} color={COLORS.red} />
        <Text style={{ ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md }}>Access Denied</Text>
        <Text style={{ ...FONTS.body, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' }}>
          Only Platform Admins can access school details.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryColor = school?.primary_color || COLORS.primary;
  const accentColor = school?.accent_color || COLORS.accent;

  const learners = schoolUsers.filter(u => u.role === 'student');
  const teachers = schoolUsers.filter(u => u.role === 'teacher');
  const schoolAdmins = schoolUsers.filter(u => u.is_school_admin === true);

  const filteredLearners = learners.filter(u =>
    u.name.toLowerCase().includes(learnerSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(learnerSearch.toLowerCase())
  );
  const filteredTeachers = teachers.filter(u =>
    u.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });

  const tabs: { key: TabName; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'learners', label: 'Learners', icon: 'school' },
    { key: 'teachers', label: 'Teachers', icon: 'briefcase' },
    { key: 'content', label: 'Content', icon: 'document-text' },
  ];

  return (
    <View style={styles.container}>
      {/* Dynamic Header */}
      <LinearGradient
        colors={[primaryColor, accentColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>School Details</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>Admin View</Text>
          </View>
        </View>

        {!loading && school && (
          <View style={styles.schoolInfoRow}>
            {school.logo_url ? (
              <Image source={{ uri: school.logo_url }} style={styles.schoolLogo} />
            ) : (
              <View style={[styles.schoolLogoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="school" size={24} color={COLORS.white} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.schoolName}>{school.name}</Text>
              {school.code && (
                <View style={[styles.codeBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                  <Text style={styles.codeText}>{school.code}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={{ ...FONTS.body, color: COLORS.textMuted, marginTop: SPACING.md }}>Loading school data...</Text>
        </View>
      )}

      {/* Error State */}
      {!loading && error && (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
          <Text style={{ ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md }}>Something went wrong</Text>
          <Text style={{ ...FONTS.body, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSchoolDetails}>
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {!loading && !error && school && (
        <>
          {/* Tabs */}
          <View style={styles.tabsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 4 }}>
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && { borderBottomColor: primaryColor }]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? primaryColor : COLORS.textMuted} />
                  <Text style={[styles.tabText, activeTab === tab.key && { color: primaryColor, fontWeight: '700' }]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <View style={styles.tabSection}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { borderLeftColor: primaryColor }]}>
                    <Ionicons name="school-outline" size={20} color={primaryColor} />
                    <Text style={[styles.statNumber, { color: primaryColor }]}>{learners.length}</Text>
                    <Text style={styles.statLabel}>Learners</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: accentColor }]}>
                    <Ionicons name="briefcase-outline" size={20} color={accentColor} />
                    <Text style={[styles.statNumber, { color: accentColor }]}>{teachers.length}</Text>
                    <Text style={styles.statLabel}>Teachers</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: COLORS.gold }]}>
                    <Ionicons name="megaphone-outline" size={20} color={COLORS.gold} />
                    <Text style={[styles.statNumber, { color: COLORS.gold }]}>{announcements.length}</Text>
                    <Text style={styles.statLabel}>Notices</Text>
                  </View>
                  <View style={[styles.statCard, { borderLeftColor: COLORS.green }]}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.green} />
                    <Text style={[styles.statNumber, { color: COLORS.green }]}>{timetables.length}</Text>
                    <Text style={styles.statLabel}>Exams</Text>
                  </View>
                </View>

                {/* School Info Card */}
                <View style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>School Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{school.name}</Text>
                  </View>
                  {school.code && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Code</Text>
                      <Text style={styles.infoValue}>{school.code}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Branding</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: school.primary_color }} />
                        <Text style={{ ...FONTS.small, color: COLORS.textMuted }}>Primary</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: school.accent_color }} />
                        <Text style={{ ...FONTS.small, color: COLORS.textMuted }}>Accent</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Created</Text>
                    <Text style={styles.infoValue}>{formatDate(school.created_at)}</Text>
                  </View>
                </View>

                {/* School Admins */}
                <View style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>School Administrators</Text>
                  {schoolAdmins.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="person-outline" size={24} color={COLORS.textMuted} />
                      <Text style={styles.emptyText}>No school administrators assigned</Text>
                    </View>
                  ) : (
                    schoolAdmins.map(admin => (
                      <View key={admin.id} style={styles.userRow}>
                        <View style={[styles.userAvatar, { backgroundColor: COLORS.gold + '15' }]}>
                          <Text style={{ ...FONTS.bodyBold, color: COLORS.gold }}>{admin.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{admin.name}</Text>
                          <Text style={styles.userEmail}>{admin.email}</Text>
                        </View>
                        <View style={[styles.rolePill, { backgroundColor: COLORS.gold + '15' }]}>
                          <Ionicons name="shield-half" size={12} color={COLORS.gold} />
                          <Text style={{ ...FONTS.small, color: COLORS.gold, fontWeight: '700' }}>School Admin</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* LEARNERS TAB */}
            {activeTab === 'learners' && (
              <View style={styles.tabSection}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search learners by name or email..."
                    placeholderTextColor={COLORS.textMuted}
                    value={learnerSearch}
                    onChangeText={setLearnerSearch}
                  />
                  {learnerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setLearnerSearch('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.countText}>
                  {filteredLearners.length} learner{filteredLearners.length !== 1 ? 's' : ''}{learnerSearch ? ' matching' : ''}
                </Text>

                {learners.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No learners enrolled</Text>
                    <Text style={styles.emptySubtext}>No students are currently linked to this school.</Text>
                  </View>
                ) : filteredLearners.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No results</Text>
                    <Text style={styles.emptySubtext}>No learners match "{learnerSearch}"</Text>
                  </View>
                ) : (
                  filteredLearners.map(u => (
                    <View key={u.id} style={styles.userCard}>
                      <View style={styles.userRow}>
                        <View style={[styles.userAvatar, { backgroundColor: primaryColor + '15' }]}>
                          <Text style={{ ...FONTS.bodyBold, color: primaryColor }}>{u.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{u.name}</Text>
                          <Text style={styles.userEmail}>{u.email}</Text>
                        </View>
                        <View style={[styles.rolePill, { backgroundColor: u.grade_level === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight }]}>
                          <Text style={{ ...FONTS.small, color: u.grade_level === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark, fontWeight: '700' }}>
                            {u.grade_level}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'teachers' && (
              <View style={styles.tabSection}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search teachers by name or email..."
                    placeholderTextColor={COLORS.textMuted}
                    value={teacherSearch}
                    onChangeText={setTeacherSearch}
                  />
                  {teacherSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setTeacherSearch('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.countText}>
                  {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''}{teacherSearch ? ' matching' : ''}
                </Text>

                {teachers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="briefcase-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No teachers registered</Text>
                    <Text style={styles.emptySubtext}>No teachers are currently linked to this school.</Text>
                  </View>
                ) : filteredTeachers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No results</Text>
                    <Text style={styles.emptySubtext}>No teachers match "{teacherSearch}"</Text>
                  </View>
                ) : (
                  filteredTeachers.map(u => (
                    <View key={u.id} style={styles.userCard}>
                      <View style={styles.userRow}>
                        <View style={[styles.userAvatar, { backgroundColor: accentColor + '15' }]}>
                          <Text style={{ ...FONTS.bodyBold, color: accentColor }}>{u.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{u.name}</Text>
                          <Text style={styles.userEmail}>{u.email}</Text>
                        </View>
                        {u.is_school_admin && (
                          <View style={[styles.rolePill, { backgroundColor: COLORS.gold + '15' }]}>
                            <Ionicons name="shield-half" size={12} color={COLORS.gold} />
                            <Text style={{ ...FONTS.small, color: COLORS.gold, fontWeight: '700' }}>Admin</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* CONTENT TAB */}
            {activeTab === 'content' && (
              <View style={styles.tabSection}>
                {/* Announcements Section */}
                <Text style={styles.sectionTitle}>Announcements</Text>
                {announcements.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="megaphone-outline" size={36} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No announcements</Text>
                    <Text style={styles.emptySubtext}>This school has no announcements yet.</Text>
                  </View>
                ) : (
                  announcements.map(ann => (
                    <View key={ann.id} style={[styles.contentCard, ann.is_urgent && { borderLeftWidth: 3, borderLeftColor: COLORS.red }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs, flexWrap: 'wrap' }}>
                        <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
                          <Text style={[styles.badgeText, { color: primaryColor }]}>School</Text>
                        </View>
                        {ann.is_urgent && (
                          <View style={[styles.badge, { backgroundColor: COLORS.redLight }]}>
                            <Text style={[styles.badgeText, { color: COLORS.red }]}>URGENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contentTitle}>{ann.title}</Text>
                      <Text style={styles.contentBody} numberOfLines={4}>{ann.content}</Text>
                      <Text style={styles.contentDate}>{formatDate(ann.created_at)}</Text>
                    </View>
                  ))
                )}

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg }} />

                {/* Timetables Section */}
                <Text style={styles.sectionTitle}>Exam Timetables</Text>
                {timetables.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No timetable entries</Text>
                    <Text style={styles.emptySubtext}>This school has no exam timetable entries yet.</Text>
                  </View>
                ) : (
                  timetables.map(exam => {
                    const examDate = new Date(exam.exam_date);
                    const isPast = examDate < new Date();
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  adminBadgeText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '700',
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
  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '700',
  },
  tabsRow: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    ...SHADOWS.sm,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  userName: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  userEmail: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  countText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
  },
  contentCard: {
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
  contentTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  contentBody: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  contentDate: {
    ...FONTS.small,
    color: COLORS.textMuted,
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
    width: 56,
    height: 64,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examDateMonth: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  examDateDay: {
    fontSize: 22,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    ...FONTS.small,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
  },
  retryBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
});
