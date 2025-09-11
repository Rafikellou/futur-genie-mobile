import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { colors } from '../../theme/colors';

interface SupportCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const supportCategories: SupportCategory[] = [
  {
    id: '1',
    title: 'Problème technique',
    icon: 'bug',
    description: 'Application qui plante, erreurs, problèmes de connexion'
  },
  {
    id: '2',
    title: 'Question sur les quiz',
    icon: 'help-circle',
    description: 'Difficultés avec les quiz, scores, progression'
  },
  {
    id: '3',
    title: 'Compte et profil',
    icon: 'person',
    description: 'Modification du profil, informations personnelles'
  },
  {
    id: '4',
    title: 'Suggestion d\'amélioration',
    icon: 'bulb',
    description: 'Idées pour améliorer l\'application'
  },
  {
    id: '5',
    title: 'Autre',
    icon: 'chatbubble',
    description: 'Toute autre question ou préoccupation'
  }
];

export function SupportScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory || !message.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie et saisir votre message');
      return;
    }

    setLoading(true);
    try {
      // Simulate sending support request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Message envoyé !',
        'Votre demande a été transmise à notre équipe support. Nous vous répondrons dans les plus brefs délais.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      
      setMessage('');
      setSelectedCategory(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer votre message. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryData = supportCategories.find(cat => cat.id === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="help-circle" size={48} color={colors.brand.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.welcomeSubtitle}>
            Sélectionnez une catégorie et décrivez votre problème ou suggestion
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégorie</Text>
          {supportCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardSelected
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <View style={styles.categoryIcon}>
                <Ionicons 
                  name={category.icon} 
                  size={24} 
                  color={selectedCategory === category.id ? colors.brand.primary : colors.text.secondary} 
                />
              </View>
              <View style={styles.categoryContent}>
                <Text style={[
                  styles.categoryTitle,
                  selectedCategory === category.id && styles.categoryTitleSelected
                ]}>
                  {category.title}
                </Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>
              {selectedCategory === category.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votre message</Text>
          <TextInput
            style={styles.messageInput}
            multiline
            numberOfLines={6}
            placeholder="Décrivez votre problème ou suggestion en détail..."
            placeholderTextColor={colors.text.tertiary}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du compte</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email :</Text>
              <Text style={styles.infoValue}>{profile?.email || 'Non renseigné'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom :</Text>
              <Text style={styles.infoValue}>{profile?.full_name || 'Non renseigné'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Enfant :</Text>
              <Text style={styles.infoValue}>{profile?.child_first_name || 'Non renseigné'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!selectedCategory || !message.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedCategory || !message.trim() || loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Envoi en cours...' : 'Envoyer le message'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  categoryCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.background.tertiary,
  },
  categoryIcon: {
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  categoryTitleSelected: {
    color: colors.brand.primary,
  },
  categoryDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  messageInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    minHeight: 120,
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  submitButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
