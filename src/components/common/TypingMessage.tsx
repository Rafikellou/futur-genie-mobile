import React, { useState, useEffect } from 'react';
import { Text, TextStyle } from 'react-native';

interface TypingMessageProps {
  message: string;
  speed?: number;
  delay?: number;
  style?: TextStyle;
  onComplete?: () => void;
}

export const TypingMessage: React.FC<TypingMessageProps> = ({
  message,
  speed = 50,
  delay = 0,
  style,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setIsStarted(true);
      }, delay);
      return () => clearTimeout(delayTimer);
    } else {
      setIsStarted(true);
    }
  }, [delay]);

  useEffect(() => {
    if (!isStarted || currentIndex >= message.length) {
      if (currentIndex >= message.length && onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + message[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, message, speed, isStarted, onComplete]);

  return (
    <Text style={style}>
      {displayedText}
      {currentIndex < message.length && isStarted && (
        <Text style={{ opacity: 0.5 }}>|</Text>
      )}
    </Text>
  );
};
