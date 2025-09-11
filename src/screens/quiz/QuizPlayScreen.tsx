import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { ProgressBar } from '../../components/common/ProgressBar';
import { ConfettiAnimation } from '../../components/common/ConfettiAnimation';
import { TypingMessage } from '../../components/common/TypingMessage';
import { getFunMessage, getRandomEncouragements } from '../../utils/funMessages';
import { colors } from '../../theme/colors';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export function QuizPlayScreen({ route, navigation }: any) {
  const { quizId } = route.params;
  const { profile } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [questionResults, setQuestionResults] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [score, setScore] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quizStarted && !showResult) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, showResult]);

  const fetchQuiz = async () => {
    try {
      // Fetch quiz with quiz items
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('is_published', true)
        .single();

      if (quizError) throw quizError;

      // Fetch quiz items separately
      const { data: itemsData, error: itemsError } = await supabase
        .from('quiz_items')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (itemsError) throw itemsError;

      // Transform quiz items to match expected structure
      const transformedQuestions = (itemsData || []).map(item => {
        let options = [];
        
        // Handle different formats of choices
        if (Array.isArray(item.choices)) {
          options = item.choices.map((choice: any) => 
            typeof choice === 'string' ? choice : choice.text || choice.id || String(choice)
          );
        } else if (item.choices && typeof item.choices === 'object') {
          // If choices is an object, extract values
          options = Object.values(item.choices).map((choice: any) => 
            typeof choice === 'string' ? choice : (choice as any).text || (choice as any).id || String(choice)
          );
        }
        
        return {
          id: item.id,
          question: item.question,
          options: options,
          correctAnswer: item.answer_keys?.[0] ? ['A', 'B', 'C', 'D'].indexOf(item.answer_keys[0]) : 0,
          explanation: item.explanation || ''
        };
      });

      const transformedQuiz = {
        ...quizData,
        questions: transformedQuestions
      };

      setQuiz(transformedQuiz);
      setSelectedAnswers({});
    } catch (error) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Erreur', 'Impossible de charger le quiz');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, choiceId: string) => {
    if (!quiz) return;
    
    // Set the answer
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: [choiceId]
    }));

    // Check if answer is correct
    const currentQuestion = quiz.questions.find(q => q.id === questionId);
    if (currentQuestion) {
      const isCorrect = currentQuestion.correctAnswer === parseInt(choiceId);
      
      // Store the result
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: isCorrect
      }));

      // Store explanation if available
      if (currentQuestion.explanation) {
        setExplanations(prev => ({
          ...prev,
          [questionId]: currentQuestion.explanation || ''
        }));
      }

      // Show immediate feedback and confetti for correct answers
      setCurrentFeedback({
        isCorrect,
        message: isCorrect ? 'Bonne réponse ! 🎉' : 'Pas tout à fait... 😔'
      });
      setShowFeedback(true);
      
      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      // Auto-advance to next question after delay
      const displayTime = isCorrect ? 1500 : 3000;
      
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestionIndex < quiz.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // Last question - submit quiz
          console.log('Submitting quiz after last question...');
          submitQuiz();
        }
      }, displayTime);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = async () => {
    if (!quiz || !profile) {
      console.log('Cannot submit quiz: missing quiz or profile');
      return;
    }
    
    console.log('Starting quiz submission...');
    setSubmitting(true);
    
    try {
      // Calculate score based on question results
      const correctCount = Object.values(questionResults).filter(Boolean).length;
      const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
      
      console.log(`Quiz results: ${correctCount}/${quiz.questions.length} correct, score: ${finalScore}%`);
      
      // Prepare answers array for database
      const answersArray = quiz.questions.map(question => {
        const questionId = question.id.toString();
        const selectedAnswer = selectedAnswers[questionId]?.[0] || '';
        const isCorrect = questionResults[questionId] || false;
        
        return {
          question_id: question.id,
          selected_answer: selectedAnswer,
          is_correct: isCorrect
        };
      });
      
      console.log('Prepared answers array:', answersArray);
      
      const submissionData = {
        quiz_id: quiz.id,
        parent_id: profile.id,
        answers: answersArray,
        score: finalScore,
        total_questions: quiz.questions.length,
        school_id: profile.school_id,
        classroom_id: profile.classroom_id,
        completed_at: new Date().toISOString(),
        quiz_duration_seconds: timeElapsed
      };
      
      console.log('Submitting to Supabase:', submissionData);
      
      // Save submission to database
      const { data, error } = await supabase
        .from('submissions')
        .insert(submissionData)
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Quiz submission successful:', data);
      
      setScore(finalScore);
      setShowResult(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le quiz. Détails: ' + (error as any)?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizStartTime(new Date());
  };

  const renderProgressDots = () => {
    if (!quiz) return null;
    
    return (
      <View style={styles.progressDotsContainer}>
        {quiz.questions.map((question, index) => {
          const questionId = question.id.toString();
          const isAnswered = selectedAnswers[questionId];
          const isCorrect = questionResults[questionId];
          const isCurrent = index === currentQuestionIndex;
          
          let dotColor = colors.text.tertiary; // Default gray
          if (isAnswered && isCorrect !== undefined) {
            dotColor = isCorrect ? colors.status.success : colors.status.error; // Green or red
          } else if (isCurrent) {
            dotColor = colors.accent.blue; // Blue for current
          }
          
          return (
            <View
              key={question.id}
              style={[
                styles.progressDot,
                { backgroundColor: dotColor },
                isCurrent && styles.progressDotCurrent
              ]}
            />
          );
        })}
      </View>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.status.warning;
    return colors.status.error;
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent ! 🎉';
    if (score >= 80) return 'Très bien ! 👏';
    if (score >= 60) return 'Bien joué ! 👍';
    if (score >= 40) return 'Peut mieux faire 📚';
    return 'Continue tes efforts ! 💪';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement du quiz...</Text>
        </View>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Quiz non trouvé</Text>
      </View>
    );
  }

  // Quiz start screen
  if (!quizStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.startContainer}>
          <Text style={styles.startTitle}>{quiz.title}</Text>
          <Text style={styles.startDescription}>{quiz.description}</Text>
          
          <View style={styles.quizInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{quiz.questions.length} questions</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>Pas de limite de temps</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>Feedback immédiat</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
            <Text style={styles.startButtonText}>Commencer le quiz</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showResult) {
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Ionicons 
              name="trophy" 
              size={64} 
              color={getScoreColor(score)} 
            />
            <Text style={styles.resultTitle}>Quiz terminé !</Text>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Votre score</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
              {score}%
            </Text>
            <Text style={styles.scoreDetails}>
              {Object.values(questionResults).filter(Boolean).length} / {quiz.questions.length} bonnes réponses
            </Text>
            <Text style={styles.timeDetails}>
              Temps écoulé : {formatTime(timeElapsed)}
            </Text>
            
            <TypingMessage 
              message={getFunMessage(score)} 
              speed={50}
              delay={1000}
              style={styles.resultMessage}
            />
          </View>
          <View style={styles.resultActions}>
            <TouchableOpacity 
              style={[styles.reviewButton, { flex: 1 }]}
              onPress={() => {
                setQuizStarted(false);
                setShowResult(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswers({});
                setQuestionResults({});
                setExplanations({});
                setTimeElapsed(0);
              }}
            >
              <Text style={styles.reviewButtonText}>Rejouer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.homeButton, { flex: 1 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.homeButtonText}>Retour aux quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = (currentQuestionIndex + 1) / quiz.questions.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} sur {quiz.questions.length}
          </Text>
          {renderProgressDots()}
        </View>
        <View style={styles.timerContainer}>
          <Ionicons name="time" size={20} color={colors.text.secondary} />
          <Text style={[styles.timerText, timeElapsed > 600 && styles.timerWarning]}>
            {formatTime(timeElapsed)}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
          const questionId = currentQuestion.id.toString();
          const isSelected = selectedAnswers[questionId]?.[0] === index.toString();
          const isAnswered = selectedAnswers[questionId] !== undefined;
          const isCorrect = questionResults[questionId];
          
          let optionStyle = styles.optionButton;
          let textStyle = styles.optionText;
          
          if (isAnswered) {
            if (isSelected) {
              optionStyle = isCorrect ? styles.optionCorrect : styles.optionIncorrect;
              textStyle = styles.optionText;
            } else if (index === currentQuestion.correctAnswer) {
              optionStyle = styles.optionCorrectAnswer;
              textStyle = styles.optionText;
            }
          } else if (isSelected) {
            optionStyle = styles.optionSelected;
            textStyle = styles.optionTextSelected;
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={optionStyle}
              onPress={() => !isAnswered ? handleAnswerSelect(questionId, index.toString()) : undefined}
              disabled={isAnswered}
            >
              <View style={[
                styles.optionRadio,
                isSelected && styles.optionRadioSelected
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={textStyle}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      </Animated.View>

      {showFeedback && currentFeedback && (
        <View style={[
          styles.feedbackContainer,
          { backgroundColor: currentFeedback.isCorrect ? '#D1FAE5' : '#FEE2E2' }
        ]}>
          <View style={styles.feedbackHeader}>
            <Ionicons 
              name={currentFeedback.isCorrect ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={currentFeedback.isCorrect ? '#10B981' : '#EF4444'} 
            />
            <Text style={[
              styles.feedbackText,
              { color: currentFeedback.isCorrect ? '#10B981' : '#EF4444' }
            ]}>
              {currentFeedback.message}
            </Text>
          </View>
          {!currentFeedback.isCorrect && currentQuestion.explanation && (
            <Text style={styles.explanationText}>
              💡 {currentQuestion.explanation}
            </Text>
          )}
        </View>
      )}
      
      <ConfettiAnimation 
        visible={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
    marginRight: 20,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.orange,
    marginLeft: 4,
  },
  timerWarning: {
    color: colors.accent.pink,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 30,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
    marginBottom: 12,
  },
  optionSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent.blue,
    marginBottom: 12,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  optionTextSelected: {
    flex: 1,
    fontSize: 16,
    color: colors.accent.blue,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  nextButton: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  nextButtonText: {
    color: '#fff',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  resultActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.blue,
  },
  reviewButtonText: {
    color: colors.accent.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: colors.accent.blue,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 18,
    color: colors.status.error,
    textAlign: 'center',
    margin: 20,
  },
  // Start screen
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  startCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    maxWidth: 350,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  startDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  quizInfo: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: colors.accent.blue,
    shadowColor: colors.accent.violet,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Progress dots
  progressDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary, // Gris par défaut
  },
  progressDotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.blue, // Bleu pour la question actuelle
  },
  // Feedback styles
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.status.success + '20', // 20% opacity
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.status.success,
    marginBottom: 12,
  },
  optionIncorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.status.error + '20', // 20% opacity
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.status.error,
    marginBottom: 12,
  },
  optionCorrectAnswer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.status.success + '20', // 20% opacity
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.status.success,
    marginBottom: 12,
  },
  // Feedback styles
  feedbackContainer: {
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  explanationText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontStyle: 'italic',
    marginTop: 8,
  },
  timeDetails: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: '500',
  },
  encouragementContainer: {
    backgroundColor: colors.accent.pink + '20', // 20% opacity
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.pink,
  },
  encouragementText: {
    fontSize: 16,
    color: colors.accent.pink,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
