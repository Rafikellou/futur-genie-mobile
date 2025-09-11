import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../theme/colors';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.status.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <LinearGradient
          colors={gradients.primary}
          style={styles.retryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.retryButtonInner} onPress={onRetry}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.primary,
  },
  message: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonInner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
