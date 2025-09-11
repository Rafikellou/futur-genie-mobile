import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  color = '#2563eb', 
  height = 8, 
  showPercentage = false 
}: ProgressBarProps) {
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <View 
          style={[
            styles.fill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: color,
              height 
            }
          ]} 
        />
      </View>
      {showPercentage && (
        <Text style={styles.percentage}>{percentage}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  percentage: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    minWidth: 35,
    textAlign: 'right',
  },
});
