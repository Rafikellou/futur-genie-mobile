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
  Image,
} from 'react-native';
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
          {/* Logo Futur Génie */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../public/logo-principal.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
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


          <View style={styles.navigationContainer}>
            <Text style={styles.navigationText}>
              Vous avez déjà un compte ?
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.actionButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.invitationContainer}>
            <Text style={styles.invitationText}>
              Je veux créer un compte en tant que parent ou enseignant d'une école et classe déjà créés.
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('UnifiedInvitationSignUp')}
            >
              <Text style={styles.actionButtonText}>Créer avec un jeton d'invitation</Text>
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
  logoImage: {
    width: 80,
    height: 80,
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
  navigationContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  navigationText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  invitationContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  invitationText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});
