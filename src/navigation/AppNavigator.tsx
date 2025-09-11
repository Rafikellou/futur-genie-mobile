import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../providers/AuthProvider';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { Loader } from '../components/common/Loader';

const Stack = createStackNavigator();

export function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
