import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const { login, signup } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Added Password state
  const [showPassword, setShowPassword] = useState(false); // Toggle visibility
  const [gradeLevel, setGradeLevel] = useState<'NSSCO' | 'NSSCAS'>('NSSCO');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [schools, setSchools] = useState<{ id: string; name: string; logo_url?: string }[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [customSchoolName, setCustomSchoolName] = useState('');

  useEffect(() => {
    if (visible && !isLogin) {
      supabase.from('schools').select('id, name, logo_url').order('name').then(({ data }) => {
        if (data) setSchools(data);
      });
    }
  }, [visible, isLogin]);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Passing password to login function
        const success = await login(email, password);
        if (success) {
          onClose();
          resetForm();
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // Passing password to signup function
        const finalSchoolName = schoolId === 'other' ? customSchoolName.trim() || null : null;
        const finalSchoolId = schoolId === 'other' ? null : schoolId;
        const success = await signup(name, email, password, gradeLevel, role, finalSchoolId, finalSchoolName);
        if (success) {
          setShowOtp(true);
          setError('');
        } else {
          setError('Email already exists or signup failed. Try logging in.');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setError('Please enter the valid 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (verifyError) {
        setError(verifyError.message);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const finalSchoolName = schoolId === 'other' ? customSchoolName.trim() || null : null;
          const finalSchoolId = schoolId === 'other' ? null : schoolId;
          await supabase.from('users').update({
            school: finalSchoolName,
            school_id: finalSchoolId,
            school_locked: !!finalSchoolId
          }).eq('id', session.user.id);
        }
        onClose();
        resetForm();
      }
    } catch {
      setError('Verification failed. Please try again.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setOtpCode('');
    setShowOtp(false);
    setShowPassword(false);
    setGradeLevel('NSSCO');
    setRole('student');
    setSchoolId(null);
    setCustomSchoolName('');
    setSchoolSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerIcon}>
              <Ionicons name={showOtp ? "mail-open" : "school"} size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>
              {showOtp ? 'Verify Your Email' : isLogin ? 'Welcome Back!' : 'Join NamStudy Prep'}
            </Text>
            <Text style={styles.subtitle}>
              {showOtp 
                ? `We sent a 6-digit code to ${email}`
                : isLogin 
                  ? 'Sign in to access your papers and quizzes' 
                  : 'Create a free account to start your exam prep'}
            </Text>

            {/* Error Box */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* OTP VERIFICATION VIEW */}
            {showOtp ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="keypad" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={COLORS.textMuted}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                      <Text style={styles.submitBtnText}>Verify & Continue</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.toggleRow} 
                  onPress={() => setShowOtp(false)}
                >
                  <Text style={styles.toggleText}>Typo in your email? </Text>
                  <Text style={styles.toggleLink}>Go back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* STANDARD LOGIN / SIGNUP VIEW */
              <View>
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>I am a...</Text>
                    <View style={styles.roleToggle}>
                      <TouchableOpacity
                        style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
                        onPress={() => setRole('student')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="school-outline" size={18} color={role === 'student' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>Student</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.roleBtn, role === 'teacher' && styles.roleBtnActive]}
                        onPress={() => setRole('teacher')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="briefcase-outline" size={18} color={role === 'teacher' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.roleBtnText, role === 'teacher' && styles.roleBtnTextActive]}>Teacher</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor={COLORS.textMuted}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor={COLORS.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={COLORS.textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Grade Level (Signup Only, Students Only) */}
                {!isLogin && role === 'student' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Grade Level</Text>
                    <View style={styles.gradeRow}>
                      <TouchableOpacity
                        style={[styles.gradeOption, gradeLevel === 'NSSCO' && styles.gradeOptionActive]}
                        onPress={() => setGradeLevel('NSSCO')}
                      >
                        <Ionicons 
                          name={gradeLevel === 'NSSCO' ? 'radio-button-on' : 'radio-button-off'} 
                          size={20} 
                          color={gradeLevel === 'NSSCO' ? COLORS.primary : COLORS.textMuted} 
                        />
                        <View>
                          <Text style={[styles.gradeTitle, gradeLevel === 'NSSCO' && styles.gradeTitleActive]}>
                            NSSCO
                          </Text>
                          <Text style={styles.gradeSubtitle}>Grade 10-11</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gradeOption, gradeLevel === 'NSSCAS' && styles.gradeOptionActive]}
                        onPress={() => setGradeLevel('NSSCAS')}
                      >
                        <Ionicons 
                          name={gradeLevel === 'NSSCAS' ? 'radio-button-on' : 'radio-button-off'} 
                          size={20} 
                          color={gradeLevel === 'NSSCAS' ? COLORS.primary : COLORS.textMuted} 
                        />
                        <View>
                          <Text style={[styles.gradeTitle, gradeLevel === 'NSSCAS' && styles.gradeTitleActive]}>
                            NSSCAS
                          </Text>
                          <Text style={styles.gradeSubtitle}>Grade 12</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* School Selection (Signup Only) */}
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Your School</Text>
                    <View style={{ gap: SPACING.xs }}>
                      {/* Search Input */}
                      <View style={[styles.inputContainer, { marginBottom: SPACING.xs, backgroundColor: COLORS.surfaceAlt }]}>
                        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
                        <TextInput
                          style={[styles.input, { color: COLORS.textPrimary }]}
                          placeholder="Search schools..."
                          placeholderTextColor={COLORS.textMuted}
                          value={schoolSearch}
                          onChangeText={setSchoolSearch}
                        />
                      </View>

                      <ScrollView 
                        style={{ maxHeight: 120, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {schools.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase())).map((school) => (
                          <TouchableOpacity
                            key={school.id}
                            style={{ padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, backgroundColor: schoolId === school.id ? COLORS.primary + '15' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}
                            onPress={() => setSchoolId(school.id)}
                          >
                            {school.logo_url ? (
                              <Image source={{ uri: school.logo_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                            ) : (
                              <Ionicons name="school-outline" size={20} color={schoolId === school.id ? COLORS.primary : COLORS.textMuted} />
                            )}
                            <Text style={{ ...FONTS.body, color: schoolId === school.id ? COLORS.primary : COLORS.textPrimary, flex: 1 }}>
                              {school.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={{ padding: SPACING.md, backgroundColor: schoolId === 'other' ? COLORS.primary + '15' : 'transparent' }}
                          onPress={() => setSchoolId('other')}
                        >
                          <Text style={{ ...FONTS.body, color: schoolId === 'other' ? COLORS.primary : COLORS.textPrimary }}>
                            Other / School Not Listed
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                      
                      {schoolId === 'other' && (
                        <View style={{ marginTop: SPACING.sm, gap: SPACING.sm }}>
                          <View style={styles.inputContainer}>
                            <Ionicons name="school-outline" size={18} color={COLORS.textMuted} />
                            <TextInput
                              style={styles.input}
                              placeholder="Enter your school name"
                              placeholderTextColor={COLORS.textMuted}
                              value={customSchoolName}
                              onChangeText={setCustomSchoolName}
                            />
                          </View>
                          <View style={{ padding: SPACING.sm, backgroundColor: '#FFF3CD', borderRadius: RADIUS.sm }}>
                            <Text style={{ ...FONTS.small, color: '#856404', textAlign: 'center' }}>
                              ⏳ Your school will appear as "Pending" until an admin reviews and approves it.
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name={isLogin ? 'log-in' : 'person-add'} size={20} color={COLORS.white} />
                      <Text style={styles.submitBtnText}>
                        {isLogin ? 'Sign In' : 'Create Free Account'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Toggle */}
                <TouchableOpacity 
                  style={styles.toggleRow} 
                  onPress={() => { setIsLogin(!isLogin); setError(''); resetForm(); }}
                >
                  <Text style={styles.toggleText}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  </Text>
                  <Text style={styles.toggleLink}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.redLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.red,
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  roleBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  roleBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  roleBtnTextActive: {
    color: COLORS.primary,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  gradeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  gradeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  gradeTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
  },
  gradeTitleActive: {
    color: COLORS.primary,
  },
  gradeSubtitle: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
});