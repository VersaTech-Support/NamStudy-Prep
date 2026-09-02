import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export default function EditProfileScreen() {
  const { user, updateProfile, updatePassword } = useUser();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [school, setSchool] = useState(user?.school || '');
  const [gradeLevel, setGradeLevel] = useState<'NSSCO' | 'NSSCAS' | 'IGCSE' | 'AS Level'>(user?.grade_level || 'NSSCO');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      const profileSuccess = await updateProfile({
        name: name.trim(),
        grade_level: gradeLevel,
        school: school.trim(),
      });

      if (!profileSuccess) {
        Alert.alert('Error', 'Failed to update profile information.');
        setLoading(false);
        return;
      }

      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match.');
          setLoading(false);
          return;
        }

        const pwdResult = await updatePassword(newPassword);
        if (!pwdResult.success) {
          Alert.alert('Password Error', pwdResult.error || 'Failed to update password.');
          setLoading(false);
          return;
        }
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Update your personal details</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
            <Text style={styles.label}>School Name (Locked)</Text>
            {Boolean(school) && !user?.school_id && (
              <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>PENDING APPROVAL</Text>
              </View>
            )}
          </View>
          <View style={[styles.inputContainer, { backgroundColor: COLORS.surfaceAlt }]}>
            <Ionicons name="school-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={[styles.input, { color: COLORS.textMuted }]}
              value={school}
              editable={false}
              placeholder="Not linked to a school"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <Text style={styles.label}>Email Address (Locked)</Text>
          <View style={[styles.inputContainer, { backgroundColor: COLORS.surfaceAlt }]}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={[styles.input, { color: COLORS.textMuted }]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <Text style={styles.label}>Curriculum / Grade Level</Text>
          <View style={styles.gradeSelectorContainer}>
            <TouchableOpacity
              style={[styles.gradeBtn, gradeLevel === 'NSSCO' && styles.gradeBtnActiveNSSCO]}
              onPress={() => setGradeLevel('NSSCO')}
            >
              <Text style={[styles.gradeBtnText, gradeLevel === 'NSSCO' && styles.gradeBtnTextActive]}>
                NSSCO (Gr 10-11)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gradeBtn, gradeLevel === 'NSSCAS' && styles.gradeBtnActiveNSSCAS]}
              onPress={() => setGradeLevel('NSSCAS')}
            >
              <Text style={[styles.gradeBtnText, gradeLevel === 'NSSCAS' && styles.gradeBtnTextActive]}>
                NSSCAS (Gr 12)
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.gradeSelectorContainer, { marginTop: SPACING.sm }]}>
            <TouchableOpacity
              style={[styles.gradeBtn, gradeLevel === 'IGCSE' && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}
              onPress={() => setGradeLevel('IGCSE')}
            >
              <Text style={[styles.gradeBtnText, gradeLevel === 'IGCSE' && styles.gradeBtnTextActive]}>
                IGCSE (Cambridge)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gradeBtn, gradeLevel === 'AS Level' && { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark }]}
              onPress={() => setGradeLevel('AS Level')}
            >
              <Text style={[styles.gradeBtnText, gradeLevel === 'AS Level' && styles.gradeBtnTextActive]}>
                AS Level (Cambridge)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: SPACING.xl }]}>Change Password (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (leave blank to keep current)"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginBottom: 2 },
  headerSubtitle: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)' },
  scrollView: { flex: 1 },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    ...SHADOWS.md,
  },
  label: { ...FONTS.caption, color: COLORS.textSecondary, fontWeight: '700', marginBottom: SPACING.xs, marginTop: SPACING.md },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  input: { flex: 1, ...FONTS.body, color: COLORS.textPrimary },
  gradeSelectorContainer: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  gradeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradeBtnActiveNSSCO: { backgroundColor: COLORS.greenLight, borderColor: COLORS.green },
  gradeBtnActiveNSSCAS: { backgroundColor: COLORS.goldLight, borderColor: COLORS.gold },
  gradeBtnText: { ...FONTS.caption, color: COLORS.textSecondary, fontWeight: '600' },
  gradeBtnTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.xxl,
    ...SHADOWS.md,
  },
  saveBtnText: { ...FONTS.h3, color: COLORS.white },
});