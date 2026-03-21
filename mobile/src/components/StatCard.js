import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';

export default function StatCard({ label, value, tone = 'default' }) {
  const valueStyle = tone === 'danger' ? styles.valueDanger : tone === 'success' ? styles.valueSuccess : styles.value;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 8,
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  valueSuccess: {
    color: palette.success,
    fontSize: 18,
    fontWeight: '800',
  },
  valueDanger: {
    color: palette.danger,
    fontSize: 18,
    fontWeight: '800',
  },
});
