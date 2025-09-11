import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { QuizPlayScreen } from '../../quiz/QuizPlayScreen';
import { colors, gradients } from '../../../theme/colors';
import { Loader } from '../../../components/common/Loader';
import { ErrorView } from '../../../components/common/ErrorView';

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: string;
  unpublish_at?: string;
  teacher: {
    full_name: string;
  };
  submissions: Array<{
    id: string;
    score: number;
    completed_at: string;
  }>;
}

interface ActivityCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  comingSoon: boolean;
}

const futureActivities: ActivityCategory[] = [
  { id: '1', title: 'Histoire', icon: 'book', color: '#8B5CF6', comingSoon: true },
  { id: '2', title: 'Anglais', icon: 'language', color: '#06B6D4', comingSoon: true },
  { id: '3', title: 'Dictée', icon: 'pencil', color: '#10B981', comingSoon: true },
  { id: '4', title: 'Jeux', icon: 'game-controller', color: '#F59E0B', comingSoon: true },
  { id: '5', title: 'Musique', icon: 'musical-notes', color: '#EF4444', comingSoon: true },
  { id: '6', title: 'Blagues', icon: 'happy', color: '#F97316', comingSoon: true },
];

export function ActivitiesTab() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  const fetchQuizzes = async () => {
    try {
      if (!profile?.classroom_id) {
        setError('Aucune classe assignée');
        return;
      }

      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          created_at,
          unpublish_at,
          owner_id,
          users!owner_id (
            full_name
          ),
          submissions!quiz_id (
            id,
            score,
            completed_at,
            parent_id
          )
        `)
        .eq('classroom_id', profile.classroom_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data and filter submissions for current parent
      const transformedQuizzes = (data || []).map(quiz => ({
        ...quiz,
        teacher: quiz.users && Array.isArray(quiz.users) && quiz.users[0] ? 
          { full_name: quiz.users[0].full_name } : 
          { full_name: 'Enseignant inconnu' },
        submissions: (quiz.submissions || []).filter(sub => sub.parent_id === profile.id)
      }));
      
      setQuizzes(transformedQuizzes);
      setError(null);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Erreur lors du chargement des quiz');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [profile?.classroom_id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuizzes();
  };

  const getQuizStatus = (quiz: Quiz) => {
    const userSubmissions = quiz.submissions.filter(s => s.completed_at);
    if (userSubmissions.length > 0) {
      const bestScore = Math.max(...userSubmissions.map(s => s.score));
      const isReplayed = userSubmissions.length > 1;
      return {
        status: 'completed',
        score: bestScore,
        isReplayed,
        color: '#10b981',
        icon: isReplayed ? 'refresh-circle' : 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      };
    }
    return {
      status: 'available',
      score: null,
      isReplayed: false,
      color: '#2563eb',
      icon: 'play-circle' as keyof typeof Ionicons.glyphMap,
    };
  };

  const handleQuizPress = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    const status = getQuizStatus(item);
    
    return (
      <TouchableOpacity 
        style={styles.quizCard}
        onPress={() => handleQuizPress(item)}
      >
        <View style={styles.quizHeader}>
          <View style={styles.quizInfo}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <Text style={styles.quizDescription}>{item.description}</Text>
            <Text style={styles.teacherName}>
              Par {item.teacher.full_name}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Ionicons name={status.icon} size={24} color={status.color} />
            {status.score !== null && (
              <Text style={[styles.scoreText, { color: status.color }]}>
                {status.score}%
              </Text>
            )}
            {status.isReplayed && (
              <Text style={styles.replayedText}>Rejoué</Text>
            )}
          </View>
        </View>
        
        <View style={styles.quizFooter}>
          <View>
            <Text style={styles.dateText}>
              Créé le {new Date(item.created_at).toLocaleDateString('fr-FR')}
            </Text>
            {item.unpublish_at && (
              <Text style={styles.unpublishText}>
                Disponible jusqu'à {new Date(item.unpublish_at).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: status.color }]}
            onPress={() => handleQuizPress(item)}
          >
            <Text style={styles.actionButtonText}>
              {status.status === 'completed' ? 'Voir résultat' : 'Commencer'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFutureActivityItem = ({ item }: { item: ActivityCategory }) => (
    <TouchableOpacity 
      style={[styles.categoryCard, { borderColor: item.color }]}
      disabled={item.comingSoon}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={32} color={item.color} />
      </View>
      <Text style={styles.categoryTitle}>{item.title}</Text>
      {item.comingSoon && (
        <Text style={styles.comingSoonText}>Bientôt disponible</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchQuizzes} />;
  }

  if (selectedQuiz) {
    return (
      <QuizPlayScreen 
        route={{ params: { quizId: selectedQuiz.id } }} 
        navigation={{
          ...navigation,
          goBack: () => setSelectedQuiz(null)
        }} 
      />
    );
  }

  const visibleQuizzes = showAllQuizzes ? quizzes : quizzes.slice(0, 3);
  const remainingQuizzes = quizzes.length - 3;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

      {/* Quiz Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz de l'école</Text>
        {quizzes.length > 0 ? (
          <>
            <FlatList
              data={visibleQuizzes}
              renderItem={renderQuizItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
            
            {quizzes.length > 3 && (
              <TouchableOpacity 
                style={styles.accordionButtonMain}
                onPress={() => setShowAllQuizzes(!showAllQuizzes)}
              >
                <Text style={styles.accordionText}>
                  {showAllQuizzes ? 'Masquer' : `Voir ${remainingQuizzes} autres activités`}
                </Text>
                <Ionicons 
                  name={showAllQuizzes ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#2563eb" 
                />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucun quiz disponible</Text>
          </View>
        )}
      </View>

      {/* Future Activities Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activités futures</Text>
        <FlatList
          data={futureActivities}
          renderItem={renderFutureActivityItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.categoryRow}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  quizCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: colors.text.secondary,
  },
  replayedText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: 2,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unpublishText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
  },
  accordionText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    width: '48%',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  accordionButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizHeader: {
    marginBottom: 12,
  },
  quizInfo: {
    flex: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.status.success,
  },
  actionButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  activityCard: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  accordionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});
