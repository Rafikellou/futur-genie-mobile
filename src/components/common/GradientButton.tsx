import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { commonStyles } from '../../theme/styles';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const getGradientColors = (): string[] => {
    if (disabled) return ['#374151', '#374151'];
    
    switch (variant) {
      case 'primary':
        return [...gradients.primary];
      case 'secondary':
        return [...gradients.secondary];
      case 'tertiary':
        return [...gradients.tertiary];
      default:
        return [...gradients.primary];
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.button.disabled.text;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getGradientColors() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[commonStyles.primaryButton, styles.gradient]}
      >
        <Text style={[commonStyles.buttonText, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
  },
  gradient: {
    borderRadius: 25,
  },
});
