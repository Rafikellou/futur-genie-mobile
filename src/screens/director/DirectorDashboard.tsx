import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import type { DirectorTabsParamList } from '../../navigation/DirectorTabs';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';

interface SchoolStats {
  totalClasses: number;
  totalTeachers: number;
  totalParents: number;
  totalQuizzes: number;
  publishedQuizzes: number;
}

interface Class {
  id: string;
  name: string;
  teacher: {
    full_name: string;
  } | null;
  _count: {
    students: number;
    quizzes: number;
  };
}

export function DirectorDashboard() {
  const { profile, user } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      // Use profile.school_id first, fallback to user app_metadata
      const schoolId = profile?.school_id || user?.app_metadata?.school_id;
      
      if (!schoolId) {
        setError('Aucune école assignée');
        return;
      }

      // Fetch school statistics
      const [classesRes, teachersRes, parentsRes, quizzesRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('id')
          .eq('school_id', schoolId),
        supabase
          .from('users')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', 'TEACHER'),
        supabase
          .from('users')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', 'PARENT'),
        supabase
          .from('quizzes')
          .select('id, is_published, classroom_id')
          .eq('school_id', schoolId)
      ]);

      const totalQuizzes = quizzesRes.data?.length || 0;
      const publishedQuizzes = quizzesRes.data?.filter(q => q.is_published).length || 0;

      setStats({
        totalClasses: classesRes.data?.length || 0,
        totalTeachers: teachersRes.data?.length || 0,
        totalParents: parentsRes.data?.length || 0,
        totalQuizzes,
        publishedQuizzes,
      });

      // Fetch classes with details
      const { data: classesData, error: classesError } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          users!classroom_id (
            full_name,
            role
          ),
          quizzes (count)
        `)
        .eq('school_id', schoolId)
        .order('name');

      if (classesError) throw classesError;

      // Transform the data
      const transformedClasses = (classesData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        teacher: cls.users?.find((u: any) => u.role === 'TEACHER') || null,
        _count: {
          students: cls.users?.filter((u: any) => u.role === 'PARENT').length || 0,
          quizzes: cls.quizzes?.length || 0,
        }
      }));

      setClasses(transformedClasses);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.school_id, user?.app_metadata?.school_id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const ClassCard = ({ item }: { item: Class }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <Text style={styles.className}>{item.name}</Text>
        <TouchableOpacity style={styles.manageButton}>
          <Ionicons name="settings-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.classInfo}>
        <Text style={styles.teacherName}>
          {item.teacher 
            ? item.teacher.full_name
            : 'Aucun enseignant assigné'
          }
        </Text>
        
        <View style={styles.classStats}>
          <View style={styles.classStat}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.classStatText}>{item._count.students} élèves</Text>
          </View>
          <View style={styles.classStat}>
            <Ionicons name="document-text-outline" size={16} color="#6b7280" />
            <Text style={styles.classStatText}>{item._count.quizzes} quiz</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Bonjour {profile?.full_name?.split(' ')[0] || 'Directeur'} !
        </Text>
        <Text style={styles.subtitleText}>
          Tableau de bord de votre école
        </Text>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              title="Classes"
              value={stats.totalClasses}
              icon="school-outline"
              color="#2563eb"
            />
            <StatCard
              title="Enseignants"
              value={stats.totalTeachers}
              icon="person-outline"
              color="#10b981"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Parents"
              value={stats.totalParents}
              icon="people-outline"
              color="#f59e0b"
            />
            <StatCard
              title="Quiz publiés"
              value={stats.publishedQuizzes}
              icon="document-text-outline"
              color="#8b5cf6"
            />
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Classes')}>
          <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
          <Text style={styles.actionButtonText}>Ajouter une classe</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Invitations')}>
          <Ionicons name="person-add-outline" size={24} color="#10b981" />
          <Text style={styles.actionButtonText}>Inviter un enseignant</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.classesSection}>
        <Text style={styles.sectionTitle}>Classes de l'école</Text>
        {classes.map((cls) => (
          <ClassCard key={cls.id} item={cls} />
        ))}
        
        {classes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucune classe créée</Text>
            <Text style={styles.emptySubtext}>
              Commencez par créer votre première classe
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
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  classesSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  classCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  manageButton: {
    padding: 4,
  },
  classInfo: {
    gap: 8,
  },
  teacherName: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  classStats: {
    flexDirection: 'row',
    gap: 16,
  },
  classStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classStatText: {
    fontSize: 12,
    color: colors.text.tertiary,
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
