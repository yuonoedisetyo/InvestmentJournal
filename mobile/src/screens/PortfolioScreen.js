import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Field from '../components/Field';
import NoticeBanner from '../components/NoticeBanner';
import PortfolioSelector from '../components/PortfolioSelector';
import SectionCard from '../components/SectionCard';
import { palette } from '../theme';
import { formatIDR } from '../utils/format';

export default function PortfolioScreen({
  portfolios,
  selectedPortfolioId,
  positions,
  cashBalance,
  capitalSummary,
  onSelectPortfolio,
  onCreatePortfolio,
  onRefresh,
  refreshing,
  notice,
}) {
  const [form, setForm] = useState({
    name: '',
    currency: 'IDR',
    is_active: true,
  });
  const [formNotice, setFormNotice] = useState({ tone: 'success', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!form.name.trim()) {
      setFormNotice({ tone: 'error', message: 'Nama portfolio wajib diisi.' });
      return;
    }

    setSubmitting(true);
    setFormNotice({ tone: 'success', message: '' });

    try {
      const result = await onCreatePortfolio({
        name: form.name.trim(),
        currency: form.currency,
        is_active: form.is_active,
      });
      setFormNotice({ tone: 'success', message: result?.message || 'Portfolio berhasil dibuat.' });
      setForm({ name: '', currency: 'IDR', is_active: true });
    } catch (error) {
      setFormNotice({ tone: 'error', message: error?.message || 'Gagal membuat portfolio.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
    >
      <NoticeBanner message={notice} />

      <SectionCard title="Pilih Portfolio" subtitle="Sentuh chip di bawah untuk mengganti portfolio aktif di backend.">
        {portfolios.length ? (
          <PortfolioSelector portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} onSelect={onSelectPortfolio} />
        ) : (
          <Text style={styles.emptyText}>Belum ada portfolio.</Text>
        )}
      </SectionCard>

      <SectionCard title="Buat Portfolio Baru" subtitle="Versi mobile juga bisa membuat portfolio baru langsung ke API.">
        <NoticeBanner message={formNotice.message} tone={formNotice.tone} />
        <View style={styles.form}>
          <Field
            label="Nama Portfolio"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Contoh: Portfolio Utama"
          />
          <Pressable style={styles.toggle} onPress={() => setForm((current) => ({ ...current, is_active: !current.is_active }))}>
            <Text style={styles.toggleText}>Set aktif setelah dibuat: {form.is_active ? 'Ya' : 'Tidak'}</Text>
          </Pressable>
          <Pressable style={styles.submitButton} onPress={handleCreate} disabled={submitting}>
            <Text style={styles.submitText}>{submitting ? 'Menyimpan...' : 'Simpan Portfolio'}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Saldo dan Modal" subtitle="Ringkasan saldo kas dan nilai modal dari portfolio aktif.">
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Cash Balance</Text>
          <Text style={styles.metricValue}>{formatIDR(cashBalance)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Capital</Text>
          <Text style={styles.metricValue}>{formatIDR(capitalSummary?.total_capital ?? 0)}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Semua Posisi" subtitle="Daftar lengkap posisi saham pada portfolio aktif.">
        {positions.length ? (
          positions.map((item) => (
            <View key={`${item.stock_code}-${item.total_shares}`} style={styles.positionRow}>
              <View style={styles.positionLeft}>
                <Text style={styles.positionCode}>{item.stock_code}</Text>
                <Text style={styles.positionMeta}>{Number(item.total_shares ?? 0)} lembar</Text>
              </View>
              <View style={styles.positionRight}>
                <Text style={styles.positionValue}>{formatIDR(item.market_value)}</Text>
                <Text style={styles.positionMeta}>{formatIDR(item.average_price)} avg</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada posisi untuk ditampilkan.</Text>
        )}
      </SectionCard>
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
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
  },
  form: {
    gap: 12,
  },
  toggle: {
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
  },
  metricBox: {
    borderRadius: 16,
    backgroundColor: palette.surfaceAlt,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  positionLeft: {
    flex: 1,
    gap: 4,
  },
  positionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  positionCode: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  positionValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  positionMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
});
