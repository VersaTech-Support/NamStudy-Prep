import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';


interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
  subject: string; // NEW
  paper_pdf_url: string;
  solution_pdf_url: string | null;
  description: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  grade_level: string;
  subscription_status: string;
  expiry_date: string | null;
  is_admin: boolean;
  role?: string;
  school?: string | null;
}

interface PaymentRecord {
  id: string;
  user_id: string;
  reference_number: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string;
  plan_type?: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string; grade_level: string };
}

export default function AdminDashboard({ onlineUsersCount }: { onlineUsersCount?: number }) {
  const { user, isAdmin } = useUser();

  const [activeTab, setActiveTab] = useState<'payments' | 'papers' | 'users' | 'quizzes'>('payments');
  const [filterRole, setFilterRole] = useState<'All' | 'student' | 'teacher' | 'admin'>('All');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Paper form states
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperYear, setPaperYear] = useState('2024');
  const [paperNumber, setPaperNumber] = useState('1');
  const [paperGrade, setPaperGrade] = useState<'NSSCO' | 'NSSCAS' | 'IGCSE' | 'AS Level'>('NSSCO');
  const [paperSubject, setPaperSubject] = useState('Mathematics'); // NEW
  const [paperUrl, setPaperUrl] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [paperDesc, setPaperDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [uploadingSolution, setUploadingSolution] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);

  // Quiz form states
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizSubject, setQuizSubject] = useState('Mathematics'); // NEW
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizA, setQuizA] = useState('');
  const [quizB, setQuizB] = useState('');
  const [quizC, setQuizC] = useState('');
  const [quizD, setQuizD] = useState('');
  const [quizCorrect, setQuizCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [quizExplanation, setQuizExplanation] = useState('');
  const [quizGrade, setQuizGrade] = useState<'NSSCO' | 'NSSCAS'>('NSSCO');
  const [quizDifficulty, setQuizDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // NEW: Dynamic Subjects States
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [papersRes, usersRes, quizzesRes, paymentsRes, subjectsRes] = await Promise.all([
      supabase.from('papers').select('*').order('year', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*, users(name, email, grade_level)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('name').order('name') // NEW: Fetch subjects
    ]);

    if (papersRes.data) setPapers(papersRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (quizzesRes.count !== null) setQuizCount(quizzesRes.count);
    if (paymentsRes.data) setPayments(paymentsRes.data as any);
    if (subjectsRes.data) setAvailableSubjects(subjectsRes.data.map((s: { name: string }) => s.name));

    setLoading(false);
  };

  // NEW: handleAddSubject function
  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Error', 'Subject name cannot be empty');
      return;
    }
    const { error } = await supabase.from('subjects').insert({ name: newSubjectName.trim() });
    if (error) {
      Alert.alert('Error', 'Failed to add subject');
    } else {
      Alert.alert('Success', 'Subject added!');
      setNewSubjectName('');
      setShowSubjectForm(false);
      fetchData();
    }
  };

  const handlePickAndUploadPDF = async (type: 'paper' | 'solution') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (type === 'paper') setUploadingPaper(true);
      else setUploadingSolution(true);

      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `${paperSubject.replace(/\s+/g, '')}_${paperGrade}_${paperYear}_P${paperNumber}_${Date.now()}.${fileExt}`;
      const bucket = type === 'paper' ? 'papers' : 'solutions';

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

      if (type === 'paper') {
        setPaperUrl(data.publicUrl);
        Alert.alert('Success', 'Paper PDF uploaded successfully!');
      } else {
        setSolutionUrl(data.publicUrl);
        Alert.alert('Success', 'Solution PDF uploaded successfully!');
      }
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload document.');
    } finally {
      setUploadingPaper(false);
      setUploadingSolution(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    Alert.alert(
      'Approve Payment',
      'Are you sure you want to approve this payment? This will activate VIP access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(paymentId);
            try {
              const { error } = await supabase
                .from('payments')
                .update({ status: 'approved', admin_note: 'Payment verified and approved' })
                .eq('id', paymentId);

              if (!error) {
                const p = payments.find(pay => pay.id === paymentId);
                if (p?.user_id) {
                  const expiry = new Date();
                  const isYearly = p.amount >= 300 || p.plan_type === 'yearly';
                  const daysToAdd = isYearly ? 365 : 30;
                  expiry.setDate(expiry.getDate() + daysToAdd);

                  await supabase.from('users').update({
                    subscription_status: 'VIP',
                    expiry_date: expiry.toISOString()
                  }).eq('id', p.user_id);
                }
                Alert.alert('Success', 'Payment approved! VIP access activated.');
                fetchData();
              } else {
                Alert.alert('Error', 'Failed to approve payment.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong.');
            }
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleRejectPayment = async () => {
    if (!rejectPaymentId) return;
    setProcessingId(rejectPaymentId);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          admin_note: rejectNote || 'Payment could not be verified'
        })
        .eq('id', rejectPaymentId);

      if (!error) {
        Alert.alert('Done', 'Payment rejected.');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to reject payment.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    }
    setProcessingId(null);
    setShowRejectModal(false);
    setRejectPaymentId(null);
    setRejectNote('');
  };

  const resetPaperForm = () => {
    setPaperTitle('');
    setPaperYear('2024');
    setPaperNumber('1');
    setPaperGrade('NSSCO');
    setPaperSubject('Mathematics');
    setPaperUrl('');
    setSolutionUrl('');
    setPaperDesc('');
    setEditingPaperId(null);
  };

  const handleSavePaper = async () => {
    if (!paperTitle || !paperUrl) {
      Alert.alert('Error', 'Please fill in the title and provide a paper PDF URL.');
      return;
    }
    setSaving(true);
    const paperData = {
      title: paperTitle,
      year: parseInt(paperYear) || 2024,
      paper_number: parseInt(paperNumber) || 1,
      grade_level: paperGrade,
      subject: paperSubject, // NEW: Include subject in DB payload
      paper_pdf_url: paperUrl,
      solution_pdf_url: solutionUrl || null,
      description: paperDesc || `${paperGrade} ${paperSubject} Exam Paper`,
    };

    if (editingPaperId) {
      const { error } = await supabase.from('papers').update(paperData).eq('id', editingPaperId);
      if (error) Alert.alert('Error', 'Failed to update paper.');
      else Alert.alert('Success', 'Paper updated successfully!');
    } else {
      const { error } = await supabase.from('papers').insert(paperData);
      if (error) Alert.alert('Error', 'Failed to add paper.');
      else Alert.alert('Success', 'Paper added successfully!');
    }
    setSaving(false);
    setShowPaperForm(false);
    resetPaperForm();
    fetchData();
  };

  const handleSaveQuiz = async () => {
    if (!quizTopic || !quizQuestion || !quizA || !quizB || !quizC || !quizD) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('quizzes').insert({
      subject: quizSubject, // NEW: Include subject in DB payload
      topic_name: quizTopic, 
      question: quizQuestion,
      option_a: quizA, 
      option_b: quizB, 
      option_c: quizC, 
      option_d: quizD,
      correct_answer: quizCorrect, 
      explanation_text: quizExplanation,
      grade_level: quizGrade, 
      difficulty: quizDifficulty,
    });
    if (error) Alert.alert('Error', 'Failed to add quiz question.');
    else Alert.alert('Success', 'Quiz question added!');
    setSaving(false);
    setShowQuizForm(false);
    fetchData();
  };

  const handleEditPaper = (paper: Paper) => {
    setEditingPaperId(paper.id);
    setPaperTitle(paper.title);
    setPaperYear(paper.year.toString());
    setPaperNumber(paper.paper_number.toString());
    setPaperGrade(paper.grade_level as 'NSSCO' | 'NSSCAS');
    setPaperSubject(paper.subject || 'Mathematics'); // NEW
    setPaperUrl(paper.paper_pdf_url);
    setSolutionUrl(paper.solution_pdf_url || '');
    setPaperDesc(paper.description || '');
    setShowPaperForm(true);
  };

  const handleDeletePaper = (paperId: string) => {
    Alert.alert('Delete Paper', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('papers').delete().eq('id', paperId); fetchData(); } },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'pending': return COLORS.gold; case 'approved': return COLORS.green; case 'rejected': return COLORS.red; default: return COLORS.textMuted; }
  };
  const getStatusBg = (status: string) => {
    switch (status) { case 'pending': return COLORS.goldLight; case 'approved': return COLORS.greenLight; case 'rejected': return COLORS.redLight; default: return COLORS.surfaceAlt; }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const processedPayments = payments.filter(p => p.status !== 'pending');
  const totalRevenue = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);

  if (!isAdmin) return null;

  return (
    <View style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
      {/* Live System Metrics Board */}
      <View style={{ marginVertical: SPACING.lg, padding: SPACING.md, backgroundColor: '#fdfdfd', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E5E4E2' }}>
        <Text style={{ ...FONTS.h3, color: '#6B7A85', marginBottom: SPACING.md }}>System Overview</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
          <View style={{ flexBasis: '48%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green, marginRight: SPACING.sm }} />
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary }}>{onlineUsersCount || 0}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Currently Online</Text>
            </View>
          </View>
          
          <View style={{ flexBasis: '48%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary }}>{users.length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Total Users</Text>
          </View>

          <View style={{ flexBasis: '31%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>{users.filter(u => u.role === 'student' || (!u.role && !u.is_admin)).length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Students</Text>
          </View>

          <View style={{ flexBasis: '31%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.accent }}>{users.filter(u => u.role === 'teacher').length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Teachers</Text>
          </View>
          
          <View style={{ flexBasis: '31%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.green }}>{papers.length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Papers</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabs, { marginHorizontal: -SPACING.lg }]}>
        {(['payments', 'papers', 'users', 'quizzes'] as const).map(tab => {
          const icons: Record<string, string> = { payments: 'card', papers: 'document-text', users: 'people', quizzes: 'help-circle' };
          const badge = tab === 'payments' ? pendingPayments.length : 0;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <View style={styles.tabInner}>
                <Ionicons name={icons[tab] as any} size={16} color={activeTab === tab ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* PAYMENTS TAB OMITTED FOR BREVITY (Unchanged) */}
          {activeTab === 'payments' && (
            <View style={styles.tabContent}>
              <View style={styles.revenueRow}>
                <View style={[styles.revCard, { backgroundColor: COLORS.gold + '10', borderColor: COLORS.gold + '30' }]}>
                  <Ionicons name="time" size={20} color={COLORS.gold} />
                  <Text style={[styles.revNum, { color: COLORS.gold }]}>{pendingPayments.length}</Text>
                  <Text style={styles.revLabel}>Pending</Text>
                </View>
                <View style={[styles.revCard, { backgroundColor: COLORS.green + '10', borderColor: COLORS.green + '30' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
                  <Text style={[styles.revNum, { color: COLORS.green }]}>{payments.filter(p => p.status === 'approved').length}</Text>
                  <Text style={styles.revLabel}>Approved</Text>
                </View>
                <View style={[styles.revCard, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30' }]}>
                  <Ionicons name="cash" size={20} color={COLORS.primary} />
                  <Text style={[styles.revNum, { color: COLORS.primary }]}>N${totalRevenue}</Text>
                  <Text style={styles.revLabel}>Revenue</Text>
                </View>
              </View>

              {pendingPayments.length > 0 && (
                <View style={styles.paymentSection}>
                  <View style={styles.paymentSectionHeader}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.paymentSectionTitle}>Pending Verification ({pendingPayments.length})</Text>
                  </View>

                  {pendingPayments.map((p) => (
                    <View key={p.id} style={[styles.paymentCard, { borderLeftColor: COLORS.gold, borderLeftWidth: 4 }]}>
                      <View style={styles.paymentCardTop}>
                        <View>
                          <Text style={styles.paymentUserName}>{p.users?.name || 'Unknown'}</Text>
                          <Text style={styles.paymentUserEmail}>{p.users?.email || ''}</Text>
                        </View>
                        <View style={[styles.paymentAmountBadge, { backgroundColor: COLORS.goldLight }]}>
                          <Text style={[styles.paymentAmountText, { color: COLORS.goldDark }]}>N${p.amount.toFixed(2)}</Text>
                        </View>
                      </View>

                      <View style={styles.paymentCardMeta}>
                        <View style={styles.paymentMetaItem}>
                          <Ionicons name="receipt" size={12} color={COLORS.textMuted} />
                          <Text style={styles.paymentMetaText}>{p.reference_number}</Text>
                        </View>
                        <View style={styles.paymentMetaItem}>
                          <Ionicons name="business" size={12} color={COLORS.textMuted} />
                          <Text style={styles.paymentMetaText}>{p.bank_name}</Text>
                        </View>
                        <View style={styles.paymentMetaItem}>
                          <Ionicons name="time" size={12} color={COLORS.textMuted} />
                          <Text style={styles.paymentMetaText}>{formatDate(p.created_at)}</Text>
                        </View>
                      </View>

                      <View style={styles.paymentActions}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprovePayment(p.id)}
                          disabled={processingId === p.id}
                        >
                          {processingId === p.id ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => { setRejectPaymentId(p.id); setShowRejectModal(true); }}
                          disabled={processingId === p.id}
                        >
                          <Ionicons name="close-circle" size={18} color={COLORS.red} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* PAPERS TAB */}
          {activeTab === 'papers' && (
            <View style={styles.tabContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                <TouchableOpacity style={[styles.addBtn, { flex: 1, marginRight: SPACING.sm }]} onPress={() => { setEditingPaperId(null); setShowPaperForm(true); }}>
                  <Ionicons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addBtnText}>Add Paper</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: COLORS.accent }]} onPress={() => setShowSubjectForm(true)}>
                  <Ionicons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addBtnText}>New Subject</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.infoText}>Manage past papers and VIP solutions.</Text>
              {papers.map(paper => (
                <View key={paper.id} style={styles.adminCard}>
                  <View style={styles.adminCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardTitle}>{paper.title}</Text>
                      <Text style={styles.adminCardSub}>
                        <Text style={{fontWeight: '700', color: COLORS.primary}}>{paper.subject || 'Mathematics'}</Text> • {paper.grade_level}
                      </Text>
                      <Text style={[styles.adminCardSub, {marginTop: 4}]}>{paper.description}</Text>
                    </View>
                    <View style={styles.adminCardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent + '15' }]} onPress={() => handleEditPaper(paper)}>
                        <Ionicons name="create" size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDeletePaper(paper.id)}>
                        <Ionicons name="trash" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <View style={styles.tabContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }}>
                <View style={[styles.revCard, { flex: 1, marginRight: SPACING.xs, backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.borderLight }]}>
                  <Text style={[styles.revNum, { color: COLORS.textPrimary, fontSize: 18 }]}>{users.length}</Text>
                  <Text style={styles.revLabel}>Total</Text>
                </View>
                <View style={[styles.revCard, { flex: 1, marginRight: SPACING.xs, backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30' }]}>
                  <Text style={[styles.revNum, { color: COLORS.primary, fontSize: 18 }]}>{users.filter(u => u.role === 'student' || (!u.role && !u.is_admin)).length}</Text>
                  <Text style={styles.revLabel}>Students</Text>
                </View>
                <View style={[styles.revCard, { flex: 1, marginRight: SPACING.xs, backgroundColor: COLORS.accent + '10', borderColor: COLORS.accent + '30' }]}>
                  <Text style={[styles.revNum, { color: COLORS.accent, fontSize: 18 }]}>{users.filter(u => u.role === 'teacher').length}</Text>
                  <Text style={styles.revLabel}>Teachers</Text>
                </View>
                <View style={[styles.revCard, { flex: 1, backgroundColor: COLORS.gold + '10', borderColor: COLORS.gold + '30' }]}>
                  <Text style={[styles.revNum, { color: COLORS.gold, fontSize: 18 }]}>{users.filter(u => u.is_admin || u.role === 'admin').length}</Text>
                  <Text style={styles.revLabel}>Admins</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: SPACING.lg, paddingBottom: SPACING.sm }}>
                {(['All', 'student', 'teacher', 'admin'] as const).map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
                    onPress={() => setFilterRole(role)}
                  >
                    <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {users
                .filter(u => {
                  if (filterRole === 'All') return true;
                  if (filterRole === 'admin') return u.is_admin || u.role === 'admin';
                  if (filterRole === 'student') return u.role === 'student' || (!u.role && !u.is_admin);
                  return u.role === filterRole;
                })
                .map(u => (
                  <View key={u.id} style={styles.adminCard}>
                    <View style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{u.name.charAt(0)}</Text>
                      </View>
                      <View style={[styles.userInfo, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: 2 }}>
                          <Text style={styles.adminCardTitle}>{u.name}</Text>
                          {(u.is_admin || u.role === 'admin') ? (
                            <View style={[styles.roleBadge, { backgroundColor: COLORS.gold + '20' }]}>
                              <Text style={[styles.roleBadgeText, { color: COLORS.goldDark }]}>Admin</Text>
                            </View>
                          ) : u.role === 'teacher' ? (
                            <View style={[styles.roleBadge, { backgroundColor: COLORS.accent + '20' }]}>
                              <Text style={[styles.roleBadgeText, { color: COLORS.accent }]}>Teacher</Text>
                            </View>
                          ) : (
                            <View style={[styles.roleBadge, { backgroundColor: COLORS.primary + '20' }]}>
                              <Text style={[styles.roleBadgeText, { color: COLORS.primary }]}>Student</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.adminCardSub}>{u.email}</Text>
                        {u.school && (
                          <Text style={[styles.adminCardSub, { marginTop: 4, color: COLORS.textMuted, fontSize: 11 }]}>
                            🏫 {u.school}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {activeTab === 'quizzes' && (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowQuizForm(true)}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add Quiz Question</Text>
              </TouchableOpacity>
              <Text style={styles.infoText}>Manage quiz questions from the database.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      )}

      {/* PAPER FORM MODAL */}
      <Modal visible={showPaperForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingPaperId ? 'Edit Paper' : 'Add New Paper'}</Text>
                <TouchableOpacity onPress={() => setShowPaperForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Paper Title *</Text>
              <TextInput style={styles.formInput} placeholder="e.g., Nov 2024 Paper 1" placeholderTextColor={COLORS.textMuted} value={paperTitle} onChangeText={setPaperTitle} />

              {/* NEW: Subject Selector in Paper Form */}
              <Text style={styles.formLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                {availableSubjects.map(s => (
                  <TouchableOpacity key={s} style={[styles.formGradeBtn, {marginRight: 8, paddingHorizontal: 16}, paperSubject === s && styles.formGradeBtnActive]} onPress={() => setPaperSubject(s)}>
                    <Text style={[styles.formGradeBtnText, paperSubject === s && styles.formGradeBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Year *</Text>
                  <TextInput style={styles.formInput} placeholder="2024" placeholderTextColor={COLORS.textMuted} value={paperYear} onChangeText={setPaperYear} keyboardType="numeric" />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Paper # *</Text>
                  <TextInput style={styles.formInput} placeholder="1" placeholderTextColor={COLORS.textMuted} value={paperNumber} onChangeText={setPaperNumber} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.formLabel}>Grade Level *</Text>
              <View style={styles.formGradeRow}>
                {(['NSSCO', 'NSSCAS', 'IGCSE', 'AS Level'] as const).map(g => (
                  <TouchableOpacity key={g} style={[styles.formGradeBtn, paperGrade === g && styles.formGradeBtnActive]} onPress={() => setPaperGrade(g)}>
                    <Text style={[styles.formGradeBtnText, paperGrade === g && styles.formGradeBtnTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Exam Paper PDF (Free) *</Text>
              <TouchableOpacity style={styles.uploadPickerBtn} onPress={() => handlePickAndUploadPDF('paper')} disabled={uploadingPaper}>
                {uploadingPaper ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={COLORS.primary} />
                    <Text style={styles.uploadPickerBtnText}>{paperUrl ? 'Change Paper PDF File' : 'Select & Upload Paper PDF'}</Text>
                  </>
                )}
              </TouchableOpacity>
              {paperUrl ? <Text style={styles.successUrlText} numberOfLines={1}>✓ File Uploaded</Text> : null}

              <Text style={styles.formLabel}>Solution PDF (VIP Golden Memos)</Text>
              <TouchableOpacity style={styles.uploadPickerBtn} onPress={() => handlePickAndUploadPDF('solution')} disabled={uploadingSolution}>
                {uploadingSolution ? (
                  <ActivityIndicator color={COLORS.gold} />
                ) : (
                  <>
                    <Ionicons name="key" size={18} color={COLORS.gold} />
                    <Text style={[styles.uploadPickerBtnText, { color: COLORS.goldDark }]}>{solutionUrl ? 'Change Solution PDF File' : 'Select & Upload Solution PDF'}</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Brief description..." placeholderTextColor={COLORS.textMuted} value={paperDesc} onChangeText={setPaperDesc} multiline />

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSavePaper} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>{editingPaperId ? 'Update Paper' : 'Save Paper'}</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUIZ FORM MODAL */}
      <Modal visible={showQuizForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Quiz Question</Text>
                <TouchableOpacity onPress={() => setShowQuizForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* NEW: Subject Selector in Quiz Form */}
              <Text style={styles.formLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                {availableSubjects.map(s => (
                  <TouchableOpacity key={s} style={[styles.formGradeBtn, {marginRight: 8, paddingHorizontal: 16}, quizSubject === s && styles.formGradeBtnActive]} onPress={() => setQuizSubject(s)}>
                    <Text style={[styles.formGradeBtnText, quizSubject === s && styles.formGradeBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Topic Name *</Text>
              <TextInput style={styles.formInput} placeholder="e.g., Algebra" placeholderTextColor={COLORS.textMuted} value={quizTopic} onChangeText={setQuizTopic} />
              <Text style={styles.formLabel}>Question *</Text>
              <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Enter the question..." placeholderTextColor={COLORS.textMuted} value={quizQuestion} onChangeText={setQuizQuestion} multiline />
              <Text style={styles.formLabel}>Option A *</Text>
              <TextInput style={styles.formInput} placeholder="Option A" placeholderTextColor={COLORS.textMuted} value={quizA} onChangeText={setQuizA} />
              <Text style={styles.formLabel}>Option B *</Text>
              <TextInput style={styles.formInput} placeholder="Option B" placeholderTextColor={COLORS.textMuted} value={quizB} onChangeText={setQuizB} />
              <Text style={styles.formLabel}>Option C *</Text>
              <TextInput style={styles.formInput} placeholder="Option C" placeholderTextColor={COLORS.textMuted} value={quizC} onChangeText={setQuizC} />
              <Text style={styles.formLabel}>Option D *</Text>
              <TextInput style={styles.formInput} placeholder="Option D" placeholderTextColor={COLORS.textMuted} value={quizD} onChangeText={setQuizD} />
              <Text style={styles.formLabel}>Correct Answer *</Text>
              <View style={styles.formGradeRow}>
                {(['A', 'B', 'C', 'D'] as const).map(a => (
                  <TouchableOpacity key={a} style={[styles.formGradeBtn, quizCorrect === a && styles.formGradeBtnActive]} onPress={() => setQuizCorrect(a)}>
                    <Text style={[styles.formGradeBtnText, quizCorrect === a && styles.formGradeBtnTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSaveQuiz} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Save Question</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NEW SUBJECT FORM MODAL */}
      <Modal visible={showSubjectForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectForm(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Subject Name *</Text>
            <TextInput 
              style={styles.formInput} 
              placeholder="e.g., Accounting" 
              placeholderTextColor={COLORS.textMuted} 
              value={newSubjectName} 
              onChangeText={setNewSubjectName} 
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddSubject}>
              <Ionicons name="add-circle" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>Add Subject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primaryDark, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, paddingHorizontal: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabText: { ...FONTS.small, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabBadge: { backgroundColor: COLORS.red, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  scrollView: { flex: 1 },
  tabContent: { padding: SPACING.xl },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsOverviewRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.xl, paddingBottom: 0 },
  overviewCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  overviewNum: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  overviewLabel: { fontSize: 10, color: COLORS.textMuted },
  revenueRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  revCard: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1 },
  revNum: { fontSize: 22, fontWeight: '800', marginTop: SPACING.xs },
  revLabel: { ...FONTS.small, color: COLORS.textMuted },
  paymentSection: { marginBottom: SPACING.xl },
  paymentSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  pendingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  paymentSectionTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  paymentCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
  paymentCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  paymentUserName: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  paymentUserEmail: { ...FONTS.small, color: COLORS.textMuted },
  paymentAmountBadge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  paymentAmountText: { ...FONTS.bodyBold },
  paymentCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  paymentMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentMetaText: { ...FONTS.small, color: COLORS.textMuted },
  paymentActions: { flexDirection: 'row', gap: SPACING.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.green, paddingVertical: 12, borderRadius: RADIUS.sm, ...SHADOWS.sm },
  approveBtnText: { ...FONTS.caption, color: COLORS.white, fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.redLight, paddingVertical: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.red + '30' },
  rejectBtnText: { ...FONTS.caption, color: COLORS.red, fontWeight: '700' },
  statusPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusPillText: { ...FONTS.small, fontWeight: '700' },
  emptyPayments: { alignItems: 'center', paddingVertical: 40 },
  emptyPaymentsTitle: { ...FONTS.h3, color: COLORS.green, marginTop: SPACING.md },
  emptyPaymentsText: { ...FONTS.caption, color: COLORS.textMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, marginBottom: SPACING.lg, ...SHADOWS.md },
  addBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  adminCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  adminCardTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  adminCardSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  adminCardActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  userAvatarText: { ...FONTS.bodyBold, color: COLORS.primary },
  userInfo: { flex: 1 },
  infoText: { ...FONTS.body, color: COLORS.textSecondary, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xl, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  modalTitle: { ...FONTS.h2, color: COLORS.textPrimary },
  formLabel: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.md },
  formInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.lg, paddingVertical: 12, ...FONTS.body, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  formRow: { flexDirection: 'row', gap: SPACING.md },
  formHalf: { flex: 1 },
  formGradeRow: { flexDirection: 'row', gap: SPACING.sm },
  formGradeBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  formGradeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  formGradeBtnText: { ...FONTS.caption, color: COLORS.textSecondary },
  formGradeBtnTextActive: { color: COLORS.white, fontWeight: '700' },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: { color: COLORS.white, fontWeight: '700' },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  uploadPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: 14, marginTop: 4 },
  uploadPickerBtnText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '700' },
  successUrlText: { ...FONTS.small, color: COLORS.green, marginTop: 4, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, marginTop: SPACING.xxl, ...SHADOWS.lg },
  saveBtnText: { ...FONTS.h3, color: COLORS.white },
});