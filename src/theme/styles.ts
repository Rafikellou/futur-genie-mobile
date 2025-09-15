import { StyleSheet } from 'react-native';
import { colors } from './colors';

// Common styles that can be reused across components
export const commonStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Card styles - Coins arrondis 16px, ombres douces
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  smallCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Input styles - Design moderne et épuré
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  
  inputFocused: {
    borderColor: colors.accent.pink,
    shadowColor: colors.accent.pink,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  textArea: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: colors.border.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Button styles - Forme arrondie, dégradé logo
  primaryButton: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  secondaryButton: {
    backgroundColor: colors.button.secondary.background,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.button.secondary.border,
  },
  
  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent.pink,
  },
  
  // Text styles - Typographie Poppins/Inter, hiérarchie claire
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: colors.text.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  
  accentText: {
    color: colors.text.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  
  // Header styles
  header: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  
  // Shadow styles - Ombres douces 20-30%
  shadow: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  lightShadow: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  strongShadow: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  
  // Spacing - Espaces généreux
  marginBottom: {
    marginBottom: 20,
  },
  
  marginTop: {
    marginTop: 20,
  },
  
  padding: {
    padding: 20,
  },
  
  paddingHorizontal: {
    paddingHorizontal: 20,
  },
  
  paddingVertical: {
    paddingVertical: 16,
  },
  
  // Flex utilities
  row: {
    flexDirection: 'row',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  spaceBetween: {
    justifyContent: 'space-between',
  },
  
  alignCenter: {
    alignItems: 'center',
  },
  
  // Layout moderne & épuré
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  
  formContainer: {
    gap: 20,
  },
  
  // États interactifs
  pressable: {
    opacity: 1,
  },
  
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
