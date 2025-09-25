export function generateInvitationInstructions(token: string, role: 'PARENT' | 'TEACHER', schoolName: string, className?: string): string {
  const roleText = role === 'PARENT' ? 'parent d\'élève' : 'enseignant(e)';
  const classText = className ? ` de la classe ${className}` : '';
  
  return `🎓 INVITATION FUTUR GÉNIE - ${schoolName}${classText}

Bonjour,

Vous êtes invité(e) à rejoindre l'école "${schoolName}"${classText} en tant que ${roleText} sur l'application Futur Génie.

📱 COMMENT VOUS INSCRIRE :

Option 1 - Lien direct (recommandé) :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Cliquez sur ce lien : futurgenie://invite?token=${token}
3. Le jeton d'invitation sera automatiquement rempli
4. Suivez les instructions pour créer votre compte

Option 2 - Saisie manuelle :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Ouvrez l'application et allez dans "Inscription avec invitation"
3. Collez ce jeton d'invitation dans le champ prévu :
   ${token}
4. Suivez les instructions pour créer votre compte

⏰ Ce lien expire dans 7 jours.

❓ Besoin d'aide ? Contactez votre école.

---
Futur Génie - Développons le potentiel de nos enfants`;
}

export function generateInvitationInstructionsShort(token: string, schoolName: string, className?: string, role: 'PARENT' | 'TEACHER' = 'PARENT'): string {
  const classText = className ? ` de la classe ${className}` : '';
  const directLink = `futurgenie://invite?token=${token}`;
  
  if (role === 'TEACHER') {
    return `Votre directeur vous invite à créer un compte pour la classe ${className} de l'école "${schoolName}" sur l'application Futur Génie.

📱 COMMENT VOUS INSCRIRE :

Option 1 - Lien direct (recommandé) :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Cliquez sur ce lien : ${directLink}
3. Le jeton d'invitation sera automatiquement rempli
4. Suivez les instructions pour créer votre compte

Option 2 - Saisie manuelle :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Ouvrez l'application et allez dans "Inscription avec invitation"
3. Collez ce jeton d'invitation dans le champ prévu :
   ${token}
4. Suivez les instructions pour créer votre compte

⏰ Ce lien expire dans 7 jours.

❓ Besoin d'aide ? Contactez votre directeur.

---
Futur Génie - Développons le potentiel de nos enfants`;
  }
  
  return `Vous êtes invité(e) à rejoindre l'école "${schoolName}"${classText} en tant que parent d'élève sur l'application Futur Génie.

📱 COMMENT VOUS INSCRIRE :

Option 1 - Lien direct (recommandé) :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Cliquez sur ce lien : ${directLink}
3. Le jeton d'invitation sera automatiquement rempli
4. Suivez les instructions pour créer votre compte

Option 2 - Saisie manuelle :
1. Téléchargez l'application Futur Génie sur votre téléphone
2. Ouvrez l'application et allez dans "Inscription avec invitation"
3. Collez ce jeton d'invitation dans le champ prévu :
   ${token}
4. Suivez les instructions pour créer votre compte

⏰ Ce lien expire dans 7 jours.

❓ Besoin d'aide ? Contactez votre école.

---
Futur Génie - Développons le potentiel de nos enfants`;
}
