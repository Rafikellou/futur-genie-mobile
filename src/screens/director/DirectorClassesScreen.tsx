import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

// Type for classrooms table
interface ClassroomRow {
  id: string;
  name: string;
  grade: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
  school_id: string;
  created_at: string;
}

const GRADES: ClassroomRow['grade'][] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME'];

export function DirectorClassesScreen() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassroomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState<ClassroomRow['grade']>('CP');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return classes;
    return classes.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  }, [classes, query]);

  const fetchClasses = async () => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade, school_id, created_at')
        .eq('school_id', profile.school_id)
        .order('name');
      if (error) throw error;
      setClasses(data || []);
    } catch (e) {
      console.error('Failed to fetch classes', e);
      Alert.alert('Erreur', "Impossible de charger les classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [profile?.school_id]);

  const onCreate = async () => {
    if (!profile?.school_id) return;
    if (!newName.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir un nom de classe');
      return;
    }
    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('classrooms')
        .insert({ name: newName.trim(), grade: newGrade, school_id: profile.school_id })
        .select('id, name, grade, school_id, created_at')
        .single();
      if (error) throw error;
      setClasses(prev => [data as ClassroomRow, ...prev]);
      setNewName('');
      setNewGrade('CP');
      Alert.alert('Succès', 'Classe créée');
    } catch (e: any) {
      console.error('Create class error', e);
      // Fallback: try Edge Function that uses service role to perform a guarded insert
      try {
        const { data, error: fnError } = await supabase.functions.invoke('director_create_classroom', {
          body: {
            name: newName.trim(),
            grade: newGrade,
            school_id: profile.school_id,
          },
        });
        if (fnError) throw fnError;
        // Refresh classes after function success
        await fetchClasses();
        setNewName('');
        setNewGrade('CP');
        Alert.alert('Succès', 'Classe créée');
      } catch (fnErr: any) {
        console.error('Create class via function error', fnErr);
        Alert.alert('Erreur', `Impossible de créer la classe. ${fnErr?.message || ''}`.trim());
      }
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: ClassroomRow }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <Text style={styles.className}>{item.name}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.grade}</Text></View>
      </View>
      <View style={styles.classActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('À venir', 'Détails de la classe prochainement')}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.actionText}>Détails</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une classe"
          placeholderTextColor={colors.text.placeholder}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.createRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Nom de la classe"
          placeholderTextColor={colors.text.placeholder}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.gradePicker} onPress={() => {
          // simple cycle through grades for now (no native picker to keep it lightweight)
          const idx = GRADES.indexOf(newGrade);
          const next = GRADES[(idx + 1) % GRADES.length];
          setNewGrade(next);
        }}>
          <Text style={styles.gradeText}>{newGrade}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.6 }]} disabled={creating} onPress={onCreate}>
          <Ionicons name="add-circle-outline" color="#fff" size={18} />
          <Text style={styles.createBtnText}>Créer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={fetchClasses}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}> 
            <Ionicons name="school-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucune classe</Text>
            <Text style={styles.emptySub}>Créez votre première classe</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchRow: {
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    marginLeft: 8,
    color: colors.text.primary,
    flex: 1,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  gradePicker: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  gradeText: { color: colors.text.primary, fontWeight: '600' },
  createBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  classCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: { color: colors.text.primary, fontWeight: '700', fontSize: 16 },
  badge: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.select({ ios: 4, android: 2 }),
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  badgeText: { color: colors.text.secondary, fontWeight: '600' },
  classActions: { marginTop: 12, flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderColor: colors.border.primary,
    borderWidth: 1,
  },
  actionText: { color: colors.text.secondary, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: colors.text.secondary, fontWeight: '700', fontSize: 18 },
  emptySub: { color: colors.text.tertiary },
});
