import * as Linking from 'expo-linking';
import { supabase } from './supabase';

const prefix = Linking.createURL('/');

export const linkingConfig = {
  prefixes: [prefix, 'futurgenie://'],
  config: {
    screens: {
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

// Handle deep link authentication callback
export const handleAuthCallback = async (url: string) => {
  try {
    const { data, error } = await supabase.auth.getSessionFromUrl(url);
    
    if (error) {
      console.error('Auth callback error:', error);
      return { success: false, error };
    }
    
    if (data.session) {
      console.log('Auth callback successful');
      return { success: true, session: data.session };
    }
    
    return { success: false, error: 'No session found' };
  } catch (error) {
    console.error('Auth callback exception:', error);
    return { success: false, error };
  }
};

// Initialize deep linking
export const initializeLinking = () => {
  // Listen for incoming links
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Deep link received:', url);
    
    // Handle auth callback
    if (url.includes('futurgenie://auth')) {
      handleAuthCallback(url);
    }
  });

  return () => subscription?.remove();
};
