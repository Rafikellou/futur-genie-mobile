import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { GradientButton } from '../../components/common/GradientButton';
import { colors, gradients } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: string;
  teacher: {
    full_name: string;
  };
  submissions: Array<{
    score: number;
    completed_at: string;
  }>;
  questions: Array<{
    text: string;
  }>;
}

export function ParentDashboard() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          users!owner_id (
            full_name
          ),
          submissions!quiz_id (
            score,
            completed_at
          ),
          questions (
            text
          )
        `)
        .eq('classroom_id', profile.classroom_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedQuizzes = (data || []).map(quiz => ({
        ...quiz,
        teacher: quiz.users?.[0] || { full_name: 'Enseignant inconnu' },
        submissions: quiz.submissions || [],
        questions: quiz.questions || []
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
    const userSubmission = quiz.submissions.find(s => s.completed_at);
    if (userSubmission) {
      return {
        status: 'completed',
        score: userSubmission.score,
        color: colors.status.success,
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      };
    }
    return {
      status: 'available',
      score: null,
      color: colors.accent.violet,
      icon: 'play-circle' as keyof typeof Ionicons.glyphMap,
    };
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    const status = getQuizStatus(item);
    const submissionCount = item.submissions.length;
    const questionCount = item.questions.length;

    return (
      <View style={[commonStyles.card, styles.quizCard]}>
        <View style={styles.quizHeader}>
          <View style={styles.quizTitleContainer}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <LinearGradient
              colors={status.status === 'completed' ? [colors.status.success, colors.status.success] : gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <Ionicons name={status.icon} size={16} color="#FFFFFF" />
              <Text style={styles.statusText}>
                {status.status === 'completed' ? `${status.score}%` : 'Disponible'}
              </Text>
            </LinearGradient>
          </View>
          
          {item.description && (
            <Text style={styles.quizDescription}>{item.description}</Text>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.statBadge}>
              <LinearGradient
                colors={gradients.tertiary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statGradient}
              >
                <Ionicons name="help-circle-outline" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statValue}>{questionCount}</Text>
              <Text style={styles.statLabel}>questions</Text>
            </View>
            
            <View style={styles.statBadge}>
              <LinearGradient
                colors={gradients.secondary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statGradient}
              >
                <Ionicons name="people-outline" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statValue}>{submissionCount}</Text>
              <Text style={styles.statLabel}>réponses</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.quizFooter}>
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherLabel}>Enseignant :</Text>
            <Text style={styles.teacherName}>{item.teacher.full_name}</Text>
          </View>
          
          <GradientButton
            title={status.status === 'completed' ? 'Voir résultat' : 'Commencer'}
            onPress={() => {/* Navigation vers le quiz */}}
            variant={status.status === 'completed' ? 'secondary' : 'primary'}
            style={styles.actionButton}
          />
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
        colors={[colors.background.secondary, colors.background.primary] as any}
        style={styles.header}
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bonjour {profile?.full_name?.split(' ')[0] || 'Parent'} !
          </Text>
          <Text style={styles.subtitleText}>
            Voici les quiz disponibles pour votre classe
          </Text>
        </View>
        
        <LinearGradient
          colors={gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerIcon}
        >
          <Ionicons name="school-outline" size={28} color="#FFFFFF" />
        </LinearGradient>
      </LinearGradient>

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
              colors={gradients.tertiary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="document-outline" size={40} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyText}>
              Aucun quiz disponible
            </Text>
            <Text style={styles.emptySubtext}>
              Les nouveaux quiz de vos enseignants apparaîtront ici dès qu'ils seront publiés.
            </Text>
            <GradientButton
              title="Actualiser"
              onPress={onRefresh}
              variant="secondary"
              style={styles.emptyButton}
            />
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    ...commonStyles.shadow,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
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
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: colors.text.secondary,
  },
  actionButton: {
    minWidth: 120,
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
    paddingHorizontal: 20,
  },
  emptyButton: {
    minWidth: 200,
  },
});
