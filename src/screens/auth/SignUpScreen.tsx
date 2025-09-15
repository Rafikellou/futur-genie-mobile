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
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../providers/AuthProvider';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Loader } from '../../components/common/Loader';
import { GradientButton } from '../../components/common/GradientButton';
import { colors } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';
import { supabase } from '../../lib/supabase';
import { directorOnboardingComplete } from '../../lib/db';

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
        const match = /[?&]token=([^&]+)/.exec(text);
        const token = match?.[1];
        if (token) {
          navigation.navigate('InviteEntry' as any, { token });
        } else {
          Alert.alert(
            'Lien invalide',
            "Le lien d'invitation ne contient pas de token valide."
          );
        }
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
      const { error: signUpError } = await signUp(
        email,
        password,
        fullName.split(' ')[0],
        fullName.split(' ').slice(1).join(' ') || '',
        'DIRECTOR' as any
      );
      
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
      console.log('🏫 Calling director_onboarding_complete via DAO...');
      try {
        const data = await directorOnboardingComplete(schoolName.trim(), fullName.trim());
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
      } catch (onboardingError: any) {
        console.error('❌ Director onboarding error:', onboardingError);
        Alert.alert('Erreur', 'Compte créé mais impossible de créer l\'école. Vous pourrez la créer après connexion.');
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
      style={commonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={commonStyles.headerContainer}>
          {/* Logo placeholder */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🔥</Text>
            </View>
          </View>
          
          <Text style={commonStyles.title}>Créer un compte Directeur</Text>
          <Text style={commonStyles.subtitle}>Seuls les Directeurs créent un compte ici</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              En tant que Directeur, vous pourrez créer votre école et inviter enseignants et parents.
            </Text>
          </View>
        </View>

        <View style={commonStyles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={commonStyles.label}>Nom complet</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ex: Marie Dupont"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={commonStyles.label}>Nom de l'école</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="Ex: École Jean Jaurès"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={commonStyles.label}>Email</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={colors.text.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={commonStyles.label}>Mot de passe</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.text.placeholder}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={commonStyles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.text.placeholder}
              secureTextEntry
            />
          </View>

          <GradientButton
            title="Créer compte et école"
            onPress={handleDirectorSignUp}
            variant="primary"
            style={styles.signUpButton}
          />

          <TouchableOpacity style={[commonStyles.secondaryButton, styles.inviteButton]} onPress={handleInviteLink}>
            <Text style={commonStyles.secondaryButtonText}>J'ai un lien d'invitation</Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[commonStyles.accentText, styles.loginLink]}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...commonStyles.shadow,
  },
  logoText: {
    fontSize: 40,
  },
  infoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.violet,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    // Styles additionnels si nécessaire
  },
  signUpButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  inviteButton: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Inter-Regular',
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
