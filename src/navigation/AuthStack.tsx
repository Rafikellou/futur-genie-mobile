import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { InvitationSignUpScreen } from '../screens/auth/InvitationSignUpScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  InvitationSignUp: { token: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="InvitationSignUp" component={InvitationSignUpScreen} />
    </Stack.Navigator>
  );
}
