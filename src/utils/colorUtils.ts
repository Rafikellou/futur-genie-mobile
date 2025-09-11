// Utility to check color contrast ratios
// Based on WCAG 2.1 guidelines (minimum 4.5:1 for normal text)

export const getContrastRatio = (color1: string, color2: string): number => {
  // Convert hex to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Calculate relative luminance
  const lum1 = calculateLuminance(rgb1);
  const lum2 = calculateLuminance(rgb2);
  
  // Return contrast ratio
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const calculateLuminance = (rgb: { r: number; g: number; b: number }) => {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const checkAccessibility = (textColor: string, backgroundColor: string): boolean => {
  return getContrastRatio(textColor, backgroundColor) >= 4.5;
};
