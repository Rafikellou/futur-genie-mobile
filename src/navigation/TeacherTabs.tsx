import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import { TeacherDashboard } from '../screens/teacher/TeacherDashboard';
import { CreateQuizScreen } from '../screens/teacher/CreateQuizScreen';
import { MyClassScreen } from '../screens/teacher/MyClassScreen';
import { SuggestionsScreen } from '../screens/teacher/SuggestionsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { colors } from '../theme/colors';

export type TeacherTabsParamList = {
  MyQuizzes: undefined;
  CreateQuiz: undefined;
  MyClass: undefined;
  Suggestions: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabsParamList>();

export function TeacherTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'MyQuizzes') {
            iconName = focused ? 'list-circle' : 'list-circle-outline';
          } else if (route.name === 'CreateQuiz') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'MyClass') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Suggestions') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
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
        name="MyQuizzes" 
        component={TeacherDashboard} 
        options={{ title: 'Mes quizs' }}
      />
      <Tab.Screen 
        name="CreateQuiz" 
        component={CreateQuizScreen} 
        options={{ title: 'Créer un quiz' }}
      />
      <Tab.Screen 
        name="MyClass" 
        component={MyClassScreen} 
        options={{ title: 'Ma Classe' }}
      />
      <Tab.Screen 
        name="Suggestions" 
        component={SuggestionsScreen} 
        options={{ title: 'Suggestions' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}
