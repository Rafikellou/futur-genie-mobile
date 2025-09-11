import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/providers/AuthProvider';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linkingConfig, initializeLinking } from './src/lib/linking';

export default function App() {
  useEffect(() => {
    const cleanup = initializeLinking();
    return cleanup;
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer linking={linkingConfig}>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
