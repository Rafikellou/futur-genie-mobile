/**
 * Shuffles answer options using Fisher-Yates algorithm while tracking the correct answer
 * @param correctAnswer The correct answer text
 * @param wrongAnswers Array of 3 incorrect answer texts
 * @returns Object containing shuffled options and the index of the correct answer
 */
export interface ShuffledAnswers {
  options: string[];
  correctIndex: number;
}

export function shuffleAnswers(correctAnswer: string, wrongAnswers: string[]): ShuffledAnswers {
  // Create array with all answers
  const options = [correctAnswer, ...wrongAnswers];
  
  // Track the correct answer index
  let correctIndex = 0;
  
  // Fisher-Yates shuffle algorithm
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap elements
    [options[i], options[j]] = [options[j], options[i]];
    
    // Update correctIndex if needed
    if (correctIndex === i) {
      correctIndex = j;
    } else if (correctIndex === j) {
      correctIndex = i;
    }
  }
  
  return { options, correctIndex };
}