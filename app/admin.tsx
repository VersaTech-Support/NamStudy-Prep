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
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/app/constants/theme';
import { useUser } from '@/app/context/UserContext';
import { supabase } from '@/app/lib/supabase';

interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
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
}

interface PaymentRecord {
  id: string;
  user_id: string;
  reference_number: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string; grade_level: string };
}

export default function AdminScreen() {
  const { user, isAdmin } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'payments' | 'papers' | 'users' | 'quizzes'>('payments');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Paper form
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperYear, setPaperYear] = useState('2024');
  const [paperNumber, setPaperNumber] = useState('1');
  const [paperGrade, setPaperGrade] = useState<'NSSCO' | 'NSSCAS'>('NSSCO');
  const [paperUrl, setPaperUrl] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [paperDesc, setPaperDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);

  // Quiz form
  const [showQuizForm, setShowQuizForm] = useState(false);
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

  // Reject note modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You need admin access to view this page.');
      router.back();
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [papersRes, usersRes] = await Promise.all([
      supabase.from('papers').select('*').order('year', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
    ]);
    if (papersRes.data) setPapers(papersRes.data);
    if (usersRes.data) setUsers(usersRes.data);

    // Fetch payments via direct Supabase call
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, users(name, email, grade_level)')
        .order('created_at', { ascending: false });
      if (data) setPayments(data as any);
    } catch {}

    setLoading(false);
  };

  const handleApprovePayment = async (paymentId: string) => {
    Alert.alert(
      'Approve Payment',
      'Are you sure you want to approve this payment? This will activate VIP for 30 days.',
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
                // Also update user subscription status
                const p = payments.find(pay => pay.id === paymentId);
                if (p?.user_id) {
                  const expiry = new Date();
                  expiry.setDate(expiry.getDate() + 30);
                  await supabase.from('users').update({
                    subscription_status: 'VIP',
                    expiry_date: expiry.toISOString()
                  }).eq('id', p.user_id);
                }
                Alert.alert('Success', 'Payment approved! User VIP activated for 30 days.');
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
    setPaperUrl('');
    setSolutionUrl('');
    setPaperDesc('');
    setEditingPaperId(null);
  };

  const resetQuizForm = () => {
    setQuizTopic('');
    setQuizQuestion('');
    setQuizA('');
    setQuizB('');
    setQuizC('');
    setQuizD('');
    setQuizCorrect('A');
    setQuizExplanation('');
    setQuizGrade('NSSCO');
    setQuizDifficulty('Medium');
  };

  const handleSavePaper = async () => {
    if (!paperTitle || !paperUrl) {
      Alert.alert('Error', 'Please fill in the title and paper PDF URL.');
      return;
    }
    setSaving(true);
    const paperData = {
      title: paperTitle,
      year: parseInt(paperYear),
      paper_number: parseInt(paperNumber),
      grade_level: paperGrade,
      paper_pdf_url: paperUrl,
      solution_pdf_url: solutionUrl || null,
      description: paperDesc,
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
      topic_name: quizTopic, question: quizQuestion,
      option_a: quizA, option_b: quizB, option_c: quizC, option_d: quizD,
      correct_answer: quizCorrect, explanation_text: quizExplanation,
      grade_level: quizGrade, difficulty: quizDifficulty,
    });
    if (error) Alert.alert('Error', 'Failed to add quiz question.');
    else Alert.alert('Success', 'Quiz question added!');
    setSaving(false);
    setShowQuizForm(false);
    resetQuizForm();
  };

  const handleEditPaper = (paper: Paper) => {
    setEditingPaperId(paper.id);
    setPaperTitle(paper.title);
    setPaperYear(paper.year.toString());
    setPaperNumber(paper.paper_number.toString());
    setPaperGrade(paper.grade_level as 'NSSCO' | 'NSSCAS');
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
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
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <View style={styles.tabContent}>
              {/* Revenue Stats */}
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

              {/* Pending Payments */}
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
                        {p.users?.grade_level && (
                          <View style={[styles.paymentGradeBadge, { backgroundColor: p.users.grade_level === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight }]}>
                            <Text style={[styles.paymentGradeText, { color: p.users.grade_level === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark }]}>
                              {p.users.grade_level}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.paymentActions}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprovePayment(p.id)}
                          disabled={processingId === p.id}
                          activeOpacity={0.7}
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
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={18} color={COLORS.red} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {pendingPayments.length === 0 && (
                <View style={styles.emptyPayments}>
                  <Ionicons name="checkmark-done-circle" size={48} color={COLORS.green} />
                  <Text style={styles.emptyPaymentsTitle}>All Caught Up!</Text>
                  <Text style={styles.emptyPaymentsText}>No pending payments to review</Text>
                </View>
              )}

              {/* Processed Payments */}
              {processedPayments.length > 0 && (
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentSectionTitle}>Payment History</Text>
                  {processedPayments.map((p) => (
                    <View key={p.id} style={[styles.paymentCard, { borderLeftColor: getStatusColor(p.status), borderLeftWidth: 4 }]}>
                      <View style={styles.paymentCardTop}>
                        <View>
                          <Text style={styles.paymentUserName}>{p.users?.name || 'Unknown'}</Text>
                          <Text style={styles.paymentMetaText}>{p.reference_number}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: getStatusBg(p.status) }]}>
                          <Text style={[styles.statusPillText, { color: getStatusColor(p.status) }]}>
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paymentCardMeta}>
                        <Text style={styles.paymentMetaText}>N${p.amount.toFixed(2)} - {formatDate(p.created_at)}</Text>
                      </View>
                      {p.admin_note && (
                        <View style={styles.adminNoteRow}>
                          <Ionicons name="chatbubble" size={11} color={COLORS.textMuted} />
                          <Text style={styles.adminNoteText}>{p.admin_note}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* PAPERS TAB */}
          {activeTab === 'papers' && (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { resetPaperForm(); setShowPaperForm(true); }}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add New Paper</Text>
              </TouchableOpacity>
              {papers.map(paper => (
                <View key={paper.id} style={styles.adminCard}>
                  <View style={styles.adminCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardTitle}>{paper.title}</Text>
                      <Text style={styles.adminCardSub}>{paper.grade_level} - {paper.description}</Text>
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
                  <View style={styles.adminCardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="document" size={12} color={COLORS.green} />
                      <Text style={[styles.metaText, { color: COLORS.green }]}>Paper PDF</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name={paper.solution_pdf_url ? 'key' : 'close-circle'} size={12} color={paper.solution_pdf_url ? COLORS.gold : COLORS.red} />
                      <Text style={[styles.metaText, { color: paper.solution_pdf_url ? COLORS.gold : COLORS.red }]}>
                        {paper.solution_pdf_url ? 'Solution PDF' : 'No Solution'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <View style={styles.tabContent}>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: COLORS.primary + '10' }]}>
                  <Text style={[styles.statNum, { color: COLORS.primary }]}>{users.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.gold + '10' }]}>
                  <Text style={[styles.statNum, { color: COLORS.gold }]}>{users.filter(u => u.subscription_status === 'VIP').length}</Text>
                  <Text style={styles.statLabel}>VIP</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.green + '10' }]}>
                  <Text style={[styles.statNum, { color: COLORS.green }]}>{users.filter(u => u.subscription_status === 'Free').length}</Text>
                  <Text style={styles.statLabel}>Free</Text>
                </View>
              </View>
              {users.map(u => (
                <View key={u.id} style={styles.adminCard}>
                  <View style={styles.userRow}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.adminCardTitle}>{u.name}</Text>
                      <Text style={styles.adminCardSub}>{u.email}</Text>
                      <View style={styles.userTags}>
                        <View style={[styles.userTag, { backgroundColor: u.grade_level === 'NSSCO' ? COLORS.greenLight : COLORS.goldLight }]}>
                          <Text style={[styles.userTagText, { color: u.grade_level === 'NSSCO' ? COLORS.greenDark : COLORS.goldDark }]}>{u.grade_level}</Text>
                        </View>
                        <View style={[styles.userTag, { backgroundColor: u.subscription_status === 'VIP' ? COLORS.goldLight : COLORS.surfaceAlt }]}>
                          <Text style={[styles.userTagText, { color: u.subscription_status === 'VIP' ? COLORS.goldDark : COLORS.textMuted }]}>{u.subscription_status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* QUIZZES TAB */}
          {activeTab === 'quizzes' && (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { resetQuizForm(); setShowQuizForm(true); }}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add Quiz Question</Text>
              </TouchableOpacity>
              <Text style={styles.infoText}>Manage quiz questions from the database. Use the button above to add new questions.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Reject Note Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.rejectOverlay}>
          <View style={styles.rejectContainer}>
            <Text style={styles.rejectTitle}>Reject Payment</Text>
            <Text style={styles.rejectSubtitle}>Optionally add a note for the student:</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="e.g., Payment not found in bank records..."
              placeholderTextColor={COLORS.textMuted}
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
            />
            <View style={styles.rejectActions}>
              <TouchableOpacity style={styles.rejectCancelBtn} onPress={() => { setShowRejectModal(false); setRejectNote(''); }}>
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectConfirmBtn} onPress={handleRejectPayment}>
                {processingId ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                  <Text style={styles.rejectConfirmText}>Reject Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Paper Form Modal */}
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
                {(['NSSCO', 'NSSCAS'] as const).map(g => (
                  <TouchableOpacity key={g} style={[styles.formGradeBtn, paperGrade === g && styles.formGradeBtnActive]} onPress={() => setPaperGrade(g)}>
                    <Text style={[styles.formGradeBtnText, paperGrade === g && styles.formGradeBtnTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Exam Paper PDF URL *</Text>
              <TextInput style={styles.formInput} placeholder="https://..." placeholderTextColor={COLORS.textMuted} value={paperUrl} onChangeText={setPaperUrl} autoCapitalize="none" />
              <View style={styles.formHint}>
                <Ionicons name="information-circle" size={14} color={COLORS.green} />
                <Text style={styles.formHintText}>This is the FREE paper download link</Text>
              </View>
              <Text style={styles.formLabel}>Solution PDF URL (Premium)</Text>
              <TextInput style={styles.formInput} placeholder="https://..." placeholderTextColor={COLORS.textMuted} value={solutionUrl} onChangeText={setSolutionUrl} autoCapitalize="none" />
              <View style={styles.formHint}>
                <Ionicons name="diamond" size={14} color={COLORS.gold} />
                <Text style={[styles.formHintText, { color: COLORS.goldDark }]}>This is the VIP-only solution link</Text>
              </View>
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

      {/* Quiz Form Modal */}
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
              <Text style={styles.formLabel}>Grade Level *</Text>
              <View style={styles.formGradeRow}>
                {(['NSSCO', 'NSSCAS'] as const).map(g => (
                  <TouchableOpacity key={g} style={[styles.formGradeBtn, quizGrade === g && styles.formGradeBtnActive]} onPress={() => setQuizGrade(g)}>
                    <Text style={[styles.formGradeBtnText, quizGrade === g && styles.formGradeBtnTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Difficulty *</Text>
              <View style={styles.formGradeRow}>
                {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                  <TouchableOpacity key={d} style={[styles.formGradeBtn, quizDifficulty === d && styles.formGradeBtnActive]} onPress={() => setQuizDifficulty(d)}>
                    <Text style={[styles.formGradeBtnText, quizDifficulty === d && styles.formGradeBtnTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Explanation</Text>
              <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Step-by-step explanation..." placeholderTextColor={COLORS.textMuted} value={quizExplanation} onChangeText={setQuizExplanation} multiline />
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSaveQuiz} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Save Question</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  // Revenue
  revenueRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  revCard: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1 },
  revNum: { fontSize: 22, fontWeight: '800', marginTop: SPACING.xs },
  revLabel: { ...FONTS.small, color: COLORS.textMuted },
  // Payment Section
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
  paymentGradeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paymentGradeText: { fontSize: 10, fontWeight: '700' },
  paymentActions: { flexDirection: 'row', gap: SPACING.sm },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.green, paddingVertical: 12, borderRadius: RADIUS.sm, ...SHADOWS.sm },
  approveBtnText: { ...FONTS.caption, color: COLORS.white, fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.redLight, paddingVertical: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.red + '30' },
  rejectBtnText: { ...FONTS.caption, color: COLORS.red, fontWeight: '700' },
  // Status
  statusPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusPillText: { ...FONTS.small, fontWeight: '700' },
  adminNoteRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm, backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm },
  adminNoteText: { ...FONTS.small, color: COLORS.textSecondary, flex: 1 },
  // Empty
  emptyPayments: { alignItems: 'center', paddingVertical: 40 },
  emptyPaymentsTitle: { ...FONTS.h3, color: COLORS.green, marginTop: SPACING.md },
  emptyPaymentsText: { ...FONTS.caption, color: COLORS.textMuted },
  // Reject Modal
  rejectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  rejectContainer: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xxl },
  rejectTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  rejectSubtitle: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  rejectInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: SPACING.lg, ...FONTS.body, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, height: 100, textAlignVertical: 'top', marginBottom: SPACING.lg },
  rejectActions: { flexDirection: 'row', gap: SPACING.md },
  rejectCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, alignItems: 'center' },
  rejectCancelText: { ...FONTS.bodyBold, color: COLORS.textSecondary },
  rejectConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, backgroundColor: COLORS.red, alignItems: 'center' },
  rejectConfirmText: { ...FONTS.bodyBold, color: COLORS.white },
  // Existing admin styles
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, marginBottom: SPACING.lg, ...SHADOWS.md },
  addBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  adminCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  adminCardTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  adminCardSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  adminCardActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  adminCardMeta: { flexDirection: 'row', gap: SPACING.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...FONTS.small, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { ...FONTS.small, color: COLORS.textMuted },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  userAvatarText: { ...FONTS.bodyBold, color: COLORS.primary },
  userInfo: { flex: 1 },
  userTags: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4 },
  userTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  userTagText: { fontSize: 10, fontWeight: '700' },
  infoText: { ...FONTS.body, color: COLORS.textSecondary, lineHeight: 22 },
  // Modals
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
  formHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  formHintText: { ...FONTS.small, color: COLORS.greenDark },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, marginTop: SPACING.xxl, ...SHADOWS.lg },
  saveBtnText: { ...FONTS.h3, color: COLORS.white },
});
