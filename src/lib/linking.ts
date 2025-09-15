import * as Linking from 'expo-linking';
import { navigationRef } from './navigationRef';
import { invitationPreview } from './db';
// Validate invitation via Edge Function to avoid RLS issues

const prefix = Linking.createURL('/');

export const linkingConfig = {
  prefixes: [prefix, 'futurgenie://', 'https://app.votredomaine'],
  config: {
    screens: {
      // When AuthStack is rendered at root, we still want /invite to resolve
      InviteEntry: 'invite',
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
        },
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Profile: 'profile',
          QuizPlay: 'quiz/:quizId',
        },
      },
    },
  },
};

// Handle invitation deep link
export const handleInvitationLink = async (url: string) => {
  try {
    const parsed = Linking.parse(url);
    const token = parsed.queryParams?.token as string | undefined;
    // Some Expo dev URLs look like exp://.../--/invite?token=...
    // We should not hard-fail on path differences; the presence of a token is sufficient here.
    if (!token) {
      return { success: false, error: 'Token manquant dans le lien' };
    }
    
    // Validate the invitation token via DAO (Edge Function)
    const data = await invitationPreview(token);
    if (!data?.ok) {
      return { success: false, error: "Lien d'invitation invalide" };
    }
    if (new Date(data.expires_at) < new Date()) {
      return { success: false, error: "Lien d'invitation expiré" };
    }
    return {
      success: true,
      invitation: {
        token: data.token,
        schoolId: data.school_id,
        classroomId: data.classroom_id,
        role: data.intended_role,
      }
    };
  } catch (error) {
    console.error('Invitation link error:', error);
    return { success: false, error: 'Erreur lors de la validation du lien' };
  }
};

// Initialize deep linking
export const initializeLinking = () => {
  // Listen for incoming links
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received:', url);
    
    // Handle invitation links for both scheme and universal links
    const parsed = Linking.parse(url);
    const path = parsed.path?.replace(/^\//, '');
    const token = parsed.queryParams?.token as string | undefined;
    if (path === 'invite' && token) {
      // Optionally validate before navigation
      handleInvitationLink(url).finally(() => {
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate('InviteEntry', { token });
        }
      });
    }
  });

  // Also handle the initial URL when the app is opened from a cold start
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('Initial deep link:', url);
      const parsed = Linking.parse(url);
      const path = parsed.path?.replace(/^\//, '');
      const token = parsed.queryParams?.token as string | undefined;
      if (path === 'invite' && token) {
        handleInvitationLink(url).finally(() => {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('InviteEntry', { token });
          }
        });
      }
    }
  }).catch((e) => console.warn('Error getting initial URL', e));

  return () => subscription?.remove();
};
