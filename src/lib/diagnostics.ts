import { supabase } from './supabase';

export interface DiagnosticResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * Diagnostic complet pour identifier les problèmes de création d'utilisateurs via invitation
 */
export async function diagnoseProblem(userId: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  
  const addResult = (step: string, success: boolean, data?: any, error?: string) => {
    results.push({
      step,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    });
  };

  // 1. Vérifier la session actuelle
  try {
    const { data: session } = await supabase.auth.getSession();
    addResult('session_check', !!session?.session, {
      hasAccessToken: !!session?.session?.access_token,
      userId: session?.session?.user?.id,
      userMetadata: session?.session?.user?.user_metadata,
      appMetadata: session?.session?.user?.app_metadata
    });
  } catch (e: any) {
    addResult('session_check', false, null, e.message);
  }

  // 2. Vérifier les données utilisateur fraîches du serveur
  try {
    const { data: freshUser, error } = await supabase.auth.getUser();
    addResult('fresh_user_check', !error, {
      userId: freshUser?.user?.id,
      email: freshUser?.user?.email,
      userMetadata: freshUser?.user?.user_metadata,
      appMetadata: freshUser?.user?.app_metadata
    }, error?.message);
  } catch (e: any) {
    addResult('fresh_user_check', false, null, e.message);
  }

  // 3. Tester la RPC get_user_profile
  try {
    const { data, error } = await supabase.rpc('get_user_profile', { user_id_input: userId });
    addResult('rpc_get_user_profile', !error, data, error?.message);
  } catch (e: any) {
    addResult('rpc_get_user_profile', false, null, e.message);
  }

  // 4. Tester l'accès direct à la table users (devrait échouer avec RLS)
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    addResult('direct_users_access', !error, data, error?.message);
  } catch (e: any) {
    addResult('direct_users_access', false, null, e.message);
  }

  // 5. Vérifier si l'utilisateur existe dans auth.users (côté serveur)
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    addResult('auth_user_exists', !error, {
      userId: data?.user?.id,
      email: data?.user?.email,
      appMetadata: data?.user?.app_metadata
    }, error?.message);
  } catch (e: any) {
    addResult('auth_user_exists', false, null, e.message);
  }

  return results;
}

/**
 * Affiche les résultats de diagnostic de manière lisible
 */
export function displayDiagnosticResults(results: DiagnosticResult[]): void {
  console.log('\n🔍 === DIAGNOSTIC RESULTS ===');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.step}`);
    if (result.data) {
      console.log('   Data:', JSON.stringify(result.data, null, 2));
    }
    if (result.error) {
      console.log('   Error:', result.error);
    }
    console.log('   Time:', result.timestamp);
    console.log('');
  });
  console.log('=== END DIAGNOSTIC ===\n');
}

/**
 * Test de récupération de profil avec retry et diagnostic
 */
export async function testProfileRetrieval(userId: string, maxAttempts: number = 5): Promise<any> {
  console.log(`🔄 Testing profile retrieval for user ${userId}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n--- Attempt ${attempt}/${maxAttempts} ---`);
    
    const diagnostics = await diagnoseProblem(userId);
    displayDiagnosticResults(diagnostics);
    
    // Chercher un profil valide dans les résultats
    const rpcResult = diagnostics.find(d => d.step === 'rpc_get_user_profile');
    if (rpcResult?.success && rpcResult.data && Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
      console.log('✅ Profile found via RPC!');
      return rpcResult.data[0];
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting 2 seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('❌ Profile retrieval failed after all attempts');
  return null;
}
