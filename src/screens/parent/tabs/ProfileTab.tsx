import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../theme/colors';

export function ProfileTab({ navigation }: any) {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [childFirstName, setChildFirstName] = useState(profile?.child_first_name || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          child_first_name: childFirstName,
          full_name: fullName,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Profile updated successfully

      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    Alert.alert('Fonctionnalité à venir', 'La modification de photo de profil sera bientôt disponible');
  };

  const handleSupport = () => {
    // Navigate to support screen (similar to teacher suggestions)
    navigation.navigate('SupportScreen');
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Profil</Text>
        <Text style={styles.subtitleText}>Gérez vos informations personnelles</Text>
      </View>

      {/* Profile Image Section */}
      <View style={styles.profileImageSection}>
        <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="person" size={40} color={colors.text.secondary} />
            </View>
          )}
          <View style={styles.imageEditIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.imageHint}>Touchez pour changer la photo</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons 
              name={isEditing ? "close" : "pencil"} 
              size={20} 
              color={colors.brand.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nom complet</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Votre nom complet"
                placeholderTextColor={colors.text.tertiary}
              />
            ) : (
              <Text style={styles.infoValue}>{fullName || 'Non renseigné'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Prénom de l'enfant</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={childFirstName}
                onChangeText={setChildFirstName}
                placeholder="Prénom de votre enfant"
                placeholderTextColor={colors.text.tertiary}
              />
            ) : (
              <Text style={styles.infoValue}>{childFirstName || 'Non renseigné'}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || 'Non renseigné'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>École</Text>
            <Text style={styles.infoValue}>{profile?.school_id || 'Non renseigné'}</Text>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleSupport}>
          <View style={styles.actionIcon}>
            <Ionicons name="help-circle" size={24} color={colors.brand.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Aide & Support</Text>
            <Text style={styles.actionSubtitle}>Besoin d'aide ? Contactez-nous</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
          <View style={styles.actionIcon}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Déconnexion</Text>
            <Text style={styles.actionSubtitle}>Se déconnecter de l'application</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
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
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.background.secondary,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  imageEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.secondary,
  },
  imageHint: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
  },
  textInput: {
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.background.primary,
  },
  saveButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
