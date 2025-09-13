import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface UserRow {
  id: string;
  role: 'DIRECTOR' | 'TEACHER' | 'PARENT';
  school_id: string | null;
  classroom_id: string | null;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

type Filter = 'ALL' | 'TEACHER' | 'PARENT';

export function DirectorUsersScreen() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = useMemo(() => {
    let list = users;
    if (filter !== 'ALL') list = list.filter(u => u.role === filter);
    if (query) list = list.filter(u => (u.full_name || u.email || '').toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [users, query, filter]);

  const fetchUsers = async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, role, school_id, classroom_id, email, full_name, created_at')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error('Fetch users error', e);
      Alert.alert('Erreur', "Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [profile?.school_id]);

  const HeaderStats = () => {
    const teachers = users.filter(u => u.role === 'TEACHER').length;
    const parents = users.filter(u => u.role === 'PARENT').length;
    return (
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="person-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.statText}>Enseignants: {teachers}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.statText}>Parents: {parents}</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: UserRow }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.full_name || '—'}</Text>
        <Text style={styles.userEmail}>{item.email || '—'}</Text>
      </View>
      <View style={[styles.rolePill, item.role === 'TEACHER' ? { backgroundColor: '#1f2937' } : { backgroundColor: '#374151' } ]}>
        <Text style={styles.pillText}>{item.role}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderStats />

      <View style={styles.filterRow}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher nom ou email"
            placeholderTextColor={colors.text.placeholder}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={styles.segmentRow}>
          {(['ALL', 'TEACHER', 'PARENT'] as Filter[]).map(f => (
            <TouchableOpacity key={f} style={[styles.segment, filter === f && styles.segmentActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                {f === 'ALL' ? 'Tous' : f === 'TEACHER' ? 'Enseignants' : 'Parents'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={fetchUsers}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}> 
            <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun utilisateur</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statCard: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.background.secondary, borderRadius: 8, padding: 12, flex: 1, borderWidth: 1, borderColor: colors.border.primary },
  statText: { color: colors.text.primary, fontWeight: '600' },
  filterRow: { paddingHorizontal: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary, borderColor: colors.border.primary, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 42 },
  searchInput: { marginLeft: 8, color: colors.text.primary, flex: 1 },
  segmentRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border.primary },
  segmentActive: { backgroundColor: colors.background.secondary },
  segmentText: { color: colors.text.tertiary, fontWeight: '600' },
  segmentTextActive: { color: colors.text.primary },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 12 },
  userName: { color: colors.text.primary, fontWeight: '700', fontSize: 16 },
  userEmail: { color: colors.text.secondary, marginTop: 2 },
  rolePill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: colors.text.secondary, fontWeight: '700', fontSize: 18 },
});
