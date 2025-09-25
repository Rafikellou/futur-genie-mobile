import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { supabase, UserRole } from '../lib/supabase'
import { normalizeRole } from '../lib/roles'

interface Profile {
  id: string
  role: UserRole
  school_id: string | null
  classroom_id: string | null
  email: string | null
  full_name: string | null
  created_at: string
  child_first_name: string | null
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  role?: string
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: UserRole
  ) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  setInvitationProcessing: (processing: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInvitationProcessing, setIsInvitationProcessing] = useState(false)

  // ---------- helpers ----------
  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 fetchProfile: Starting profile fetch for', userId)
      
      // Use session from context instead of calling getSession() to avoid deadlock
      if (!session?.access_token) {
        console.warn('⚠️ No access token available in session context')
        return
      }
      
      // Try RPC call first (preferred method)
      const { data, error } = await supabase.rpc('get_user_profile', { user_id_input: userId })
      
      if (error) {
        console.warn('⚠️ RPC get_user_profile failed:', error?.message || error)
        // Fallback to synthesized profile from JWT
        await synthesizeProfileFromJWT(userId)
      } else {
        const row = Array.isArray(data) ? data[0] : data
        if (row) {
          console.log('✅ RPC profile found:', row)
          setProfile(row)
          setLoading(false)
        } else {
          console.warn('⚠️ RPC returned empty result, falling back to JWT synthesis')
          await synthesizeProfileFromJWT(userId)
        }
      }
    } catch (e) {
      console.error('💥 fetchProfile unexpected error:', e)
      await synthesizeProfileFromJWT(userId)
    }
  }

  const synthesizeProfileFromJWT = async (userId: string) => {
    try {
      console.log('🧩 Synthesizing profile from JWT metadata...')
      
      // Get fresh user data to ensure we have latest metadata
      const { data: freshUser } = await supabase.auth.getUser()
      if (!freshUser?.user) {
        console.warn('⚠️ No fresh user data available')
        setProfile(null)
        setLoading(false)
        return
      }

      const appMetadata = freshUser.user.app_metadata as any
      const userMetadata = freshUser.user.user_metadata as any
      
      // Check for role in multiple possible fields
      const role = appMetadata?.role || appMetadata?.user_role || userMetadata?.role
      
      if (role) {
        const synthesized: Profile = {
          id: userId,
          role: normalizeRole(role) as UserRole,
          school_id: appMetadata.school_id ?? null,
          classroom_id: appMetadata.classroom_id ?? null,
          email: freshUser.user.email ?? null,
          full_name: [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(' ') || null,
          created_at: new Date().toISOString(),
          child_first_name: userMetadata.child_first_name ?? null,
        }
        console.log('✅ Synthesized profile from JWT:', synthesized)
        setProfile(synthesized)
        setLoading(false)
      } else {
        console.warn('⚠️ No role found in JWT metadata')
        setProfile(null)
        setLoading(false)
      }
    } catch (e) {
      console.warn('❌ Profile synthesis failed:', e)
      setProfile(null)
      setLoading(false)
    }
  }

  // ---------- effects ----------
  useEffect(() => {
    // 1) Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Initial session:', !!session)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2) Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth change:', event, session?.user?.id || 'no-user')
      
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'INITIAL_SESSION') {
        console.log('🔄 Initial session:', !!session)
        if (session?.user && !isInvitationProcessing) {
          await fetchProfile(session.user.id)
        } else if (session?.user) {
          console.log('⏳ Skipping initial profile fetch - invitation processing')
        }
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        if (session?.user && !isInvitationProcessing) {
          console.log('🔄 SIGNED_IN - fetching profile')
          await fetchProfile(session.user.id)
        } else if (session?.user) {
          console.log('⏳ Skipping profile fetch - invitation processing')
        }
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Only fetch profile after token refresh if not processing invitation
        if (!isInvitationProcessing) {
          console.log('🔄 TOKEN_REFRESHED - fetching profile')
          // Force fresh session data before fetching profile
          const { data: freshSession } = await supabase.auth.getSession()
          if (freshSession?.session) {
            console.log('🔄 TOKEN_REFRESHED - Updated session with fresh data')
            setSession(freshSession.session)
            setUser(freshSession.session.user)
            // Use the fresh session user ID
            await fetchProfile(freshSession.session.user.id)
          } else {
            console.log('🔄 TOKEN_REFRESHED - No fresh session, using current session')
            await fetchProfile(session.user.id)
          }
        } else {
          console.log('⏳ TOKEN_REFRESHED - skipping profile fetch (invitation processing)')
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [isInvitationProcessing])

  // Fallback: Ensure profile is loaded if user exists but profile is missing
  useEffect(() => {
    if (user?.id && !profile && !loading && !isInvitationProcessing) {
      console.log('🔄 Fallback: User exists but profile is missing, fetching profile...')
      fetchProfile(user.id)
    }
  }, [user?.id, profile, loading, isInvitationProcessing])

  // ---------- auth actions ----------
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: UserRole
  ) => {
    const metadata: Record<string, any> = { first_name: firstName, last_name: lastName }
    if (role) metadata.role = role
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    await SecureStore.deleteItemAsync('supabase_session')
  }

  const refreshProfile = async () => {
    if (user?.id) {
      // Force refresh session to get latest metadata before fetching profile
      try {
        console.log('🔄 refreshProfile: Refreshing session first...')
        await supabase.auth.refreshSession()
        // Get fresh session data
        const { data: freshSession } = await supabase.auth.getSession()
        if (freshSession?.session) {
          setSession(freshSession.session)
          setUser(freshSession.session.user)
        }
        
        // Wait a bit for metadata to propagate
        console.log('⏳ refreshProfile: Waiting for metadata to propagate...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.warn('⚠️ Session refresh failed during profile refresh:', error)
      }
      
      await fetchProfile(user.id)
    }
  }

  const setInvitationProcessing = (processing: boolean) => {
    console.log('🔄 Invitation processing state:', processing)
    setIsInvitationProcessing(processing)
  }

  // ---------- role from JWT (source de vérité) ----------
  const appMetadata = session?.user?.app_metadata as any
  const userMetadata = session?.user?.user_metadata as any
  const rawRole = appMetadata?.role || appMetadata?.user_role || userMetadata?.role
  const role = normalizeRole(rawRole)
  console.log('[AuthProvider] user:', session?.user?.id, 'role(raw):', rawRole, 'role(norm):', role, 'appMetadata:', appMetadata)

  const value: AuthContextType = {
    session,
    user: session?.user ?? null, // Use session.user which has fresh app_metadata
    profile,
    loading,
    role,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    setInvitationProcessing,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}