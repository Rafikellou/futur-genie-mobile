import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { colors } from '../../theme/colors';

interface Student {
  id: string;
  full_name: string;
  child_first_name: string | null;
  email: string;
  quizzes_taken: number;
  correct_answers: number;
  total_questions: number;
  average_score: number;
  average_time_minutes: number;
}

type SortField = 'name' | 'quizzes' | 'score' | 'time';
type SortOrder = 'asc' | 'desc';

export function MyClassScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchStudents = async () => {
    try {
      if (!profile?.classroom_id) {
        setError('Aucune classe assignée');
        return;
      }

      // Get all students in the teacher's classroom
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, full_name, child_first_name, email')
        .eq('classroom_id', profile.classroom_id)
        .eq('role', 'PARENT');

      if (studentsError) throw studentsError;

      // Get all completed submissions for these students
      const studentIds = studentsData?.map(student => student.id) || [];
      
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('parent_id, quiz_id, score, total_questions, quiz_duration_seconds')
        .in('parent_id', studentIds)
        .not('completed_at', 'is', null);

      if (submissionsError) throw submissionsError;

      // Transform the data to calculate statistics
      const transformedStudents = (studentsData || []).map(student => {
        const studentSubmissions = submissionsData?.filter(sub => sub.parent_id === student.id) || [];
        const quizzes_taken = studentSubmissions.length;
        
        // Score is already stored as percentage, so we calculate average directly
        const average_score = quizzes_taken > 0 
          ? studentSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / quizzes_taken 
          : 0;
        
        // Calculate total correct answers from percentage scores
        const total_questions = studentSubmissions.reduce((sum, sub) => sum + (sub.total_questions || 0), 0);
        const total_correct = studentSubmissions.reduce((sum, sub) => {
          const percentage = sub.score || 0;
          const questions = sub.total_questions || 0;
          return sum + Math.round((percentage / 100) * questions);
        }, 0);

        // Calculate average time in minutes
        const average_time_seconds = quizzes_taken > 0 
          ? studentSubmissions.reduce((sum, sub) => sum + (sub.quiz_duration_seconds || 0), 0) / quizzes_taken 
          : 0;
        const average_time_minutes = average_time_seconds / 60;

        return {
          id: student.id,
          full_name: student.full_name,
          child_first_name: student.child_first_name,
          email: student.email,
          quizzes_taken,
          correct_answers: total_correct,
          total_questions,
          average_score: Math.round(average_score),
          average_time_minutes: Math.round(average_time_minutes * 10) / 10, // Round to 1 decimal
        };
      });

      setStudents(transformedStudents);
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Erreur lors du chargement des élèves');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortStudents = (field: SortField) => {
    if (!students || students.length === 0) return;
    
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);

    const sorted = [...students].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (field) {
        case 'name':
          aValue = (a.child_first_name || a.full_name).toLowerCase();
          bValue = (b.child_first_name || b.full_name).toLowerCase();
          break;
        case 'quizzes':
          aValue = a.quizzes_taken;
          bValue = b.quizzes_taken;
          break;
        case 'score':
          aValue = a.average_score;
          bValue = b.average_score;
          break;
        case 'time':
          aValue = a.average_time_minutes;
          bValue = b.average_time_minutes;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return newOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    setStudents(sorted);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const renderSortHeader = () => (
    <View style={styles.sortHeader}>
      <TouchableOpacity style={styles.sortButton} onPress={() => sortStudents('name')}>
        <Text style={styles.sortButtonText}>Prénom</Text>
        {sortField === 'name' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.brand.primary} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.sortButton} onPress={() => sortStudents('quizzes')}>
        <Text style={styles.sortButtonText}>Quiz</Text>
        {sortField === 'quizzes' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.brand.primary} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.sortButton} onPress={() => sortStudents('score')}>
        <Text style={styles.sortButtonText}>Score</Text>
        {sortField === 'score' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.brand.primary} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.sortButton} onPress={() => sortStudents('time')}>
        <Text style={styles.sortButtonText}>Temps</Text>
        {sortField === 'time' && (
          <Ionicons 
            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color={colors.brand.primary} 
          />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStudentItem = ({ item }: { item: Student }) => (
    <View style={styles.studentRow}>
      <Text style={styles.studentName}>
        {item.child_first_name || item.full_name}
      </Text>
      <Text style={styles.statValue}>{item.quizzes_taken}</Text>
      <Text style={styles.statValue}>{item.average_score}%</Text>
      <Text style={styles.statValue}>{item.average_time_minutes}min</Text>
    </View>
  );

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchStudents} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ma Classe</Text>
        <Text style={styles.headerSubtitle}>
          {students?.length || 0} élève(s) dans votre classe
        </Text>
      </View>

      {renderSortHeader()}

      <FlatList
        data={students || []}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun élève dans votre classe</Text>
            <Text style={styles.emptySubtext}>
              Les élèves apparaîtront ici une fois qu'ils auront rejoint votre classe
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
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  sortHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 4,
  },
  listContainer: {
    padding: 16,
  },
  studentRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentName: {
    flex: 2,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
