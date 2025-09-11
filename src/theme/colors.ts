// Theme colors based on the dark design with blue-violet gradients
export const colors = {
  // Background colors
  background: {
    primary: '#121212',      // Main dark background
    secondary: '#1E1E1E',    // Cards and secondary elements
    tertiary: '#2A2A2A',     // Input fields and interactive elements
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',      // Main text
    secondary: '#E0E0E0',    // Secondary text
    tertiary: '#9E9E9E',     // Muted text
    placeholder: '#616161',  // Placeholder text
  },
  
  // Accent colors from user's brand palette
  accent: {
    blue: '#015FF7',        // Bleu vif
    violet: '#6239E1',      // Violet
    pink: '#EA1E83',        // Rose fuchsia
    orange: '#FF7F59',      // Orange clair
    pastel: '#FB995D',      // Orange pastel
  },
  
  // Primary gradient (blue to violet as requested)
  gradient: {
    start: '#015FF7',       // Bleu vif
    end: '#6239E1',         // Violet
  },
  
  // Button colors
  button: {
    primary: {
      background: 'linear-gradient(135deg, #015FF7 0%, #6239E1 100%)',
      text: '#ffffff',
    },
    secondary: {
      background: '#2A2A2A',
      text: '#E0E0E0',
    },
    success: {
      background: '#10b981',
      text: '#ffffff',
    },
    danger: {
      background: '#ef4444',
      text: '#ffffff',
    },
  },
  
  // Border colors
  border: {
    primary: '#2A2A2A',
    secondary: '#3D3D3D',
    accent: '#015FF7',       // Bleu vif
  },
  
  // Status colors
  status: {
    success: '#10b981',
    warning: '#FB995D',      // Orange pastel
    error: '#ef4444',
    info: '#015FF7',         // Bleu vif
  },
  
  // Brand colors
  brand: {
    primary: '#6239E1',      // Violet
    secondary: '#015FF7',    // Bleu vif
  },
  
  // Special colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
};

// Gradient styles for React Native
export const gradients = {
  primary: ['#015FF7', '#6239E1'] as const,
  secondary: ['#6239E1', '#EA1E83'] as const,  // Violet to Rose fuchsia
  accent: ['#FF7F59', '#FB995D'] as const,     // Orange gradient
};
