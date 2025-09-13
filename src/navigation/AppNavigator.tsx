import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../providers/AuthProvider';
import { AuthStack } from './AuthStack';
import { DirectorTabs } from './DirectorTabs';
import { TeacherTabs } from './TeacherTabs';
import { ParentTabs } from './ParentTabs';
import { Loader } from '../components/common/Loader';
import { InvitationScreen } from '../screens/auth/InvitationScreen';

const Stack = createStackNavigator();

export function AppNavigator() {
  const { session, loading, profile, user } = useAuth() as any;

  console.log('🧭 AppNavigator render:', {
    loading,
    hasSession: !!session,
    hasProfile: !!profile,
    profileRole: profile?.role,
    userMetadataRole: user?.user_metadata?.role,
    userId: user?.id
  });

  if (loading) {
    console.log('⏳ AppNavigator: Still loading, showing Loader');
    return <Loader />;
  }

  const initialRouteName = session ? 'Main' : 'Auth';

  // For new users without profile yet, allow navigation to proceed
  // The profile will be created by director_onboarding_complete or invitation_consume
  // and then refreshed, so we don't need to block navigation here

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      {/* Expose Invitation at root so it can be opened from deep links regardless of auth state */}
      <Stack.Screen name="Invitation" component={InvitationScreen} />
      {session ? (
        <Stack.Screen 
          name="Main" 
          component={(() => {
            // If we have a profile, use it
            if (profile?.role === 'PARENT') {
              console.log('🧭 Routing to ParentTabs (profile role)');
              return ParentTabs;
            }
            if (profile?.role === 'DIRECTOR') {
              console.log('🧭 Routing to DirectorTabs (profile role: DIRECTOR)');
              return DirectorTabs;
            }
            if (profile?.role === 'TEACHER') {
              console.log('🧭 Routing to TeacherTabs (profile role: TEACHER)');
              return TeacherTabs;
            }
            
            // If no profile but user_metadata has role, use that
            if (user?.user_metadata?.role === 'DIRECTOR') {
              console.log('🧭 Routing to DirectorTabs (user_metadata role: DIRECTOR, profile pending)');
              return DirectorTabs;
            }
            if (user?.user_metadata?.role === 'TEACHER') {
              console.log('🧭 Routing to TeacherTabs (user_metadata role: TEACHER, profile pending)');
              return TeacherTabs;
            }
            
            // Default fallback to ParentTabs
            console.log('🧭 Routing to ParentTabs (default fallback)');
            return ParentTabs;
          })()} 
        />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
