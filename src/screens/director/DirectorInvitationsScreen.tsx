import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { ensureParentInvitationLink, ensureTeacherInvitationLink, generateInvitationUrl, revokeInvitationForClassRole } from '../../lib/db';
import { generateInvitationInstructionsShort } from '../../utils/invitationText';

interface Classroom {
  id: string;
  name: string;
  grade: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
}

interface InvitationLinkRow {
  id: string;
  token: string;
  classroom_id: string;
  school_id: string;
  expires_at: string;
  used_at: string | null;
}

type InviteRole = 'PARENT' | 'TEACHER';
type InviteMapPerClass = Record<string, { PARENT: InvitationLinkRow | null; TEACHER: InvitationLinkRow | null }>;

export function DirectorInvitationsScreen() {
  const { profile, user } = useAuth();
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [invites, setInvites] = useState<InviteMapPerClass>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Use profile.school_id first, fallback to user app_metadata
    const schoolId = profile?.school_id || user?.app_metadata?.school_id;
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      setClasses(data || []);

      // Ensure we have active parent and teacher invitations for each class
      const map: InviteMapPerClass = {};
      for (const cls of data || []) {
        const entry: { PARENT: InvitationLinkRow | null; TEACHER: InvitationLinkRow | null } = { PARENT: null, TEACHER: null };
        try {
          const linkParent = await ensureParentInvitationLink(cls.id, schoolId, profile?.id || user?.id);
          entry.PARENT = linkParent as unknown as InvitationLinkRow;
        } catch (e) {
          console.warn('No parent invitation for classroom', cls.id, e);
        }
        try {
          const linkTeacher = await ensureTeacherInvitationLink(cls.id, schoolId, profile?.id || user?.id);
          entry.TEACHER = linkTeacher as unknown as InvitationLinkRow;
        } catch (e) {
          // May fail if policies forbid or if not director; safe to ignore per class
          console.warn('No teacher invitation for classroom', cls.id, e);
        }
        map[cls.id] = entry;
      }
      setInvites(map);
    } catch (e) {
      console.error('Error fetching invites', e);
      Alert.alert('Erreur', "Impossible de charger les invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [profile?.school_id, user?.app_metadata?.school_id]);

  const copyLink = async (clsId: string, role: InviteRole) => {
    const inv = invites[clsId]?.[role];
    if (!inv) return;
    const url = generateInvitationUrl(inv.token);
    await Clipboard.setStringAsync(url);
    Alert.alert('Lien copié', `Le lien ${role === 'PARENT' ? 'parents' : 'enseignant'} a été copié dans le presse-papiers`);
  };

  const copyInvitationInstructions = async (clsId: string, role: InviteRole) => {
    const inv = invites[clsId]?.[role];
    if (!inv) return;
    const schoolName = profile?.school_name || 'Votre école';
    const className = classes.find(c => c.id === clsId)?.name;
    const instructions = generateInvitationInstructionsShort(inv.token, schoolName, className, role);
    await Clipboard.setStringAsync(instructions);
    Alert.alert('Instructions copiées', `Instructions d'invitation ${role === 'PARENT' ? 'parents' : 'enseignant'} copiées dans le presse-papiers`);
  };

  const revokeLink = async (clsId: string, role: InviteRole) => {
    try {
      await revokeInvitationForClassRole(clsId, role);
      Alert.alert('Révoqué', `Le lien ${role === 'PARENT' ? 'parents' : 'enseignant'} a été révoqué. Un nouveau sera généré si nécessaire.`);
      fetchData();
    } catch (e) {
      console.error('Revoke link error', e);
      Alert.alert('Erreur', "Impossible de révoquer le lien");
    }
  };

  const generateParentLink = async (clsId: string) => {
    const schoolId = profile?.school_id || user?.app_metadata?.school_id;
    if (!schoolId) {
      Alert.alert('Erreur', "Aucune école associée au profil directeur");
      return;
    }
    try {
      const link = await ensureParentInvitationLink(clsId, schoolId, profile?.id || user?.id);
      setInvites(prev => ({
        ...prev,
        [clsId]: { ...(prev[clsId] || { PARENT: null, TEACHER: null }), PARENT: link as any },
      }));
      Alert.alert('Succès', 'Lien parents généré');
    } catch (e) {
      console.error('Generate parent link error', e);
      Alert.alert('Erreur', "Impossible de générer le lien parents");
    }
  };

  const generateTeacherLink = async (clsId: string) => {
    const schoolId = profile?.school_id || user?.app_metadata?.school_id;
    if (!schoolId) {
      Alert.alert('Erreur', "Aucune école associée au profil directeur");
      return;
    }
    try {
      const link = await ensureTeacherInvitationLink(clsId, schoolId, profile?.id || user?.id);
      setInvites(prev => ({
        ...prev,
        [clsId]: { ...(prev[clsId] || { PARENT: null, TEACHER: null }), TEACHER: link as any },
      }));
      Alert.alert('Succès', 'Lien enseignant généré');
    } catch (e) {
      console.error('Generate teacher link error', e);
      Alert.alert('Erreur', "Impossible de générer le lien enseignant (réservé au directeur)");
    }
  };

  const renderItem = ({ item }: { item: Classroom }) => {
    const invParent = invites[item.id]?.PARENT || null;
    const invTeacher = invites[item.id]?.TEACHER || null;
    const urlParent = invParent ? generateInvitationUrl(invParent.token) : undefined;
    const urlTeacher = invTeacher ? generateInvitationUrl(invTeacher.token) : undefined;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.grade}</Text></View>
        </View>
        {/* Parent link */}
        <View style={styles.row}>
          <Ionicons name="qr-code-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.rowText}>Lien Parents</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#059669' }]} onPress={() => copyInvitationInstructions(item.id, 'PARENT')} disabled={!invParent}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#b91c1c' }]} onPress={() => revokeLink(item.id, 'PARENT')} disabled={!invParent}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Révoquer</Text>
          </TouchableOpacity>
        </View>
        {!invParent ? (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity style={styles.btn} onPress={() => generateParentLink(item.id)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Générer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.link} numberOfLines={1}>{urlParent}</Text>
        )}
        <Text style={styles.note}>Ce lien est réutilisable par tous les parents de cette classe et expire 7 jours après sa génération.</Text>

        {/* Teacher link */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <Ionicons name="qr-code-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.rowText}>Lien Enseignant</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#059669' }]} onPress={() => copyInvitationInstructions(item.id, 'TEACHER')} disabled={!invTeacher}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#b91c1c' }]} onPress={() => revokeLink(item.id, 'TEACHER')} disabled={!invTeacher}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Révoquer</Text>
          </TouchableOpacity>
        </View>
        {!invTeacher ? (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity style={styles.btn} onPress={() => generateTeacherLink(item.id)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Générer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.link} numberOfLines={1}>{urlTeacher}</Text>
        )}
        <Text style={styles.note}>Ce lien permet d'inviter un(e) enseignant(e) à prendre en charge cette classe. Il expire après 7 jours.</Text>
      </View>
    );
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background.primary }}
      data={classes}
      keyExtractor={(c) => c.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      refreshing={loading}
      onRefresh={fetchData}
      ListEmptyComponent={!loading ? (
        <View style={styles.empty}> 
          <Ionicons name="qr-code-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>Aucune classe</Text>
          <Text style={styles.emptySub}>Créez une classe pour générer des liens parents</Text>
        </View>
      ) : null}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  className: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  badge: { backgroundColor: colors.background.tertiary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border.primary },
  badgeText: { color: colors.text.secondary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rowText: { color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { backgroundColor: colors.brand.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { color: '#fff', fontWeight: '700' },
  link: { color: colors.text.tertiary, marginTop: 8 },
  note: { color: colors.text.tertiary, marginTop: 6, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: colors.text.secondary, fontWeight: '700', fontSize: 18 },
  emptySub: { color: colors.text.tertiary },
});
