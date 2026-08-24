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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';


interface Paper {
  id: string;
  title: string;
  year: number;
  paper_number: number;
  grade_level: string;
  subject: string | null; // NEW
  paper_pdf_url: string;
  solution_pdf_url: string | null;
  description: string | null;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  grade_level: string;
  subscription_status: string | null;
  expiry_date: string | null;
  is_admin: boolean | null;
  role?: string | null;
  school?: string | null;
  school_id?: string | null;
  is_school_admin?: boolean | null;
}

interface Quiz {
  id: string;
  subject?: string | null;
  topic_name?: string | null;
  topic_id?: string | null;
  question?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
  explanation_text?: string | null;
  grade_level?: string | null;
  difficulty?: string | null;
}

interface School {
  id: string;
  name: string;
  code?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
}

interface Notice {
  id: string;
  school_id?: string | null;
  title: string;
  content: string;
  author_id?: string | null;
  is_urgent?: boolean | null;
  created_at: string | null;
  schools?: { name: string } | null;
}

interface Timetable {
  id: string;
  school_id?: string | null;
  curriculum?: string | null;
  subject_name?: string | null;
  paper_code?: string | null;
  exam_date?: string | null;
  start_time?: string | null;
  duration?: string | null;
  venue?: string | null;
  created_at: string | null;
  schools?: { name: string } | null;
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
  const { user, isAdmin, uploadSchoolLogo } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'payments' | 'papers' | 'users' | 'quizzes' | 'schools' | 'notices' | 'timetables'>(isAdmin ? 'payments' : 'notices');
  const [filterRole, setFilterRole] = useState<'All' | 'student' | 'teacher' | 'admin'>('All');
  const [filterSchool, setFilterSchool] = useState<string>('All');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]); // PHASE 5: Fetch full quizzes
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [pendingSchoolRequests, setPendingSchoolRequests] = useState<{ school: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // School directory search
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

  // School form states
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolPrimaryColor, setNewSchoolPrimaryColor] = useState('#6200EE');
  const [newSchoolAccentColor, setNewSchoolAccentColor] = useState('#03DAC6');

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
  const [paperSearchQuery, setPaperSearchQuery] = useState('');
  const [paperGradeFilter, setPaperGradeFilter] = useState<'All' | 'NSSCO' | 'NSSCAS' | 'IGCSE' | 'AS Level'>('All');

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
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizSearchQuery, setQuizSearchQuery] = useState('');
  const [quizGradeFilter, setQuizGradeFilter] = useState<'All' | 'NSSCO' | 'NSSCAS'>('All');

  // NEW: Dynamic Subjects States
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Notice form states
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeIsUrgent, setNoticeIsUrgent] = useState(false);
  const [noticesList, setNoticesList] = useState<Notice[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeSearchQuery, setNoticeSearchQuery] = useState('');
  const [noticeScopeFilter, setNoticeScopeFilter] = useState<'All' | 'National' | 'School'>('All');

  // Timetable form states
  const [showTimetableForm, setShowTimetableForm] = useState(false);
  const [timetableCurriculum, setTimetableCurriculum] = useState('NSSCO');
  const [timetableSubject, setTimetableSubject] = useState('Mathematics');
  const [timetablePaper, setTimetablePaper] = useState('Paper 1');
  const [timetableDate, setTimetableDate] = useState(new Date().toISOString().split('T')[0]);
  const [timetableTime, setTimetableTime] = useState('08:00 AM');
  const [timetableDuration, setTimetableDuration] = useState('2 hours');
  const [timetableVenue, setTimetableVenue] = useState('Main Hall');
  const [timetablesList, setTimetablesList] = useState<Timetable[]>([]);
  const [editingTimetableId, setEditingTimetableId] = useState<string | null>(null);
  const [timetableSearchQuery, setTimetableSearchQuery] = useState('');
  const [timetableScopeFilter, setTimetableScopeFilter] = useState<'All' | 'National' | 'School'>('All');

  // User Management Form states
  const [showManageSchoolForm, setShowManageSchoolForm] = useState(false);
  const [manageSchoolUserId, setManageSchoolUserId] = useState<string | null>(null);
  const [manageSchoolId, setManageSchoolId] = useState<string | null>(null);
  const [manageSchoolAdmin, setManageSchoolAdmin] = useState(false);
  const [manageSchoolUserName, setManageSchoolUserName] = useState('');
  const [manageSchoolUserRole, setManageSchoolUserRole] = useState('');
  const [manageSchoolUserEmail, setManageSchoolUserEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [papersRes, usersRes, quizzesRes, paymentsRes, subjectsRes, schoolsRes, noticesRes, timetablesRes] = await Promise.all([
      supabase.from('papers').select('*').order('year', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('quizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*, users(name, email, grade_level)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('name').order('name'),
      supabase.from('schools').select('*').order('name'),
      supabase.from('school_announcements').select('*, schools(name)').order('created_at', { ascending: false }),
      supabase.from('school_timetables').select('*, schools(name)').order('exam_date', { ascending: true })
    ]);

    if (papersRes.data) setPapers(papersRes.data);
    if (usersRes.data) setUsers(usersRes.data as any as UserRecord[]);
    if (quizzesRes.data) setQuizzes(quizzesRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRecord[]);
    if (subjectsRes.data) setAvailableSubjects(subjectsRes.data.map((s: { name: string }) => s.name));
    if (schoolsRes.data) setSchoolsList(schoolsRes.data);
    if (noticesRes.data) setNoticesList(noticesRes.data);
    if (timetablesRes.data) setTimetablesList(timetablesRes.data);

    // Compute pending school requests from the fetched users
    if (usersRes.data) {
      const counts: Record<string, number> = {};
      (usersRes.data as any as UserRecord[]).forEach((u) => {
        if (u.school && !u.school_id) {
          counts[u.school] = (counts[u.school] || 0) + 1;
        }
      });
      setPendingSchoolRequests(
        Object.entries(counts).map(([school, count]) => ({ school, count }))
      );
    }

    setLoading(false);
  };

  const handleAddSchool = async () => {
    if (!newSchoolName.trim()) {
      Alert.alert('Error', 'School name is required');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from('schools').insert({
      name: newSchoolName.trim(),
      code: newSchoolCode.trim() || null,
      primary_color: newSchoolPrimaryColor.trim() || '#6200EE',
      accent_color: newSchoolAccentColor.trim() || '#03DAC6',
    }).select('id').single();
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Failed to add school: ' + error.message);
    } else if (data) {
      // Auto-link pending users who requested this exact school name
      await supabase
        .from('users')
        .update({ school_id: data.id, school_locked: true })
        .eq('school', newSchoolName.trim())
        .is('school_id', null);

      setShowSchoolForm(false);
      setNewSchoolName('');
      setNewSchoolCode('');
      setNewSchoolPrimaryColor('#6200EE');
      setNewSchoolAccentColor('#03DAC6');
      fetchData();
    }
  };

  const handleManageSchool = async () => {
    if (!manageSchoolUserId) return;
    setSaving(true);
    const { error } = await supabase.rpc('set_school_admin_assignment', {
      target_user_id: manageSchoolUserId || '',
      target_school_id: manageSchoolId || '',
      new_is_school_admin: manageSchoolAdmin,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowManageSchoolForm(false);
      fetchData();
    }
  };

  const handleLogoUpload = async (schoolId: string, currentSchoolName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets[0]) return;

      const file = result.assets[0];
      const mimeType = file.type === 'image' ? 'image/jpeg' : (file.mimeType || 'image/jpeg');

      const publicUrl = await uploadSchoolLogo({
        uri: file.uri,
        type: mimeType,
        name: file.fileName || `logo.jpg`
      }, schoolId);

      if (publicUrl) {
        const { error } = await supabase
          .from('schools')
          .update({ logo_url: publicUrl })
          .eq('id', schoolId);
        
        if (error) {
          Alert.alert('Error', 'Failed to update school record');
        } else {
          fetchData(); // Refresh the list
        }
      } else {
        Alert.alert('Error', 'Failed to upload image');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An unexpected error occurred during upload');
    }
  };

  const handleSaveNotice = async () => {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      Alert.alert('Error', 'Title and content are required.');
      return;
    }
    setSaving(true);
    const targetSchoolId = isAdmin ? null : user?.school_id || null;
    const noticeData = {
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      is_urgent: noticeIsUrgent,
      school_id: targetSchoolId,
      author_id: user?.id || null,
    };
    
    if (editingNoticeId) {
      const { error } = await supabase.from('school_announcements').update(noticeData).eq('id', editingNoticeId);
      if (error) Alert.alert('Error', 'Failed to update notice: ' + error.message);
      else Alert.alert('Success', 'Notice updated!');
    } else {
      const { error } = await supabase.from('school_announcements').insert(noticeData);
      if (error) Alert.alert('Error', 'Failed to add notice: ' + error.message);
      else Alert.alert('Success', 'Notice added!');
    }
    
    setSaving(false);
    setShowNoticeForm(false);
    setNoticeTitle('');
    setNoticeContent('');
    setNoticeIsUrgent(false);
    setEditingNoticeId(null);
    fetchData();
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeTitle(notice.title);
    setNoticeContent(notice.content);
    setNoticeIsUrgent(notice.is_urgent || false);
    setShowNoticeForm(true);
  };

  const handleDeleteNotice = (noticeId: string) => {
    Alert.alert('Delete Notice', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('school_announcements').delete().eq('id', noticeId); fetchData(); } },
    ]);
  };

  const handleSaveTimetable = async () => {
    if (!timetableSubject.trim()) {
      Alert.alert('Error', 'Subject name is required.');
      return;
    }
    setSaving(true);
    const targetSchoolId = isAdmin ? null : user?.school_id || null;
    const timetableData = {
      curriculum: timetableCurriculum,
      subject_name: timetableSubject.trim(),
      paper_code: timetablePaper.trim(),
      exam_date: timetableDate,
      start_time: timetableTime.trim(),
      duration: timetableDuration.trim(),
      venue: timetableVenue.trim(),
      school_id: targetSchoolId,
    };
    
    if (editingTimetableId) {
      const { error } = await supabase.from('school_timetables').update(timetableData).eq('id', editingTimetableId);
      if (error) Alert.alert('Error', 'Failed to update timetable: ' + error.message);
      else Alert.alert('Success', 'Timetable updated!');
    } else {
      const { error } = await supabase.from('school_timetables').insert(timetableData);
      if (error) Alert.alert('Error', 'Failed to add timetable: ' + error.message);
      else Alert.alert('Success', 'Timetable added!');
    }
    
    setShowTimetableForm(false);
    setTimetableSubject('');
    setTimetablePaper('');
    setEditingTimetableId(null);
    fetchData();
    setSaving(false);
  };

  const handleEditTimetable = (item: Timetable) => {
    setEditingTimetableId(item.id);
    setTimetableCurriculum(item.curriculum || 'NSSCO');
    setTimetableSubject(item.subject_name || '');
    setTimetablePaper(item.paper_code || '');
    setTimetableDate(item.exam_date || new Date().toISOString().split('T')[0]);
    setTimetableTime(item.start_time || '');
    setTimetableDuration(item.duration || '');
    setTimetableVenue(item.venue || '');
    setShowTimetableForm(true);
  };

  const handleDeleteTimetable = (timetableId: string) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('school_timetables').delete().eq('id', timetableId); fetchData(); } },
    ]);
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to upload document.';
      Alert.alert('Upload Error', msg);
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
                  const isYearly = p.amount >= 540 || p.plan_type === 'yearly';
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
    const quizData = {
      subject: quizSubject,
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
    };
    
    if (editingQuizId) {
      const { error } = await supabase.from('quizzes').update(quizData).eq('id', editingQuizId);
      if (error) Alert.alert('Error', 'Failed to update quiz question.');
      else Alert.alert('Success', 'Quiz question updated!');
    } else {
      const { error } = await supabase.from('quizzes').insert(quizData);
      if (error) Alert.alert('Error', 'Failed to add quiz question.');
      else Alert.alert('Success', 'Quiz question added!');
    }
    
    setSaving(false);
    setShowQuizForm(false);
    
    // Reset form
    setQuizTopic('');
    setQuizQuestion('');
    setQuizA('');
    setQuizB('');
    setQuizC('');
    setQuizD('');
    setQuizExplanation('');
    setEditingQuizId(null);
    fetchData();
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizSubject(quiz.subject || 'Mathematics');
    setQuizTopic(quiz.topic_name || '');
    setQuizQuestion(quiz.question || '');
    setQuizA(quiz.option_a || '');
    setQuizB(quiz.option_b || '');
    setQuizC(quiz.option_c || '');
    setQuizD(quiz.option_d || '');
    setQuizCorrect((quiz.correct_answer as any) || 'A');
    setQuizExplanation(quiz.explanation_text || '');
    setQuizGrade((quiz.grade_level as any) || 'NSSCO');
    setQuizDifficulty((quiz.difficulty as any) || 'Medium');
    setShowQuizForm(true);
  };

  const handleDeleteQuiz = (quizId: string) => {
    Alert.alert('Delete Quiz', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('quizzes').delete().eq('id', quizId); fetchData(); } },
    ]);
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

  if (!isAdmin && !user?.is_school_admin) return null;

  const superAdminTabs = ['payments', 'papers', 'users', 'quizzes', 'schools'] as const;
  const schoolAdminTabs = ['notices', 'timetables'] as const;
  const availableTabs = isAdmin ? [...superAdminTabs, ...schoolAdminTabs] : schoolAdminTabs;

  return (
    <View style={{ flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
      {/* Curriculum & Notes CMS Entry */}
      {isAdmin && (
        <TouchableOpacity 
          style={{ 
            backgroundColor: COLORS.primary, 
            padding: SPACING.lg, 
            borderRadius: RADIUS.md, 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginTop: SPACING.md,
            ...SHADOWS.sm
          }}
          onPress={() => router.push('/admin/curriculum' as any)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="book" size={20} color={COLORS.white} />
            </View>
            <View>
              <Text style={{ ...FONTS.h3, color: COLORS.white, marginBottom: 2 }}>Curriculum & Notes</Text>
              <Text style={{ ...FONTS.caption, color: 'rgba(255,255,255,0.8)' }}>Manage subjects, sections, topics and content blocks</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

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
          
          <View style={{ flexBasis: '31%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.gold }}>{quizzes.length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Quiz Questions</Text>
          </View>

          <View style={{ flexBasis: '31%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>{schoolsList.length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Registered Schools</Text>
          </View>

          <View style={{ flexBasis: '48%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.gold }}>{pendingPayments.length}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Pending Payments</Text>
          </View>

          <View style={{ flexBasis: '48%', backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.green }}>N${totalRevenue.toFixed(2)}</Text>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Approved Payments Revenue</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabs, { marginHorizontal: -SPACING.lg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 16 }}>
          {availableTabs.map(tab => {
            const icons: Record<string, string> = { payments: 'card', papers: 'document-text', users: 'people', quizzes: 'help-circle', schools: 'school', notices: 'megaphone', timetables: 'calendar' };
            const badge = tab === 'payments' ? pendingPayments.length : 0;
            return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <View style={styles.tabInner}>
                <Ionicons name={icons[tab] as keyof typeof Ionicons.glyphMap} size={16} color={activeTab === tab ? COLORS.primary : COLORS.textMuted} />
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
        </ScrollView>
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
          {activeTab === 'papers' && (() => {
            const filteredPapers = papers.filter(p => {
              const matchesSearch = p.title.toLowerCase().includes(paperSearchQuery.toLowerCase()) || (p.subject && p.subject.toLowerCase().includes(paperSearchQuery.toLowerCase()));
              const matchesGrade = paperGradeFilter === 'All' || p.grade_level === paperGradeFilter;
              return matchesSearch && matchesGrade;
            });
            return (
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

              {/* Papers Search & Filter */}
              <View style={{ marginBottom: SPACING.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm, marginBottom: SPACING.sm }}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{ flex: 1, ...FONTS.body, color: COLORS.textPrimary, marginLeft: SPACING.sm }}
                    placeholder="Search papers by title or subject..."
                    placeholderTextColor={COLORS.textMuted}
                    value={paperSearchQuery}
                    onChangeText={setPaperSearchQuery}
                  />
                  {paperSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setPaperSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {(['All', 'NSSCO', 'NSSCAS', 'IGCSE', 'AS Level'] as const).map(grade => (
                    <TouchableOpacity
                      key={grade}
                      style={[styles.filterChip, paperGradeFilter === grade && styles.filterChipActive]}
                      onPress={() => setPaperGradeFilter(grade)}
                    >
                      <Text style={[styles.filterChipText, paperGradeFilter === grade && styles.filterChipTextActive]}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>{filteredPapers.length} paper(s) found.</Text>
              
              {filteredPapers.map(paper => (
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
            );
          })()}

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

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, gap: SPACING.sm }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingBottom: SPACING.sm }}>
                  {(['All', 'student', 'teacher', 'admin'] as const).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
                      onPress={() => setFilterRole(role)}
                    >
                      <Text style={[styles.filterChipText, filterRole === role && styles.filterChipTextActive]}>
                        {role === 'All' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* School Filter Dropdown (simplified as a horizontal scroll for now) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingBottom: SPACING.sm, borderLeftWidth: 1, borderLeftColor: COLORS.border, paddingLeft: SPACING.sm }}>
                  <TouchableOpacity
                    style={[styles.filterChip, filterSchool === 'All' && styles.filterChipActive]}
                    onPress={() => setFilterSchool('All')}
                  >
                    <Text style={[styles.filterChipText, filterSchool === 'All' && styles.filterChipTextActive]}>
                      All Schools
                    </Text>
                  </TouchableOpacity>
                  {Array.from(new Set(users.map(u => u.school).filter(Boolean))).map((schoolName) => (
                    <TouchableOpacity
                      key={schoolName as string}
                      style={[styles.filterChip, filterSchool === schoolName && styles.filterChipActive]}
                      onPress={() => setFilterSchool(schoolName as string)}
                    >
                      <Text style={[styles.filterChipText, filterSchool === schoolName && styles.filterChipTextActive]}>
                        {schoolName as string}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {users
                .filter(u => {
                  if (filterSchool !== 'All' && u.school !== filterSchool) return false;
                  
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
                        {Boolean(u.school) && (
                          <Text style={[styles.adminCardSub, { marginTop: 4, color: COLORS.textMuted, fontSize: 11 }]}>
                            🏫 {u.school}
                          </Text>
                        )}
                      </View>
                      {isAdmin && u.role === 'teacher' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15', marginLeft: SPACING.sm }]}
                          onPress={() => {
                            setManageSchoolUserId(u.id);
                            setManageSchoolUserName(u.name);
                            setManageSchoolUserEmail(u.email);
                            setManageSchoolUserRole(u.role || '');
                            setManageSchoolId(u.school_id || null);
                            setManageSchoolAdmin(u.is_school_admin || false);
                            setShowManageSchoolForm(true);
                          }}
                        >
                          <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* QUIZZES TAB */}
          {activeTab === 'quizzes' && (() => {
            const filteredQuizzes = quizzes.filter(q => {
              const matchesSearch = (q.topic_name && q.topic_name.toLowerCase().includes(quizSearchQuery.toLowerCase())) || 
                                    (q.subject && q.subject.toLowerCase().includes(quizSearchQuery.toLowerCase())) ||
                                    (q.question && q.question.toLowerCase().includes(quizSearchQuery.toLowerCase()));
              const matchesGrade = quizGradeFilter === 'All' || q.grade_level === quizGradeFilter;
              return matchesSearch && matchesGrade;
            });
            return (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingQuizId(null); setShowQuizForm(true); }}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add Quiz Question</Text>
              </TouchableOpacity>
              
              {/* Quizzes Search & Filter */}
              <View style={{ marginBottom: SPACING.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm, marginBottom: SPACING.sm }}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{ flex: 1, ...FONTS.body, color: COLORS.textPrimary, marginLeft: SPACING.sm }}
                    placeholder="Search quizzes by topic, subject or question..."
                    placeholderTextColor={COLORS.textMuted}
                    value={quizSearchQuery}
                    onChangeText={setQuizSearchQuery}
                  />
                  {quizSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setQuizSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {(['All', 'NSSCO', 'NSSCAS'] as const).map(grade => (
                    <TouchableOpacity
                      key={grade}
                      style={[styles.filterChip, quizGradeFilter === grade && styles.filterChipActive]}
                      onPress={() => setQuizGradeFilter(grade)}
                    >
                      <Text style={[styles.filterChipText, quizGradeFilter === grade && styles.filterChipTextActive]}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>{filteredQuizzes.length} question(s) found.</Text>
              
              {filteredQuizzes.map(quiz => (
                <View key={quiz.id} style={styles.adminCard}>
                  <View style={styles.adminCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardTitle}>{quiz.topic_name} - {quiz.subject}</Text>
                      <Text style={styles.adminCardSub}>
                        {quiz.grade_level} • Difficulty: {quiz.difficulty}
                      </Text>
                      <Text style={[styles.adminCardSub, {marginTop: 4, color: COLORS.textPrimary}]} numberOfLines={2}>{quiz.question}</Text>
                    </View>
                    <View style={styles.adminCardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent + '15' }]} onPress={() => handleEditQuiz(quiz)}>
                        <Ionicons name="create" size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDeleteQuiz(quiz.id)}>
                        <Ionicons name="trash" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            );
          })()}

          {activeTab === 'schools' && isAdmin && (() => {
            // Single-pass aggregation of school statistics from in-memory users
            const schoolStats = users.reduce<Record<string, { learners: number; teachers: number }>>((acc, u) => {
              if (!u.school_id) return acc;
              if (!acc[u.school_id]) acc[u.school_id] = { learners: 0, teachers: 0 };
              if (u.role === 'student') acc[u.school_id].learners++;
              else if (u.role === 'teacher') acc[u.school_id].teachers++;
              // Users with null/undefined/admin roles are not counted as learners or teachers
              return acc;
            }, {});

            const filteredSchools = schoolsList.filter(school =>
              school.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()) ||
              (school.code && school.code.toLowerCase().includes(schoolSearchQuery.toLowerCase()))
            );

            return (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowSchoolForm(true)}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add New School</Text>
              </TouchableOpacity>

              {/* School Search */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 10, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm }}>
                <Ionicons name="search" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={{ flex: 1, ...FONTS.body, color: COLORS.textPrimary, marginLeft: SPACING.sm }}
                  placeholder="Search schools by name or code..."
                  placeholderTextColor={COLORS.textMuted}
                  value={schoolSearchQuery}
                  onChangeText={setSchoolSearchQuery}
                />
                {schoolSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSchoolSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Pending School Requests */}
              {pendingSchoolRequests.length > 0 && (
                <View style={{ marginBottom: SPACING.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md }}>
                    <Ionicons name="time" size={20} color={'#F59E0B'} />
                    <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>Pending School Requests ({pendingSchoolRequests.length})</Text>
                  </View>
                  {pendingSchoolRequests.map((req) => (
                    <View key={req.school} style={[styles.adminCard, { borderLeftWidth: 3, borderLeftColor: '#F59E0B' }]}>
                      <View style={styles.adminCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adminCardTitle}>{req.school}</Text>
                          <Text style={{ ...FONTS.small, color: COLORS.textSecondary, marginTop: 2 }}>
                            {req.count} user{req.count > 1 ? 's' : ''} requesting this school
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.schoolApproveBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => {
                            setNewSchoolName(req.school);
                            setShowSchoolForm(true);
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                          <Text style={{ ...FONTS.caption, color: COLORS.white, fontWeight: '700', marginLeft: 4 }}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* School Directory */}
              <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>
                {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}{schoolSearchQuery ? ' matching' : ' registered'}
              </Text>
              {filteredSchools.map(school => {
                const stats = schoolStats[school.id] || { learners: 0, teachers: 0 };
                return (
                  <TouchableOpacity
                    key={school.id}
                    style={styles.adminCard}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/school-details/${school.id}` as import('expo-router').Href)}
                  >
                    <View style={styles.adminCardHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                        {school.logo_url ? (
                          <Image source={{ uri: school.logo_url }} style={{ width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt }} />
                        ) : (
                          <View style={{ width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: school.primary_color || COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ ...FONTS.h3, color: COLORS.white }}>{school.name.charAt(0)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adminCardTitle}>{school.name}</Text>
                          {school.code && (
                            <View style={[styles.roleBadge, { alignSelf: 'flex-start', marginTop: 4 }]}>
                              <Text style={styles.roleBadgeText}>{school.code}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleLogoUpload(school.id, school.name)}>
                        <Ionicons name="image-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* School Stats */}
                    <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.primary + '10', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full }}>
                        <Ionicons name="school-outline" size={14} color={COLORS.primary} />
                        <Text style={{ ...FONTS.caption, color: COLORS.primary, fontWeight: '700' }}>{stats.learners}</Text>
                        <Text style={{ ...FONTS.small, color: COLORS.primary }}>Learners</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.accent + '10', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full }}>
                        <Ionicons name="briefcase-outline" size={14} color={COLORS.accent} />
                        <Text style={{ ...FONTS.caption, color: COLORS.accent, fontWeight: '700' }}>{stats.teachers}</Text>
                        <Text style={{ ...FONTS.small, color: COLORS.accent }}>Teachers</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })()}

          {/* NOTICES TAB */}
          {activeTab === 'notices' && (() => {
            const filteredNotices = noticesList.filter(n => {
              const matchesSearch = n.title?.toLowerCase().includes(noticeSearchQuery.toLowerCase()) || 
                                    n.content?.toLowerCase().includes(noticeSearchQuery.toLowerCase());
              
              let matchesScope = true;
              if (noticeScopeFilter === 'National') matchesScope = !n.school_id;
              else if (noticeScopeFilter === 'School') matchesScope = !!n.school_id;
              
              return matchesSearch && matchesScope;
            });
            return (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingNoticeId(null); setShowNoticeForm(true); }}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Post Notice</Text>
              </TouchableOpacity>
              
              {/* Notices Search & Filter */}
              <View style={{ marginBottom: SPACING.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm, marginBottom: SPACING.sm }}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{ flex: 1, ...FONTS.body, color: COLORS.textPrimary, marginLeft: SPACING.sm }}
                    placeholder="Search notices..."
                    placeholderTextColor={COLORS.textMuted}
                    value={noticeSearchQuery}
                    onChangeText={setNoticeSearchQuery}
                  />
                  {noticeSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setNoticeSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {(['All', 'National', 'School'] as const).map(scope => (
                    <TouchableOpacity
                      key={scope}
                      style={[styles.filterChip, noticeScopeFilter === scope && styles.filterChipActive]}
                      onPress={() => setNoticeScopeFilter(scope)}
                    >
                      <Text style={[styles.filterChipText, noticeScopeFilter === scope && styles.filterChipTextActive]}>{scope}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>{filteredNotices.length} notice(s) found.</Text>
              
              {filteredNotices.map(notice => (
                <View key={notice.id} style={styles.adminCard}>
                  <View style={styles.adminCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardTitle}>{notice.title}</Text>
                      <Text style={[styles.adminCardSub, { marginTop: 4 }]}>
                        {notice.schools?.name || 'National'} {notice.is_urgent && '• URGENT'}
                      </Text>
                    </View>
                    <View style={styles.adminCardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent + '15' }]} onPress={() => handleEditNotice(notice)}>
                        <Ionicons name="create" size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDeleteNotice(notice.id)}>
                        <Ionicons name="trash" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            );
          })()}

          {/* TIMETABLES TAB */}
          {activeTab === 'timetables' && (() => {
            const filteredTimetables = timetablesList.filter(t => {
              const matchesSearch = (t.subject_name && t.subject_name.toLowerCase().includes(timetableSearchQuery.toLowerCase())) || 
                                    (t.paper_code && t.paper_code.toLowerCase().includes(timetableSearchQuery.toLowerCase()));
              
              let matchesScope = true;
              if (timetableScopeFilter === 'National') matchesScope = !t.school_id;
              else if (timetableScopeFilter === 'School') matchesScope = !!t.school_id;
              
              return matchesSearch && matchesScope;
            });
            return (
            <View style={styles.tabContent}>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingTimetableId(null); setShowTimetableForm(true); }}>
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add Timetable Event</Text>
              </TouchableOpacity>
              
              {/* Timetables Search & Filter */}
              <View style={{ marginBottom: SPACING.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm, marginBottom: SPACING.sm }}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={{ flex: 1, ...FONTS.body, color: COLORS.textPrimary, marginLeft: SPACING.sm }}
                    placeholder="Search events by subject or paper code..."
                    placeholderTextColor={COLORS.textMuted}
                    value={timetableSearchQuery}
                    onChangeText={setTimetableSearchQuery}
                  />
                  {timetableSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setTimetableSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {(['All', 'National', 'School'] as const).map(scope => (
                    <TouchableOpacity
                      key={scope}
                      style={[styles.filterChip, timetableScopeFilter === scope && styles.filterChipActive]}
                      onPress={() => setTimetableScopeFilter(scope)}
                    >
                      <Text style={[styles.filterChipText, timetableScopeFilter === scope && styles.filterChipTextActive]}>{scope}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SPACING.md }}>{filteredTimetables.length} event(s) found.</Text>
              
              {filteredTimetables.map(item => (
                <View key={item.id} style={styles.adminCard}>
                  <View style={styles.adminCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminCardTitle}>{item.subject_name} ({item.paper_code})</Text>
                      <Text style={[styles.adminCardSub, { marginTop: 4 }]}>
                        {item.exam_date} at {item.start_time} • {item.schools?.name || 'National'}
                      </Text>
                    </View>
                    <View style={styles.adminCardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent + '15' }]} onPress={() => handleEditTimetable(item)}>
                        <Ionicons name="create" size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.redLight }]} onPress={() => handleDeleteTimetable(item.id)}>
                        <Ionicons name="trash" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            );
          })()}

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

      {/* NEW SCHOOL FORM MODAL */}
      <Modal visible={showSchoolForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New School</Text>
                <TouchableOpacity onPress={() => setShowSchoolForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>School Name *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Windhoek High School" placeholderTextColor={COLORS.textMuted} value={newSchoolName} onChangeText={setNewSchoolName} />
              
              <Text style={styles.formLabel}>School Code</Text>
              <TextInput style={styles.formInput} placeholder="e.g. WHS" placeholderTextColor={COLORS.textMuted} value={newSchoolCode} onChangeText={setNewSchoolCode} />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Primary Color (Hex)</Text>
                  <TextInput style={styles.formInput} placeholder="#6200EE" placeholderTextColor={COLORS.textMuted} value={newSchoolPrimaryColor} onChangeText={setNewSchoolPrimaryColor} />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Accent Color (Hex)</Text>
                  <TextInput style={styles.formInput} placeholder="#03DAC6" placeholderTextColor={COLORS.textMuted} value={newSchoolAccentColor} onChangeText={setNewSchoolAccentColor} />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }, { marginTop: SPACING.xl }]} onPress={handleAddSchool} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Save School</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NEW NOTICE MODAL */}
      <Modal visible={showNoticeForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Post Notice</Text>
                <TouchableOpacity onPress={() => setShowNoticeForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Title *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Exam Updates" placeholderTextColor={COLORS.textMuted} value={noticeTitle} onChangeText={setNoticeTitle} />

              <Text style={styles.formLabel}>Content *</Text>
              <TextInput style={[styles.formInput, { height: 100 }]} placeholder="Notice details..." placeholderTextColor={COLORS.textMuted} value={noticeContent} onChangeText={setNoticeContent} multiline />
              
              <Text style={styles.formLabel}>Content Scope</Text>
              <View style={[styles.filterChip, styles.filterChipActive, { alignSelf: 'flex-start', marginBottom: SPACING.md }]}>
                <Text style={styles.filterChipTextActive}>
                  {isAdmin ? '● National' : `● My School — ${user?.school || 'Unknown'}`}
                </Text>
              </View>

              <TouchableOpacity style={styles.uploadBtn} onPress={() => setNoticeIsUrgent(!noticeIsUrgent)}>
                <Ionicons name={noticeIsUrgent ? "alert-circle" : "alert-circle-outline"} size={24} color={noticeIsUrgent ? COLORS.red : COLORS.primary} />
                <Text style={[styles.uploadBtnText, { color: noticeIsUrgent ? COLORS.red : COLORS.primary }]}>Mark as Urgent</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }, { marginTop: SPACING.xl }]} onPress={handleSaveNotice} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="paper-plane" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Post Notice</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NEW TIMETABLE MODAL */}
      <Modal visible={showTimetableForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Timetable Event</Text>
                <TouchableOpacity onPress={() => setShowTimetableForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Content Scope</Text>
              <View style={[styles.filterChip, styles.filterChipActive, { alignSelf: 'flex-start', marginBottom: SPACING.md }]}>
                <Text style={styles.filterChipTextActive}>
                  {isAdmin ? '● National' : `● My School — ${user?.school || 'Unknown'}`}
                </Text>
              </View>

              <Text style={styles.formLabel}>Curriculum</Text>
              <View style={styles.pickerContainer}>
                {['NSSCO', 'NSSCAS'].map(level => (
                  <TouchableOpacity key={level} style={[styles.gradePill, timetableCurriculum === level && styles.gradePillActive]} onPress={() => setTimetableCurriculum(level)}>
                    <Text style={[styles.gradePillText, timetableCurriculum === level && styles.gradePillTextActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Subject Name *</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Mathematics" placeholderTextColor={COLORS.textMuted} value={timetableSubject} onChangeText={setTimetableSubject} />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Paper Code</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. Paper 1" placeholderTextColor={COLORS.textMuted} value={timetablePaper} onChangeText={setTimetablePaper} />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Exam Date (YYYY-MM-DD)</Text>
                  <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={timetableDate} onChangeText={setTimetableDate} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. 08:00 AM" placeholderTextColor={COLORS.textMuted} value={timetableTime} onChangeText={setTimetableTime} />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Duration</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. 2 hours" placeholderTextColor={COLORS.textMuted} value={timetableDuration} onChangeText={setTimetableDuration} />
                </View>
              </View>

              <Text style={styles.formLabel}>Venue</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Main Hall" placeholderTextColor={COLORS.textMuted} value={timetableVenue} onChangeText={setTimetableVenue} />

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }, { marginTop: SPACING.xl }]} onPress={handleSaveTimetable} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="add-circle" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Save Event</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* MANAGE SCHOOL MODAL */}
      <Modal visible={showManageSchoolForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage School</Text>
                <TouchableOpacity onPress={() => setShowManageSchoolForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md }}>
                <Text style={{ ...FONTS.bodyBold, color: COLORS.textPrimary }}>{manageSchoolUserName}</Text>
                <Text style={{ ...FONTS.small, color: COLORS.textSecondary }}>{manageSchoolUserEmail}</Text>
                <View style={[styles.roleBadge, { backgroundColor: COLORS.accent + '20', alignSelf: 'flex-start', marginTop: 8 }]}>
                  <Text style={[styles.roleBadgeText, { color: COLORS.accent }]}>Teacher</Text>
                </View>
              </View>

              <Text style={styles.formLabel}>School Assignment</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.xs, paddingHorizontal: SPACING.xs }}>
                  <TouchableOpacity
                    style={[styles.gradePill, manageSchoolId === null && styles.gradePillActive]}
                    onPress={() => setManageSchoolId(null)}
                  >
                    <Text style={[styles.gradePillText, manageSchoolId === null && styles.gradePillTextActive]}>Unassigned</Text>
                  </TouchableOpacity>
                  {schoolsList.map(school => (
                    <TouchableOpacity
                      key={school.id}
                      style={[styles.gradePill, manageSchoolId === school.id && styles.gradePillActive]}
                      onPress={() => setManageSchoolId(school.id)}
                    >
                      <Text style={[styles.gradePillText, manageSchoolId === school.id && styles.gradePillTextActive]}>{school.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.formLabel}>School Admin Privileges</Text>
              <TouchableOpacity
                style={[
                  styles.uploadBtn, 
                  { borderColor: manageSchoolAdmin ? COLORS.primary : COLORS.border, backgroundColor: manageSchoolAdmin ? COLORS.primary + '10' : 'transparent', marginBottom: SPACING.md }
                ]}
                onPress={() => setManageSchoolAdmin(!manageSchoolAdmin)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  <Ionicons name={manageSchoolAdmin ? "checkbox" : "square-outline"} size={24} color={manageSchoolAdmin ? COLORS.primary : COLORS.textMuted} />
                  <View>
                    <Text style={{ ...FONTS.bodyBold, color: manageSchoolAdmin ? COLORS.primary : COLORS.textPrimary }}>School Admin {manageSchoolAdmin ? 'ON' : 'OFF'}</Text>
                    <Text style={{ ...FONTS.caption, color: COLORS.textMuted }}>{manageSchoolAdmin ? 'Can manage school content' : 'Ordinary teacher'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={{ backgroundColor: COLORS.red + '10', padding: SPACING.sm, borderRadius: RADIUS.sm, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: SPACING.xl }}>
                <Ionicons name="information-circle" size={16} color={COLORS.red} />
                <Text style={{ ...FONTS.caption, color: COLORS.red, flex: 1 }}>
                  Platform Admin status cannot be modified here.
                </Text>
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleManageSchool} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Ionicons name="save" size={20} color={COLORS.white} /><Text style={styles.saveBtnText}>Save Assignment</Text></>
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
  tab: { paddingVertical: SPACING.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
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
  schoolApproveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  gradePill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradePillActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  gradePillText: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
  },
  gradePillTextActive: {
    color: COLORS.primary,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  uploadBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
});