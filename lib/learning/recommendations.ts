import { StudyRecommendation, TopicMastery, SubjectMastery } from './types';
import { FEATURES } from '@/constants/features';

interface RecommendationContext {
  topicMastery: TopicMastery[];
  subjectMastery: SubjectMastery[];
  userSubjects: string[];
  daysUntilExam?: number | null;
  isPro?: boolean;
}

/**
 * The Next Best Action engine. 
 * Derives personalized study recommendations deterministically from recent activity.
 */
export function getNextBestActions(ctx: RecommendationContext): StudyRecommendation[] {
  const { topicMastery, userSubjects, daysUntilExam, isPro } = ctx;
  const recommendations: StudyRecommendation[] = [];

  // 1. EMPTY STATE (0 quiz attempts)
  if (topicMastery.length === 0) {
    const subjectToStart = userSubjects.length > 0 ? userSubjects[0] : 'Mathematics';
    recommendations.push({
      type: 'continue',
      title: 'Start your learning journey',
      description: `Choose a topic in ${subjectToStart} to kickstart your personalized profile.`,
      subject: subjectToStart,
      priority: 1,
      reason: 'Your learning profile is just getting started.'
    });
    return recommendations;
  }

  // Deduplication tracker
  const recommendedTopics = new Set<string>();

  // Helper to add if not already recommended
  const addRec = (rec: StudyRecommendation) => {
    if (rec.topicName && recommendedTopics.has(rec.topicName)) return;
    recommendations.push(rec);
    if (rec.topicName) recommendedTopics.add(rec.topicName);
  };

  const hasExamPressure = typeof daysUntilExam === 'number' && daysUntilExam <= 30;

  // 2. WEAK TOPICS (Remediation)
  const weakTopics = topicMastery.filter(t => t.masteryScore < 70).sort((a, b) => a.masteryScore - b.masteryScore);
  if (weakTopics.length > 0) {
    const primaryWeak = weakTopics[0];
    addRec({
      type: 'topic_quiz',
      title: `Practice ${primaryWeak.topic_name}`,
      description: 'Strengthen this area with a 10-question practice quiz.',
      topicId: primaryWeak.topic_id,
      topicName: primaryWeak.topic_name,
      subject: primaryWeak.subject,
      priority: 100, // Highest priority
      reason: `Your recent score is ${primaryWeak.masteryScore}%, so this is currently one of your priority topics.`
    });
  }

  // 3. DECLINING TREND (Targeted Review)
  const decliningTopics = topicMastery.filter(t => t.trend === 'DECLINING');
  for (const decl of decliningTopics) {
    if (recommendations.length >= 3) break;
    addRec({
      type: 'review_topic',
      title: `Review ${decl.topic_name}`,
      description: 'Your performance in this topic has dipped recently. Time for a refresher.',
      topicId: decl.topic_id,
      topicName: decl.topic_name,
      subject: decl.subject,
      priority: 90,
      reason: 'Your recent scores show a declining trend.'
    });
  }

  // 4. STRONG TOPICS (Exam vs Maintenance)
  const strongTopics = topicMastery.filter(t => t.masteryScore >= 85).sort((a, b) => b.masteryScore - a.masteryScore);
  
  if (strongTopics.length > 0 && recommendations.length < 3) {
    const strong = strongTopics[0];
    
    if (hasExamPressure) {
      // Exam Approaching -> Recommend Past Paper Practice
      addRec({
        type: 'past_paper',
        title: `Mastery Challenge: ${strong.subject}`,
        description: 'You are strong here. Test your knowledge with a full past exam paper.',
        subject: strong.subject,
        priority: 80,
        reason: 'You have mastered this topic, and exams are approaching.'
      });
    } else {
      // No Exam Pressure -> Recommend Maintenance (Flashcards)
      addRec({
        type: 'flashcards',
        title: `Maintain Mastery: ${strong.topic_name}`,
        description: 'Keep this topic fresh in your memory with a quick flashcard session.',
        topicId: strong.topic_id,
        topicName: strong.topic_name,
        subject: strong.subject,
        priority: 70,
        reason: 'Consistent review prevents forgetting what you have mastered.'
      });
    }
  }

  // 5. NAMTUTOR (Only if enabled and user is PRO, or we fallback)
  // E.g., if a user has a weak topic and NamTutor is enabled, we could suggest a tutoring session.
  if (FEATURES.ENABLE_NAMTUTOR && weakTopics.length > 1 && recommendations.length < 3) {
    const secondaryWeak = weakTopics[1];
    addRec({
      type: 'review_topic', // The Topic Hub hosts the NamTutor action
      title: `Ask NamTutor about ${secondaryWeak.topic_name}`,
      description: 'Get AI-guided help to break down the concepts you are struggling with.',
      topicId: secondaryWeak.topic_id,
      topicName: secondaryWeak.topic_name,
      subject: secondaryWeak.subject,
      priority: 85,
      reason: 'NamTutor can provide personalized explanations for areas needing practice.'
    });
  }

  // 6. FALLBACK (If we still need recommendations, suggest the most recently studied topic)
  if (recommendations.length < 3 && topicMastery.length > 0) {
    const recent = topicMastery[0];
    addRec({
      type: 'continue',
      title: `Continue ${recent.topic_name}`,
      description: 'Pick up right where you left off.',
      topicId: recent.topic_id,
      topicName: recent.topic_name,
      subject: recent.subject,
      priority: 50,
      reason: 'This was your most recently studied topic.'
    });
  }

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
