// Charte graphique Futur Génie - Couleurs officielles
export const colors = {
  // Background colors - Bleu marine profond comme base
  background: {
    primary: '#0B1D3A',      // Fond principal bleu marine profond
    secondary: '#12284F',    // Cartes et éléments secondaires (bleu nuit plus clair)
    tertiary: '#1A3458',     // Champs de saisie et éléments interactifs
  },
  
  // Text colors - Blanc cassé et gris clair
  text: {
    primary: '#F2F4F8',      // Texte principal blanc cassé
    secondary: '#B0B8C5',    // Texte secondaire gris clair
    tertiary: '#8A92A0',     // Texte atténué
    placeholder: '#6B7280',  // Placeholder
    accent: '#FF4FA3',       // Texte d'accent rose (mots-clés, tags)
  },
  
  // Couleurs d'accent issues du logo - Dégradé violet → rose → orange
  accent: {
    violet: '#8B5CF6',       // Violet du dégradé logo
    pink: '#FF4FA3',         // Rose du dégradé logo
    orange: '#FB7C37',       // Orange du dégradé logo
    blueLight: '#4DA6FF',    // Bleu clair pour hover/états secondaires
  },
  
  // Dégradés du logo
  gradient: {
    primary: ['#8B5CF6', '#FF4FA3', '#FB7C37'], // Violet → Rose → Orange
    secondary: ['#8B5CF6', '#FF4FA3'],           // Violet → Rose
    tertiary: ['#FF4FA3', '#FB7C37'],            // Rose → Orange
  },
  
  // Button colors
  button: {
    primary: {
      gradient: ['#8B5CF6', '#FF4FA3', '#FB7C37'], // Dégradé logo complet
      text: '#FFFFFF',
    },
    secondary: {
      background: '#12284F',
      text: '#F2F4F8',
      border: '#1A3458',
    },
    hover: {
      gradient: ['#9F70FF', '#FF69B4', '#FF8C42'], // Version éclaircie du dégradé
      background: '#4DA6FF', // Bleu clair pour hover
    },
    disabled: {
      background: '#374151', // Gris bleuté
      text: '#6B7280',
    },
  },
  
  // Border colors
  border: {
    primary: '#1A3458',
    secondary: '#2D4A6B',
    accent: '#FF4FA3',       // Rose accent
  },
  
  // Status colors
  status: {
    success: '#10B981',
    warning: '#FB7C37',      // Orange du logo
    error: '#EF4444',
    info: '#4DA6FF',         // Bleu clair
  },
  
  // Brand colors
  brand: {
    primary: '#8B5CF6',      // Violet principal
    secondary: '#FF4FA3',    // Rose accent
    tertiary: '#FB7C37',     // Orange
  },
  
  // Special colors
  overlay: 'rgba(11, 29, 58, 0.8)',  // Overlay avec la couleur de fond
  shadow: 'rgba(0, 0, 0, 0.25)',     // Ombres douces 25%
  transparent: 'transparent',
};

// Gradient styles for React Native
export const gradients = {
  primary: ['#8B5CF6', '#FF4FA3', '#FB7C37'] as const,  // Dégradé logo complet
  secondary: ['#8B5CF6', '#FF4FA3'] as const,           // Violet → Rose
  tertiary: ['#FF4FA3', '#FB7C37'] as const,            // Rose → Orange
  hover: ['#9F70FF', '#FF69B4', '#FF8C42'] as const,    // Version éclaircie
};
