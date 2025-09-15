import React from 'react';
import { useAuth } from '../providers/AuthProvider';
import { AuthStack } from './AuthStack';
import { DirectorTabs } from './DirectorTabs';
import { TeacherTabs } from './TeacherTabs';
import { ParentTabs } from './ParentTabs';
import { Loader } from '../components/common/Loader';

export function AppNavigator() {
  const { user, role, loading } = useAuth() as any;

  console.log('🧭 AppNavigator render:', { 
    hasUser: !!user, 
    role, 
    loading,
    userId: user?.id?.slice(0, 8) 
  });

  if (loading) return <Loader message={"Nous préparons ton profil. Quelques secondes de patience avant de découvrir Futur Génie"} />;
  if (!user) return <AuthStack />;
  if (!role) return <Loader message={"Nous préparons ton profil. Quelques secondes de patience avant de découvrir Futur Génie"} />; // wait for normalized role

  if (role === 'DIRECTOR') return <DirectorTabs />;
  if (role === 'TEACHER') return <TeacherTabs />;
  return <ParentTabs />;
}
