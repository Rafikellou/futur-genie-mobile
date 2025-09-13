# Guide de Déploiement RLS Multi-Tenant

## Vue d'ensemble

Ce guide explique comment déployer les nouvelles politiques RLS qui résolvent le problème de permissions trop restrictives tout en maintenant l'architecture multi-tenant.

## Problème résolu

- ❌ **Avant**: Les utilisateurs ne pouvaient pas lire leur propre profil
- ❌ **Avant**: La RPC `get_user_profile` retournait `[]` vide
- ✅ **Après**: Permissions granulaires respectant la hiérarchie École → Classe → Utilisateur

## Architecture Multi-Tenant

```
École (schools)
├── DIRECTOR
│   ├── Peut lire/modifier tous les users de son école
│   ├── Peut gérer toutes les classes de son école
│   └── Peut voir tous les quiz de son école
├── Classes (classrooms)
│   ├── TEACHER
│   │   ├── Peut lire les élèves de sa classe
│   │   ├── Peut créer/gérer les quiz de sa classe
│   │   └── Accès limité à son école via sa classe
│   └── PARENT
│       ├── Peut voir les quiz publiés de sa classe
│       ├── Peut voir les résultats de ses enfants
│       └── Accès en lecture seule
```

## Étapes de Déploiement

### 1. Déployer les Edge Functions

```bash
# Déployer la fonction utilitaire pour exec_sql
supabase functions deploy setup_exec_sql_rpc

# Déployer la fonction de configuration RLS
supabase functions deploy setup_rls_policies

# Déployer la fonction de création RPC
supabase functions deploy create_rpc_get_user_profile
```

### 2. Exécuter les fonctions dans l'ordre

#### A. Créer la fonction exec_sql
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/setup_exec_sql_rpc" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**OU** exécuter manuellement dans Supabase Dashboard SQL Editor:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
```

#### B. Configurer les politiques RLS
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/setup_rls_policies" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### C. Créer la RPC sécurisée
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/create_rpc_get_user_profile" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 3. Vérification

#### Tester la RPC
```javascript
const { data, error } = await supabase.rpc('get_user_profile', {
  user_id_input: 'user-uuid'
});
console.log('Profile data:', data);
```

#### Tester les permissions par rôle

**DIRECTOR:**
```javascript
// Doit pouvoir lire tous les users de son école
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('school_id', 'school-uuid');
```

**TEACHER:**
```javascript
// Doit pouvoir lire les users de sa classe
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('classroom_id', 'classroom-uuid');
```

**PARENT:**
```javascript
// Doit pouvoir lire son propre profil uniquement
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', 'own-user-id');
```

## Politiques RLS Créées

### Table `users`
- `users_read_own_profile`: Lecture de son propre profil
- `users_read_school_members`: DIRECTOR lit tous les users de son école
- `users_read_class_members`: TEACHER lit les users de sa classe
- `users_update_own_profile`: Modification de son propre profil

### Table `schools`
- `schools_read_own`: Lecture de son école
- `schools_manage_own`: DIRECTOR gère son école

### Table `classrooms`
- `classrooms_read_school`: Lecture des classes de son école
- `classrooms_manage_school`: DIRECTOR gère les classes de son école

## Sécurité

### SECURITY DEFINER
La RPC `get_user_profile` utilise `SECURITY DEFINER` pour:
- Bypasser les politiques RLS
- Vérifier que l'utilisateur demande son propre profil
- Retourner les données complètes en toute sécurité

### Isolation Multi-Tenant
- Chaque école est complètement isolée
- Les directeurs ne peuvent pas voir les autres écoles
- Les enseignants ne peuvent pas voir les autres classes
- Les parents ont un accès très limité

## Rollback

En cas de problème, supprimer les politiques:

```sql
-- Supprimer toutes les politiques
DROP POLICY IF EXISTS "users_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_read_school_members" ON users;
DROP POLICY IF EXISTS "users_read_class_members" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "schools_read_own" ON schools;
DROP POLICY IF EXISTS "schools_manage_own" ON schools;
DROP POLICY IF EXISTS "classrooms_read_school" ON classrooms;
DROP POLICY IF EXISTS "classrooms_manage_school" ON classrooms;

-- Supprimer la RPC
DROP FUNCTION IF EXISTS get_user_profile(uuid);
```

## Tests de Validation

1. ✅ Créer un nouveau directeur → Doit pouvoir lire son profil
2. ✅ Directeur lit les users de son école → Doit réussir
3. ✅ Directeur tente de lire une autre école → Doit échouer
4. ✅ Enseignant lit sa classe → Doit réussir
5. ✅ Enseignant tente de lire une autre classe → Doit échouer
6. ✅ Parent lit son profil → Doit réussir
7. ✅ Parent tente de lire d'autres profils → Doit échouer

## Notes Importantes

- Les Edge Functions utilisent `service_role` et bypassent RLS
- Les requêtes client utilisent `authenticated` et respectent RLS
- La RPC `get_user_profile` est le pont sécurisé entre les deux
- Toujours tester après déploiement avec de vrais utilisateurs
