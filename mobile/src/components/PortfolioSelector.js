import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { palette } from '../theme';

export default function PortfolioSelector({ portfolios, selectedPortfolioId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {portfolios.map((portfolio) => {
        const active = portfolio.id === selectedPortfolioId;

        return (
          <Pressable
            key={portfolio.id}
            onPress={() => onSelect(portfolio.id)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text style={[styles.name, active ? styles.nameActive : null]}>{portfolio.name}</Text>
            <Text style={[styles.currency, active ? styles.currencyActive : null]}>{portfolio.currency}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  chipActive: {
    borderColor: palette.accent,
    backgroundColor: '#ccfbf1',
  },
  name: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  nameActive: {
    color: palette.accentDark,
  },
  currency: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  currencyActive: {
    color: palette.accentDark,
  },
});
