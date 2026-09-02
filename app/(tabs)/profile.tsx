import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthModal from '@/components/AuthModal';
import UpgradeModal from '@/components/UpgradeModal';
import * as ImagePicker from 'expo-image-picker';
import AdminDashboard from '@/components/AdminDashboard';

interface Payment {
  id: string;
  reference_number: string;
  amount: number;
  status: string | null;
  created_at: string | null;
}

export default function ProfileScreen() {
  const { user, isPro, isAdmin, onlineUsersCount, logout, refreshUser, updateProfile } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showAdminDashboard = isAdmin || user?.is_school_admin;
  
  const [authVisible, setAuthVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'details'>('activity');
  const [stats, setStats] = useState({ subjects: 0, notesRead: 0 });

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchStats();
      refreshUser();
    }
  }, [user?.id]);

  const fetchPayments = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setPayments(data);
    } catch { }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const { count: sCount } = await supabase.from('student_subjects').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { data: nData } = await supabase.from('student_content_progress').select('progress_percent').eq('user_id', user.id);
      let readCount = 0;
      if (nData) readCount = nData.filter(d => d.progress_percent >= 90).length;
      setStats({ subjects: sCount || 0, notesRead: readCount });
    } catch { }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      const success = await updateProfile({ avatar_file: { uri, type, name: filename } });
      if (success) {
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload profile picture.');
      }
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.notLoggedInTitle}>Sign In to Continue</Text>
          <Text style={styles.notLoggedInText}>Create a free account to track your progress and access premium features.</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => setAuthVisible(true)} activeOpacity={0.8}>
            <Ionicons name="log-in" size={20} color={COLORS.white} />
            <Text style={styles.signInBtnText}>Sign In / Sign Up</Text>
          </TouchableOpacity>
        </View>
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      </View>
    );
  }

  const daysUntilExpiry = user.expiry_date
    ? Math.max(0, Math.ceil((new Date(user.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const pendingPayment = payments.find(p => p.status === 'pending');

  const activityItems = [
    { icon: 'stats-chart-outline', label: 'My Performance', route: '/(tabs)/analytics', color: COLORS.primary },
    { icon: 'pulse-outline', label: 'Strengths & Weaknesses', route: '/strengths', color: COLORS.red },
    { icon: 'bookmark-outline', label: 'Saved Items', route: '/(tabs)/bookmarks', color: COLORS.gold },
    { icon: 'card-outline', label: 'Payment & Billing', route: '/payment', color: COLORS.green },
  ];

  return (
    <View style={styles.container}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        
        <View style={styles.profileSummary}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={12} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: isPro ? COLORS.goldLight : COLORS.surfaceAlt }]}>
                <Ionicons name={isPro ? 'diamond' : 'person'} size={12} color={isPro ? COLORS.goldDark : COLORS.textMuted} />
                <Text style={[styles.tagText, { color: isPro ? COLORS.goldDark : COLORS.textMuted }]}>{isPro ? 'Pro' : 'Free'}</Text>
              </View>
              {isAdmin && (
                <View style={[styles.tag, { backgroundColor: '#E5E4E2' }]}>
                  <Text style={[styles.tagText, { color: '#6B7A85' }]}>Admin</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.subjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.notesRead}</Text>
            <Text style={styles.statLabel}>Notes Read</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.grade_level || '-'}</Text>
            <Text style={styles.statLabel}>Grade</Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'activity' && styles.segmentActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.segmentText, activeTab === 'activity' && styles.segmentTextActive]}>My Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'details' && styles.segmentActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.segmentText, activeTab === 'details' && styles.segmentTextActive]}>My Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Pending Payment Alert */}
        {pendingPayment && !isPro && (
          <TouchableOpacity style={styles.pendingAlert} onPress={() => router.push('/payment')}>
            <Ionicons name="time" size={24} color={COLORS.gold} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.pendingAlertTitle}>Payment Pending</Text>
              <Text style={styles.pendingAlertSub}>Ref: {pendingPayment.reference_number}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.goldDark} />
          </TouchableOpacity>
        )}

        {/* ─── Activity Tab ─────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Dashboard</Text>
            <View style={styles.menuCard}>
              {activityItems.map((item, index) => (
                <View key={index}>
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  {index < activityItems.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
            
            {showAdminDashboard && (
              <View style={{ marginTop: SPACING.lg }}>
                <AdminDashboard onlineUsersCount={onlineUsersCount} />
              </View>
            )}
          </View>
        )}

        {/* ─── Details Tab ──────────────────────────────────────── */}
        {activeTab === 'details' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{user.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{user.email}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>School</Text>
                <Text style={styles.detailValue}>{user.school || 'Not set'}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
                <Text style={[styles.menuItemText, { color: COLORS.primary }]}>Edit Profile</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.menuCard}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Current Plan</Text>
                <Text style={[styles.detailValue, isPro && { color: COLORS.goldDark, fontWeight: '700' }]}>
                  {isPro ? 'Pro Subscription' : 'Free Basic'}
                </Text>
              </View>
              {isPro && daysUntilExpiry !== null && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>
                      {daysUntilExpiry > 0 ? `Active (${daysUntilExpiry} days left)` : 'Expired'}
                    </Text>
                  </View>
                </>
              )}
              {!isPro && (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/payment')}>
                    <Text style={[styles.menuItemText, { color: COLORS.goldDark, fontWeight: '700' }]}>Upgrade to Pro</Text>
                    <Ionicons name="diamond" size={18} color={COLORS.goldDark} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={() => Alert.alert('Sign Out', 'Are you sure you want to log out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }])}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  profileName: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  profileEmail: {
    ...FONTS.small,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  segmentText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },

  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: SPACING.xl,
  },
  sectionTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Menus
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuItemText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: SPACING.xl + 28,
  },
  
  // Details
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  detailLabel: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Extras
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    margin: SPACING.xl,
    marginBottom: 0,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingAlertTitle: {
    ...FONTS.bodyBold,
    color: COLORS.goldDark,
  },
  pendingAlertSub: {
    ...FONTS.small,
    color: COLORS.goldDark,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.redLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.red + '30',
  },
  logoutText: {
    ...FONTS.bodyBold,
    color: COLORS.red,
  },

  // Auth
  notLoggedIn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxxl, paddingBottom: 100 },
  notLoggedInTitle: { ...FONTS.h2, color: COLORS.textPrimary, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  notLoggedInText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl },
  signInBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxxl, paddingVertical: 16, borderRadius: RADIUS.md, ...SHADOWS.lg },
  signInBtnText: { ...FONTS.h3, color: COLORS.white },
});