import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DirectorDashboard } from '../screens/director/DirectorDashboard';
import { DirectorClassesScreen } from '../screens/director/DirectorClassesScreen';
import { DirectorUsersScreen } from '../screens/director/DirectorUsersScreen';
import { DirectorInvitationsScreen } from '../screens/director/DirectorInvitationsScreen';
import { colors } from '../theme/colors';

export type DirectorTabsParamList = {
  Dashboard: undefined;
  Classes: undefined;
  Users: undefined;
  Invitations: undefined;
};

const Tab = createBottomTabNavigator<DirectorTabsParamList>();

export function DirectorTabs() {
  console.log('📱 DirectorTabs: Rendering Director navigation');
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Invitations') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopColor: colors.border.primary,
        },
        headerStyle: {
          backgroundColor: colors.background.secondary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DirectorDashboard} 
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Classes" 
        component={DirectorClassesScreen} 
        options={{ title: 'Classes' }}
      />
      <Tab.Screen 
        name="Users" 
        component={DirectorUsersScreen} 
        options={{ title: 'Utilisateurs' }}
      />
      <Tab.Screen 
        name="Invitations" 
        component={DirectorInvitationsScreen} 
        options={{ title: 'Invitations' }}
      />
    </Tab.Navigator>
  );
}
