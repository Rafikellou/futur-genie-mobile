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
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';

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
        color: '#10b981',
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      };
    }
    return {
      status: 'available',
      score: null,
      color: '#2563eb',
      icon: 'play-circle' as keyof typeof Ionicons.glyphMap,
    };
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    const status = getQuizStatus(item);
    
    // Debug
    console.log('Quiz data:', {
      title: item.title,
      hasQuestions: !!item.questions,
      questionStyles: styles.questionOption
    });

    return (
      <TouchableOpacity style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <View style={styles.quizInfo}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            
            {/* Test visuel forcé */}
            <View style={[styles.questionOption, {backgroundColor: '#2A2A2A'}]}>
              <Text style={{color: '#FFFFFF', fontSize: 16}}>
                Exemple de question (test)
              </Text>
            </View>
            
            {item.questions?.slice(0, 2).map((q, i) => {
              console.log(`Question ${i}:`, {
                text: q.text,
                hasText: !!q.text,
                textLength: q.text?.length
              });
              
              return (
                <View key={i} style={styles.questionOption}>
                  <Text 
                    style={{
                      color: '#FFFFFF', // Blanc forcé
                      fontSize: 16,
                      fontWeight: '500',
                      backgroundColor: 'transparent' // Éviter tout conflit
                    }}
                    testID={`question-${i}-text`}
                  >
                    {q.text || 'Texte non disponible'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
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
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Bonjour {profile?.full_name?.split(' ')[0] || 'Parent'} !
        </Text>
        <Text style={styles.subtitleText}>
          Voici les quiz disponibles pour votre classe
        </Text>
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
            <Ionicons name="document-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucun quiz disponible</Text>
            <Text style={styles.emptySubtext}>
              Les nouveaux quiz apparaîtront ici
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b', // Dark background matching theme
  },
  header: {
    padding: 20,
    backgroundColor: '#334155', // Secondary background
    borderBottomWidth: 1,
    borderBottomColor: '#475569', // Border primary
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff', // Primary text
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#e2e8f0', // Secondary text
  },
  listContainer: {
    padding: 16,
  },
  quizCard: {
    backgroundColor: '#334155', // Secondary background
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3, // Increased for better visibility on dark
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#475569', // Border for better definition
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizInfo: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff', // Blanc pur
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 14,
    color: '#e2e8f0', // Gris clair (#E0E0E0)
    marginBottom: 8,
    lineHeight: 20, // Ajout pour meilleure lisibilité
  },
  teacherName: {
    fontSize: 12,
    color: '#ff9900', // Orange pastel pour un peu de couleur
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#475569', // Border primary
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8', // Tertiary text
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8, // Slightly more rounded
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0', // Secondary text
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8', // Tertiary text
    marginTop: 4,
  },
  optionText: { 
    fontSize: 16,
    color: '#ffffff', // Blanc
    paddingVertical: 12,
  },
  questionOption: {
    fontSize: 16,
    color: '#ffffff', // Blanc
    padding: 12,
    backgroundColor: '#475569', // Tertiary background
    borderRadius: 8,
    marginVertical: 4,
  }
});
