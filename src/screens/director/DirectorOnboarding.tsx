import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { directorOnboardingComplete } from '../../lib/db';
import { colors } from '../../theme/colors';

export function DirectorOnboarding() {
  const { user, refreshProfile } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const completeOnboarding = async () => {
    if (!user) return;
    if (!schoolName.trim()) {
      Alert.alert('Nom requis', "Veuillez saisir le nom de l'école");
      return;
    }
    try {
      setLoading(true);
      
      // Use the new combined onboarding function via DAO
      const data = await directorOnboardingComplete(schoolName.trim(), fullName.trim() || '');
      
      // Refresh JWT to include updated app_metadata (school_id)
      await supabase.auth.refreshSession();
      await refreshProfile();
      
      Alert.alert('Configuration terminée', "Votre profil directeur et votre école ont été créés avec succès.");
      
    } catch (e: any) {
      console.error('Onboarding error', e);
      Alert.alert('Erreur', e?.message || "Impossible de terminer la configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Ionicons name="school-outline" size={48} color={colors.brand.primary} />
        <Text style={styles.title}>Bienvenue Directeur</Text>
        <Text style={styles.subtitle}>Créez votre école pour commencer</Text>

        <Text style={styles.label}>Votre nom complet (optionnel)</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholder="Ex: Marie Dupont"
          placeholderTextColor={colors.text.placeholder}
        />

        <Text style={styles.label}>Nom de l'école</Text>
        <TextInput
          value={schoolName}
          onChangeText={setSchoolName}
          style={styles.input}
          placeholder="Ex: École Jean Jaurès"
          placeholderTextColor={colors.text.placeholder}
        />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={completeOnboarding}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Créer et continuer</Text>
        </TouchableOpacity>

        <Text style={styles.help}>Vous avez déjà une école? Ce flux prendra en charge l'association si RLS l'autorise.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: 22, marginTop: 12 },
  subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: 16 },
  label: { color: colors.text.primary, alignSelf: 'flex-start', marginBottom: 8, marginTop: 8, fontWeight: '600' },
  input: { width: '100%', borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.tertiary, color: colors.text.primary, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  btn: { marginTop: 16, backgroundColor: colors.brand.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  help: { color: colors.text.tertiary, marginTop: 12, textAlign: 'center' },
});
