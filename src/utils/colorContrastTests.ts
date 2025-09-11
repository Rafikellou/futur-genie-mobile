import { colors } from '../theme/colors';
import { getContrastRatio, checkAccessibility } from './colorUtils';

// Test color combinations
const testContrasts = () => {
  const tests = [
    {
      name: 'Primary text on background',
      foreground: colors.text.primary,
      background: colors.background.primary,
      minRatio: 4.5
    },
    {
      name: 'Secondary text on background',
      foreground: colors.text.secondary,
      background: colors.background.primary,
      minRatio: 4.5
    },
    {
      name: 'Button text on gradient (worst case)',
      foreground: colors.button.primary.text,
      background: colors.gradient.end, // Using the darker part of gradient
      minRatio: 4.5
    },
    {
      name: 'Accent text on background',
      foreground: colors.accent.blue,
      background: colors.background.primary,
      minRatio: 3.0 // For large text or UI components
    }
  ];

  tests.forEach(test => {
    const ratio = getContrastRatio(test.foreground, test.background);
    const passes = ratio >= test.minRatio;
    
    console.log(`[${passes ? 'PASS' : 'FAIL'}] ${test.name}`);
    console.log(`  Ratio: ${ratio.toFixed(2)}:1 (Minimum: ${test.minRatio}:1)`);
    console.log(`  Colors: ${test.foreground} on ${test.background}\n`);
  });
};

testContrasts();
