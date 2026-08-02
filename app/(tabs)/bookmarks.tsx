import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser, Bookmark } from '@/context/UserContext';
import PaperCard from '@/components/PaperCard';
import TopicCard from '@/components/TopicCard';
import UpgradeModal from '@/components/UpgradeModal';
import AuthModal from '@/components/AuthModal';

export default function BookmarksScreen() {
  const { user, isVIP, bookmarks, toggleBookmark, isBookmarked } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'papers' | 'quizzes'>('papers');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);

  const paperBookmarks = bookmarks.filter(b => b.item_type === 'paper');
  const quizBookmarks = bookmarks.filter(b => b.item_type === 'quiz');

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="bookmark-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>Sign In to Save</Text>
        <Text style={styles.emptyText}>Create an account to save papers and quizzes.</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => setAuthVisible(true)}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
        <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
      </View>
    );
  }

  const handleDownloadPaper = (paper: any) => {
    Linking.openURL(paper.paper_pdf_url).catch(() => {
      Alert.alert('Download', `Paper: ${paper.title}\n\nThe download link will open in your browser.`);
    });
  };

  const handleViewSolution = (paper: any) => {
    if (!isVIP) {
      setUpgradeVisible(true);
      return;
    }
    if (paper.solution_pdf_url) {
      Linking.openURL(paper.solution_pdf_url).catch(() => {
        Alert.alert('Solution', `Opening step-by-step solution for: ${paper.title}`);
      });
    }
  };

  const handleToggleBookmarkPaper = async (paper: any) => {
    await toggleBookmark(paper.id, 'paper', paper.title, paper);
  };

  const handleTopicPress = (topic: any) => {
    router.push({
      pathname: '/quiz/[topic]',
      params: { 
        topic: topic.topicName, 
        gradeLevel: topic.gradeLevel,
        subject: topic.subject
      },
    });
  };

  const handleToggleBookmarkQuiz = async (topic: any) => {
    const key = `${topic.topicName}-${topic.gradeLevel}-${topic.subject}`;
    await toggleBookmark(key, 'quiz', topic.topicName, topic);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Saved</Text>
          <Text style={styles.headerSubtitle}>
            {bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'} bookmarked
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'papers' && styles.tabActive]}
          onPress={() => setActiveTab('papers')}
        >
          <Text style={[styles.tabText, activeTab === 'papers' && styles.tabTextActive]}>Papers</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{paperBookmarks.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quizzes' && styles.tabActive]}
          onPress={() => setActiveTab('quizzes')}
        >
          <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>Quizzes</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{quizBookmarks.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {activeTab === 'papers' && (
          <View style={styles.listContainer}>
            {paperBookmarks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Saved Papers</Text>
                <Text style={styles.emptyText}>Tap the heart icon on any paper to save it here.</Text>
              </View>
            ) : (
              paperBookmarks.map((bookmark) => {
                const paper = bookmark.metadata;
                if (!paper) return null;
                return (
                  <PaperCard
                    key={bookmark.id}
                    paper={paper}
                    isVIP={isVIP}
                    isBookmarked={true}
                    onDownloadPaper={handleDownloadPaper}
                    onViewSolution={handleViewSolution}
                    onToggleBookmark={handleToggleBookmarkPaper}
                  />
                );
              })
            )}
          </View>
        )}

        {activeTab === 'quizzes' && (
          <View style={styles.listContainer}>
            {quizBookmarks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="help-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Saved Quizzes</Text>
                <Text style={styles.emptyText}>Tap the heart icon on any quiz topic to save it here.</Text>
              </View>
            ) : (
              <View style={styles.topicsGrid}>
                {quizBookmarks.map((bookmark) => {
                  const topic = bookmark.metadata;
                  if (!topic) return null;
                  return (
                    <TopicCard
                      key={bookmark.id}
                      topicName={topic.topicName}
                      questionCount={topic.questionCount}
                      gradeLevel={topic.gradeLevel}
                      isVIP={isVIP}
                      isBookmarked={true}
                      onPress={() => handleTopicPress(topic)}
                      onToggleBookmark={() => handleToggleBookmarkQuiz(topic)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  headerContent: {},
  headerTitle: { ...FONTS.h1, color: COLORS.white, marginBottom: 2 },
  headerSubtitle: { ...FONTS.caption, color: 'rgba(255,255,255,0.7)' },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: SPACING.xs },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { ...FONTS.bodyBold, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  badge: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { ...FONTS.small, fontWeight: '700', color: COLORS.textSecondary },
  scrollView: { flex: 1 },
  listContainer: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: SPACING.lg },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md, textAlign: 'center' },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, textAlign: 'center' },
  authBtn: { marginTop: SPACING.xl, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  authBtnText: { ...FONTS.bodyBold, color: COLORS.white },
});
