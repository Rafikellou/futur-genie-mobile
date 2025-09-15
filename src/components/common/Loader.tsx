import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, Text } from 'react-native';
import { colors } from '../../theme/colors';

type LoaderProps = { message?: string };

export function Loader({ message }: LoaderProps) {
  const fade = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      {message ? (
        <Animated.View style={{ opacity: fade, marginTop: 16, paddingHorizontal: 24 }}>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
});
