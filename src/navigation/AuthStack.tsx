import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { InviteEntryScreen } from '../screens/auth/InviteEntryScreen';
import { ParentInvitationSignUpScreen } from '../screens/auth/ParentInvitationSignUpScreen';
import { TeacherInvitationSignUpScreen } from '../screens/auth/TeacherInvitationSignUpScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  InviteEntry: { token?: string; url?: string };
  ParentInvitationSignUp: { token: string };
  TeacherInvitationSignUp: { token: string };
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
      <Stack.Screen name="InviteEntry" component={InviteEntryScreen} />
      <Stack.Screen name="ParentInvitationSignUp" component={ParentInvitationSignUpScreen} />
      <Stack.Screen name="TeacherInvitationSignUp" component={TeacherInvitationSignUpScreen} />
    </Stack.Navigator>
  );
}
