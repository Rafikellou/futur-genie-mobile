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
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../providers/AuthProvider';
import { Loader } from '../../components/common/Loader';
import { colors, gradients } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

type InvitationSignUpScreenNavigationProp = StackNavigationProp<any, 'InvitationSignUp'>;
type InvitationSignUpScreenRouteProp = RouteProp<any, 'InvitationSignUp'>;

interface Props {
  navigation: InvitationSignUpScreenNavigationProp;
  route: InvitationSignUpScreenRouteProp;
}

export function InvitationSignUpScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const { signUp } = useAuth();

  const token = route.params?.token;

  useEffect(() => {
    if (token) {
      fetchInvitationData();
    }
  }, [token]);

  const fetchInvitationData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('invitation_preview', {
        body: { token },
      });
      if (error || !data?.ok) {
        Alert.alert('Erreur', 'Lien d\'invitation invalide');
        navigation.goBack();
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        Alert.alert('Erreur', 'Ce lien d\'invitation a expiré');
        navigation.goBack();
        return;
      }
      setInvitationData({
        ...data,
        classroom: data.classroom,
        school: data.school,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de vérifier l\'invitation');
      navigation.goBack();
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

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
    
    try {
      // Create auth user
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
      const { error: consumeError } = await supabase.functions.invoke('invitation_consume', {
        body: { 
          token,
          childFirstName: invitationData?.intended_role === 'PARENT' ? childFirstName : null
        },
      });
      
      if (consumeError) {
        Alert.alert('Erreur', 'Compte créé mais impossible de traiter l\'invitation. Contactez votre école.');
      } else {
        Alert.alert(
          'Inscription réussie',
          'Votre compte a été créé avec succès. Vérifiez votre email pour confirmer votre compte.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !invitationData) {
    return <Loader />;
  }

  const isParent = invitationData.intended_role === 'PARENT';
  const roleText = isParent ? 'Parent' : 'Enseignant';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Inscription {roleText}</Text>
          <Text style={styles.subtitle}>
            École: {invitationData.school?.name}
          </Text>
          <Text style={styles.subtitle}>
            Classe: {invitationData.classroom?.name} ({invitationData.classroom?.grade})
          </Text>
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

          {isParent && (
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
          )}

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
    marginBottom: 4,
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
