import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import AuthModal from '@/components/AuthModal';

interface Flashcard {
  id: string;
  subject: string;
  grade_level: string;
  topic: string;
  front_content: string;
  back_content: string;
  topic_id?: string;
}

export default function FlashcardsScreen() {
  const { user } = useUser();
  const { topic_id, topic_name } = useLocalSearchParams<{ topic_id?: string; topic_name?: string }>();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      fetchFlashcards();
    } else {
      setCards([]);
      setLoading(false);
    }
  }, [user]);

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      let query = supabase.from('flashcards').select('*');
      
      const userIsAdmin = user?.role === 'admin' || (user as any)?.is_admin === true;
      
      if (!userIsAdmin && user?.subjects && user.subjects.length > 0) {
        query = query.in('subject', user.subjects);
      }
      
      if (!userIsAdmin && user?.grade_level) {
        query = query.eq('grade_level', user.grade_level);
      }
      
      if (topic_id) {
        query = query.eq('topic_id', topic_id);
      } else if (topic_name) {
        query = query.eq('topic', topic_name);
      }

      const { data, error } = await query;
      if (data && !error) {
        setCards(data);
      } else {
        console.error('Fetch flashcards error:', error?.message);
      }
    } catch (err) {
      console.error('Fetch flashcards exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const flipCard = () => {
    if (isFlipped) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.timing(flipAnimation, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      if (isFlipped) {
        // Flip back instantly before showing next card
        flipAnimation.setValue(0);
        setIsFlipped(false);
      }
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      if (isFlipped) {
        flipAnimation.setValue(0);
        setIsFlipped(false);
      }
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Flashcards</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="albums-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Sign In to Study</Text>
          <Text style={styles.emptyText}>Create an account to access revision flashcards.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setAuthVisible(true)}>
            <Text style={styles.actionBtnText}>Sign In</Text>
          </TouchableOpacity>
          <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Flashcards</Text>
          <Text style={styles.headerSubtitle}>
            Active recall and revision notes
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="albums-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Flashcards Yet</Text>
          <Text style={styles.emptyText}>We don't have flashcards for your selected subjects and grade yet. Check back later!</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Card {currentIndex + 1} of {cards.length}
            </Text>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{cards[currentIndex].topic}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cardContainer}
            activeOpacity={1}
            onPress={flipCard}
          >
            {/* Front of Card */}
            <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
              <Text style={styles.cardSubject}>{cards[currentIndex].subject}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardQuestion}>{cards[currentIndex].front_content}</Text>
              </View>
              <Text style={styles.cardHint}>Tap to flip</Text>
            </Animated.View>

            {/* Back of Card */}
            <Animated.View
              style={[styles.card, styles.cardBack, backAnimatedStyle]}
            >
              <Text style={[styles.cardSubject, { color: COLORS.white }]}>Answer</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardAnswer}>{cards[currentIndex].back_content}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.navigationRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={prevCard}
              disabled={currentIndex === 0}
            >
              <Ionicons name="arrow-back" size={24} color={currentIndex === 0 ? COLORS.textMuted : COLORS.primary} />
              <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, currentIndex === cards.length - 1 && styles.navBtnDisabled]}
              onPress={nextCard}
              disabled={currentIndex === cards.length - 1}
            >
              <Text style={[styles.navBtnText, currentIndex === cards.length - 1 && styles.navBtnTextDisabled]}>Next</Text>
              <Ionicons name="arrow-forward" size={24} color={currentIndex === cards.length - 1 ? COLORS.textMuted : COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  headerContent: {},
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginBottom: 2 },
  headerSubtitle: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.xl, textAlign: 'center' },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxl, paddingVertical: 12, borderRadius: RADIUS.md },
  actionBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  
  content: { flex: 1, padding: SPACING.xl },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  progressText: { ...FONTS.bodyBold, color: COLORS.textSecondary },
  topicBadge: { backgroundColor: COLORS.primaryLight + '30', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  topicBadgeText: { ...FONTS.small, color: COLORS.primary, fontWeight: '700' },
  
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardFront: {
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
  },
  cardBack: {
    backgroundColor: COLORS.primary,
    justifyContent: 'space-between',
  },
  cardSubject: { ...FONTS.caption, color: COLORS.textMuted, textAlign: 'center' },
  cardContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardQuestion: { ...FONTS.h2, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 32 },
  cardAnswer: { ...FONTS.h3, color: COLORS.white, textAlign: 'center', lineHeight: 28 },
  cardHint: { ...FONTS.small, color: COLORS.textMuted, textAlign: 'center' },
  
  navigationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  navBtnDisabled: { backgroundColor: COLORS.background, shadowOpacity: 0, borderColor: 'transparent' },
  navBtnText: { ...FONTS.bodyBold, color: COLORS.primary },
  navBtnTextDisabled: { color: COLORS.textMuted },
});
