# Futur Génie Mobile

Application mobile iOS/Android pour la plateforme éducative Futur Génie, développée avec Expo (React Native + TypeScript) et connectée à Supabase.

## 🚀 Fonctionnalités

### Authentification
- Connexion/Inscription avec Supabase Auth
- Gestion des rôles (DIRECTOR, TEACHER, PARENT)
- Sessions persistées avec expo-secure-store
- Deep links pour l'authentification

### Dashboards par rôle
- **Parent** : Consultation des quiz publiés, progression, prise de quiz
- **Enseignant** : Création de quiz via IA (OpenAI), gestion CRUD, publication, statistiques
- **Directeur** : Gestion école, classes, utilisateurs, invitations

### Quiz
- Création automatique via API OpenAI
- Création manuelle avec éditeur intégré
- Prise de quiz avec timer et navigation
- Calcul automatique du score
- Historique des soumissions

## 🛠️ Stack Technique

- **React Native** avec Expo
- **TypeScript**
- **Supabase** (authentification, base de données)
- **React Navigation** (navigation stack + bottom tabs)
- **expo-secure-store** (stockage sécurisé)
- **expo-linking** (deep links)
- **OpenAI API** (génération de quiz IA)

## 📦 Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- Expo CLI : `npm install -g @expo/cli`
- Compte Supabase configuré
- Clé API OpenAI (optionnel, pour la génération IA)

### Configuration

1. **Cloner et installer les dépendances**
```bash
cd futur-genie-mobile
npm install
```

2. **Configuration des variables d'environnement**
```bash
cp .env.example .env
```

Remplir le fichier `.env` :
```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
OPENAI_API_KEY=sk-votre_cle_openai
```

3. **Configuration Supabase**

Dans votre dashboard Supabase, ajouter l'URL de deep link dans **Authentication > URL Configuration** :
```
futurgenie://auth
```

4. **Schéma de base de données**

L'application utilise le même schéma que la version web. Assurez-vous que les tables suivantes existent :
- `profiles` (utilisateurs avec rôles)
- `schools` (écoles)
- `classes` (classes)
- `quizzes` (quiz)
- `quiz_submissions` (soumissions)

## 🚀 Lancement

### Développement
```bash
# Démarrer le serveur de développement
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios

# Lancer sur web
npm run web
```

### Première utilisation

1. Créer un compte via l'écran d'inscription
2. Un administrateur doit assigner un rôle et une école/classe via le dashboard web
3. Se reconnecter pour accéder aux fonctionnalités selon le rôle

## 📱 Navigation

### Structure de navigation
```
App
├── AuthStack (non connecté)
│   ├── LoginScreen
│   └── SignUpScreen
└── MainTabs (connecté)
    ├── Dashboard (selon rôle)
    │   ├── ParentDashboard
    │   ├── TeacherDashboard
    │   └── DirectorDashboard
    └── ProfileScreen
```

### Deep Links
- `futurgenie://auth` - Retour après authentification Supabase
- `futurgenie://quiz/{id}` - Accès direct à un quiz

## 🔒 Sécurité

### Row Level Security (RLS)
L'application respecte les mêmes politiques RLS que la version web :
- Isolation par école pour les directeurs
- Isolation par classe pour les enseignants
- Accès aux quiz publiés pour les parents

### Authentification
- Pas de clé `service_role` côté mobile
- Utilisation exclusive de la clé `anon` avec RLS
- Sessions chiffrées avec expo-secure-store

## 🎨 Interface

### Design System
- Couleurs principales : Bleu (#2563eb), Vert (#10b981), Rouge (#ef4444)
- Typographie : Système par défaut avec poids variables
- Composants réutilisables dans `src/components/common/`

### Composants communs
- `Loader` - Indicateur de chargement
- `ErrorView` - Affichage d'erreurs avec retry
- `ProgressBar` - Barre de progression
- `Toast` - Notifications temporaires

## 📊 Fonctionnalités par rôle

### Parent
- ✅ Voir les quiz publiés de la classe
- ✅ Prendre un quiz avec timer
- ✅ Voir son score et historique
- 🔄 Réviser les réponses (à implémenter)

### Enseignant
- ✅ Créer des quiz manuellement
- ✅ Générer des quiz avec l'IA
- ✅ Publier/dépublier des quiz
- ✅ Voir les statistiques de classe
- 🔄 Modifier les quiz existants (à implémenter)

### Directeur
- ✅ Vue d'ensemble de l'école
- ✅ Statistiques globales
- ✅ Gestion des classes
- 🔄 Inviter des utilisateurs (à implémenter)
- 🔄 Gestion des enseignants (à implémenter)

## 🐛 Débogage

### Logs
```bash
# Voir les logs Expo
npx expo logs

# Logs Android
npx expo logs --platform android

# Logs iOS
npx expo logs --platform ios
```

### Problèmes courants

1. **Erreur de connexion Supabase**
   - Vérifier les variables d'environnement
   - Contrôler les politiques RLS

2. **Deep links non fonctionnels**
   - Vérifier la configuration dans Supabase Dashboard
   - Tester avec `npx expo install --fix`

3. **Génération IA échoue**
   - Vérifier la clé OpenAI
   - Contrôler les quotas API

## 📱 Build et déploiement

### Build de développement
```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

### Publication
```bash
# Publier sur Expo
npx expo publish

# Build pour les stores
npx expo build:android --type app-bundle
npx expo build:ios --type archive
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Contacter l'équipe de développement

---

**Version** : 1.0.0  
**Dernière mise à jour** : Septembre 2025
