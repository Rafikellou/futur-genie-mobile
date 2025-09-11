import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Loader } from '../../components/common/Loader';
import { ErrorView } from '../../components/common/ErrorView';
import { colors, gradients } from '../../theme/colors';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'suggestion' | 'bug' | 'feature';
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export function SuggestionsScreen() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'suggestion' | 'bug' | 'feature'>('suggestion');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      if (!profile?.id) {
        setError('Profil non trouvé');
        return;
      }

      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSuggestions(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Erreur lors du chargement des suggestions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuggestions();
  };

  const submitSuggestion = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (!profile?.id) {
      Alert.alert('Erreur', 'Profil non trouvé');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('suggestions')
        .insert({
          user_id: profile.id,
          title: title.trim(),
          description: description.trim(),
          type,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Votre suggestion a été envoyée avec succès !');
      setTitle('');
      setDescription('');
      setType('suggestion');
      fetchSuggestions();
    } catch (err) {
      console.error('Error submitting suggestion:', err);
      Alert.alert('Erreur', 'Impossible d\'envoyer la suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (suggestionType: string) => {
    switch (suggestionType) {
      case 'bug':
        return 'bug';
      case 'feature':
        return 'bulb';
      default:
        return 'chatbubble';
    }
  };

  const getTypeColor = (suggestionType: string) => {
    switch (suggestionType) {
      case 'bug':
        return colors.status.error;
      case 'feature':
        return colors.brand.secondary;
      default:
        return colors.status.success;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return colors.status.success;
      case 'reviewed':
        return colors.status.warning;
      default:
        return colors.text.tertiary;
    }
  };

  const renderSuggestionItem = ({ item }: { item: Suggestion }) => (
    <View style={styles.suggestionCard}>
      <View style={styles.suggestionHeader}>
        <View style={styles.suggestionInfo}>
          <View style={styles.typeRow}>
            <Ionicons 
              name={getTypeIcon(item.type)} 
              size={16} 
              color={getTypeColor(item.type)} 
            />
            <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
              {item.type === 'bug' ? 'Bug' : item.type === 'feature' ? 'Fonctionnalité' : 'Suggestion'}
            </Text>
          </View>
          <Text style={styles.suggestionTitle}>{item.title}</Text>
          <Text style={styles.suggestionDescription}>{item.description}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status === 'pending' ? 'En attente' : 
               item.status === 'reviewed' ? 'Examiné' : 'Résolu'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchSuggestions} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Suggestions</Text>
          <Text style={styles.headerSubtitle}>
            Aidez-nous à améliorer l'application
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Nouvelle suggestion</Text>
          
          <View style={styles.typeSelector}>
            {[
              { key: 'suggestion', label: 'Suggestion', icon: 'chatbubble' },
              { key: 'bug', label: 'Bug', icon: 'bug' },
              { key: 'feature', label: 'Fonctionnalité', icon: 'bulb' },
            ].map((typeOption) => (
              <TouchableOpacity
                key={typeOption.key}
                style={[
                  styles.typeButton,
                  type === typeOption.key && styles.typeButtonActive,
                ]}
                onPress={() => setType(typeOption.key as any)}
              >
                <Ionicons 
                  name={typeOption.icon as any} 
                  size={20} 
                  color={type === typeOption.key ? colors.text.primary : colors.text.secondary} 
                />
                <Text style={[
                  styles.typeButtonText,
                  type === typeOption.key && styles.typeButtonTextActive,
                ]}>
                  {typeOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Titre de votre suggestion"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={styles.descriptionInput}
            placeholder="Décrivez votre suggestion en détail..."
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />

          <LinearGradient
            colors={gradients.primary}
            style={styles.submitButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.submitButtonInner}
              onPress={submitSuggestion}
              disabled={submitting}
            >
              {submitting ? (
                <Ionicons name="hourglass" size={20} color={colors.text.primary} />
              ) : (
                <Ionicons name="send" size={20} color={colors.text.primary} />
              )}
              <Text style={styles.submitButtonText}>
                {submitting ? 'Envoi...' : 'Envoyer'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Mes suggestions</Text>
          
          {suggestions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucune suggestion envoyée</Text>
              <Text style={styles.emptySubtext}>
                Vos suggestions apparaîtront ici après envoi
              </Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
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
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  typeButtonActive: {
    borderColor: colors.brand.secondary,
    backgroundColor: colors.background.secondary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  titleInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  descriptionInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 20,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  submitButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyContainer: {
    padding: 20,
    paddingTop: 0,
  },
  suggestionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionInfo: {
    flex: 1,
    marginRight: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
