import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { Loader } from '../../../components/common/Loader';
import { ErrorView } from '../../../components/common/ErrorView';
import { colors } from '../../../theme/colors';

interface Submission {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  quiz: {
    title: string;
  };
}

interface DailyStats {
  date: string;
  submissionCount: number;
  averageScore: number;
  averageTime: number;
  availableQuizzes: number;
  submissionRate: number;
}

interface QuizStats {
  id: string;
  title: string;
  score: number;
  duration: number;
  completed_at: string;
}

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const barWidth = (chartWidth - 60) / 30; // 30 days with spacing

export function ProgressTab() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      if (!profile?.id || !profile?.classroom_id) {
        setError('Profil non trouvé');
        return;
      }

      // Get submissions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch submissions data
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          completed_at,
          quizzes!quiz_id (
            title
          )
        `)
        .eq('parent_id', profile.id)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch available quizzes in the classroom for the last 30 days
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, title, created_at')
        .eq('classroom_id', profile.classroom_id)
        .eq('is_published', true)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (quizzesError) throw quizzesError;

      const transformedSubmissions = (submissionsData || []).map(submission => ({
        ...submission,
        quiz: submission.quizzes?.[0] || { title: 'Quiz inconnu' }
      }));

      setSubmissions(transformedSubmissions);
      setAvailableQuizzes(quizzesData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id, profile?.classroom_id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getDailyStats = (): DailyStats[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => {
      const daySubmissions = submissions.filter(sub => 
        sub.completed_at.split('T')[0] === date
      );
      
      // Get unique quiz submissions for this day (one submission per quiz)
      const uniqueSubmissions = daySubmissions.reduce((acc, sub) => {
        if (!acc.find(s => s.quiz_id === sub.quiz_id)) {
          acc.push(sub);
        }
        return acc;
      }, [] as Submission[]);
      
      const submissionCount = uniqueSubmissions.length;
      const averageScore = submissionCount > 0 
        ? uniqueSubmissions.reduce((sum, sub) => sum + sub.score, 0) / submissionCount 
        : 0;
      
      // Since quiz_duration_minutes doesn't exist, we'll use a placeholder or calculate from other data
      const averageTime = 0; // Placeholder - no duration data available
      
      // Count available quizzes for this day
      const dayAvailableQuizzes = availableQuizzes.filter(quiz => 
        quiz.created_at.split('T')[0] <= date
      ).length;
      
      const submissionRate = dayAvailableQuizzes > 0 ? (submissionCount / dayAvailableQuizzes) * 100 : 0;

      return { 
        date, 
        submissionCount, 
        averageScore, 
        averageTime,
        availableQuizzes: dayAvailableQuizzes,
        submissionRate
      };
    });
  };

  const getOverallStats = () => {
    if (submissions.length === 0) {
      return {
        averageScore30Days: 0,
        averageTime30Days: 0,
        submissionRate30Days: 0,
        totalSubmissions: 0
      };
    }

    // Get unique submissions (one per quiz)
    const uniqueSubmissions = submissions.reduce((acc, sub) => {
      if (!acc.find(s => s.quiz_id === sub.quiz_id)) {
        acc.push(sub);
      }
      return acc;
    }, [] as Submission[]);

    const totalSubmissions = uniqueSubmissions.length;
    const averageScore30Days = uniqueSubmissions.reduce((sum, sub) => sum + sub.score, 0) / totalSubmissions;
    const averageTime30Days = 0; // No duration data available in database
    const submissionRate30Days = availableQuizzes.length > 0 ? (totalSubmissions / availableQuizzes.length) * 100 : 0;
    
    return {
      averageScore30Days: Math.round(averageScore30Days),
      averageTime30Days: Math.round(averageTime30Days * 10) / 10, // Round to 1 decimal
      submissionRate30Days: Math.round(submissionRate30Days),
      totalSubmissions
    };
  };

  const getQuizList = (): QuizStats[] => {
    // Get unique submissions (latest submission per quiz)
    const uniqueSubmissions = submissions.reduce((acc, sub) => {
      const existing = acc.find(s => s.quiz_id === sub.quiz_id);
      if (!existing || new Date(sub.completed_at) > new Date(existing.completed_at)) {
        if (existing) {
          const index = acc.indexOf(existing);
          acc[index] = sub;
        } else {
          acc.push(sub);
        }
      }
      return acc;
    }, [] as Submission[]);

    return uniqueSubmissions.map(sub => ({
      id: sub.quiz_id,
      title: sub.quiz.title,
      score: sub.score,
      duration: 0, // No duration data available in database
      completed_at: sub.completed_at
    })).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  };

  const renderScoreHistogram = () => {
    const dailyStats = getDailyStats();
    const maxScore = 100; // Score is always out of 100

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Évolution du score moyen (30 derniers jours)</Text>
        <View style={styles.chart}>
          <View style={styles.barsContainer}>
            {dailyStats.filter(stat => stat.submissionCount > 0).map((stat, index) => (
              <View key={stat.date} style={styles.barColumn}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (stat.averageScore / maxScore) * 100,
                      backgroundColor: stat.averageScore >= 70 ? '#10b981' : stat.averageScore >= 50 ? '#f59e0b' : '#ef4444'
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>
                  {new Date(stat.date).getDate()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderSubmissionRateHistogram = () => {
    const dailyStats = getDailyStats();
    const maxRate = 100; // Rate is always out of 100%

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Taux de soumission par jour (30 derniers jours)</Text>
        <View style={styles.chart}>
          <View style={styles.barsContainer}>
            {dailyStats.filter(stat => stat.availableQuizzes > 0).map((stat, index) => (
              <View key={stat.date} style={styles.barColumn}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (stat.submissionRate / maxRate) * 100,
                      backgroundColor: stat.submissionRate >= 80 ? '#10b981' : stat.submissionRate >= 50 ? '#f59e0b' : '#ef4444'
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>
                  {new Date(stat.date).getDate()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderTimeHistogram = () => {
    const dailyStats = getDailyStats();
    const maxTime = Math.max(...dailyStats.map(stat => stat.averageTime), 1);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Temps moyen par quiz (30 derniers jours)</Text>
        <View style={styles.chart}>
          <View style={styles.barsContainer}>
            {dailyStats.filter(stat => stat.submissionCount > 0).map((stat, index) => (
              <View key={stat.date} style={styles.barColumn}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (stat.averageTime / maxTime) * 100,
                      backgroundColor: '#2563eb'
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>
                  {new Date(stat.date).getDate()}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.chartSubtitle}>Temps en minutes</Text>
      </View>
    );
  };


  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchData} />;
  }

  const stats = getOverallStats();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Progrès de {profile?.child_first_name || 'votre enfant'}</Text>
        <Text style={styles.subtitleText}>Suivi des performances et statistiques</Text>
      </View>

      {/* Overall Statistics - 30 derniers jours */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.averageScore30Days}%</Text>
          <Text style={styles.statLabel}>Score moyen (30j)</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#2563eb" />
          <Text style={styles.statValue}>{stats.averageTime30Days}min</Text>
          <Text style={styles.statLabel}>Temps moyen</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.submissionRate30Days}%</Text>
          <Text style={styles.statLabel}>Taux de soumission</Text>
        </View>
      </View>

      {/* Statistiques détaillées */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Résumé des 30 derniers jours</Text>
        <Text style={styles.progressText}>
          {stats.totalSubmissions} quiz complétés sur {availableQuizzes.length} proposés
        </Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${stats.submissionRate30Days}%`,
                backgroundColor: stats.submissionRate30Days >= 70 ? '#10b981' : stats.submissionRate30Days >= 50 ? '#f59e0b' : '#ef4444'
              }
            ]} 
          />
        </View>
      </View>

      {/* Charts */}
      {renderScoreHistogram()}
      {renderSubmissionRateHistogram()}
      {renderTimeHistogram()}

      {/* Liste des quiz passés */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz passés (30 derniers jours)</Text>
        {getQuizList().map((quiz) => (
          <View key={quiz.id} style={styles.submissionCard}>
            <View style={styles.submissionInfo}>
              <Text style={styles.submissionTitle}>{quiz.title}</Text>
              <Text style={styles.submissionDate}>
                {new Date(quiz.completed_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <Text style={styles.submissionDate}>
                Temps: Non disponible
              </Text>
            </View>
            <View style={styles.submissionScore}>
              <Text 
                style={[
                  styles.scoreText,
                  { 
                    color: quiz.score >= 70 ? '#10b981' : quiz.score >= 50 ? '#f59e0b' : '#ef4444'
                  }
                ]}
              >
                {quiz.score}%
              </Text>
            </View>
          </View>
        ))}
        
        {getQuizList().length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucun quiz complété</Text>
            <Text style={styles.emptySubtext}>Les résultats apparaîtront ici après les premiers quiz</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    margin: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
  },
  chartContainer: {
    margin: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  chart: {
    height: 120,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
  },
  barColumn: {
    alignItems: 'center',
    width: barWidth,
  },
  bar: {
    width: barWidth - 2,
    backgroundColor: '#10b981',
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 4,
  },
  scoreChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  scorePoint: {
    alignItems: 'center',
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 4,
  },
  emptyChart: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  submissionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  submissionScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalQuestions: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
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
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
