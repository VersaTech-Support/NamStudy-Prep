import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, isVIP, streak } = useUser();
  const router = useRouter();
  const [authVisible, setAuthVisible] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);

  // Exam Countdown (Assume Nov 1st of current year)
  const calculateDaysToExam = () => {
    const today = new Date();
    let examDate = new Date(today.getFullYear(), 10, 1); // Nov 1st (0-indexed month 10)
    if (today > examDate) {
      examDate = new Date(today.getFullYear() + 1, 10, 1);
    }
    const diffTime = Math.abs(examDate.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysToExam = calculateDaysToExam();

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    const { count: pCount } = await supabase.from('papers').select('*', { count: 'exact', head: true });
    const { count: qCount } = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
    const { count: sCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: tCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
    
    if (pCount) setPaperCount(pCount);
    if (qCount) setQuizCount(qCount);
    if (sCount) setStudentCount(sCount);
    if (tCount) setTeacherCount(tCount);
  };

  const stats = [
    { icon: 'document-text', label: 'Past Papers', value: `${paperCount}+`, color: COLORS.green },
    { icon: 'help-circle', label: 'Quiz Questions', value: `${quizCount}+`, color: COLORS.accent },
    { icon: 'people', label: 'Students', value: `${studentCount}`, color: COLORS.primary },
    { icon: 'briefcase', label: 'Teachers', value: `${teacherCount}`, color: COLORS.gold },
  ];

  const features = [
    {
      icon: 'albums',
      title: 'Revision Flashcards',
      description: 'Active recall study cards tailored to your selected subjects.',
      color: COLORS.primary,
      bg: COLORS.primaryLight + '30',
      action: () => router.push('/flashcards'),
    },
    {
      icon: 'bookmark',
      title: 'Saved Items',
      description: 'Quickly access all your bookmarked papers and quizzes.',
      color: COLORS.gold,
      bg: COLORS.goldLight,
      action: () => router.push('/bookmarks'),
    },
    {
      icon: 'document-text',
      title: 'Free Past Papers',
      description: 'Access all NSSCO & NSSCAS past exam papers from 2019-2024 completely free.',
      color: COLORS.green,
      bg: COLORS.greenLight,
      action: () => router.push('/papers'),
    },
    {
      icon: 'key',
      title: 'Golden Memos',
      description: 'Detailed step-by-step worked solutions to every exam paper. VIP only.',
      color: COLORS.gold,
      bg: COLORS.goldLight,
      action: () => router.push('/papers'),
      premium: true,
    },
    {
      icon: 'help-circle',
      title: 'Topic Quizzes',
      description: 'Practice with targeted quizzes on Algebra, Geometry, Calculus & more.',
      color: COLORS.accent,
      bg: '#DBEAFE',
      action: () => router.push('/quizzes'),
    },
    {
      icon: 'analytics',
      title: 'Track Progress',
      description: 'Monitor your performance and see which topics need more practice.',
      color: COLORS.primary,
      bg: '#EDE9FE',
      action: () => router.push('/analytics'),
    },
  ];



  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroOverlay}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={styles.logoRow}>
                <View style={styles.logoIcon}>
                  <Ionicons name="book" size={20} color={COLORS.white} />
                </View>
                <Text style={styles.logoText}>NamStudy Prep</Text>
              </View>
              {user ? (
                <View style={styles.userBadge}>
                  <Ionicons name="person-circle" size={20} color={COLORS.white} />
                  <Text style={styles.userName}>{user.name.split(' ')[0]}</Text>
                  {isVIP && (
                    <View style={styles.vipTag}>
                      <Text style={styles.vipTagText}>VIP</Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.signInBtn} onPress={() => setAuthVisible(true)}>
                  <Ionicons name="log-in" size={18} color={COLORS.white} />
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="star" size={12} color={COLORS.gold} />
                <Text style={styles.heroBadgeText}>Namibia's #1 Study Prep App</Text>
              </View>
              <Text style={styles.heroTitle}>Master NSSCO{'\n'}& NSSCAS Exams</Text>
              <Text style={styles.heroSubtitle}>
                Free past papers, step-by-step solutions, and topic quizzes to ace your subjects.
              </Text>

              <View style={styles.heroBtnRow}>
                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={() => router.push('/papers')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text" size={18} color={COLORS.primary} />
                  <Text style={styles.primaryBtnText}>Browse Free Papers</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryBtn} 
                  onPress={() => router.push('/quizzes')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={18} color={COLORS.white} />
                  <Text style={styles.secondaryBtnText}>Start Quiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Streak & Countdown Widget */}
        <View style={styles.widgetContainer}>
          <View style={styles.widgetCard}>
            <View style={styles.widgetItem}>
              <View style={[styles.widgetIconBg, { backgroundColor: COLORS.gold + '20' }]}>
                <Ionicons name="flame" size={24} color={COLORS.gold} />
              </View>
              <View>
                <Text style={styles.widgetValue}>{streak} {streak === 1 ? 'Day' : 'Days'}</Text>
                <Text style={styles.widgetLabel}>Study Streak</Text>
              </View>
            </View>
            <View style={styles.widgetDivider} />
            <View style={styles.widgetItem}>
              <View style={[styles.widgetIconBg, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="calendar" size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.widgetValue}>{daysToExam} Days</Text>
                <Text style={styles.widgetLabel}>Until Exams</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Tutor Banner */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.aiTutorBanner, { opacity: 0.6 }]} 
            onPress={() => router.push('/tutor')}
            activeOpacity={1}
            disabled={true}
          >
            <View style={styles.aiTutorContent}>
              <View style={styles.aiTutorHeader}>
                <Ionicons name="time" size={18} color={COLORS.gold} />
                <Text style={[styles.aiTutorTag, { color: COLORS.gold }]}>COMING SOON</Text>
              </View>
              <Text style={styles.aiTutorTitle}>Ask NamTutor AI</Text>
              <Text style={styles.aiTutorDesc}>Get 24/7 instant help with past papers, topics, and study tips.</Text>
            </View>
            <View style={styles.aiTutorIconContainer}>
              <Ionicons name="chatbubbles" size={32} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Everything You Need</Text>
          <Text style={styles.sectionSubtitle}>All the tools to prepare for your exams</Text>

          {features.map((feature, i) => (
            <TouchableOpacity key={i} style={styles.featureCard} onPress={feature.action} activeOpacity={0.7}>
              <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
                <Ionicons name={feature.icon as any} size={24} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  {feature.premium && (
                    <View style={styles.premiumTag}>
                      <Ionicons name="diamond" size={10} color={COLORS.gold} />
                      <Text style={styles.premiumTagText}>VIP</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Grade Levels */}
        {!user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Level</Text>
            <Text style={styles.sectionSubtitle}>Content tailored to your curriculum</Text>

            <View style={styles.gradeCards}>
              <TouchableOpacity 
                style={[styles.gradeCard, { borderColor: COLORS.green }]} 
                onPress={() => router.push('/papers')}
                activeOpacity={0.7}
              >
                <View style={[styles.gradeIconBg, { backgroundColor: COLORS.greenLight }]}>
                  <Ionicons name="school" size={28} color={COLORS.green} />
                </View>
                <Text style={styles.gradeCardTitle}>NSSCO</Text>
                <Text style={styles.gradeCardSub}>Grade 10-11</Text>
                <View style={styles.gradeTopics}>
                  <Text style={styles.gradeTopicText}>Algebra, Geometry, Statistics, Number, Trigonometry, Probability</Text>
                </View>
                <View style={[styles.gradeBtn, { backgroundColor: COLORS.green }]}>
                  <Text style={styles.gradeBtnText}>View Papers</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.gradeCard, { borderColor: COLORS.gold }]} 
                onPress={() => router.push('/papers')}
                activeOpacity={0.7}
              >
                <View style={[styles.gradeIconBg, { backgroundColor: COLORS.goldLight }]}>
                  <Ionicons name="ribbon" size={28} color={COLORS.gold} />
                </View>
                <Text style={styles.gradeCardTitle}>NSSCAS</Text>
                <Text style={styles.gradeCardSub}>Grade 12</Text>
                <View style={styles.gradeTopics}>
                  <Text style={styles.gradeTopicText}>Calculus, Vectors, Functions, Matrices, Sequences, Probability</Text>
                </View>
                <View style={[styles.gradeBtn, { backgroundColor: COLORS.gold }]}>
                  <Text style={styles.gradeBtnText}>View Papers</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}



        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaIcon}>
            <Ionicons name="rocket" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.ctaTitle}>Ready to Ace Your Exams?</Text>
          <Text style={styles.ctaSubtitle}>
            Start with free past papers or upgrade to VIP for complete solutions and unlimited quizzes.
          </Text>
          <TouchableOpacity 
            style={styles.ctaBtn} 
            onPress={() => user ? router.push('/papers') : setAuthVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaBtnText}>
              {user ? 'Go to Papers' : 'Get Started Free'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="book" size={18} color={COLORS.textMuted} />
            <Text style={styles.footerLogoText}>NamStudy Prep</Text>
          </View>
          <Text style={styles.footerText}>Your Path to Exam Success</Text>
          <Text style={styles.footerCopy}>Made with dedication for Namibian students</Text>
          <Text style={styles.footerCopy}>2026 NamStudy Prep. All rights reserved.</Text>
        </View>
      </ScrollView>

      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    minHeight: 420,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(88, 28, 135, 0.85)',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  userName: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  vipTag: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  signInText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  heroBadgeText: {
    ...FONTS.small,
    color: COLORS.goldLight,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: SPACING.md,
  },
  heroSubtitle: {
    ...FONTS.body,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    ...SHADOWS.lg,
  },
  primaryBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  
  // Widget Styles
  widgetContainer: {
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.xl, // Pull it up to overlap hero
    marginBottom: SPACING.lg,
    zIndex: 10,
  },
  widgetCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
    alignItems: 'center',
  },
  widgetItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  widgetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetValue: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  widgetLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  widgetDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.borderLight,
  },
  // Stats
  statsContainer: {
    marginTop: -20,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
  },
  statLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxxl,
  },
  sectionTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  
  // AI Tutor Banner
  aiTutorBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  aiTutorContent: {
    flex: 1,
    paddingRight: SPACING.lg,
  },
  aiTutorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  aiTutorTag: {
    ...FONTS.caption,
    color: COLORS.gold,
    fontWeight: '800',
    letterSpacing: 1,
  },
  aiTutorTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  aiTutorDesc: {
    ...FONTS.small,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  aiTutorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  // Features
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  featureTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  featureDesc: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  // Grade Cards
  gradeCards: {
    gap: SPACING.md,
  },
  gradeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 2,
    ...SHADOWS.md,
  },
  gradeIconBg: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  gradeCardTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  gradeCardSub: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  gradeTopics: {
    marginBottom: SPACING.lg,
  },
  gradeTopicText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  gradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  gradeBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },

  // CTA
  ctaSection: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
    ...SHADOWS.xl,
  },
  ctaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  ctaTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  ctaSubtitle: {
    ...FONTS.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  ctaBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerLogoText: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  footerText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  footerCopy: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
});
