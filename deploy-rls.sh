#!/bin/bash

# Script Bash pour déployer les politiques RLS
# Assurez-vous d'avoir Supabase CLI installé et configuré

echo "🚀 Déploiement des Edge Functions RLS..."

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé. Installez-le avec:"
    echo "npm install -g supabase"
    exit 1
fi

# Vérifier si on est dans le bon répertoire
if [ ! -d "supabase/functions" ]; then
    echo "❌ Répertoire supabase/functions non trouvé. Exécutez ce script depuis la racine du projet."
    exit 1
fi

echo "📦 Déploiement des Edge Functions..."

# Déployer les fonctions dans l'ordre
echo "1. Déploiement de setup_exec_sql_rpc..."
if supabase functions deploy setup_exec_sql_rpc; then
    echo "✅ setup_exec_sql_rpc déployé"
else
    echo "❌ Erreur lors du déploiement de setup_exec_sql_rpc"
    exit 1
fi

echo "2. Déploiement de create_rpc_get_user_profile..."
if supabase functions deploy create_rpc_get_user_profile; then
    echo "✅ create_rpc_get_user_profile déployé"
else
    echo "❌ Erreur lors du déploiement de create_rpc_get_user_profile"
    exit 1
fi

echo "3. Déploiement de setup_rls_policies..."
if supabase functions deploy setup_rls_policies; then
    echo "✅ setup_rls_policies déployé"
else
    echo "❌ Erreur lors du déploiement de setup_rls_policies"
    exit 1
fi

echo ""
echo "✅ Toutes les Edge Functions ont été déployées avec succès!"
echo ""
echo "🔧 Étapes suivantes:"
echo "1. Exécutez setup_exec_sql_rpc pour créer la fonction utilitaire"
echo "2. Exécutez create_rpc_get_user_profile pour créer la RPC sécurisée"
echo "3. Exécutez setup_rls_policies pour configurer toutes les politiques"
echo ""
echo "📖 Consultez RLS_DEPLOYMENT_GUIDE.md pour les détails complets"
