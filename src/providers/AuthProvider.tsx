import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase, UserRole } from '../lib/supabase';

interface Profile {
  id: string;
  role: UserRole;
  school_id: string | null;
  classroom_id: string | null;
  email: string | null;
  full_name: string | null;
  created_at: string;
  child_first_name: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Initial session check:', session ? 'Session exists' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 Initial user:', session.user.id, 'metadata:', session.user.user_metadata);
        ensureUserRow(session.user).then(() => fetchProfile(session.user!.id));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session ? `User: ${session.user?.id}` : 'No session');
      if (session?.user) {
        console.log('📋 User metadata:', session.user.user_metadata);
        console.log('📋 App metadata:', session.user.app_metadata);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('⏳ Starting ensureUserRow and fetchProfile...');
        await ensureUserRow(session.user);
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }

      // We avoid storing the entire session in SecureStore to prevent size limit warnings.
      if (!session) {
        await SecureStore.deleteItemAsync('supabase_session');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureUserRow = async (authUser: User) => {
    try {
      console.log('🔍 ensureUserRow: Checking if user exists in database:', authUser.id);
      
      // Check if user row exists
      const { data: existing, error: selError } = await supabase
        .from('users')
        .select('id, role, school_id')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (selError) {
        console.error('❌ ensureUserRow select error:', selError);
      } else {
        console.log('✅ ensureUserRow result:', existing ? `User exists with role: ${existing.role}` : 'User does not exist in database');
      }
      
      if (existing) return;

      // For directors created via SignUpScreen, the profile will be created by director_onboarding_complete
      // For other users (teachers/parents), they should come via invitation which handles profile creation
      // So we don't need to create a profile here - just log and return
      console.log('⚠️ User profile will be created by appropriate Edge Function (director_onboarding_complete or invitation_consume)');
      
    } catch (e) {
      console.error('💥 ensureUserRow unexpected error:', e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 fetchProfile: Starting profile fetch for user:', userId);
      
      // Try RPC first
      console.log('📞 Attempting RPC get_user_profile...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_profile', {
        user_id_input: userId,
      });

      if (rpcError || !rpcData || rpcData.length === 0) {
        if (rpcError) {
          console.error('❌ RPC get_user_profile error:', rpcError);
        } else {
          console.log('⚠️ RPC succeeded but returned empty result:', rpcData);
        }
        
        // Fallback to direct table query
        console.log('🔄 Falling back to direct users table query');
        const { data: directData, error: directError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
          
        if (directError) {
          console.error('❌ Direct users query error:', directError);
          console.log('🚫 Setting profile to null due to direct query error');
          setProfile(null);
        } else {
          console.log('✅ Direct query succeeded, data:', directData);
          setProfile(directData);
        }
      } else {
        console.log('✅ RPC succeeded, data:', rpcData);
        const profileData = rpcData && rpcData.length > 0 ? rpcData[0] : null;
        console.log('📋 Processed profile data:', profileData || 'No profile data');
        setProfile(profileData);
        
        // If no profile found but user exists, it might be a new director
        // whose profile will be created by director_onboarding_complete
        if (!profileData) {
          console.log('⚠️ No profile found via RPC - user might be in onboarding process');
        }
      }
    } catch (error) {
      console.error('💥 fetchProfile unexpected error:', error);
      setProfile(null);
    } finally {
      console.log('🏁 fetchProfile completed, setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'DIRECTOR',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync('supabase_session');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
