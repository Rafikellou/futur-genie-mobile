import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { ensureParentInvitationLink, generateInvitationUrl, getClassroomById } from '../../lib/db';
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

interface InvitationLink {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface ClassroomInfo {
  id: string;
  name: string;
  grade: string;
}

type SortField = 'name' | 'quizzes' | 'score' | 'time';
type SortOrder = 'asc' | 'desc';

export function MyClassScreen() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [invitationLink, setInvitationLink] = useState<InvitationLink | null>(null);
  const [classroomInfo, setClassroomInfo] = useState<ClassroomInfo | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchClassroomInfo = async () => {
    try {
      // Use profile.classroom_id first, fallback to user app_metadata
      const classroomId = profile?.classroom_id || user?.app_metadata?.classroom_id;
      if (!classroomId) return;
      
      const classroom = await getClassroomById(classroomId);
      setClassroomInfo(classroom);
    } catch (err) {
      console.error('Error fetching classroom info:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      // Use profile.classroom_id first, fallback to user app_metadata
      const classroomId = profile?.classroom_id || user?.app_metadata?.classroom_id;
      if (!classroomId) {
        setError('Aucune classe assignée');
        return;
      }

      // Get all students in the teacher's classroom
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, full_name, child_first_name, email')
        .eq('classroom_id', classroomId)
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

  const generateInvitationLink = async () => {
    const classroomId = profile?.classroom_id || user?.app_metadata?.classroom_id;
    const schoolId = profile?.school_id || user?.app_metadata?.school_id;
    const userId = profile?.id || user?.id;
    
    if (!classroomId || !schoolId) {
      Alert.alert('Erreur', 'Informations de classe manquantes');
      return;
    }

    setGeneratingLink(true);
    try {
      const link = await ensureParentInvitationLink(
        classroomId,
        schoolId,
        userId
      );
      setInvitationLink(link);
    } catch (err) {
      console.error('Error generating invitation link:', err);
      Alert.alert('Erreur', 'Impossible de générer le lien d\'invitation');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyInvitationLink = async () => {
    if (!invitationLink) return;
    
    const url = generateInvitationUrl(invitationLink.token);
    await Clipboard.setStringAsync(url);
    Alert.alert('Copié', 'Le lien d\'invitation a été copié dans le presse-papiers');
  };

  const shareInvitationLink = async () => {
    if (!invitationLink || !classroomInfo) return;
    
    const url = generateInvitationUrl(invitationLink.token);
    const message = `Rejoignez la classe ${classroomInfo.name} (${classroomInfo.grade}) sur Futur Génie !\n\nUtilisez ce lien pour inscrire votre enfant :\n${url}`;
    
    try {
      await Share.share({
        message,
        title: 'Invitation à rejoindre la classe',
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClassroomInfo();
  }, [profile?.classroom_id, user?.app_metadata?.classroom_id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
    fetchClassroomInfo();
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

  const renderInvitationSection = () => (
    <View style={styles.invitationSection}>
      <View style={styles.invitationHeader}>
        <Ionicons name="link-outline" size={24} color={colors.brand.primary} />
        <Text style={styles.invitationTitle}>Lien d'invitation</Text>
      </View>
      
      <Text style={styles.invitationDescription}>
        Partagez ce lien avec les parents pour qu'ils puissent inscrire leurs enfants dans votre classe.
      </Text>
      
      {invitationLink ? (
        <View style={styles.linkContainer}>
          <View style={styles.linkInfo}>
            <Text style={styles.linkUrl} numberOfLines={1}>
              {generateInvitationUrl(invitationLink.token)}
            </Text>
            <Text style={styles.linkExpiry}>
              Expire le {new Date(invitationLink.expires_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          
          <View style={styles.linkActions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={copyInvitationLink}
            >
              <Ionicons name="copy-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.actionButtonText}>Copier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={shareInvitationLink}
            >
              <Ionicons name="share-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.generateButton} 
          onPress={generateInvitationLink}
          disabled={generatingLink}
        >
          {generatingLink ? (
            <Text style={styles.generateButtonText}>Génération...</Text>
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.generateButtonText}>Générer le lien</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ma Classe</Text>
        {classroomInfo && (
          <Text style={styles.headerSubtitle}>
            {classroomInfo.name} - {classroomInfo.grade}
          </Text>
        )}
        <Text style={styles.headerSubtitle}>
          {students?.length || 0} élève(s) dans votre classe
        </Text>
      </View>

      {renderInvitationSection()}

      <View style={styles.studentsSection}>
        <Text style={styles.sectionTitle}>Liste des élèves</Text>
        
        {renderSortHeader()}

        {students && students.length > 0 ? (
          students.map((student) => (
            <View key={student.id} style={styles.studentRow}>
              <Text style={styles.studentName}>
                {student.child_first_name || student.full_name}
              </Text>
              <Text style={styles.statValue}>{student.quizzes_taken}</Text>
              <Text style={styles.statValue}>{student.average_score}%</Text>
              <Text style={styles.statValue}>{student.average_time_minutes}min</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun élève dans votre classe</Text>
            <Text style={styles.emptySubtext}>
              Les élèves apparaîtront ici une fois qu'ils auront rejoint votre classe
            </Text>
          </View>
        )}
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
  invitationSection: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  invitationDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  linkContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  linkInfo: {
    marginBottom: 12,
  },
  linkUrl: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.brand.primary,
    backgroundColor: colors.background.tertiary,
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  linkExpiry: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: colors.background.tertiary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand.primary,
    marginLeft: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  studentsSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
});
