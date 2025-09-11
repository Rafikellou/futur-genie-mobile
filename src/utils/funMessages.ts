export const getFunMessage = (score: number): string => {
  if (score >= 95) {
    return "🏆 Incroyable ! Tu es un vrai génie !";
  } else if (score >= 90) {
    return "🌟 Fantastique ! Tu maîtrises parfaitement !";
  } else if (score >= 85) {
    return "🎯 Excellent travail ! Continue comme ça !";
  } else if (score >= 80) {
    return "👏 Très bien joué ! Tu progresses super bien !";
  } else if (score >= 75) {
    return "💪 Bon travail ! Tu es sur la bonne voie !";
  } else if (score >= 70) {
    return "👍 Pas mal du tout ! Encore un petit effort !";
  } else if (score >= 65) {
    return "🤔 C'est un bon début ! Continue à t'entraîner !";
  } else if (score >= 60) {
    return "📚 Il faut réviser un peu plus ! Tu peux y arriver !";
  } else if (score >= 50) {
    return "🎲 Comme au bowling... il faut viser mieux !";
  } else if (score >= 40) {
    return "🤓 Il te faut des lunettes... pour mieux lire !";
  } else if (score >= 30) {
    return "🎪 On dirait que tu as joué les yeux fermés !";
  } else if (score >= 20) {
    return "🎭 Tu as confondu quiz et loterie ?";
  } else if (score >= 10) {
    return "🎨 Très créatif... mais pas très précis !";
  } else {
    return "🎪 Bravo ! Tu as réussi à surprendre tout le monde !";
  }
};

export const getRandomEncouragements = (): string[] => [
  "Ne t'inquiète pas, même Einstein a eu des mauvaises notes !",
  "L'important c'est de participer... et d'apprendre !",
  "Chaque erreur est une leçon déguisée !",
  "Tu es unique, même dans tes réponses !",
  "La prochaine fois sera la bonne !",
  "Rome ne s'est pas construite en un jour !",
  "Les champions aussi ont commencé quelque part !",
  "Ton cerveau a juste besoin d'un petit échauffement !",
  "C'est en forgeant qu'on devient forgeron !",
  "Même les super-héros ont des jours difficiles !"
];
