import React, { useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../providers/AuthProvider';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Loader } from '../../components/common/Loader';
import { colors, gradients } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, refreshProfile } = useAuth();
  const handleInviteLink = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && (text.includes('/invite') || text.includes('invite?'))) {
        (navigation.getParent() as any)?.navigate('Invitation', { url: text });
      } else {
        Alert.alert(
          "Lien non détecté",
          "Copiez un lien d'invitation (se terminant par /invite?token=...) puis réessayez."
        );
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'accéder au presse-papiers");
    }
  };

  const handleDirectorSignUp = async () => {
    if (!email || !password || !fullName || !schoolName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
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
      console.log('🚀 SignUpScreen: Starting director signup process');
      
      // First, create the auth user with role metadata
      console.log('👤 Creating auth user...');
      const { error: signUpError } = await signUp(email, password, fullName.split(' ')[0], fullName.split(' ').slice(1).join(' ') || '');
      
      if (signUpError) {
        console.error('❌ Auth signup error:', signUpError);
        Alert.alert('Erreur d\'inscription', signUpError.message);
        return;
      }
      console.log('✅ Auth user created successfully');

      // Wait a moment for auth user to be created
      console.log('⏳ Waiting for auth user to be fully created...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then complete the director onboarding with school creation
      console.log('🏫 Calling director_onboarding_complete Edge Function...');
      const { data, error: onboardingError } = await supabase.functions.invoke('director_onboarding_complete', {
        body: { 
          schoolName: schoolName.trim(),
          fullName: fullName.trim()
        },
      });
      
      if (onboardingError) {
        console.error('❌ Director onboarding error:', onboardingError);
        Alert.alert('Erreur', 'Compte créé mais impossible de créer l\'école. Vous pourrez la créer après connexion.');
      } else {
        console.log('✅ Director onboarding completed:', data);
        
        // Refresh session to get updated metadata
        console.log('🔄 Refreshing session...');
        await supabase.auth.refreshSession();
        
        // Wait for profile to be available
        console.log('⏳ Waiting for profile to be available...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Refresh profile
        console.log('📋 Refreshing profile...');
        await refreshProfile();
        
        console.log('🎉 Signup process completed successfully');
        Alert.alert(
          'Inscription réussie',
          'Votre compte directeur et votre école ont été créés avec succès. Vérifiez votre email pour confirmer votre compte.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: any) {
      console.error('💥 SignUp unexpected error:', error);
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte Directeur</Text>
          <Text style={styles.subtitle}>Seuls les Directeurs créent un compte ici</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ex: Marie Dupont"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom de l'école</Text>
            <TextInput
              style={styles.input}
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="Ex: École Jean Jaurès"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
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
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
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
            <TouchableOpacity style={styles.signUpButtonInner} onPress={handleDirectorSignUp}>
              <Text style={styles.signUpButtonText}>Créer compte et école</Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity style={styles.inviteButton} onPress={handleInviteLink}>
            <Text style={styles.inviteButtonText}>J’ai un lien d’invitation</Text>
          </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brand.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  signUpButton: {
    borderRadius: 8,
    marginTop: 20,
  },
  signUpButtonInner: {
    padding: 16,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  inviteButton: {
    marginTop: 12,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.secondary,
  },
  inviteButtonText: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: 16,
    color: colors.brand.primary,
    fontWeight: '600',
  },
});
