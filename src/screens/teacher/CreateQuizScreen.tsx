import React from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { aiGenerateQuizByLesson, aiGenerateQuizByLessonV2, createQuizWithItems, type GeneratedQuiz } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { EditQuizModal } from './EditQuizModal';
import { colors, gradients } from '../../theme/colors';

interface QuizChoice {
  id: string;
  text: string;
}

interface QuizQuestion {
  question: string;
  choices: QuizChoice[];
  answer_keys: string[];
  explanation?: string;
}

// Using GeneratedQuiz type from DAO

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  quiz?: GeneratedQuiz;
}

export function CreateQuizScreen() {
  const { profile, user, loading, refreshProfile } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedQuiz, setGeneratedQuiz] = React.useState<GeneratedQuiz | null>(null);
  const [editingQuiz, setEditingQuiz] = React.useState<GeneratedQuiz | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showScrollArrow, setShowScrollArrow] = React.useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const textInputRef = React.useRef<TextInput>(null);

  // Add welcome message on component mount
  React.useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome-message',
      text: 'Bonjour ! Je suis votre assistant IA pour créer des quiz. Donnez-moi la leçon du jour ou le sujet sur lequel vous souhaitez créer un quiz, et je génèrerai automatiquement 10 questions adaptées pour vos élèves.',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const addMessage = (text: string, isUser: boolean, quiz?: GeneratedQuiz) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      isUser,
      timestamp: new Date(),
      quiz,
    };
    setMessages(prev => [...prev, newMessage]);
    
    // For AI messages, scroll to show the beginning of the response
    if (!isUser) {
      setTimeout(() => {
        const messageIndex = messages.length;
        // Scroll to position that shows the start of the AI message
        scrollViewRef.current?.scrollTo({ 
          y: messageIndex * 150, // Approximate message height
          animated: true 
        });
        setShowScrollArrow(true);
      }, 100);
    } else {
      // For user messages, scroll to end
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const generateQuiz = async (lessonDescription: string) => {
    try {
      // Schéma JSON strict pour le quiz
      const quizSchema = {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "questions"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            minItems: 10,
            maxItems: 10,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question", "choices", "answer_keys"],
              properties: {
                question: { type: "string" },
                choices: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "text"],
                    properties: {
                      id: { type: "string", enum: ["A", "B", "C", "D"] },
                      text: { type: "string" }
                    }
                  }
                },
                answer_keys: {
                  type: "array",
                  minItems: 1,
                  maxItems: 1,
                  items: { type: "string", enum: ["A", "B", "C", "D"] }
                },
                explanation: { type: "string" }
              }
            }
          }
        }
      };

      const instructions = `Tu es un expert Montessori. L'utilisateur a besoin de toi pour construire un quiz de 10 questions sur la leçon du jour.

Respecte STRICTEMENT le format JSON suivant:
{"title": "Titre", "description": "Description", "questions": [{"question": "...", "choices": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}], "answer_keys": ["LETTRE_CORRECTE"], "explanation": "..."}]}.

Contraintes:
- 10 questions exactement
- 4 choix (A, B, C, D) par question
- 1 seule bonne réponse par question (answer_keys a 1 élément)
- Français, avec explications pédagogiques concises`;

      const input = `Voilà la leçon demandée par l'utilisateur: ${lessonDescription.trim()}`;

      // Appel via DAO (Edge Function côté serveur)
      let retryCount = 0;
      const maxRetries = 1;

      while (retryCount < maxRetries) {
        try {
          try {
            const quiz = await aiGenerateQuizByLessonV2({
              lessonDescription: input,
              questionCount: 10,
              schema: quizSchema as any,
              systemInstructions: instructions,
            });
            console.log('Edge Function quiz payload:', quiz);

            // Vérifier que le quiz a bien 10 questions
            if (!quiz.questions || quiz.questions.length !== 10) {
              throw new Error(`Quiz incomplet: ${quiz.questions?.length || 0} questions au lieu de 10`);
            }

            // Normaliser le format des choices (gérer objet ou tableau)
            quiz.questions = quiz.questions.map((question: any) => {
              if (question.choices && typeof question.choices === 'object' && !Array.isArray(question.choices)) {
                // Convertir objet en tableau
                question.choices = Object.entries(question.choices).map(([id, text]) => ({
                  id,
                  text: text as string
                }));
              }
              
              // Vérifier que choices est maintenant un tableau
              if (!Array.isArray(question.choices)) {
                question.choices = [];
              }
              
              // Vérifier que answer_keys est un tableau
              if (!Array.isArray(question.answer_keys)) {
                question.answer_keys = [];
              }
              
              return question;
            });

            console.log('Successfully parsed and normalized quiz:', quiz);
            return quiz as GeneratedQuiz;
          } catch (jsonError) {
            console.error(`Edge Function payload error (attempt ${retryCount + 1}):`, jsonError);
            if (retryCount < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw jsonError;
            }
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('Quiz generation failed:', error);
            Alert.alert(
              'Erreur',
              'Échec de la génération du quiz. Veuillez réessayer.'
            );
            setIsGenerating(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Erreur génération quiz:', error);
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          throw new Error('Requête mal formée - vérifiez le format JSON et les paramètres');
        } else if (error.message.includes('401')) {
          throw new Error('Clé API invalide ou modèle non disponible');
        } else if (error.message.includes('404')) {
          throw new Error('Modèle gpt-5-mini introuvable - vérifiez son nom exact');
        }
        throw new Error('Erreur lors de la génération du quiz: ' + error.message);
      }
      throw new Error('Erreur lors de la génération du quiz');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;
    
    const message = inputText.trim();
    setInputText('');
    
    // Add user message
    addMessage(message, true);
    setIsGenerating(true);
    
    try {
      if (generatedQuiz) {
        // If we already have a quiz, treat this as improvement feedback
        addMessage('Je travaille sur l\'amélioration du quiz selon vos demandes...', false);
        const improved = await improveQuiz(message, generatedQuiz);
        if (improved) {
          setGeneratedQuiz(improved);
          addMessage(`J'ai mis à jour le quiz "${improved.title}" en appliquant vos modifications.`, false, improved);
        } else {
          addMessage(`Je n'ai pas pu améliorer le quiz pour cette demande. Essayez de préciser davantage vos instructions.`, false);
        }
      } else {
        // Generate new quiz
        addMessage('Je génère un quiz basé sur votre leçon...', false);
        
        const quiz = await generateQuiz(message);
        setGeneratedQuiz(quiz ?? null);
        
        addMessage(`J'ai créé un quiz "${quiz?.title}" avec ${quiz?.questions.length} questions pour vous :`, false, quiz);
      }
    } catch (error: any) {
      // Surface EF error details when available
      const status = error?.status;
      const message = error?.message || (error instanceof Error ? error.message : 'Erreur inconnue');
      const contextBody = error?.context?.body;
      console.error('EF error', status, message, contextBody);
      addMessage(`Erreur génération (${status ?? 'n/a'}): ${message}`, false);
      Alert.alert('Erreur', `Erreur génération (${status ?? 'n/a'}) : ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to measure how many question statements remained identical
  const countUnchangedQuestions = (a: GeneratedQuiz, b: GeneratedQuiz) => {
    const len = Math.min(a.questions.length, b.questions.length);
    let same = 0;
    for (let i = 0; i < len; i++) {
      const qa = (a.questions[i].question || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const qb = (b.questions[i].question || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (qa === qb) same++;
    }
    return same;
  };

  const improveQuiz = async (feedback: string, current: GeneratedQuiz): Promise<GeneratedQuiz | null> => {
    try {
      const questionCount = Array.isArray(current.questions) ? current.questions.length : 10;
      // Build a schema aligned with current quiz length
      const improvementSchema = {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'questions'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          questions: {
            type: 'array',
            minItems: questionCount,
            maxItems: questionCount,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['question', 'choices', 'answer_keys'],
              properties: {
                question: { type: 'string' },
                choices: {
                  type: 'array',
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'text'],
                    properties: {
                      id: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                      text: { type: 'string' },
                    },
                  },
                },
                answer_keys: { type: 'array', minItems: 1, maxItems: 1, items: { type: 'string', enum: ['A', 'B', 'C', 'D'] } },
                explanation: { type: 'string' },
              },
            },
          },
        },
      } as const;

      const baseSystemInstructions = `Tu es un expert Montessori.

Respecte STRICTEMENT le format JSON suivant:
{"title": "Titre", "description": "Description", "questions": [{"question": "...", "choices": [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."}], "answer_keys": ["LETTRE_CORRECTE"], "explanation": "..."}]}.

Contraintes:
- ${questionCount} questions exactement (NE CHANGE PAS ce nombre)
- 4 choix (A, B, C, D) par question
- 1 seule bonne réponse par question (answer_keys a 1 élément)
- N'ajoute PAS d'autres champs que ceux listés
- Français, avec explications pédagogiques concises`;

      const fullContext = `Tu as proposé le quiz ci-dessous, et l'utilisateur te demande de faire la modification suivante: ${feedback}.

Voici le quiz que tu avais proposé initialement (en JSON):
${JSON.stringify(current)}
`;

      const condensedQuiz = {
        title: current.title,
        description: current.description,
        questions: current.questions.map(q => ({ question: q.question, answer_keys: q.answer_keys }))
      };
      const condensedContext = `Tu as proposé le quiz ci-dessous, et l'utilisateur te demande de faire la modification suivante: ${feedback}.

Pour référence, voici un RÉSUMÉ du quiz (sans les choix pour réduire la taille):
${JSON.stringify(condensedQuiz)}

Re-génère les 4 choix (A, B, C, D) pour chaque question en respectant le format.`;

      let retry = 0;
      const maxRetries = 2;
      while (retry < maxRetries) {
        try {
          const forceChanges = retry > 0;
          const systemInstructions = baseSystemInstructions + (forceChanges
            ? `\nExigence supplémentaire (2e tentative): modifie substantiellement AU MOINS ${Math.ceil(questionCount * 0.7)} énoncés de questions. N'utilise pas les mêmes formulations.`
            : ``);

          const quiz = await aiGenerateQuizByLessonV2({
            lessonDescription: retry === 0 ? fullContext : condensedContext,
            questionCount,
            schema: improvementSchema as any,
            systemInstructions,
          });

          // Normalize shapes like in generateQuiz
          quiz.questions = quiz.questions.map((q: any) => {
            if (q.choices && typeof q.choices === 'object' && !Array.isArray(q.choices)) {
              q.choices = Object.entries(q.choices).map(([id, text]) => ({ id, text: text as string }));
            }
            if (!Array.isArray(q.choices)) q.choices = [];
            if (!Array.isArray(q.answer_keys)) q.answer_keys = [];
            return q;
          });

          // If too many questions stayed identical, trigger a stricter retry once
          const unchanged = countUnchangedQuestions(current, quiz as GeneratedQuiz);
          const unchangedRatio = unchanged / questionCount;
          if (unchangedRatio > 0.4 && retry < maxRetries - 1) {
            console.warn(`Improvement insufficient (${unchanged}/${questionCount} unchanged). Retrying with stricter instructions...`);
            retry++;
            continue;
          }

          return quiz as GeneratedQuiz;
        } catch (e) {
          console.error('Quiz improvement failed', e);
          const status = (e as any)?.context?.response?.status ?? (e as any)?.status;
          const details = (e as any)?.context?.body ?? (e as any)?.message ?? 'Erreur inconnue';
          addMessage(`Erreur amélioration (${status ?? 'n/a'}): ${details}`, false);
          if (retry < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000));
            retry++;
          } else {
            throw e;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur amélioration quiz:', error);
      const status = (error as any)?.context?.response?.status ?? (error as any)?.status;
      const details = (error as any)?.context?.body ?? (error as any)?.message ?? 'Erreur inconnue';
      addMessage(`Amélioration interrompue (${status ?? 'n/a'}): ${details}`, false);
      Alert.alert('Erreur', 'Échec de l\'amélioration du quiz. Veuillez réessayer.');
      return null;
    }
  };

  // Test function to check database connection and permissions
  const testDatabaseConnection = async () => {
    console.log('🧪 Testing database connection...');
    try {
      // Test basic connection
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('👤 User data:', userData);
      if (userError) console.error('❌ User error:', userError);

      // Test session data
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔑 Session data:', {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        email: sessionData?.session?.user?.email,
        appMetadata: sessionData?.session?.user?.app_metadata,
        userMetadata: sessionData?.session?.user?.user_metadata
      });

      // Test quiz table access
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id')
        .limit(1);
      console.log('📝 Quiz table access:', { data: quizData, error: quizError });

      // Test quiz_items table access
      const { data: itemsData, error: itemsError } = await supabase
        .from('quiz_items')
        .select('id')
        .limit(1);
      console.log('📋 Quiz_items table access:', { data: itemsData, error: itemsError });

      // Test profile data from AuthProvider
      console.log('👤 AuthProvider data:', {
        hasProfile: !!profile,
        profileId: profile?.id,
        profileRole: profile?.role,
        school_id: profile?.school_id,
        classroom_id: profile?.classroom_id,
        loading: loading,
        hasUser: !!user,
        userId: user?.id
      });

      // Try to fetch profile manually if missing
      if (!profile && user?.id) {
        console.log('🔄 Attempting to fetch profile manually...');
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_user_profile', { user_id_input: user.id });
        console.log('👤 Manual profile fetch:', { data: profileData, error: profileError });
      }

    } catch (error) {
      console.error('❌ Database connection test failed:', error);
    }
  };

  const handleSaveQuiz = async (quiz?: GeneratedQuiz, isPublished: boolean = false, actionType: 'draft' | 'publish' = 'draft') => {
    console.log('🔍 handleSaveQuiz called with:', { 
      hasQuiz: !!quiz, 
      quizTitle: quiz?.title, 
      isPublished, 
      actionType,
      profileId: profile?.id,
      schoolId: profile?.school_id,
      classroomId: profile?.classroom_id
    });

    if (!quiz || !profile?.id) {
      console.error('❌ Missing quiz or profile:', { hasQuiz: !!quiz, hasProfile: !!profile?.id });
      Alert.alert('Erreur', 'Impossible de sauvegarder le quiz');
      return;
    }

    if (!profile.school_id || !profile.classroom_id) {
      console.error('❌ Missing school_id or classroom_id:', { 
        schoolId: profile.school_id, 
        classroomId: profile.classroom_id 
      });
      Alert.alert('Erreur', 'Informations de classe ou d\'école manquantes. Veuillez vous reconnecter.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('🚀 Attempting to save quiz...');
      // Create quiz and items via DAO
      await createQuizWithItems({
        quiz,
        owner_id: profile.id,
        school_id: profile.school_id,
        classroom_id: profile.classroom_id,
        is_published: isPublished,
      });
      console.log('✅ Quiz saved successfully');

      // Custom success messages based on action type
      const successMessages = {
        draft: {
          alert: `Quiz "${quiz.title}" sauvegardé en brouillon!`,
          chat: `📝 Quiz "${quiz.title}" sauvegardé en brouillon. Vous pouvez le modifier et le publier plus tard.`
        },
        publish: {
          alert: `Quiz "${quiz.title}" publié avec succès!`,
          chat: `🚀 Quiz "${quiz.title}" publié! Il est maintenant disponible pour vos élèves.`
        }
      };

      Alert.alert('Succès', successMessages[actionType].alert);
      addMessage(successMessages[actionType].chat, false);
      
      // Reset the generated quiz after successful save
      setGeneratedQuiz(null);
      
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde complète:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status,
        statusText: error.statusText
      });
      
      const errorMessage = error.message || 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible de sauvegarder le quiz: ${errorMessage}`);
      addMessage(`❌ Erreur lors de la sauvegarde: ${errorMessage}`, false);
    } finally {
      console.log('🏁 handleSaveQuiz completed, setting isSaving to false');
      setIsSaving(false);
    }
  };

  const resetConversation = () => {
    Alert.alert(
      'Réinitialiser',
      'Effacer cette proposition et reprendre à zéro ? Ceci supprimera la demande et la proposition actuelle (non sauvegardée).',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui, effacer',
          style: 'destructive',
          onPress: () => {
            // Recréer le message d'accueil initial et vider l'état courant
            const welcomeMessage: Message = {
              id: 'welcome-message',
              text: 'Bonjour ! Je suis votre assistant IA pour créer des quiz. Donnez-moi la leçon du jour ou le sujet sur lequel vous souhaitez créer un quiz, et je génèrerai automatiquement 10 questions adaptées pour vos élèves.',
              isUser: false,
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setGeneratedQuiz(null);
            setEditingQuiz(null);
            setInputText('');
            setShowScrollArrow(false);
          }
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
          
          // Hide arrow when user scrolls to bottom
          if (isAtBottom) {
            setShowScrollArrow(false);
          }
          
          // Dismiss keyboard when scrolling down
          if (contentOffset.y > 100) {
            Keyboard.dismiss();
          }
        }}
        scrollEventThrottle={16}
      >
        {messages.map((message, index) => (
          <View key={message.id} style={styles.messageWrapper}>
            {message.isUser ? (
              // User message - discrete bubble like ChatGPT
              <View style={styles.userMessageContainer}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{message.text}</Text>
                  <Text style={styles.userTimestamp}>
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ) : (
              // AI message - full width, no bubble
              <View style={styles.aiMessageContainer}>
                <Text style={styles.aiText}>{message.text}</Text>
                <Text style={styles.aiTimestamp}>
                  {formatTime(message.timestamp)}
                </Text>

                {/* Quiz Display - Full Width */}
                {message.quiz && (
                  <View style={styles.quizContainer}>
                    {/* Quiz Header */}
                    <View style={styles.quizHeader}>
                      <Text style={styles.quizTitle}>📝 {message.quiz?.title}</Text>
                      <Text style={styles.quizDescription}>{message.quiz?.description}</Text>
                      <View style={styles.quizMeta}>
                        <Text style={styles.quizMetaText}>📊 {message.quiz?.questions.length} questions</Text>
                        <Text style={styles.quizMetaText}>⏱️ ~{Math.ceil(message.quiz?.questions.length * 1.5)} min</Text>
                      </View>
                    </View>

                    {/* Questions List */}
                    <View style={styles.questionsSection}>
                      <Text style={styles.sectionTitle}>📋 Questions du quiz</Text>
                      {message.quiz?.questions.map((question, index) => (
                        <View key={index} style={styles.questionItem}>
                          <Text style={styles.questionNumber}>Question {index + 1}</Text>
                          <Text style={styles.questionText}>{question.question}</Text>
                          
                          <View style={styles.choicesList}>
                            {question.choices.map((choice) => (
                              <View key={choice.id} style={styles.choiceItem}>
                                <Text style={[
                                  styles.choiceBullet,
                                  question.answer_keys.includes(choice.id) && styles.correctChoiceBullet
                                ]}>
                                  {question.answer_keys.includes(choice.id) ? '✅' : '•'}
                                </Text>
                                <Text style={[
                                  styles.choiceText,
                                  question.answer_keys.includes(choice.id) && styles.correctChoiceText
                                ]}>
                                  {choice.id}. {choice.text}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {question.explanation && (
                            <View style={styles.explanationBox}>
                              <Text style={styles.explanationText}>💡 {question.explanation}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.quizActions}>
                      <Text style={styles.actionsTitle}>🎯 Actions disponibles</Text>
                      <View style={styles.actionButtonsGrid}>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => setEditingQuiz(message.quiz || null)}
                        >
                          <Ionicons name="create-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Modifier</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.draftButton]}
                          onPress={() => handleSaveQuiz(message.quiz, false, 'draft')}
                          disabled={isSaving}
                        >
                          <Ionicons name="document-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Brouillon</Text>
                        </TouchableOpacity>
                        
                        <LinearGradient
                          colors={gradients.primary}
                          style={[styles.actionButton, styles.publishButton]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <TouchableOpacity 
                            style={styles.publishButtonInner}
                            onPress={() => handleSaveQuiz(message.quiz, true, 'publish')}
                            disabled={isSaving}
                          >
                            <Ionicons name="rocket-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Publier</Text>
                          </TouchableOpacity>
                        </LinearGradient>
                        
                        {/* Test Database Connection - temporary debug button */}
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                          onPress={testDatabaseConnection}
                        >
                          <Ionicons name="bug-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Test DB</Text>
                        </TouchableOpacity>
                        
                        {/* Refresh Profile - temporary debug button */}
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                          onPress={async () => {
                            console.log('🔄 Forcing profile refresh...');
                            await refreshProfile();
                            console.log('✅ Profile refresh completed');
                          }}
                        >
                          <Ionicons name="refresh-outline" size={18} color="#fff" />
                          <Text style={styles.actionButtonText}>Refresh Profile</Text>
                        </TouchableOpacity>
                        
                        {/* Reset / Start Over - demarcated section */}
                        <View style={styles.resetSection}>
                          <TouchableOpacity 
                            style={styles.resetButton}
                            onPress={resetConversation}
                            disabled={isGenerating}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            <Text style={styles.resetButtonText}>Effacer et recommencer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Loading indicator */}
        {isGenerating && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>
                {generatedQuiz ? 'Amélioration en cours...' : 'Génération du quiz...'}
              </Text>
            </View>
          </View>
        )}

        {/* Scroll Down Arrow */}
        {showScrollArrow && (
          <TouchableOpacity 
            style={styles.scrollArrow}
            onPress={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
              setShowScrollArrow(false);
            }}
          >
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, { height: Math.max(40, inputText.split('\n').length * 20 + 20) }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Décrivez la leçon pour créer un quiz..."
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
          onFocus={() => setShowScrollArrow(false)}
        />
        <LinearGradient
          colors={inputText.trim() ? gradients.primary : [colors.text.tertiary, colors.text.tertiary]}
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity 
            style={styles.sendButtonInner}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={colors.text.primary} 
            />
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
      {/* Edit Quiz Modal */}
      <EditQuizModal
        visible={editingQuiz !== null}
        quiz={editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSave={async (updatedQuiz, isPublished, actionType) => {
          // Save the quiz to database
          await handleSaveQuiz(updatedQuiz, isPublished, actionType);
          setEditingQuiz(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 4,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  // User message styles - discrete bubble like ChatGPT
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    backgroundColor: colors.brand.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
  },
  userText: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  userTimestamp: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    textAlign: 'right',
  },
  // AI message styles - full width, no bubble
  aiMessageContainer: {
    width: '100%',
    marginBottom: 24,
  },
  aiText: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  aiTimestamp: {
    color: colors.text.secondary,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background.secondary,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
    marginRight: 12,
    minHeight: 40,
    maxHeight: 120,
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  sendButtonInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Quiz display styles - full width, no card styling
  quizContainer: {
    width: '100%',
    marginTop: 16,
  },
  quizHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 28,
  },
  quizDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 22,
  },
  quizMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  quizMetaText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  questionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  questionItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brand.secondary,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: 12,
  },
  choicesList: {
    marginLeft: 8,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  choiceBullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
    minWidth: 20,
  },
  correctChoiceBullet: {
    color: colors.status.success,
  },
  choiceText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  correctChoiceText: {
    color: colors.status.success,
    fontWeight: '600',
  },
  explanationBox: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.secondary,
  },
  explanationText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  quizActions: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtonsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: colors.status.warning,
  },
  draftButton: {
    backgroundColor: colors.button.secondary.background,
  },
  publishButton: {
    borderRadius: 10,
    marginBottom: 8,
  },
  publishButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  resetSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    gap: 8,
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  // Loading styles
  loadingContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.primary,
  },
  scrollArrow: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.brand.secondary,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
