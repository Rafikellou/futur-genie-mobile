# Script PowerShell pour déployer les politiques RLS
# Assurez-vous d'avoir Supabase CLI installé et configuré

Write-Host "🚀 Déploiement des Edge Functions RLS..." -ForegroundColor Green

# Vérifier si Supabase CLI est installé
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI n'est pas installé. Installez-le avec:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Vérifier si on est dans le bon répertoire
if (-not (Test-Path "supabase\functions")) {
    Write-Host "❌ Répertoire supabase\functions non trouvé. Exécutez ce script depuis la racine du projet." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Déploiement des Edge Functions..." -ForegroundColor Cyan

# Déployer les fonctions dans l'ordre
try {
    Write-Host "1. Déploiement de setup_exec_sql_rpc..." -ForegroundColor Yellow
    supabase functions deploy setup_exec_sql_rpc
    
    Write-Host "2. Déploiement de create_rpc_get_user_profile..." -ForegroundColor Yellow  
    supabase functions deploy create_rpc_get_user_profile
    
    Write-Host "3. Déploiement de setup_rls_policies..." -ForegroundColor Yellow
    supabase functions deploy setup_rls_policies
    
    Write-Host "✅ Toutes les Edge Functions ont été déployées avec succès!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors du déploiement: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Étapes suivantes:" -ForegroundColor Cyan
Write-Host "1. Exécutez setup_exec_sql_rpc pour créer la fonction utilitaire"
Write-Host "2. Exécutez create_rpc_get_user_profile pour créer la RPC sécurisée"  
Write-Host "3. Exécutez setup_rls_policies pour configurer toutes les politiques"
Write-Host ""
Write-Host "📖 Consultez RLS_DEPLOYMENT_GUIDE.md pour les détails complets" -ForegroundColor Green
