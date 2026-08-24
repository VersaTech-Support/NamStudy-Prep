import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

import { getUserMastery } from '@/lib/learning/mastery';
import { getNextBestActions } from '@/lib/learning/recommendations';
import { StudyRecommendation } from '@/lib/learning/types';
import RecommendationCard from '@/components/ui/RecommendationCard';

interface QuizQuestion {
  id: string;
  topic_name: string;
  topic_id?: string | null;
  subject?: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation_text?: string | null;
  difficulty?: string | null;
  grade_level: string;
}

export default function QuizScreen() {
  const { topic, gradeLevel, topic_id } = useLocalSearchParams<{ topic: string; gradeLevel: string; topic_id?: string }>();
  const router = useRouter();
  const { user, isPro } = useUser();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (quizComplete && user) {
      // Delay fetching by a bit to ensure the newly saved quiz result is committed and readable
      setTimeout(async () => {
        try {
          const masteryData = await getUserMastery(user.id);
          const nextActions = getNextBestActions({
            topicMastery: masteryData.topicMastery,
            subjectMastery: masteryData.subjectMastery,
            userSubjects: user.subjects || ['Mathematics'],
            isPro,
          });
          if (nextActions.length > 0) {
            setRecommendation(nextActions[0]);
          }
        } catch (err) {
          console.error("Failed to load post-quiz recommendation", err);
        }
      }, 500);
    }
  }, [quizComplete, user]);

  const fetchQuestions = async () => {
    setLoading(true);
    let query = supabase.from('quizzes').select('*');
    
    if (topic_id) {
      query = query.eq('topic_id', topic_id);
    } else {
      query = query.eq('topic_name', topic).eq('grade_level', gradeLevel);
    }

    const { data, error } = await query;

    if (data) {
      // Shuffle questions
      const shuffled = data.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
    }
    setLoading(false);
  };

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (answer: string) => {
    if (selectedAnswer) return; // Already answered
    setSelectedAnswer(answer);
    setShowExplanation(true);
    setAnswered(prev => prev + 1);
    if (answer === currentQuestion.correct_answer) {
      setScore(prev => prev + 1);
    }
  };

  // --- NEW LOGIC: Save the score to the database ---
  const saveQuizScore = async (finalScore: number, totalQuestions: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          topic_name: topic,
          score: finalScore,
          total_questions: totalQuestions,
          grade_level: gradeLevel || user.grade_level || 'NSSCO',
        });

      if (error) {
        console.error('Error saving quiz score:', error.message);
      } else {
        console.log('Quiz score securely saved to database!');
      }
    } catch (err) {
      console.error('Unexpected error saving score:', err);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Trigger the save function right before completing the quiz
      saveQuizScore(score, questions.length);
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswered(0);
    setQuizComplete(false);
    // Re-shuffle
    setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const getOptionStyle = (option: string) => {
    if (!selectedAnswer) return styles.option;
    if (option === currentQuestion.correct_answer) return [styles.option, styles.optionCorrect];
    if (option === selectedAnswer && option !== currentQuestion.correct_answer) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (option: string) => {
    if (!selectedAnswer) return styles.optionText;
    if (option === currentQuestion.correct_answer) return [styles.optionText, styles.optionTextCorrect];
    if (option === selectedAnswer && option !== currentQuestion.correct_answer) return [styles.optionText, styles.optionTextWrong];
    return [styles.optionText, styles.optionTextDimmed];
  };

  const getOptionIcon = (option: string) => {
    if (!selectedAnswer) return null;
    if (option === currentQuestion.correct_answer) return <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />;
    if (option === selectedAnswer && option !== currentQuestion.correct_answer) return <Ionicons name="close-circle" size={22} color={COLORS.red} />;
    return null;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return COLORS.green;
      case 'Medium': return COLORS.gold;
      case 'Hard': return COLORS.red;
      default: return COLORS.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{topic}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{topic}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="help-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Questions Yet</Text>
          <Text style={styles.emptyText}>Questions for this topic are coming soon!</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const getResultColor = () => {
      if (percentage >= 80) return COLORS.green;
      if (percentage >= 50) return COLORS.gold;
      return COLORS.red;
    };
    const getResultMessage = () => {
      if (percentage >= 80) return 'Excellent Work!';
      if (percentage >= 50) return 'Good Effort!';
      return 'Keep Practicing!';
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <View style={[styles.resultCircle, { borderColor: getResultColor() }]}>
            <Text style={[styles.resultPercentage, { color: getResultColor() }]}>{percentage}%</Text>
            <Text style={styles.resultFraction}>{score}/{questions.length}</Text>
          </View>
          <Text style={[styles.resultMessage, { color: getResultColor() }]}>{getResultMessage()}</Text>
          <Text style={styles.resultTopic}>{topic} - {gradeLevel}</Text>

          {recommendation && (
            <View style={{ width: '100%', marginTop: SPACING.xl, marginBottom: SPACING.lg }}>
              <Text style={{ ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.md }}>Recommended Next</Text>
              <RecommendationCard 
                recommendation={recommendation}
                onPress={() => {
                  if (recommendation.type === 'topic_quiz' || recommendation.type === 'continue') {
                    if (recommendation.topicId) router.replace(`/topic/${recommendation.topicId}`);
                    else router.replace({ pathname: '/quiz/[topic]', params: { topic: recommendation.topicName || 'Unknown', gradeLevel: recommendation.gradeLevel || gradeLevel } });
                  } else if (recommendation.type === 'review_topic') {
                    if (recommendation.topicId) router.replace(`/topic/${recommendation.topicId}`);
                    else router.replace('/quizzes');
                  } else if (recommendation.type === 'past_paper') {
                    router.replace('/papers');
                  } else if (recommendation.type === 'flashcards') {
                    router.replace('/flashcards');
                  }
                }}
              />
            </View>
          )}

          <View style={[styles.resultActions, { marginTop: recommendation ? 0 : SPACING.xxxl }]}>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRestart} activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const options = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{topic}</Text>
        <Text style={styles.headerCounter}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.questionInfo}>
          <View style={[styles.diffBadge, { backgroundColor: getDifficultyColor(currentQuestion.difficulty || 'Normal') + '15' }]}>
            <Text style={[styles.diffText, { color: getDifficultyColor(currentQuestion.difficulty || 'Normal') }]}>
              {currentQuestion.difficulty}
            </Text>
          </View>
          <View style={styles.scoreBadge}>
            <Ionicons name="trophy" size={14} color={COLORS.gold} />
            <Text style={styles.scoreText}>{score}/{answered}</Text>
          </View>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={getOptionStyle(option.key)}
              onPress={() => handleSelectAnswer(option.key)}
              activeOpacity={selectedAnswer ? 1 : 0.7}
              disabled={!!selectedAnswer}
            >
              <View style={[styles.optionKey,
              selectedAnswer === option.key && option.key === currentQuestion.correct_answer && styles.optionKeyCorrect,
              selectedAnswer === option.key && option.key !== currentQuestion.correct_answer && styles.optionKeyWrong,
              ]}>
                <Text style={[styles.optionKeyText,
                selectedAnswer === option.key && styles.optionKeyTextSelected,
                ]}>{option.key}</Text>
              </View>
              <Text style={getOptionTextStyle(option.key)}>{option.text}</Text>
              <View style={styles.optionIconContainer}>
                {getOptionIcon(option.key)}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {showExplanation && currentQuestion.explanation_text && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={18} color={COLORS.gold} />
              <Text style={styles.explanationTitle}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation_text}</Text>
          </View>
        )}

        {selectedAnswer && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  headerCounter: {
    ...FONTS.caption,
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  questionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  diffBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  diffText: {
    ...FONTS.small,
    fontWeight: '700',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  scoreText: {
    ...FONTS.caption,
    color: COLORS.goldDark,
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  questionLabel: {
    ...FONTS.small,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  questionText: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  optionCorrect: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  optionWrong: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redLight,
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionKey: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionKeyCorrect: {
    backgroundColor: COLORS.green,
  },
  optionKeyWrong: {
    backgroundColor: COLORS.red,
  },
  optionKeyText: {
    ...FONTS.bodyBold,
    color: COLORS.textSecondary,
  },
  optionKeyTextSelected: {
    color: COLORS.white,
  },
  optionText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  optionTextCorrect: {
    color: COLORS.greenDark,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: COLORS.red,
  },
  optionTextDimmed: {
    color: COLORS.textMuted,
  },
  optionIconContainer: {
    width: 24,
    marginLeft: SPACING.sm,
  },
  explanationCard: {
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  explanationTitle: {
    ...FONTS.bodyBold,
    color: COLORS.goldDark,
  },
  explanationText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    ...SHADOWS.lg,
  },
  nextBtnText: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  goBackBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  goBackBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  resultCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    ...SHADOWS.lg,
  },
  resultPercentage: {
    fontSize: 42,
    fontWeight: '900',
  },
  resultFraction: {
    ...FONTS.caption,
    color: COLORS.textMuted,
  },
  resultMessage: {
    ...FONTS.h1,
    marginBottom: SPACING.sm,
  },
  resultTopic: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxxl,
  },
  resultActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    ...SHADOWS.lg,
  },
  retryBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.white,
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  doneBtnText: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
  },
});