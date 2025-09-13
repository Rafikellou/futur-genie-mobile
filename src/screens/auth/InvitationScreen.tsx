import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { handleInvitationLink } from '../../lib/linking';
import { getClassroomById, markInvitationLinkAsUsed, updateUser } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { colors } from '../../theme/colors';

type AuthStackParamList = {
  Invitation: { url?: string; token?: string };
  Login: undefined;
  SignUp: undefined;
};

type InvitationScreenRouteProp = RouteProp<AuthStackParamList, 'Invitation'>;
type InvitationScreenNavigationProp = any;

interface InvitationData {
  token: string;
  schoolId: string;
  classroomId: string;
  role: 'PARENT' | 'TEACHER';
}

interface ClassroomInfo {
  id: string;
  name: string;
  grade: string;
  school_id: string;
}

export function InvitationScreen() {
  const route = useRoute<InvitationScreenRouteProp>();
  const navigation = useNavigation<InvitationScreenNavigationProp>();
  const { user, profile, refreshProfile } = useAuth() as any;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateInvitation();
  }, []);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from route params or URL
      const token = route.params?.token;
      const url = route.params?.url;
      
      let invitationUrl = '';
      if (token) {
        invitationUrl = `futurgenie://invite?token=${token}`;
      } else if (url) {
        invitationUrl = url;
      } else {
        // No invite provided: silently redirect to appropriate entry point
        if (user) {
          (navigation as any)?.navigate('Main');
        } else {
          (navigation as any)?.navigate('Auth', { screen: 'Login' });
        }
        return;
      }

      // Validate the invitation
      const result = await handleInvitationLink(invitationUrl);
      
      if (!result.success) {
        setError(result.error || 'Lien d\'invitation invalide');
        return;
      }

      if (result.invitation) {
        setInvitation(result.invitation);

        // Get classroom information
        const classroomInfo = await getClassroomById(result.invitation.classroomId);
        setClassroom(classroomInfo);
      }

    } catch (err) {
      console.error('Error validating invitation:', err);
      setError('Erreur lors de la validation de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !classroom || !user) {
      Alert.alert('Erreur', 'Informations manquantes pour accepter l\'invitation');
      return;
    }

    setProcessing(true);
    try {
      // Consume invitation via Edge Function (handles role + associations + mark used)
      const { data, error: fnError } = await supabase.functions.invoke('invitation_consume', {
        body: { token: invitation.token },
      });
      if (fnError) throw fnError;

      // Refresh JWT to include updated app_metadata
      await supabase.auth.refreshSession();
      await refreshProfile?.();
      // Ask AuthProvider to reload profile after role/school/class changes
      // We do not have direct access to refreshProfile here, but profile changes will be
      // reflected on next app state; we can optionally navigate to Main
      Alert.alert(
        'Invitation acceptée !',
        `Vous avez rejoint la classe ${classroom.name} (${classroom.grade})`,
        [
          {
            text: 'Continuer',
            onPress: () => (navigation as any).navigate('Main'),
          }
        ]
      );

    } catch (err) {
      console.error('Error accepting invitation:', err);
      Alert.alert('Erreur', 'Impossible d\'accepter l\'invitation. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  const declineInvitation = () => {
    Alert.alert(
      'Refuser l\'invitation',
      'Êtes-vous sûr de vouloir refuser cette invitation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: () => (navigation as any).navigate('Auth', { screen: 'Login' })
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>Validation de l'invitation...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.status.error} />
          <Text style={styles.errorTitle}>Invitation invalide</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.backButtonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <Ionicons name="person-outline" size={64} color={colors.brand.primary} />
          <Text style={styles.authTitle}>Connexion requise</Text>
          <Text style={styles.authMessage}>
            Vous devez être connecté pour accepter cette invitation.
          </Text>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={() => navigation.navigate('Auth', { screen: 'SignUp' })}
          >
            <Text style={styles.signupButtonText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.invitationContainer}>
        <Ionicons name="school-outline" size={64} color={colors.brand.primary} />
        
        <Text style={styles.title}>Invitation à rejoindre une classe</Text>
        
        {classroom && (
          <View style={styles.classroomInfo}>
            <Text style={styles.classroomName}>{classroom.name}</Text>
            <Text style={styles.classroomGrade}>{classroom.grade}</Text>
          </View>
        )}
        
        <Text style={styles.description}>
          {invitation?.role === 'TEACHER'
            ? `Vous êtes invité(e) à rejoindre cette classe en tant qu'enseignant(e). Vous pourrez gérer les quiz et suivre l'activité de la classe. Ce lien expire 7 jours après son émission.`
            : `Vous êtes invité(e) à rejoindre cette classe en tant que parent. Vous pourrez suivre les progrès de votre enfant et accéder aux quiz. Ce lien est réutilisable par tous les parents de la même classe et expire 7 jours après son émission.`}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.acceptButton, processing && styles.disabledButton]} 
            onPress={acceptInvitation}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                <Text style={styles.acceptButtonText}>Accepter l'invitation</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.declineButton} 
            onPress={declineInvitation}
            disabled={processing}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.status.error} />
            <Text style={styles.declineButtonText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.status.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  authRequiredContainer: {
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  signupButton: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  invitationContainer: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  classroomInfo: {
    backgroundColor: colors.background.secondary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  classroomName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  classroomGrade: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.status.error,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.status.error,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
