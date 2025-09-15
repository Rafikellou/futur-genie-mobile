import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/providers/AuthProvider';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linkingConfig } from './src/lib/linking';
import { navigationRef } from './src/lib/navigationRef';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef} linking={linkingConfig}>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
