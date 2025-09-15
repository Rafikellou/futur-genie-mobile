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
      console.log('🔍 fetchProfile: RPC get_user_profile for', userId)
      
      // Check if we have fresh app_metadata with role info
      const checkAppMetadata = async () => {
        try {
          console.log('🔍 checkAppMetadata: Getting fresh user...')
          const { data: freshUser } = await supabase.auth.getUser()
          const appMetadata = freshUser?.user?.app_metadata
          console.log('📋 Current app_metadata:', appMetadata)
          return appMetadata?.role && appMetadata?.school_id
        } catch (error) {
          console.error('❌ Error in checkAppMetadata:', error)
          return false
        }
      }
      
      // Use session from context instead of calling getSession() to avoid deadlock
      console.log('🔍 fetchProfile: Using session from context...')
      if (!session?.access_token) {
        console.warn('⚠️ No access token available in session context')
        return
      }
      console.log('🔍 fetchProfile: Session context OK, user:', session.user?.id)
      
      console.log('🔍 fetchProfile: Calling checkAppMetadata...')
      // Check if app_metadata is ready (for invitation-created users)
      let hasAppMetadata
      try {
        hasAppMetadata = await checkAppMetadata()
        console.log('🔍 fetchProfile: checkAppMetadata result:', hasAppMetadata)
      } catch (checkError) {
        console.error('❌ Exception in checkAppMetadata:', checkError)
        hasAppMetadata = false
      }
      if (!hasAppMetadata) {
        console.log('⏳ Waiting for app_metadata to be available...')
        // Wait a bit more for invitation_consume to complete
        await new Promise((res) => setTimeout(res, 2000))
        const hasAppMetadataRetry = await checkAppMetadata()
        if (!hasAppMetadataRetry) {
          console.warn('⚠️ app_metadata still not available after retry')
          // For Directors created via signup (not invitation), proceed anyway
          const { data: currentUser } = await supabase.auth.getUser()
          const userRole = currentUser?.user?.user_metadata?.role || currentUser?.user?.app_metadata?.role
          if (userRole === 'DIRECTOR') {
            console.log('🏫 Director signup detected, proceeding with RPC calls anyway')
          } else {
            console.log('⏳ Non-director user, continuing to wait for app_metadata...')
            return
          }
        }
      } else {
        console.log('✅ app_metadata is available, proceeding with RPC calls')
      }
      const maxAttempts = 8
      let attempt = 0
      let lastError: any = null
      while (attempt < maxAttempts) {
        attempt++
        console.log(`🔄 RPC get_user_profile attempt ${attempt}/${maxAttempts} for user:`, userId)
        
        // Log current session info before RPC call
        const { data: currentSession } = await supabase.auth.getSession()
        console.log(`📋 Session info before RPC:`, {
          hasSession: !!currentSession?.session,
          userId: currentSession?.session?.user?.id,
          hasAccessToken: !!currentSession?.session?.access_token,
          tokenLength: currentSession?.session?.access_token?.length
        })
        
        const { data, error } = await supabase.rpc('get_user_profile', { user_id_input: userId })
        console.log(`📡 RPC raw response:`, { data, error })
        
        if (error) {
          lastError = error
          console.warn(`⚠️ RPC get_user_profile attempt ${attempt} error:`, error?.message || error)
          console.warn(`⚠️ Full error object:`, JSON.stringify(error))
        } else {
          const row = Array.isArray(data) ? data[0] : data
          console.log(`✅ RPC result (attempt ${attempt}):`, row ?? 'null')
          if (row) {
            console.log('🎯 Setting profile and loading=false')
            setProfile(row)
            setLoading(false)
            return
          } else {
            console.warn(`⚠️ RPC returned empty result on attempt ${attempt}`)
          }
        }
        // Small backoff to wait for Edge Function & JWT refresh to settle
        console.log(`⏳ Waiting before next profile attempt (${attempt}/${maxAttempts})`)
        await new Promise((res) => setTimeout(res, 900))
      }
      console.error('❌ RPC get_user_profile ultimately failed or returned null', lastError)
      // Fallback: synthesize a profile from JWT app_metadata so UI can proceed
      try {
        const { data: sess } = await supabase.auth.getSession()
        let am: any = sess?.session?.user?.app_metadata || {}
        let um: any = sess?.session?.user?.user_metadata || {}
        // If app_metadata seems incomplete (no school/class), fetch fresh user from server
        if (!am?.school_id || !am?.classroom_id) {
          const fresh = await supabase.auth.getUser()
          if (fresh?.data?.user) {
            am = fresh.data.user.app_metadata || am
            um = fresh.data.user.user_metadata || um
          }
        }
        if (am?.role) {
          const synthesized: Profile = {
            id: userId,
            role: normalizeRole(am.role) as UserRole,
            school_id: am.school_id ?? null,
            classroom_id: am.classroom_id ?? null,
            email: sess?.session?.user?.email ?? null,
            full_name: [um.first_name, um.last_name].filter(Boolean).join(' ') || null,
            created_at: new Date().toISOString(),
            child_first_name: um.child_first_name ?? null,
          }
          console.log('🧩 Using synthesized profile from app_metadata:', synthesized)
          setProfile(synthesized)
          return
        }
      } catch (e) {
        console.warn('Fallback profile synthesis failed:', e)
      }
      setProfile(null)
    } catch (e) {
      console.error('💥 fetchProfile unexpected:', e)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // ---------- effects ----------
  useEffect(() => {
    // 1) Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Initial session:', !!session)
      if (session?.access_token) {
        console.log("🔑 ACCESS TOKEN (FULL):", session?.access_token);
      }
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
      console.log('🔑 ACCESS TOKEN (FULL):', session?.access_token)
      
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'INITIAL_SESSION') {
        console.log('🔄 Initial session:', !!session)
        setLoading(false)
        if (session?.user) {
          console.log('⏳ Skipping initial profile fetch - waiting for invitation processing')
        }
      } else if (event === 'SIGNED_IN') {
        console.log('⏳ Skipping initial profile fetch - waiting for invitation processing')
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Only fetch profile after token refresh if not processing invitation
        if (!isInvitationProcessing) {
          console.log('🔄 TOKEN_REFRESHED - fetching profile (not processing invitation)')
          await fetchProfile(session.user.id)
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
      await fetchProfile(user.id)
    }
  }

  const setInvitationProcessing = (processing: boolean) => {
    console.log('🔄 Invitation processing state:', processing)
    setIsInvitationProcessing(processing)
  }

  // ---------- role from JWT (source de vérité) ----------
  const rawRole =
    (session?.user?.app_metadata as any)?.role ??
    (session?.user?.user_metadata as any)?.role
  const role = normalizeRole(rawRole)
  console.log('[AuthProvider] user:', session?.user?.id, 'role(raw):', rawRole, 'role(norm):', role)

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
