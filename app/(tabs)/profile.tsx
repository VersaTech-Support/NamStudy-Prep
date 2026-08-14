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
import AuthModal from '@/components/AuthModal';
import UpgradeModal from '@/components/UpgradeModal';
import * as ImagePicker from 'expo-image-picker';
import AdminDashboard from '@/components/AdminDashboard';

interface Payment {
  id: string;
  reference_number: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string;
  created_at: string;
  admin_note: string | null;
}

export default function ProfileScreen() {
  const { user, isPro, isAdmin, onlineUsersCount, logout, refreshUser, updateProfile } = useUser();
  const router = useRouter();
  const showAdminDashboard = isAdmin || user?.is_school_admin;
  const [authVisible, setAuthVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (user) {
      fetchPayments();
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

  const getStatusColor = (s: string) => s === 'pending' ? COLORS.gold : s === 'approved' ? COLORS.green : COLORS.red;
  const getStatusBg = (s: string) => s === 'pending' ? COLORS.goldLight : s === 'approved' ? COLORS.greenLight : COLORS.redLight;
  const getStatusIcon = (s: string): any => s === 'pending' ? 'time' : s === 'approved' ? 'checkmark-circle' : 'close-circle';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account</Text>
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
  const menuItems = [
    { icon: 'create', label: 'Edit Profile', color: COLORS.primary, onPress: () => router.push('/edit-profile') },
    { icon: 'bookmark', label: 'My Saved Items', color: COLORS.gold, onPress: () => router.push('/bookmarks') },
    { icon: 'albums', label: 'Revision Flashcards', color: COLORS.primary, onPress: () => router.push('/flashcards') },
    { icon: 'stats-chart', label: 'My Performance', color: COLORS.green, onPress: () => router.push('/analytics') },
    { icon: 'document-text', label: 'My Papers', color: COLORS.green, onPress: () => router.push('/papers') },
    { icon: 'help-circle', label: 'My Quizzes', color: COLORS.accent, onPress: () => router.push('/quizzes') },
    { icon: 'card', label: 'Payment & Billing', color: COLORS.gold, onPress: () => router.push('/payment') },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Card */}
        <View style={[styles.profileCard, isAdmin && { borderColor: '#E5E4E2', borderWidth: 2, backgroundColor: '#fdfdfd' }]}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative', marginBottom: SPACING.md }} activeOpacity={0.9}>
            <View style={[styles.avatar, isAdmin && { backgroundColor: '#8A9EA7' }]}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} />
              ) : (
                <Text style={styles.avatarText}>{user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
              )}
            </View>
            <View style={[styles.cameraOverlay, showAdminDashboard && { backgroundColor: '#8A9EA7', borderColor: '#fdfdfd' }]}>
              <Ionicons name="camera" size={12} color={COLORS.white} />
            </View>
            {isPro === true && !showAdminDashboard && <View style={styles.vipBadgeSmall}><Ionicons name="diamond" size={12} color={COLORS.white} /></View>}
            {showAdminDashboard && <View style={[styles.vipBadgeSmall, { backgroundColor: '#A0B2C6' }]}><Ionicons name="shield" size={12} color={COLORS.white} /></View>}
          </TouchableOpacity>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>{user.email}</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {isAdmin ? (
              <View style={[styles.profileTag, { backgroundColor: '#E5E4E2' }]}>
                <Ionicons name="shield-checkmark" size={12} color={'#6B7A85'} />
                <Text style={[styles.profileTagText, { color: '#6B7A85' }]}>Super Admin</Text>
              </View>
            ) : user.is_school_admin ? (
              <View style={[styles.profileTag, { backgroundColor: '#E5E4E2' }]}>
                <Ionicons name="shield-half" size={12} color={'#6B7A85'} />
                <Text style={[styles.profileTagText, { color: '#6B7A85' }]}>School Admin</Text>
              </View>
            ) : user.role === 'teacher' ? (
              <View style={[styles.profileTag, { backgroundColor: COLORS.accentLight }]}>
                <Ionicons name="briefcase" size={12} color={COLORS.accent} />
                <Text style={[styles.profileTagText, { color: COLORS.accent }]}>Teacher</Text>
              </View>
            ) : (
              <View style={[styles.profileTag, { backgroundColor: user.grade_level === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight }]}>
                <Text style={[styles.profileTagText, { color: user.grade_level === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark }]}>{user.grade_level}</Text>
              </View>
            )}
            
            {!showAdminDashboard && (
              <View style={[styles.profileTag, { backgroundColor: isPro === true ? COLORS.goldLight : COLORS.surfaceAlt }]}>
                <Ionicons name={isPro === true ? 'diamond' : 'person'} size={12} color={isPro === true ? COLORS.gold : COLORS.textMuted} />
                <Text style={[styles.profileTagText, { color: isPro === true ? COLORS.goldDark : COLORS.textMuted }]}>{isPro === true ? 'Pro Plan' : 'Free Plan'}</Text>
              </View>
            )}
          </View>
          
          {Boolean(user.school) && (
            <View style={{ marginTop: SPACING.md, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
              <Ionicons name="school" size={14} color={COLORS.textSecondary} style={{ marginRight: SPACING.xs }} />
              <Text style={{ ...FONTS.caption, color: COLORS.textSecondary, marginRight: SPACING.xs }}>{user.school}</Text>
              {user.school_locked && <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />}
              {!user.school_id && (
                <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.white }}>PENDING</Text>
                </View>
              )}
            </View>
          )}
          {user.school_locked && (
            <Text style={{ ...FONTS.small, color: COLORS.textMuted, marginTop: SPACING.xs, textAlign: 'center', opacity: 0.7 }}>
              School is locked. Contact admin to change.
            </Text>
          )}
        </View>

        {/* Pending Payment Banner */}
        {pendingPayment && !isPro && (
          <TouchableOpacity style={styles.pendingBanner} onPress={() => router.push('/payment')} activeOpacity={0.8}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
              <Ionicons name="time" size={20} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...FONTS.caption, color: COLORS.goldDark, fontWeight: '700' }}>Payment Pending Verification</Text>
              <Text style={{ ...FONTS.small, color: COLORS.goldDark }}>Ref: {pendingPayment.reference_number}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.goldDark} />
          </TouchableOpacity>
        )}

        {/* Quick Access Menu — visible for ALL authenticated users */}
        <View style={{ marginHorizontal: SPACING.xl, marginTop: SPACING.xxl }}>
          <Text style={{ ...FONTS.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md }}>Quick Access</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
              <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary, flex: 1 }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscription — hidden for admins */}
        {isPro === true && !showAdminDashboard ? (
          <View style={styles.subscriptionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <View style={{ width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
                <Ionicons name="diamond" size={24} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}><Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>Pro Subscription</Text><Text style={{ ...FONTS.small, color: COLORS.green }}>Active</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green }} /><Text style={{ ...FONTS.small, color: COLORS.green, fontWeight: '700' }}>Active</Text></View>
            </View>
            {daysUntilExpiry !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.goldLight, padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.md }}>
                <Ionicons name="time" size={14} color={COLORS.goldDark} />
                <Text style={{ ...FONTS.caption, color: COLORS.goldDark }}>{daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Subscription expired'}</Text>
              </View>
            )}
            {['Step-by-step solutions', 'Unlimited quizzes', 'Performance tracking'].map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                <Text style={{ ...FONTS.caption, color: COLORS.textSecondary }}>{f}</Text>
              </View>
            ))}
          </View>
        ) : !pendingPayment && !showAdminDashboard ? (
          <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/payment')} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
              <View style={{ width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md }}>
                <Ionicons name="diamond" size={28} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}><Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>Upgrade to Pro</Text><Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>Get solutions & unlimited quizzes</Text></View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.goldLight, padding: SPACING.md, borderRadius: RADIUS.sm }}>
              <Text style={{ ...FONTS.caption, color: COLORS.goldDark, fontWeight: '700' }}>From N$60/month via FNB Transfer</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.gold} />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Admin Dashboard */}
        {showAdminDashboard && <AdminDashboard onlineUsersCount={onlineUsersCount} />}

        {/* Recent Payments for Consumers */}
        {payments.length > 0 && !showAdminDashboard && (
          <View style={{ marginHorizontal: SPACING.xl, marginTop: SPACING.xxl }}>
            <Text style={{ ...FONTS.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md }}>Recent Payments</Text>
            {payments.slice(0, 3).map((p) => (
              <View key={p.id} style={styles.menuItem}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getStatusColor(p.status), marginRight: SPACING.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...FONTS.caption, color: COLORS.textPrimary, fontWeight: '600', fontSize: 12 }}>{p.reference_number}</Text>
                  <Text style={{ ...FONTS.small, color: COLORS.textMuted }}>{formatDate(p.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(p.status) }]}>
                  <Ionicons name={getStatusIcon(p.status)} size={12} color={getStatusColor(p.status)} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: getStatusColor(p.status) }}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Text>
                </View>
                <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary, fontSize: 13, marginLeft: SPACING.sm }}>N${p.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }])} activeOpacity={0.7}>
          <Ionicons name="log-out" size={20} color={COLORS.red} />
          <Text style={{ ...FONTS.bodyBold, color: COLORS.red }}>Sign Out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginBottom: 2 },
  headerSubtitle: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)' },
  scrollView: { flex: 1 },
  notLoggedIn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxxl, paddingBottom: 100 },
  notLoggedInTitle: { ...FONTS.h2, color: COLORS.textPrimary, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  notLoggedInText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl },
  signInBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxxl, paddingVertical: 16, borderRadius: RADIUS.md, ...SHADOWS.lg },
  signInBtnText: { ...FONTS.h3, color: COLORS.white },
  profileCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.xl, marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.xxl, alignItems: 'center', ...SHADOWS.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  vipBadgeSmall: { position: 'absolute', bottom: 0, left: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  profileName: { ...FONTS.h2, color: COLORS.textPrimary, marginBottom: 2 },
  profileTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  profileTagText: { ...FONTS.small, fontWeight: '700' },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.goldLight, marginHorizontal: SPACING.xl, marginTop: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gold + '40' },
  subscriptionCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.xl, marginTop: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.md, borderWidth: 1.5, borderColor: COLORS.gold + '40' },
  upgradeCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.xl, marginTop: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.md, borderWidth: 2, borderColor: COLORS.gold, borderStyle: 'dashed' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.sm },
  menuIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, marginRight: SPACING.sm },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.xl, marginTop: SPACING.xxl, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.redLight, borderWidth: 1, borderColor: COLORS.red + '30' },
});