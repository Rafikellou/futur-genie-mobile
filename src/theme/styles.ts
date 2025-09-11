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
  },
  
  // Card styles
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  
  smallCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  
  // Input styles
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  
  textArea: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    color: colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Button styles
  primaryButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButton: {
    backgroundColor: colors.button.secondary.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
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
  
  // Shadow styles
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Spacing
  marginBottom: {
    marginBottom: 16,
  },
  
  marginTop: {
    marginTop: 16,
  },
  
  padding: {
    padding: 16,
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
});
