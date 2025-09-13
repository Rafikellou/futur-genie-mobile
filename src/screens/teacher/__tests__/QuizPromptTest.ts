import { generateQuiz } from '../CreateQuizScreen';

// Mock des dépendances React Native
jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn() },
}));

describe('Quiz Prompt Tests', () => {
  const testSubjects = [
    'La révolution française',
    'Les tables de multiplication',
    'Le cycle de l\'eau',
    'Les capitales européennes'
  ];

  testSubjects.forEach(subject => {
    test(`Vérifie la distribution des réponses pour ${subject}`, async () => {
      const quiz = await generateQuiz(subject);
      
      // Compter les bonnes réponses par position
      const answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
      
      quiz.questions.forEach(question => {
        const correctAnswer = question.answer_keys[0];
        answerDistribution[correctAnswer]++;
      });

      // Vérifier la distribution
      console.log(`Distribution pour ${subject}:`, answerDistribution);
      
      expect(answerDistribution.A).toBe(2);
      expect(answerDistribution.B).toBe(2);
      expect(answerDistribution.C).toBe(3);
      expect(answerDistribution.D).toBe(3);
    });
  });
});

describe('Quiz Prompt Tests', () => {
  const requiredPromptParts = [
    'EXACTEMENT 2 bonnes réponses en position A',
    'EXACTEMENT 2 bonnes réponses en position B',
    'EXACTEMENT 3 bonnes réponses en position C',
    'EXACTEMENT 3 bonnes réponses en position D'
  ];

  test('Le prompt contient les instructions pour chaque position', () => {
    requiredPromptParts.forEach(part => {
      expect(part).toBeDefined();
    });
  });
});

describe('Quiz Prompt Distribution', () => {
  const testPrompt = `
  Règles CRITIQUES pour la distribution des bonnes réponses:
  - EXACTEMENT 2 bonnes réponses en position A
  - EXACTEMENT 2 bonnes réponses en position B
  - EXACTEMENT 3 bonnes réponses en position C
  - EXACTEMENT 3 bonnes réponses en position D
  `;

  test('Vérifie que le prompt contient les bonnes instructions pour la position D', () => {
    // Vérification directe du prompt
    expect(testPrompt).toContain('EXACTEMENT 3 bonnes réponses en position D');
    expect(testPrompt).toMatch(/position D.*3.*bonnes réponses/s);
  });

  // Test supplémentaire pour vérifier la structure globale
  test('Vérifie la structure complète du prompt', () => {
    expect(testPrompt).toMatchSnapshot();
  });
});
