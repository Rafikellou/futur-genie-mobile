import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { handleInvitationLink } from '../../lib/linking';
import { colors } from '../../theme/colors';

// Minimal types to avoid circular imports
type AuthStackParamList = {
  InviteEntry: { token?: string; url?: string };
  ParentInvitationSignUp: { token: string };
  TeacherInvitationSignUp: { token: string };
  Login: undefined;
};

export function InviteEntryScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, 'InviteEntry'>>();
  const navigation = useNavigation<any>();
  const currentUrl = Linking.useURL();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // Determine the URL or token source in order of precedence:
        // 1) Explicit route param url (programmatic navigation)
        // 2) Explicit route param token
        // 3) Current URL from Linking.useURL() (deep link through RN linking)
        // 4) Fallback to getInitialURL (cold start cases on some platforms)

        let url = route.params?.url as string | undefined;
        let token = route.params?.token as string | undefined;

        if (!url && token) {
          url = `futurgenie://invite?token=${token}`;
        }

        if (!url && !token) {
          // Try from the latest URL hook value
          if (currentUrl) {
            url = currentUrl;
          } else {
            // As a last resort, query the initial URL
            try {
              const initial = await Linking.getInitialURL();
              if (initial) url = initial;
            } catch {}
          }
        }

        if (!url) {
          setError("Lien d'invitation manquant");
          return;
        }

        const result = await handleInvitationLink(url!);
        if (!result.success || !result.invitation) {
          setError(result.error || "Lien d'invitation invalide");
          return;
        }

        const intended = result.invitation.role;
        const t = result.invitation.token;
        if (intended === 'TEACHER') {
          navigation.navigate('TeacherInvitationSignUp', { token: t });
        } else {
          navigation.navigate('ParentInvitationSignUp', { token: t });
        }
      } catch (e) {
        setError("Erreur lors de la validation du lien d'invitation");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [route.params, currentUrl]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>Ouverture de l'invitation...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background.primary }}>
        <Text style={{ color: colors.status.error, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Invitation invalide</Text>
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: colors.background.primary }} />;
}
