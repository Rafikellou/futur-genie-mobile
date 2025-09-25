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

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      Alert.alert('Erreur de connexion', error.message);
    }
    
    setLoading(false);
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
          
          <Text style={commonStyles.title}>Futur Génie</Text>
          <Text style={commonStyles.subtitle}>Connectez-vous à votre compte</Text>
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

          <GradientButton
            title="Se connecter"
            onPress={handleLogin}
            variant="primary"
            style={styles.loginButton}
          />


          <View style={styles.helpTextContainer}>
            <Text style={styles.helpText}>
              Si vous êtes directeur d'une école et voulez créer votre école :
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.actionButtonText}>S'inscrire et créer l'école</Text>
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              Si vous êtes parent d'élève ou enseignant et avez un lien d'invitation :
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('UnifiedInvitationSignUp')}
            >
              <Text style={styles.actionButtonText}>S'inscrire avec un jeton</Text>
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
  helpTextContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  helpText: {
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
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    // Styles additionnels si nécessaire
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});
