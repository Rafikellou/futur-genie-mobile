import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../providers/AuthProvider';

export function CommunicationTab() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Communication</Text>
        <Text style={styles.subtitleText}>
          Échanges avec l'équipe pédagogique
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.comingSoonContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubbles" size={64} color="#6b7280" />
          </View>
          
          <Text style={styles.comingSoonTitle}>Bientôt disponible</Text>
          <Text style={styles.comingSoonDescription}>
            Cette section permettra de communiquer directement avec les enseignants de {profile?.child_first_name || 'votre enfant'}.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="mail" size={20} color="#9ca3af" />
              <Text style={styles.featureText}>Messages directs avec les enseignants</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="notifications" size={20} color="#9ca3af" />
              <Text style={styles.featureText}>Annonces de la classe</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="calendar" size={20} color="#9ca3af" />
              <Text style={styles.featureText}>Informations sur les événements</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="document-text" size={20} color="#9ca3af" />
              <Text style={styles.featureText}>Rapports de progression</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
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
    borderBottomColor: '#e5e7eb',
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: 320,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
});
