import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SectionCard from '../components/SectionCard';
import { palette } from '../theme';

export default function SettingsScreen({ user, apiBaseUrl, onLogout }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionCard title="Profil Login" subtitle="Informasi sesi yang sedang aktif di aplikasi mobile.">
        <View style={styles.item}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.value}>{user?.name || '-'}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || '-'}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>No HP</Text>
          <Text style={styles.value}>{user?.phone || '-'}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Konfigurasi API" subtitle="Gunakan alamat host yang bisa dijangkau emulator atau device Anda.">
        <View style={styles.item}>
          <Text style={styles.label}>API Base URL</Text>
          <Text style={styles.value}>{apiBaseUrl}</Text>
        </View>
        <Text style={styles.helper}>
          Untuk device fisik, biasanya Anda perlu mengganti localhost menjadi IP lokal laptop Anda, misalnya
          {' '}http://192.168.1.10:8000.
        </Text>
      </SectionCard>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  item: {
    gap: 4,
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helper: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  logoutButton: {
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: palette.danger,
    fontSize: 15,
    fontWeight: '800',
  },
});
