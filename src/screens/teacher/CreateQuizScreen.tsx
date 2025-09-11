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

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  quiz?: GeneratedQuiz;
}

export function CreateQuizScreen() {
  const { profile } = useAuth();
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: [
                {
                  type: 'text',
                  text: `Génère un quiz de 10 questions à choix multiples basé sur cette leçon: "${lessonDescription}". 
                  
Règles CRITIQUES pour la distribution des bonnes réponses:
                  - OBLIGATOIRE: Sur les 10 questions, la bonne réponse doit être distribuée de façon équilibrée:
                    * 2-3 bonnes réponses en position A
                    * 2-3 bonnes réponses en position B  
                    * 2-3 bonnes réponses en position C
                    * 2-3 bonnes réponses en position D
                  - INTERDIT: Mettre plus de 3 bonnes réponses sur la même position
                  - INTERDIT: Mettre les bonnes réponses toujours en début (A,B) ou fin (C,D)
                  - VÉRIFICATION: Compte bien que chaque position (A,B,C,D) a au moins 2 bonnes réponses
                  
Format de réponse OBLIGATOIRE (JSON strict):
                  {
                    "title": "Titre du quiz",
                    "description": "Description courte",
                    "questions": [
                      {
                        "question": "Question 1?",
                        "choices": [
                          {"id": "A", "text": "Réponse A"},
                          {"id": "B", "text": "Réponse B"},
                          {"id": "C", "text": "Réponse C"},
                          {"id": "D", "text": "Réponse D"}
                        ],
                        "answer_keys": ["A"],
                        "explanation": "Explication de la bonne réponse"
                      }
                    ]
                  }
                  
Règle IMPORTANTE: Réponds UNIQUEMENT avec le JSON, aucun autre texte.`
                }
              ]
            },
            {
              role: 'user',
              content: `Crée un quiz sur: ${lessonDescription}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      const quizContent = data.choices[0].message.content;
      
      try {
        const quiz: GeneratedQuiz = JSON.parse(quizContent);
        return quiz;
      } catch (parseError) {
        throw new Error('Erreur de format de réponse');
      }
    } catch (error) {
      console.error('Erreur génération quiz:', error);
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Clé API OpenAI invalide ou expirée');
        } else if (error.message.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer plus tard.');
        } else if (error.message.includes('network')) {
          throw new Error('Problème de connexion réseau');
        }
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
        // TODO: Implement quiz improvement logic
      } else {
        // Generate new quiz
        addMessage('Je génère un quiz basé sur votre leçon...', false);
        
        const quiz = await generateQuiz(message);
        setGeneratedQuiz(quiz);
        
        addMessage(`J'ai créé un quiz "${quiz.title}" avec ${quiz.questions.length} questions pour vous :`, false, quiz);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addMessage(`Erreur: ${errorMessage}`, false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async (quiz?: GeneratedQuiz, isPublished: boolean = false, actionType: 'draft' | 'publish' = 'draft') => {
    if (!quiz || !profile?.id) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le quiz');
      return;
    }

    setIsSaving(true);
    try {
      // Create quiz in Supabase
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quiz.title,
          description: quiz.description,
          level: 'CE1', // Default level, could be made configurable
          owner_id: profile.id,
          school_id: profile.school_id,
          classroom_id: profile.classroom_id,
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
          unpublish_at: isPublished ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create quiz items (questions) - remove explanation as it doesn't exist in DB
      const quizItems = quiz.questions.map((question, index) => ({
        quiz_id: quizData.id,
        school_id: profile.school_id,
        classroom_id: profile.classroom_id,
        question: question.question,
        choices: question.choices,
        answer_keys: question.answer_keys,
        order_index: index
      }));

      const { error: itemsError } = await supabase
        .from('quiz_items')
        .insert(quizItems);

      if (itemsError) throw itemsError;

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
      console.error('Erreur sauvegarde:', error);
      const errorMessage = error.message || 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible de sauvegarder le quiz: ${errorMessage}`);
      addMessage(`❌ Erreur lors de la sauvegarde: ${errorMessage}`, false);
    } finally {
      setIsSaving(false);
    }
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
                      <Text style={styles.quizTitle}>📝 {message.quiz.title}</Text>
                      <Text style={styles.quizDescription}>{message.quiz.description}</Text>
                      <View style={styles.quizMeta}>
                        <Text style={styles.quizMetaText}>📊 {message.quiz.questions.length} questions</Text>
                        <Text style={styles.quizMetaText}>⏱️ ~{Math.ceil(message.quiz.questions.length * 1.5)} min</Text>
                      </View>
                    </View>

                    {/* Questions List */}
                    <View style={styles.questionsSection}>
                      <Text style={styles.sectionTitle}>📋 Questions du quiz</Text>
                      {message.quiz.questions.map((question, index) => (
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
