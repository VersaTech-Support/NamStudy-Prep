import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  actions?: { type: 'quiz' | 'flashcards' | 'topic' }[];
}

export default function TutorScreen() {
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{ topicId?: string; topicName?: string; subject?: string; grade?: string; curriculum?: string }>();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: true });

      if (data && !error) {
        setMessages(data as AIMessage[]);
      } else if (error && error.code !== '42P01') {
        console.error('Fetch AI messages error:', error.message);
      }
    } catch (err) {
      console.error('Fetch AI messages exception:', err);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(), 500);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const getAIResponse = async (allMessages: AIMessage[]) => {
    setIsTyping(true);

    let replyContent = "I'm having trouble connecting right now. Please try again in a moment!";
    let parsedActions: any[] = [];

    try {
      const chatHistory = allMessages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const userContext = {
        curriculum: params.curriculum || (user?.grade_level === 'IGCSE' || user?.grade_level === 'AS Level' ? 'Cambridge' : 'Namibian'),
        gradeLevel: params.grade || user?.grade_level || 'NSSCO',
        subjects: user?.subjects || [],
        topicId: params.topicId,
        topicName: params.topicName,
        currentSubject: params.subject
      };

      const { data, error } = await supabase.functions.invoke('ai-tutor', {
        body: { messages: chatHistory, context: userContext },
      });

      if (error) {
        console.error('Edge Function error:', error.message || error);
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errBody = await error.context.json();
            console.error('Edge Function diagnostic:', JSON.stringify(errBody));
            if (errBody?.details) {
              console.error('Upstream details:', errBody.details);
            }
            if (errBody?.reply) replyContent = errBody.reply;
          } catch (_) { /* ignore */ }
        }
      } else if (data?.reply) {
        replyContent = data.reply;
        if (data.actions) parsedActions = data.actions;
      }
    } catch (err: any) {
      console.error('Failed to invoke AI tutor:', err?.message || err);
    }

    const aiMsg = {
      user_id: user?.id || '',
      role: 'assistant',
      content: replyContent,
    };

    try {
      const { data, error } = await supabase.from('ai_messages').insert(aiMsg).select().single();
      if (data && !error) {
        const newMessage = data as AIMessage;
        newMessage.actions = parsedActions; // Attach transient actions
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (e) {
      console.error('Failed to save AI response:', e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    
    const content = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    const userMsg = {
      user_id: user.id,
      role: 'user',
      content,
    };

    const tempId = Date.now().toString();
    const optimisticMsg: AIMessage = { ...userMsg, id: tempId, role: 'user', created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(), 100);

    try {
      const { data, error } = await supabase.from('ai_messages').insert(userMsg).select().single();
      if (data && !error) {
        setMessages((prev) => prev.map(m => m.id === tempId ? (data as AIMessage) : m));
      }
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    getAIResponse([...messages, optimisticMsg]);
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant]}>
        {!isUser && (
          <View style={styles.avatarAssistant}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAssistant]}>
            {item.content}
          </Text>
          {item.actions && item.actions.length > 0 && (
            <View style={styles.actionsContainer}>
              {item.actions.map((action, idx) => {
                let iconName: any = 'arrow-forward';
                let label = 'View';
                if (action.type === 'quiz') { iconName = 'help-circle-outline'; label = 'Practice Quiz'; } 
                else if (action.type === 'flashcards') { iconName = 'albums-outline'; label = 'Review Flashcards'; } 
                else if (action.type === 'topic') { iconName = 'book-outline'; label = 'View Topic'; }
                return (
                  <TouchableOpacity key={idx} style={styles.actionButton} onPress={() => {
                      if (!params.topicId) return;
                      if (action.type === 'quiz') router.push(`/quiz/${encodeURIComponent(params.topicName || '')}?topic_id=${params.topicId}&subject=${encodeURIComponent(params.subject || '')}` as any);
                      else if (action.type === 'flashcards') router.push(`/flashcards?topic_id=${params.topicId}&topic_name=${encodeURIComponent(params.topicName || '')}` as any);
                      else if (action.type === 'topic') router.push(`/topic/${params.topicId}` as any);
                    }}>
                    <Ionicons name={iconName} size={16} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>NamTutor AI</Text>
            <Text style={styles.headerSubtitle}>Your 24/7 Namibian Exam Expert</Text>
          </View>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sign In to Chat</Text>
          <Text style={styles.emptyText}>Create an account to get personalized tutoring help.</Text>
          <TouchableOpacity style={styles.authBtn} onPress={() => setAuthVisible(true)}>
            <Text style={styles.authBtnText}>Sign In</Text>
          </TouchableOpacity>
          <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
            <Ionicons name="sparkles" size={16} color={COLORS.gold} />
            <Text style={styles.headerTitle}>NamTutor AI</Text>
          </View>
          <Text style={styles.headerSubtitle}>Your 24/7 Namibian Exam Expert</Text>
        </View>
      </View>

      {params.topicName && (
        <View style={styles.contextBanner}>
          <Ionicons name="school" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.contextBannerText} numberOfLines={1}>
            Studying: <Text style={{ fontWeight: '600' }}>{params.topicName}</Text>
            {params.subject ? ` (${params.curriculum ? params.curriculum + ' • ' : ''}${params.subject})` : ''}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              messages.length === 0 && !isTyping ? (
                <View style={styles.emptyChatContainer}>
                  <View style={styles.emptyChatIconBg}>
                    <Ionicons name="sparkles" size={40} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyChatTitle}>Hi {user?.name?.split(' ')[0] || 'there'}!</Text>
                  <Text style={styles.emptyChatText}>
                    {params.topicName 
                      ? `I'm ready to help you with ${params.topicName}. What do you want to learn?` 
                      : 'I am your personal study assistant. Ask me anything about your school work!'}
                  </Text>
                  {params.topicName && (
                    <View style={styles.suggestedPromptsContainer}>
                      {["Explain this topic simply", "Test me on this topic", "Give me an exam-style example", "What are the common mistakes?"].map((promptText, i) => (
                        <TouchableOpacity key={i} style={styles.suggestedPromptChip} onPress={() => { setInputText(promptText); setTimeout(() => handleSend(), 0); }}>
                          <Text style={styles.suggestedPromptText}>{promptText}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : null
            }
            ListFooterComponent={
              isTyping ? (
                <View style={[styles.messageWrapper, styles.messageWrapperAssistant]}>
                  <View style={styles.avatarAssistant}>
                    <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                  </View>
                  <View style={[styles.messageBubble, styles.messageBubbleAssistant, { paddingVertical: 12, paddingHorizontal: 16 }]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                </View>
              ) : null
            }
            onContentSizeChange={scrollToBottom}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask NamTutor AI a question..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isTyping}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    backgroundColor: COLORS.primary, 
    paddingTop: Platform.OS === 'ios' ? 56 : 40, 
    paddingBottom: SPACING.lg, 
    paddingHorizontal: SPACING.xl, 
    flexDirection: 'row', 
    alignItems: 'center',
    ...SHADOWS.md,
    zIndex: 10
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...FONTS.h2, color: COLORS.white },
  headerSubtitle: { ...FONTS.small, color: 'rgba(255,255,255,0.8)' },
  contextBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight + '30', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  contextBannerText: { ...FONTS.small, color: COLORS.primaryDark, flex: 1 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.xl, textAlign: 'center' },
  authBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxl, paddingVertical: 12, borderRadius: RADIUS.md },
  authBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  chatContent: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
  emptyChatContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl, marginTop: SPACING.xl },
  emptyChatIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight + '30', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyChatTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyChatText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.lg },
  messageWrapper: { flexDirection: 'row', marginBottom: SPACING.md, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperAssistant: { justifyContent: 'flex-start' },
  avatarAssistant: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight + '40', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  messageBubble: { maxWidth: '80%', padding: SPACING.md, borderRadius: RADIUS.lg },
  messageBubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  messageBubbleAssistant: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  messageText: { ...FONTS.body, lineHeight: 22 },
  messageTextUser: { color: COLORS.white },
  messageTextAssistant: { color: COLORS.textPrimary },
  actionsContainer: { marginTop: SPACING.md, gap: SPACING.xs, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: SPACING.md },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary, alignSelf: 'flex-start' },
  actionButtonText: { ...FONTS.caption, fontWeight: '600', color: COLORS.primary, marginLeft: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 36 : 48, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  textInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingTop: 12, paddingBottom: 12, minHeight: 44, maxHeight: 120, ...FONTS.body, color: COLORS.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.sm, ...SHADOWS.sm },
  sendBtnDisabled: { backgroundColor: COLORS.borderLight, boxShadow: 'none' },
  suggestedPromptsContainer: { marginTop: SPACING.xl, gap: SPACING.sm, width: '100%' },
  suggestedPromptChip: { backgroundColor: COLORS.white, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryLight, boxShadow: `0px 1px 2px 0px ${COLORS.textPrimary}0D`, elevation: 1 },
  suggestedPromptText: { ...FONTS.caption, color: COLORS.primary, textAlign: 'center', fontWeight: '500' }
});
