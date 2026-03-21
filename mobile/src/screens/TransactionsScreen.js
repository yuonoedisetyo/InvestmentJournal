import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import NoticeBanner from '../components/NoticeBanner';
import PortfolioSelector from '../components/PortfolioSelector';
import SectionCard from '../components/SectionCard';
import { stockApi } from '../services/api';
import { palette } from '../theme';
import { formatCompactDate, formatIDR, formatThousandsInput, normalizeDigits } from '../utils/format';

const transactionModes = [
  { value: 'TOPUP', label: 'Topup' },
  { value: 'WITHDRAW', label: 'Withdraw' },
  { value: 'BUY', label: 'Beli Saham' },
  { value: 'SELL', label: 'Jual Saham' },
  { value: 'DIVIDEND', label: 'Dividen' },
];

function createInitialForm(portfolioId) {
  return {
    portfolio_id: portfolioId,
    type: 'TOPUP',
    stock_code: '',
    lot: '',
    price: '',
    fee: '0',
    amount: '',
    notes: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  };
}

export default function TransactionsScreen({
  portfolios,
  selectedPortfolioId,
  onSelectPortfolio,
  journal,
  onSubmitTransaction,
  onRefresh,
  refreshing,
  notice,
}) {
  const [form, setForm] = useState(() => createInitialForm(selectedPortfolioId));
  const [submitNotice, setSubmitNotice] = useState({ tone: 'success', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stockOptions, setStockOptions] = useState([]);

  const isStockTransaction = useMemo(() => ['BUY', 'SELL'].includes(form.type), [form.type]);
  const needsStockCode = useMemo(() => ['BUY', 'SELL', 'DIVIDEND'].includes(form.type), [form.type]);
  const isCashTransaction = useMemo(() => ['TOPUP', 'WITHDRAW', 'DIVIDEND'].includes(form.type), [form.type]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      portfolio_id: selectedPortfolioId,
    }));
  }, [selectedPortfolioId]);

  useEffect(() => {
    if (!needsStockCode) {
      setStockOptions([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const query = String(form.stock_code || '').trim();
        const data = await stockApi.listMasterStocks({ q: query, limit: 8 });
        if (!cancelled) {
          setStockOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setStockOptions([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.stock_code, needsStockCode]);

  function updateField(name, value) {
    if (name === 'stock_code') {
      setForm((current) => ({ ...current, stock_code: value.toUpperCase() }));
      return;
    }

    if (name === 'amount') {
      setForm((current) => ({ ...current, amount: normalizeDigits(value) }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit() {
    if (!selectedPortfolioId) {
      setSubmitNotice({ tone: 'error', message: 'Pilih portfolio terlebih dahulu.' });
      return;
    }

    setSubmitting(true);
    setSubmitNotice({ tone: 'success', message: '' });

    try {
      const result = await onSubmitTransaction({
        ...form,
        portfolio_id: selectedPortfolioId,
        stock_code: String(form.stock_code || '').trim().toUpperCase(),
        lot: Number(form.lot),
        price: Number(form.price),
        fee: Number(form.fee),
        amount: Number(form.amount),
      });

      setSubmitNotice({ tone: 'success', message: result?.message || 'Transaksi berhasil disimpan.' });
      setForm(createInitialForm(selectedPortfolioId));
    } catch (error) {
      setSubmitNotice({ tone: 'error', message: error?.message || 'Transaksi gagal disimpan.' });
      setForm(createInitialForm(selectedPortfolioId));
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

      <SectionCard title="Portfolio Aktif" subtitle="Pilih portfolio target sebelum mencatat transaksi.">
        {portfolios.length ? (
          <PortfolioSelector portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} onSelect={onSelectPortfolio} />
        ) : (
          <Text style={styles.emptyText}>Belum ada portfolio.</Text>
        )}
      </SectionCard>

      <SectionCard title="Input Transaksi" subtitle="Nominal ditampilkan dengan separator titik, tetapi dikirim ke API sebagai angka bersih.">
        <NoticeBanner message={submitNotice.message} tone={submitNotice.tone} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
          {transactionModes.map((mode) => {
            const active = mode.value === form.type;

            return (
              <Pressable
                key={mode.value}
                onPress={() => setForm((current) => ({ ...current, type: mode.value }))}
                style={[styles.modeChip, active ? styles.modeChipActive : null]}
              >
                <Text style={[styles.modeText, active ? styles.modeTextActive : null]}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput
              style={styles.input}
              value={form.transaction_date}
              onChangeText={(value) => updateField('transaction_date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {needsStockCode ? (
            <View style={styles.field}>
              <Text style={styles.label}>Kode Saham</Text>
              <TextInput
                style={styles.input}
                value={form.stock_code}
                onChangeText={(value) => updateField('stock_code', value)}
                placeholder="BBCA"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
              {stockOptions.length ? (
                <Text style={styles.hint}>Saran: {stockOptions.map((item) => item.stock_code).join(', ')}</Text>
              ) : null}
            </View>
          ) : null}

          {isStockTransaction ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Lot</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.lot)}
                  onChangeText={(value) => updateField('lot', value.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="2"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Harga</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.price)}
                  onChangeText={(value) => updateField('price', value.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="9000"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Fee</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.fee)}
                  onChangeText={(value) => updateField('fee', value.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </>
          ) : null}

          {isCashTransaction ? (
            <View style={styles.field}>
              <Text style={styles.label}>Nominal</Text>
              <TextInput
                style={styles.input}
                value={formatThousandsInput(form.amount)}
                onChangeText={(value) => updateField('amount', value)}
                keyboardType="number-pad"
                placeholder="500.000"
                placeholderTextColor="#94a3b8"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Opsional"
              placeholderTextColor="#94a3b8"
              multiline
            />
          </View>

          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitText}>{submitting ? 'Menyimpan...' : 'Simpan Transaksi'}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Jurnal Terbaru" subtitle="Histori transaksi terbaru untuk portfolio aktif.">
        {journal.length ? (
          journal.slice(0, 10).map((item) => (
            <View key={`${item.entry_type || 'ENTRY'}-${item.id}`} style={styles.journalRow}>
              <View style={styles.journalLeft}>
                <Text style={styles.journalTitle}>
                  {item.type} {item.stock_code ? `• ${item.stock_code}` : ''}
                </Text>
                <Text style={styles.journalMeta}>{formatCompactDate(item.transaction_date)}</Text>
              </View>
              <Text style={styles.journalValue}>{formatIDR(item.amount || item.net_amount || item.price || 0)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada jurnal transaksi.</Text>
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
  modeRow: {
    gap: 10,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipActive: {
    borderColor: palette.accent,
    backgroundColor: '#ccfbf1',
  },
  modeText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modeTextActive: {
    color: palette.accentDark,
  },
  form: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: palette.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    color: palette.textMuted,
    fontSize: 12,
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
  journalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  journalLeft: {
    flex: 1,
    gap: 4,
  },
  journalTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
  },
  journalMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
  journalValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});
