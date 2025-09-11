import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import { ActivitiesTab } from '../screens/parent/tabs/ActivitiesTab';
import { ProgressTab } from '../screens/parent/tabs/ProgressTab';
import { CommunicationTab } from '../screens/parent/tabs/CommunicationTab';
import { DirectorDashboard } from '../screens/director/DirectorDashboard';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { ProfileTab } from '../screens/parent/tabs/ProfileTab';
import { TeacherTabs } from './TeacherTabs';
import { colors } from '../theme/colors';

export type MainTabsParamList = {
  Activities?: undefined;
  Progress?: undefined;
  Communication?: undefined;
  Dashboard?: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { profile } = useAuth();

  if (profile?.role === 'TEACHER') {
    return <TeacherTabs />;
  }

  // For non-parent roles, use the original dashboard structure
  if (profile?.role === 'DIRECTOR') {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
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
          options={{ title: 'École' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: 'Profil' }}
        />
      </Tab.Navigator>
    );
  }

  // For parent role, use the 4-tab structure
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Activities':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'Progress':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Communication':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
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
        name="Activities" 
        component={ActivitiesTab}
        options={{ title: 'Activités' }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressTab}
        options={{ title: 'Progrès' }}
      />
      <Tab.Screen 
        name="Communication" 
        component={CommunicationTab}
        options={{ title: 'Communication' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTab} 
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}
