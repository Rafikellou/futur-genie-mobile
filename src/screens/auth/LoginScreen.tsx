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
import * as Clipboard from 'expo-clipboard';
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
          {/* Logo placeholder - vous pouvez ajouter votre logo ici */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🔥</Text>
            </View>
          </View>
          
          <Text style={commonStyles.title}>Futur Génie</Text>
          <Text style={commonStyles.subtitle}>Connectez-vous à votre compte</Text>
          <View style={styles.noticeContainer}>
            <Text style={styles.notice}>
              Seuls les Directeurs créent un compte ici. Enseignants et Parents doivent utiliser un lien d'invitation envoyé par l'école.
            </Text>
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

          <TouchableOpacity style={[commonStyles.secondaryButton, styles.inviteButton]} onPress={handleInviteLink}>
            <Text style={commonStyles.secondaryButtonText}>J'ai un lien d'invitation</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[commonStyles.accentText, styles.signupLink]}>S'inscrire</Text>
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
  noticeContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.pink,
  },
  notice: {
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
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  inviteButton: {
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Inter-Regular',
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
