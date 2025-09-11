import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface EditQuizModalProps {
  visible: boolean;
  quiz: GeneratedQuiz | null;
  onClose: () => void;
  onSave: (quiz: GeneratedQuiz, isPublished: boolean, actionType: 'draft' | 'publish') => void;
}

export function EditQuizModal({ visible, quiz, onClose, onSave }: EditQuizModalProps) {
  const [editedQuiz, setEditedQuiz] = React.useState<GeneratedQuiz | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (quiz) {
      setEditedQuiz(JSON.parse(JSON.stringify(quiz))); // Deep copy
    }
  }, [quiz]);

  const handleSave = async (isPublished: boolean, actionType: 'draft' | 'publish') => {
    if (!editedQuiz) return;
    
    // Validation
    if (!editedQuiz.title.trim()) {
      Alert.alert('Erreur', 'Le titre du quiz est requis');
      return;
    }
    
    if (editedQuiz.questions.length === 0) {
      Alert.alert('Erreur', 'Le quiz doit contenir au moins une question');
      return;
    }
    
    // Validate each question
    for (let i = 0; i < editedQuiz.questions.length; i++) {
      const question = editedQuiz.questions[i];
      if (!question.question.trim()) {
        Alert.alert('Erreur', `La question ${i + 1} ne peut pas être vide`);
        return;
      }
      if (question.choices.length < 2) {
        Alert.alert('Erreur', `La question ${i + 1} doit avoir au moins 2 choix`);
        return;
      }
      if (question.answer_keys.length === 0) {
        Alert.alert('Erreur', `La question ${i + 1} doit avoir au moins une bonne réponse`);
        return;
      }
    }
    
    // Call the save function and wait for it to complete
    await onSave(editedQuiz, isPublished, actionType);
    onClose();
  };

  const updateQuizTitle = (title: string) => {
    if (!editedQuiz) return;
    setEditedQuiz({ ...editedQuiz, title });
  };

  const updateQuizDescription = (description: string) => {
    if (!editedQuiz) return;
    setEditedQuiz({ ...editedQuiz, description });
  };

  const updateQuestion = (index: number, questionText: string) => {
    if (!editedQuiz) return;
    const newQuestions = [...editedQuiz.questions];
    newQuestions[index] = { ...newQuestions[index], question: questionText };
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
  };

  const updateChoice = (questionIndex: number, choiceId: string, text: string) => {
    if (!editedQuiz) return;
    const newQuestions = [...editedQuiz.questions];
    const choiceIndex = newQuestions[questionIndex].choices.findIndex(c => c.id === choiceId);
    if (choiceIndex !== -1) {
      newQuestions[questionIndex].choices[choiceIndex].text = text;
      setEditedQuiz({ ...editedQuiz, questions: newQuestions });
    }
  };

  const toggleCorrectAnswer = (questionIndex: number, choiceId: string) => {
    if (!editedQuiz) return;
    const newQuestions = [...editedQuiz.questions];
    const question = newQuestions[questionIndex];
    
    if (question.answer_keys.includes(choiceId)) {
      // Remove from correct answers
      question.answer_keys = question.answer_keys.filter(id => id !== choiceId);
    } else {
      // Add to correct answers (for now, only single correct answer)
      question.answer_keys = [choiceId];
    }
    
    setEditedQuiz({ ...editedQuiz, questions: newQuestions });
  };

  const deleteQuestion = (index: number) => {
    if (!editedQuiz) return;
    Alert.alert(
      'Supprimer la question',
      'Êtes-vous sûr de vouloir supprimer cette question ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newQuestions = editedQuiz.questions.filter((_, i) => i !== index);
            setEditedQuiz({ ...editedQuiz, questions: newQuestions });
          }
        }
      ]
    );
  };

  if (!editedQuiz) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le quiz</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => handleSave(false, 'draft')} 
              style={[styles.headerButton, styles.draftButton]}
            >
              <Text style={styles.headerButtonText}>Brouillon</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleSave(true, 'publish')} 
              style={[styles.headerButton, styles.publishButton]}
            >
              <Text style={styles.headerButtonText}>Publier</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quiz Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Titre du quiz</Text>
            <TextInput
              style={styles.titleInput}
              value={editedQuiz.title}
              onChangeText={updateQuizTitle}
              placeholder="Titre du quiz"
              placeholderTextColor="#999"
            />
          </View>

          {/* Quiz Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={editedQuiz.description}
              onChangeText={updateQuizDescription}
              placeholder="Description du quiz"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Questions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Questions ({editedQuiz.questions.length})</Text>
            
            {editedQuiz.questions.map((question, questionIndex) => (
              <View key={questionIndex} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>{questionIndex + 1}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteQuestion(questionIndex)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Question Text */}
                <TextInput
                  style={styles.questionInput}
                  value={question.question}
                  onChangeText={(text) => updateQuestion(questionIndex, text)}
                  placeholder="Texte de la question"
                  placeholderTextColor="#999"
                  multiline
                />

                {/* Choices */}
                <View style={styles.choicesContainer}>
                  <Text style={styles.choicesTitle}>Choix de réponses</Text>
                  {question.choices.map((choice) => (
                    <View key={choice.id} style={styles.choiceRow}>
                      <TouchableOpacity
                        onPress={() => toggleCorrectAnswer(questionIndex, choice.id)}
                        style={[
                          styles.choiceRadio,
                          question.answer_keys.includes(choice.id) && styles.choiceRadioSelected
                        ]}
                      >
                        {question.answer_keys.includes(choice.id) && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <Text style={styles.choiceLabel}>{choice.id}</Text>
                      <TextInput
                        style={styles.choiceInput}
                        value={choice.text}
                        onChangeText={(text) => updateChoice(questionIndex, choice.id, text)}
                        placeholder="Texte du choix"
                        placeholderTextColor="#999"
                      />
                    </View>
                  ))}
                </View>

                {/* Explanation */}
                {question.explanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationLabel}>Explication</Text>
                    <Text style={styles.explanationText}>{question.explanation}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  draftButton: {
    backgroundColor: '#6b7280',
  },
  publishButton: {
    backgroundColor: '#10b981',
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  descriptionInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#475569',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  questionCard: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  questionInput: {
    backgroundColor: '#475569',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  choicesContainer: {
    marginBottom: 16,
  },
  choicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  choiceRadioSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  choiceLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 20,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: '#475569',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
  },
  explanationContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#93c5fd',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
  },
});
