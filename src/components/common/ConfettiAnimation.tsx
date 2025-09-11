import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  color: string;
}

interface ConfettiAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({
  visible,
  onComplete
}) => {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  useEffect(() => {
    if (visible) {
      createConfetti();
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [visible]);

  const createConfetti = () => {
    confettiPieces.current = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(height + 50), // Start from bottom
      rotation: new Animated.Value(0),
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
  };

  const startAnimation = () => {
    const animations = confettiPieces.current.map((piece, index) => {
      // Stagger the launch timing for more realistic effect
      const delay = index * 25; // Faster staggering for more explosive effect
      const randomBounceHeight = Math.random() * 0.4 + 0.1; // Random bounce between 10% and 50% of screen
      const horizontalDrift = (Math.random() - 0.5) * width * 1.5; // More dramatic horizontal movement
      
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Launch upward with multiple bounces, then fall down
          Animated.sequence([
            // Initial explosive launch to top of screen
            Animated.timing(piece.y, {
              toValue: -50, // Launch above screen top
              duration: 1200,
              useNativeDriver: true,
            }),
            // First bounce
            Animated.timing(piece.y, {
              toValue: height * randomBounceHeight,
              duration: 600,
              useNativeDriver: true,
            }),
            // Second smaller bounce
            Animated.timing(piece.y, {
              toValue: height * (randomBounceHeight * 0.6),
              duration: 400,
              useNativeDriver: true,
            }),
            // Final fall
            Animated.timing(piece.y, {
              toValue: height + 150,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
          // More dramatic horizontal drift with bouncing
          Animated.timing(piece.x, {
            toValue: Math.random() * width + horizontalDrift,
            duration: 4000,
            useNativeDriver: true,
          }),
          // Faster, more chaotic rotation
          Animated.loop(
            Animated.timing(piece.rotation, {
              toValue: 360,
              duration: 400 + Math.random() * 600, // Faster rotation
              useNativeDriver: true,
            })
          ),
        ]),
      ]);
    });

    animationRef.current = Animated.parallel(animations);
    animationRef.current.start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      {confettiPieces.current.map((piece) => (
        <Animated.View
          key={piece.id}
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            backgroundColor: piece.color,
            borderRadius: 6,
            transform: [
              { translateX: piece.x },
              { translateY: piece.y },
              {
                rotate: piece.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
};
