import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import { Loader } from '../../components/common/Loader';
import { colors, gradients } from '../../theme/colors';
import { invitationPreview, invitationConsume } from '../../lib/db';
import { supabase } from '../../lib/supabase';

// Minimal types for this screen
type ParamList = {
  ParentInvitationSignUp: { token: string };
  Login: undefined;
};

type NavProp = StackNavigationProp<ParamList, 'ParentInvitationSignUp'>;

type Props = { navigation: NavProp; route: RouteProp<ParamList, 'ParentInvitationSignUp'> };

export function ParentInvitationSignUpScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const { signUp, refreshProfile } = useAuth();

  const token = route.params?.token;

  useEffect(() => {
    if (token) {
      fetchInvitationData();
    }
  }, [token]);

  const fetchInvitationData = async () => {
    try {
      const data = await invitationPreview(token);
      if (!data?.ok) {
        Alert.alert('Erreur', "Lien d'invitation invalide");
        navigation.goBack();
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        Alert.alert('Erreur', "Ce lien d'invitation a expiré");
        navigation.goBack();
        return;
      }
      if (data.intended_role !== 'PARENT') {
        Alert.alert('Erreur', "Ce lien n'est pas destiné aux parents");
        navigation.goBack();
        return;
      }
      setInvitationData({
        ...data,
        classroom: data.classroom,
        school: data.school,
      });
    } catch (error) {
      Alert.alert('Erreur', "Impossible de vérifier l'invitation");
      navigation.goBack();
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!childFirstName) {
      Alert.alert('Erreur', "Le prénom de l'enfant est requis pour les parents");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      // Create auth user (no role here; invitation will set role)
      const { error: signUpError } = await signUp(
        email,
        password,
        fullName.split(' ')[0],
        fullName.split(' ').slice(1).join(' ') || ''
      );

      if (signUpError) {
        Alert.alert("Erreur d'inscription", signUpError.message);
        return;
      }

      // Consume invitation with childFirstName
      try {
        await invitationConsume(token, { childFirstName });
      } catch (consumeError: any) {
        Alert.alert("Erreur", "Compte créé mais impossible de traiter l'invitation. Contactez votre école.");
        return;
      }

      // Refresh session and proactively refresh profile to avoid race
      try { 
        console.log('🔄 Refreshing session after invitation consume...');
        await supabase.auth.refreshSession(); 
      } catch (e) {
        console.warn('⚠️ Session refresh failed:', e);
      }
      
      // Force fresh user data from server to get updated app_metadata
      try {
        console.log('🔄 Getting fresh user data...');
        const { data: freshUser } = await supabase.auth.getUser();
        console.log('✅ Fresh user app_metadata:', freshUser?.user?.app_metadata);
      } catch (e) {
        console.warn('⚠️ Fresh user fetch failed:', e);
      }
      
      // Wait a bit for JWT propagation then refresh profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      try { 
        console.log('🔄 Refreshing profile...');
        await refreshProfile(); 
      } catch (e) {
        console.warn('⚠️ Profile refresh failed:', e);
      }
      
      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = !!sessionData?.session?.user;

      if (hasSession) {
        Alert.alert(
          'Inscription réussie',
          "Votre compte a été créé et l'invitation a été appliquée. Vous allez être redirigé vers votre tableau de bord.",
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Inscription réussie',
          "Votre compte a été créé. Vérifiez votre email pour confirmer votre compte avant de vous connecter.",
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !invitationData) {
    return <Loader />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Inscription Parent</Text>
          <Text style={styles.subtitle}>Rejoignez la classe via votre invitation</Text>
          {invitationData?.classroom && (
            <Text style={styles.subtitle}>
              Classe: {invitationData.classroom?.name} ({invitationData.classroom?.grade})
            </Text>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ex: Marie Dupont"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom de l'enfant *</Text>
            <TextInput
              style={styles.input}
              value={childFirstName}
              onChangeText={setChildFirstName}
              placeholder="Ex: Lucas"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <LinearGradient
            colors={gradients.primary}
            style={styles.signUpButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.signUpButtonInner} onPress={handleSignUp}>
              <Text style={styles.signUpButtonText}>S'inscrire</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.brand.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.text.secondary, textAlign: 'center', marginBottom: 4 },
  form: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  signUpButton: { borderRadius: 8, marginTop: 20 },
  signUpButtonInner: { padding: 16, alignItems: 'center' },
  signUpButtonText: { color: colors.text.primary, fontSize: 18, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 16, color: colors.text.secondary },
  loginLink: { fontSize: 16, color: colors.brand.primary, fontWeight: '600' },
});
