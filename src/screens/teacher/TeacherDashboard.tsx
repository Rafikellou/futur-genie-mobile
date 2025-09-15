import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { GradientButton } from '../../components/common/GradientButton';
import { EditQuizModal } from './EditQuizModal';
import { colors, gradients } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';

interface Quiz {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  created_at: string;
  published_at: string | null;
  unpublish_at: string | null;
  _count: {
    submissions: number;
  };
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  choices: QuizChoice[];
  answer_keys: string[];
  explanation?: string;
}

interface QuizChoice {
  id: string;
  text: string;
}

export function TeacherDashboard() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<GeneratedQuiz | null>(null);
  const [loadingQuizData, setLoadingQuizData] = useState(false);

  const fetchQuizzes = async () => {
    try {
      if (!profile?.id) {
        setError('Profil non trouvé');
        return;
      }

      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          is_published,
          created_at,
          published_at,
          unpublish_at,
          submissions!inner(count)
        `)
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(quiz => ({
        ...quiz,
        _count: {
          submissions: quiz.submissions?.[0]?.count || 0
        }
      }));

      setQuizzes(transformedData);
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
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuizzes();
  };

  const togglePublishStatus = async (quizId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !currentStatus })
        .eq('id', quizId);

      if (error) throw error;

      // Update local state
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, is_published: !currentStatus }
          : quiz
      ));

      Alert.alert(
        'Succès',
        `Quiz ${!currentStatus ? 'publié' : 'dépublié'} avec succès`
      );
    } catch (err) {
      console.error('Error updating quiz:', err);
      Alert.alert('Erreur', 'Impossible de modifier le statut du quiz');
    }
  };

  const fetchQuizData = async (quizId: string): Promise<GeneratedQuiz | null> => {
    try {
      setLoadingQuizData(true);
      
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          title,
          description,
          quiz_items (
            question,
            choices,
            answer_keys,
            explanation
          )
        `)
        .eq('id', quizId)
        .single();

      if (error) throw error;

      if (!data) return null;

      // Transform the data to match GeneratedQuiz interface
      const generatedQuiz: GeneratedQuiz = {
        title: data.title,
        description: data.description,
        questions: (data.quiz_items || []).map((item: any) => ({
          question: item.question,
          choices: item.choices || [],
          answer_keys: item.answer_keys || [],
          explanation: item.explanation
        }))
      };

      return generatedQuiz;
    } catch (err) {
      console.error('Error fetching quiz data:', err);
      Alert.alert('Erreur', 'Impossible de charger les données du quiz');
      return null;
    } finally {
      setLoadingQuizData(false);
    }
  };

  const handleEditQuiz = async (quiz: Quiz) => {
    const quizData = await fetchQuizData(quiz.id);
    if (quizData) {
      setEditingQuiz(quizData);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    Alert.alert(
      'Supprimer le quiz',
      'Êtes-vous sûr de vouloir supprimer ce quiz ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', quizId);

              if (error) throw error;

              setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
              Alert.alert('Succès', 'Quiz supprimé avec succès');
            } catch (err) {
              console.error('Error deleting quiz:', err);
              Alert.alert('Erreur', 'Impossible de supprimer le quiz');
            }
          }
        }
      ]
    );
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    return (
      <View style={[commonStyles.card, styles.quizCard]}>
        <View style={styles.quizHeader}>
          <View style={styles.quizTitleContainer}>
            <Text style={styles.quizTitle}>📝 {item.title}</Text>
            <LinearGradient
              colors={item.is_published ? [colors.status.success, '#22c55e'] : [colors.status.warning, '#fbbf24']}
              style={styles.statusBadge}
            >
              <Text style={styles.statusText}>
                {item.is_published ? '✅ Publié' : '📝 Brouillon'}
              </Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.quizDescription}>{item.description}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statBadge}>
                <Ionicons name="people" size={14} color={colors.accent.pink} />
                <Text style={styles.statValue}>{item._count.submissions}</Text>
              </View>
              <Text style={styles.statLabel}>soumissions</Text>
            </View>
            
            {item.is_published && item.published_at && (
              <View style={styles.statItem}>
                <View style={styles.statBadge}>
                  <Ionicons name="calendar" size={14} color={colors.accent.orange} />
                  <Text style={styles.statValue}>{new Date(item.published_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.statLabel}>publié le</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.quizFooter}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditQuiz(item)}
              disabled={loadingQuizData}
            >
              {loadingQuizData ? (
                <ActivityIndicator size="small" color={colors.accent.violet} />
              ) : (
                <Ionicons name="pencil" size={16} color={colors.accent.violet} />
              )}
              <Text style={styles.actionButtonText}>Modifier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.publishButton]}
              onPress={() => togglePublishStatus(item.id, item.is_published)}
            >
              <Ionicons 
                name={item.is_published ? 'eye-off' : 'eye'} 
                size={16} 
                color={item.is_published ? colors.status.warning : colors.status.success} 
              />
              <Text style={styles.actionButtonText}>
                {item.is_published ? 'Masquer' : 'Publier'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteQuiz(item.id)}
            >
              <Ionicons name="trash" size={16} color={colors.status.error} />
              <Text style={styles.actionButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchQuizzes} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.header}
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bonjour {profile?.full_name?.split(' ')[0] || 'Enseignant'} ! 👋
          </Text>
          <Text style={styles.subtitleText}>
            Gérez vos quiz et suivez les performances de vos élèves
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="school" size={32} color={colors.accent.orange} />
        </View>
      </LinearGradient>

      <View style={styles.createButtonContainer}>
        <GradientButton
          title="✨ Créer un nouveau quiz"
          onPress={() => navigation.navigate('CreateQuiz' as never)}
          variant="primary"
          style={styles.createButton}
        />
      </View>

      <FlatList
        data={quizzes}
        renderItem={renderQuizItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[colors.background.secondary, colors.background.tertiary]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="document-text-outline" size={48} color={colors.accent.orange} />
            </LinearGradient>
            <Text style={styles.emptyText}>Aucun quiz créé</Text>
            <Text style={styles.emptySubtext}>
              Commencez par créer votre premier quiz pour engager vos élèves
            </Text>
            <GradientButton
              title="Créer mon premier quiz"
              onPress={() => navigation.navigate('CreateQuiz' as never)}
              variant="secondary"
              style={styles.emptyButton}
            />
          </View>
        }
      />

      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          visible={!!editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={async (quiz: GeneratedQuiz, isPublished: boolean, actionType: 'draft' | 'publish') => {
            // Here you would implement the save logic to update the quiz in the database
            // For now, just close the modal and refresh
            setEditingQuiz(null);
            fetchQuizzes();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    lineHeight: 22,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...commonStyles.shadow,
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createButton: {
    // Styles spécifiques si nécessaire
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quizCard: {
    marginBottom: 16,
  },
  quizHeader: {
    marginBottom: 16,
  },
  quizTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  quizDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  quizFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: colors.text.secondary,
  },
  editButton: {
    borderWidth: 1,
    borderColor: colors.accent.violet,
  },
  publishButton: {
    borderWidth: 1,
    borderColor: colors.status.success,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
});
