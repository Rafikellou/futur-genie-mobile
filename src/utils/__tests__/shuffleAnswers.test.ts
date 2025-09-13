import { shuffleAnswers } from '../shuffleAnswers';

describe('shuffleAnswers', () => {
  it('should maintain the correct answer while shuffling options', () => {
    const correctAnswer = 'Paris';
    const wrongAnswers = ['London', 'Berlin', 'Madrid'];
    
    const result = shuffleAnswers(correctAnswer, wrongAnswers);
    
    // Check that all original options are present
    expect(result.options).toContain('Paris');
    expect(result.options).toContain('London');
    expect(result.options).toContain('Berlin');
    expect(result.options).toContain('Madrid');
    
    // Check that the correct index points to the correct answer
    expect(result.options[result.correctIndex]).toBe('Paris');
    
    // Check that we have exactly 4 options
    expect(result.options.length).toBe(4);
  });

  it('should distribute correct answers evenly across positions', () => {
    const correctAnswer = 'Correct';
    const wrongAnswers = ['Wrong1', 'Wrong2', 'Wrong3'];
    
    // Run the shuffle many times to test distribution
    const positionCount = [0, 0, 0, 0];
    const iterations = 10000;
    
    for (let i = 0; i < iterations; i++) {
      const result = shuffleAnswers(correctAnswer, wrongAnswers);
      positionCount[result.correctIndex]++;
    }
    
    // Check that each position gets roughly 25% of the correct answers (within 5% tolerance)
    const expected = iterations / 4;
    const tolerance = iterations * 0.05;
    
    positionCount.forEach(count => {
      expect(count).toBeGreaterThan(expected - tolerance);
      expect(count).toBeLessThan(expected + tolerance);
    });
  });
});