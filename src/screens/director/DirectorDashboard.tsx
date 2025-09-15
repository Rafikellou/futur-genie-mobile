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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import type { DirectorTabsParamList } from '../../navigation/DirectorTabs';
import { supabase } from '../../lib/supabase';
import { colors, gradients } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { GradientButton } from '../../components/common/GradientButton';

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

  const StatCard = ({ title, value, icon, gradientColors }: {
    title: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    gradientColors: string[];
  }) => (
    <View style={[commonStyles.card, styles.statCard]}>
      <LinearGradient
        colors={gradientColors as any}
        style={styles.statIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </LinearGradient>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const ClassCard = ({ item }: { item: Class }) => (
    <View style={[commonStyles.card, styles.classCard]}>
      <View style={styles.classHeader}>
        <View style={styles.classNameContainer}>
          <Text style={styles.className}>{item.name}</Text>
          {!item.teacher && (
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>Sans enseignant</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.manageButton}>
          <Ionicons name="settings-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.classInfo}>
        <Text style={styles.teacherName}>
          {item.teacher 
            ? `👨‍🏫 ${item.teacher.full_name}`
            : '⚠️ Aucun enseignant assigné'
          }
        </Text>
        
        <View style={styles.classStats}>
          <View style={styles.classStat}>
            <View style={styles.statBadge}>
              <Ionicons name="people-outline" size={14} color={colors.accent.pink} />
              <Text style={styles.classStatText}>{item._count.students}</Text>
            </View>
            <Text style={styles.statLabel}>élèves</Text>
          </View>
          <View style={styles.classStat}>
            <View style={styles.statBadge}>
              <Ionicons name="document-text-outline" size={14} color={colors.accent.orange} />
              <Text style={styles.classStatText}>{item._count.quizzes}</Text>
            </View>
            <Text style={styles.statLabel}>quiz</Text>
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
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.header}
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bonjour {profile?.full_name?.split(' ')[0] || 'Directeur'} ! 👋
          </Text>
          <Text style={styles.subtitleText}>
            Tableau de bord de votre école
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="school" size={32} color={colors.accent.pink} />
        </View>
      </LinearGradient>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              title="Classes"
              value={stats.totalClasses}
              icon="school-outline"
              gradientColors={[colors.accent.violet, colors.accent.pink]}
            />
            <StatCard
              title="Enseignants"
              value={stats.totalTeachers}
              icon="person-outline"
              gradientColors={[colors.accent.pink, colors.accent.orange]}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Parents"
              value={stats.totalParents}
              icon="people-outline"
              gradientColors={[colors.accent.orange, '#FFB347']}
            />
            <StatCard
              title="Quiz publiés"
              value={stats.publishedQuizzes}
              icon="document-text-outline"
              gradientColors={[...gradients.primary]}
            />
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <GradientButton
          title="➕ Ajouter une classe"
          onPress={() => navigation.navigate('Classes')}
          variant="secondary"
          style={styles.actionButton}
        />
        
        <GradientButton
          title="👥 Inviter un enseignant"
          onPress={() => navigation.navigate('Invitations')}
          variant="tertiary"
          style={styles.actionButton}
        />
      </View>

      <View style={styles.classesSection}>
        <View style={styles.sectionHeader}>
          <Text style={commonStyles.sectionTitle}>Classes de l'école</Text>
          <View style={styles.classesBadge}>
            <Text style={styles.classesBadgeText}>{classes.length}</Text>
          </View>
        </View>
        
        {classes.map((cls) => (
          <ClassCard key={cls.id} item={cls} />
        ))}
        
        {classes.length === 0 && (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[colors.background.secondary, colors.background.tertiary]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="school-outline" size={48} color={colors.accent.pink} />
            </LinearGradient>
            <Text style={styles.emptyText}>Aucune classe créée</Text>
            <Text style={styles.emptySubtext}>
              Commencez par créer votre première classe pour inviter des enseignants et parents
            </Text>
            <GradientButton
              title="Créer ma première classe"
              onPress={() => navigation.navigate('Classes')}
              variant="primary"
              style={styles.emptyButton}
            />
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
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
  },
  classesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  classesBadge: {
    backgroundColor: colors.accent.pink,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classesBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  classCard: {
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  warningBadge: {
    backgroundColor: colors.status.warning,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  manageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
  },
  classInfo: {
    gap: 12,
  },
  teacherName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
  },
  classStats: {
    flexDirection: 'row',
    gap: 20,
  },
  classStat: {
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
  classStatText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
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
