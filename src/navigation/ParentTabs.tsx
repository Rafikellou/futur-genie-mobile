import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivitiesTab } from '../screens/parent/tabs/ActivitiesTab';
import { ProgressTab } from '../screens/parent/tabs/ProgressTab';
import { CommunicationTab } from '../screens/parent/tabs/CommunicationTab';
import { ProfileTab } from '../screens/parent/tabs/ProfileTab';
import { SupportScreen } from '../screens/parent/SupportScreen';
import { colors } from '../theme/colors';

export type ParentTabsParamList = {
  Activities: undefined;
  Progress: undefined;
  Communication: undefined;
  Profile: undefined;
};

export type ParentStackParamList = {
  ParentTabs: undefined;
  SupportScreen: undefined;
};

const Tab = createBottomTabNavigator<ParentTabsParamList>();
const Stack = createStackNavigator<ParentStackParamList>();

function ParentTabsNavigator() {
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

export function ParentTabs() {
  console.log('📱 ParentTabs: Rendering Parent navigation with support screen');
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentTabs" component={ParentTabsNavigator} />
      <Stack.Screen name="SupportScreen" component={SupportScreen} />
    </Stack.Navigator>
  );
}
