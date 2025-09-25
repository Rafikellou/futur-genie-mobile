import React, { useState, useEffect } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import { Loader } from '../../components/common/Loader';
import { GradientButton } from '../../components/common/GradientButton';
import { colors } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';
import { invitationPreview, invitationConsume } from '../../lib/db';
import { supabase } from '../../lib/supabase';

type UnifiedInvitationSignUpScreenNavigationProp = StackNavigationProp<any, 'UnifiedInvitationSignUp'>;
type UnifiedInvitationSignUpScreenRouteProp = RouteProp<any, 'UnifiedInvitationSignUp'>;

interface Props {
  navigation: UnifiedInvitationSignUpScreenNavigationProp;
  route: UnifiedInvitationSignUpScreenRouteProp;
}

export function UnifiedInvitationSignUpScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const { signUp, setInvitationProcessing } = useAuth();

  const routeToken = route.params?.token;

  useEffect(() => {
    if (routeToken) {
      setManualToken(routeToken);
      fetchInvitationData(routeToken);
    }
  }, [routeToken]);

  const fetchInvitationData = async (tokenToUse: string) => {
    try {
      const data = await invitationPreview(tokenToUse);
      if (!data?.ok) {
        Alert.alert('Erreur', 'Jeton d\'invitation invalide');
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        Alert.alert('Erreur', 'Ce jeton d\'invitation a expiré');
        return;
      }
      setInvitationData({
        ...data,
        classroom: data.classroom,
        school: data.school,
      });
      setTokenValidated(true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de vérifier l\'invitation');
    }
  };

  const handleTokenValidation = async () => {
    if (!manualToken.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un jeton d\'invitation');
      return;
    }
    await fetchInvitationData(manualToken.trim());
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation spécifique aux parents
    if (invitationData?.intended_role === 'PARENT' && !childFirstName) {
      Alert.alert('Erreur', 'Le prénom de l\'enfant est requis pour les parents');
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
    setInvitationProcessing(true);
    
    try {
      console.log('🚀 UnifiedInvitationSignUp: Starting signup process for', invitationData?.intended_role);
      
      // Create auth user (no role here; invitation will set role)
      const { error: signUpError } = await signUp(
        email,
        password,
        fullName.split(' ')[0],
        fullName.split(' ').slice(1).join(' ') || ''
      );
      
      if (signUpError) {
        Alert.alert('Erreur d\'inscription', signUpError.message);
        return;
      }

      // Consume invitation
      try {
        await invitationConsume(manualToken, {
          childFirstName: invitationData?.intended_role === 'PARENT' ? childFirstName : null,
        });
      } catch (consumeError: any) {
        Alert.alert('Erreur', 'Compte créé mais impossible de traiter l\'invitation. Contactez votre école.');
        return;
      }

      // Refresh session to include updated app_metadata
      try {
        console.log('🔄 Refreshing session after invitation consume...');
        await supabase.auth.refreshSession();
      } catch (e) {
        console.warn('⚠️ Session refresh failed:', e);
      }

      // Wait for JWT propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = !!sessionData?.session?.user;

      if (hasSession) {
        Alert.alert(
          'Inscription réussie !',
          'Votre compte a été créé avec succès. Vous allez être redirigé vers l\'application.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', 'Session non trouvée après inscription');
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
      setInvitationProcessing(false);
    }
  };

  if (loading) {
    return <Loader message="Création de votre compte en cours..." />;
  }

  // Si pas de token validé, afficher le formulaire de saisie du token
  if (!tokenValidated) {
    return (
      <KeyboardAvoidingView 
        style={commonStyles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={commonStyles.headerContainer}>
            <Text style={commonStyles.title}>Inscription avec invitation</Text>
            <Text style={commonStyles.subtitle}>
              Saisissez votre jeton d'invitation pour continuer
            </Text>
          </View>

          <View style={commonStyles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={commonStyles.label}>Jeton d'invitation</Text>
              <TextInput
                style={[commonStyles.input, styles.input]}
                value={manualToken}
                onChangeText={setManualToken}
                placeholder="Collez votre jeton d'invitation ici"
                placeholderTextColor={colors.text.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={3}
              />
            </View>

            <GradientButton
              title="Valider le jeton"
              onPress={handleTokenValidation}
              variant="primary"
              style={styles.validateButton}
            />

            <View style={styles.navigationContainer}>
              <Text style={styles.navigationText}>
                Vous êtes directeur et voulez créer votre école ?
              </Text>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.actionButtonText}>Créer une école</Text>
              </TouchableOpacity>
              
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const isParent = invitationData.intended_role === 'PARENT';
  const isTeacher = invitationData.intended_role === 'TEACHER';

  return (
    <KeyboardAvoidingView 
      style={commonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={commonStyles.headerContainer}>
          <Text style={commonStyles.title}>
            {isParent ? 'Inscription Parent' : 'Inscription Enseignant'}
          </Text>
          <Text style={commonStyles.subtitle}>
            {isParent 
              ? 'Rejoignez l\'école de votre enfant' 
              : 'Rejoignez l\'équipe pédagogique'
            }
          </Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>École:</Text> {invitationData.school?.name}
            </Text>
            {invitationData.classroom && (
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Classe:</Text> {invitationData.classroom.name} ({invitationData.classroom.grade})
              </Text>
            )}
          </View>
        </View>

        <View style={commonStyles.formContainer}>
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
            <Text style={commonStyles.label}>Nom complet</Text>
            <TextInput
              style={[commonStyles.input, styles.input]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Prénom Nom"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="words"
            />
          </View>

          {isParent && (
            <View style={styles.inputContainer}>
              <Text style={commonStyles.label}>Prénom de l'enfant</Text>
              <TextInput
                style={[commonStyles.input, styles.input]}
                value={childFirstName}
                onChangeText={setChildFirstName}
                placeholder="Prénom de votre enfant"
                placeholderTextColor={colors.text.placeholder}
                autoCapitalize="words"
              />
            </View>
          )}

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
            title={isParent ? "Créer mon compte parent" : "Créer mon compte enseignant"}
            onPress={handleSignUp}
            variant="primary"
            style={styles.signUpButton}
          />

          <View style={styles.navigationContainer}>
            <Text style={styles.navigationText}>
              Vous êtes directeur et voulez créer votre école ?
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.actionButtonText}>Créer une école</Text>
            </TouchableOpacity>
            
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
  infoContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.pink,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  bold: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    // Styles additionnels si nécessaire
  },
  validateButton: {
    marginTop: 8,
    marginBottom: 16,
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
