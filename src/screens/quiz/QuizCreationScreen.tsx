import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Loader } from '../../components/common/Loader';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export function QuizCreationScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const generateQuizWithAI = async () => {
    if (!subject || !level) {
      Alert.alert('Erreur', 'Veuillez remplir le sujet et le niveau');
      return;
    }

    setGeneratingQuiz(true);
    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          level,
          questionCount: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du quiz');
      }

      const data = await response.json();
      
      setTitle(data.title || `Quiz ${subject} - ${level}`);
      setDescription(data.description || `Quiz généré automatiquement sur ${subject}`);
      setQuestions(data.questions || []);
      
      Alert.alert('Succès', 'Quiz généré avec succès !');
    } catch (error) {
      console.error('Error generating quiz:', error);
      Alert.alert('Erreur', 'Impossible de générer le quiz. Veuillez réessayer.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const addManualQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const saveQuiz = async () => {
    if (!title || !description || questions.length === 0) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!profile?.class_id) {
      Alert.alert('Erreur', 'Aucune classe assignée');
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter(q => 
      !q.question || q.options.some(opt => !opt.trim())
    );

    if (invalidQuestions.length > 0) {
      Alert.alert('Erreur', 'Toutes les questions doivent avoir un texte et des options complètes');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .insert({
          title,
          description,
          questions,
          class_id: profile.class_id,
          teacher_id: profile.id,
          is_published: false,
        });

      if (error) throw error;

      Alert.alert(
        'Succès',
        'Quiz créé avec succès !',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving quiz:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading || generatingQuiz) {
    return <Loader />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer un nouveau quiz</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Titre du quiz *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Quiz de mathématiques"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le contenu du quiz..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Génération automatique (IA)</Text>
          
          <View style={styles.aiContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sujet</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Ex: Mathématiques, Histoire, Sciences..."
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Niveau</Text>
              <TextInput
                style={styles.input}
                value={level}
                onChangeText={setLevel}
                placeholder="Ex: CE1, CM2, 6ème..."
              />
            </View>

            <TouchableOpacity 
              style={styles.generateButton}
              onPress={generateQuizWithAI}
            >
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Générer avec l'IA</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.questionsHeader}>
            <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addManualQuestion}
            >
              <Ionicons name="add" size={20} color="#2563eb" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Question {index + 1}</Text>
                <TouchableOpacity 
                  onPress={() => removeQuestion(question.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={question.question}
                onChangeText={(text) => updateQuestion(question.id, 'question', text)}
                placeholder="Tapez votre question..."
                multiline
              />

              <Text style={styles.optionsLabel}>Options de réponse</Text>
              {question.options.map((option, optionIndex) => (
                <View key={optionIndex} style={styles.optionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.optionRadio,
                      question.correctAnswer === optionIndex && styles.optionRadioSelected
                    ]}
                    onPress={() => updateQuestion(question.id, 'correctAnswer', optionIndex)}
                  >
                    {question.correctAnswer === optionIndex && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    value={option}
                    onChangeText={(text) => {
                      const newOptions = [...question.options];
                      newOptions[optionIndex] = text;
                      updateQuestion(question.id, 'options', newOptions);
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                </View>
              ))}
            </View>
          ))}

          {questions.length === 0 && (
            <View style={styles.emptyQuestions}>
              <Ionicons name="help-circle-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Aucune question ajoutée</Text>
              <Text style={styles.emptySubtext}>
                Utilisez l'IA ou ajoutez des questions manuellement
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, (!title || !description || questions.length === 0) && styles.saveButtonDisabled]}
            onPress={saveQuiz}
            disabled={!title || !description || questions.length === 0}
          >
            <Text style={styles.saveButtonText}>Sauvegarder le quiz</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  aiContainer: {
    backgroundColor: colors.background.tertiary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  questionCard: {
    backgroundColor: colors.background.tertiary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    padding: 4,
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  optionInput: {
    flex: 1,
  },
  emptyQuestions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
