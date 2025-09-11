import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { EditQuizModal } from './EditQuizModal';
import { colors, gradients } from '../../theme/colors';

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

export function TeacherDashboard() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

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
      <View style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <View style={styles.quizInfo}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <Text style={styles.quizDescription}>{item.description}</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.is_published ? '#10b981' : '#f59e0b' }
              ]}>
                <Text style={styles.statusText}>
                  {item.is_published ? 'Publié' : 'Brouillon'}
                </Text>
              </View>
              <Text style={styles.submissionCount}>
                {item._count.submissions} soumission(s)
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.quizFooter}>
          {item.is_published && item.published_at && (
            <Text style={styles.dateText}>
              Publié le {new Date(item.published_at).toLocaleDateString('fr-FR')}
              {item.unpublish_at && ` • Fin le ${new Date(item.unpublish_at).toLocaleDateString('fr-FR')}`}
            </Text>
          )}
          {!item.is_published && (
            <Text style={styles.draftText}>Brouillon</Text>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setEditingQuiz(item)}
            >
              <Ionicons name="pencil" size={16} color="#2563eb" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.publishButton]}
              onPress={() => togglePublishStatus(item.id, item.is_published)}
            >
              <Ionicons 
                name={item.is_published ? 'eye-off' : 'eye'} 
                size={16} 
                color={item.is_published ? '#f59e0b' : '#10b981'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteQuiz(item.id)}
            >
              <Ionicons name="trash" size={16} color="#ef4444" />
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
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Bonjour {profile?.full_name} !
        </Text>
        <Text style={styles.subtitleText}>
          Gérez vos quiz et suivez les performances
        </Text>
      </View>

      <LinearGradient
        colors={gradients.primary}
        style={styles.createButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          style={styles.createButtonInner}
          onPress={() => navigation.navigate('CreateQuiz' as never)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Créer un nouveau quiz</Text>
        </TouchableOpacity>
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
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucun quiz créé</Text>
          </View>
        }
      />

      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          visible={!!editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={() => {
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
  // ... (rest of the styles remain the same)
  header: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  createButton: {
    margin: 16,
    borderRadius: 12,
  },
  createButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  createButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  quizCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  quizHeader: {
    marginBottom: 12,
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  submissionCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  draftText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: colors.background.tertiary,
  },
  editButton: {
    borderColor: colors.brand.secondary,
  },
  publishButton: {
    borderColor: colors.status.success,
  },
  deleteButton: {
    borderColor: colors.status.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 4,
  },
});
