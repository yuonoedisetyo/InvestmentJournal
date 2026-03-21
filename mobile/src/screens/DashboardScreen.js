import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import NoticeBanner from '../components/NoticeBanner';
import PortfolioSelector from '../components/PortfolioSelector';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { palette } from '../theme';
import { formatCompactDate, formatIDR, formatPercent } from '../utils/format';

export default function DashboardScreen({
  portfolios,
  selectedPortfolioId,
  selectedPortfolio,
  positions,
  summary,
  performanceData,
  onSelectPortfolio,
  onRefresh,
  refreshing,
  notice,
}) {
  const latestPerformance = performanceData[performanceData.length - 1] || null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
    >
      <NoticeBanner message={notice} />

      <SectionCard title="Portfolio Aktif" subtitle="Pilih portfolio untuk memuat ringkasan, posisi, dan jurnal terbaru.">
        {portfolios.length ? (
          <PortfolioSelector portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} onSelect={onSelectPortfolio} />
        ) : (
          <Text style={styles.emptyText}>Belum ada portfolio. Buat portfolio baru di tab Portfolio.</Text>
        )}
        <Text style={styles.helperText}>Sekarang aktif: {selectedPortfolio?.name || '-'}</Text>
      </SectionCard>

      <SectionCard title="Ringkasan Nilai" subtitle="Ringkasan ini dihitung dari posisi terbuka dan histori transaksi aktif.">
        <View style={styles.statGrid}>
          <StatCard label="Total Invested" value={formatIDR(summary.invested)} />
          <StatCard label="Market Value" value={formatIDR(summary.marketValue)} />
          <StatCard label="Unrealized PnL" value={formatIDR(summary.unrealized)} tone={summary.unrealized >= 0 ? 'success' : 'danger'} />
          <StatCard label="PnL %" value={formatPercent(summary.pnlPercent)} tone={summary.pnlPercent >= 0 ? 'success' : 'danger'} />
        </View>
      </SectionCard>

      <SectionCard
        title="Performa Terakhir"
        subtitle="Untuk chart penuh Anda masih bisa memakai versi web. Di mobile ini kami tampilkan snapshot paling penting."
        rightSlot={
          <Pressable onPress={onRefresh}>
            <Text style={styles.linkText}>Refresh</Text>
          </Pressable>
        }
      >
        {latestPerformance ? (
          <View style={styles.performanceBox}>
            <Text style={styles.performanceLabel}>Tanggal terakhir</Text>
            <Text style={styles.performanceValue}>{formatCompactDate(latestPerformance.date)}</Text>
            <Text style={styles.performanceMeta}>Portfolio index: {Number(latestPerformance.portfolio ?? 0).toFixed(2)}</Text>
            <Text style={styles.performanceMeta}>IHSG index: {Number(latestPerformance.ihsg ?? 0).toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>Belum ada data performa untuk portfolio ini.</Text>
        )}
      </SectionCard>

      <SectionCard title="Posisi Teratas" subtitle="Daftar ini mengambil posisi saham aktif dari backend.">
        {positions.length ? (
          positions.slice(0, 5).map((item) => (
            <View key={`${item.stock_code}-${item.total_shares}`} style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{item.stock_code}</Text>
                <Text style={styles.rowMeta}>{Number(item.total_shares ?? 0)} lembar</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{formatIDR(item.market_value)}</Text>
                <Text style={[styles.rowMeta, Number(item.unrealized_pnl ?? 0) >= 0 ? styles.positive : styles.negative]}>
                  {formatIDR(item.unrealized_pnl)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada posisi saham aktif.</Text>
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
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkText: {
    color: palette.accentDark,
    fontWeight: '800',
    fontSize: 13,
  },
  performanceBox: {
    borderRadius: 16,
    backgroundColor: '#eefbf7',
    padding: 14,
    gap: 4,
  },
  performanceLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  performanceValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
  },
  performanceMeta: {
    color: palette.text,
    fontSize: 14,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  rowLeft: {
    flex: 1,
    gap: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
  rowValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  positive: {
    color: palette.success,
  },
  negative: {
    color: palette.danger,
  },
});
