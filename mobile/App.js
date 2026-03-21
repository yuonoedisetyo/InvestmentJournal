import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {
  authApi,
  clearStoredSession,
  portfolioApi,
  readStoredSession,
  storeSession,
  transactionApi,
} from './src/services/api';
import { palette } from './src/theme';

const initialDashboardState = {
  portfolios: [],
  selectedPortfolioId: null,
  positions: [],
  journal: [],
  cashBalance: 0,
  capitalSummary: null,
  performanceData: [],
};

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'transactions', label: 'Transaksi' },
  { key: 'settings', label: 'Akun' },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardState, setDashboardState] = useState(initialDashboardState);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [screenNotice, setScreenNotice] = useState('');

  const selectedPortfolio = useMemo(
    () => dashboardState.portfolios.find((item) => item.id === dashboardState.selectedPortfolioId) || null,
    [dashboardState.portfolios, dashboardState.selectedPortfolioId]
  );

  const summary = useMemo(() => {
    const invested = dashboardState.positions.reduce((acc, item) => acc + Number(item.invested_amount ?? 0), 0);
    const marketValue = dashboardState.positions.reduce((acc, item) => acc + Number(item.market_value ?? 0), 0);
    const unrealized = dashboardState.positions.reduce((acc, item) => acc + Number(item.unrealized_pnl ?? 0), 0);
    const realized = dashboardState.positions.reduce((acc, item) => acc + Number(item.realized_pnl ?? 0), 0);
    const pnlPercent = invested ? ((marketValue - invested) / invested) * 100 : 0;

    return {
      invested,
      marketValue,
      unrealized,
      realized,
      pnlPercent,
      totalPnl: unrealized + realized,
    };
  }, [dashboardState.positions]);

  const clearNoticeSoon = useCallback(() => {
    setTimeout(() => setScreenNotice(''), 2400);
  }, []);

  const hydratePortfolioData = useCallback(async (portfolioId) => {
    if (!portfolioId) {
      setDashboardState((current) => ({
        ...current,
        selectedPortfolioId: null,
        positions: [],
        journal: [],
        cashBalance: 0,
        capitalSummary: null,
        performanceData: [],
      }));
      return;
    }

    const [positions, journal, cashBalance, capitalSummary, performanceData] = await Promise.all([
      portfolioApi.listPositions(portfolioId),
      transactionApi.listJournal(portfolioId),
      portfolioApi.cashBalance(portfolioId),
      portfolioApi.capitalSummary(portfolioId),
      portfolioApi.performance(portfolioId),
    ]);

    setDashboardState((current) => ({
      ...current,
      selectedPortfolioId: portfolioId,
      positions: Array.isArray(positions) ? positions : [],
      journal: Array.isArray(journal) ? journal : [],
      cashBalance: Number(cashBalance?.cash_balance ?? 0),
      capitalSummary: capitalSummary || null,
      performanceData: Array.isArray(performanceData) ? performanceData : [],
    }));
  }, []);

  const refreshDashboard = useCallback(
    async (preferredPortfolioId) => {
      setIsRefreshing(true);

      try {
        const portfolios = await portfolioApi.listPortfolios();
        const safePortfolios = Array.isArray(portfolios) ? portfolios : [];
        const activePortfolio =
          safePortfolios.find((item) => item.id === preferredPortfolioId) ||
          safePortfolios.find((item) => item.is_active) ||
          safePortfolios[0] ||
          null;

        setDashboardState((current) => ({
          ...current,
          portfolios: safePortfolios,
        }));

        await hydratePortfolioData(activePortfolio?.id ?? null);
      } finally {
        setIsRefreshing(false);
      }
    },
    [hydratePortfolioData]
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const storedSession = await readStoredSession();
        if (!storedSession?.token) {
          if (mounted) {
            setSession(null);
          }
          return;
        }

        const me = await authApi.me();
        const nextSession = {
          token: storedSession.token,
          user: me.user,
        };

        await storeSession(nextSession);
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        await refreshDashboard();
      } catch {
        await clearStoredSession();
        if (mounted) {
          setSession(null);
          setDashboardState(initialDashboardState);
        }
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshDashboard]);

  const handleAuthSuccess = useCallback(
    async (nextSession) => {
      await storeSession(nextSession);
      setSession(nextSession);
      setScreenNotice('');
      await refreshDashboard();
    },
    [refreshDashboard]
  );

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local logout should still proceed.
    } finally {
      await clearStoredSession();
      setSession(null);
      setDashboardState(initialDashboardState);
      setActiveTab('dashboard');
      setScreenNotice('');
    }
  }, []);

  const handleSelectPortfolio = useCallback(
    async (portfolioId) => {
      try {
        await portfolioApi.activatePortfolio(portfolioId);
        await refreshDashboard(portfolioId);
      } catch (error) {
        setScreenNotice(error?.response?.data?.message || 'Gagal mengganti portfolio aktif.');
        clearNoticeSoon();
      }
    },
    [clearNoticeSoon, refreshDashboard]
  );

  const handleCreatePortfolio = useCallback(
    async (payload) => {
      try {
        const created = await portfolioApi.createPortfolio(payload);
        await refreshDashboard(created?.id);
        const message = `Portfolio ${created?.name || payload.name} berhasil dibuat.`;
        setScreenNotice(message);
        clearNoticeSoon();
        return { success: true, message };
      } catch (error) {
        const message = error?.response?.data?.message || 'Gagal membuat portfolio.';
        setScreenNotice(message);
        clearNoticeSoon();
        throw new Error(message);
      }
    },
    [clearNoticeSoon, refreshDashboard]
  );

  const handleSubmitTransaction = useCallback(
    async (entry) => {
      try {
        if (entry.type === 'BUY') {
          await transactionApi.buy(entry);
        } else if (entry.type === 'SELL') {
          await transactionApi.sell(entry);
        } else if (entry.type === 'TOPUP') {
          await transactionApi.topup(entry);
        } else if (entry.type === 'WITHDRAW') {
          await transactionApi.withdraw(entry);
        } else if (entry.type === 'DIVIDEND') {
          await transactionApi.addDividend({
            ...entry,
            pay_date: entry.transaction_date,
          });
        }

        await refreshDashboard(entry.portfolio_id);
        const message = `Transaksi ${entry.type} berhasil dicatat.`;
        setScreenNotice(message);
        clearNoticeSoon();
        return { success: true, message };
      } catch (error) {
        const message = error?.response?.data?.message || 'Gagal menyimpan transaksi.';
        setScreenNotice(message);
        clearNoticeSoon();
        throw new Error(message);
      }
    },
    [clearNoticeSoon, refreshDashboard]
  );

  const renderActiveScreen = () => {
    const commonProps = {
      portfolios: dashboardState.portfolios,
      selectedPortfolioId: dashboardState.selectedPortfolioId,
      selectedPortfolio,
      onSelectPortfolio: handleSelectPortfolio,
      onRefresh: () => refreshDashboard(dashboardState.selectedPortfolioId),
      refreshing: isRefreshing,
      notice: screenNotice,
    };

    if (activeTab === 'portfolio') {
      return (
        <PortfolioScreen
          {...commonProps}
          positions={dashboardState.positions}
          cashBalance={dashboardState.cashBalance}
          capitalSummary={dashboardState.capitalSummary}
          onCreatePortfolio={handleCreatePortfolio}
        />
      );
    }

    if (activeTab === 'transactions') {
      return (
        <TransactionsScreen
          {...commonProps}
          journal={dashboardState.journal}
          onSubmitTransaction={handleSubmitTransaction}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <SettingsScreen
          user={session?.user}
          apiBaseUrl={process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000'}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <DashboardScreen
        {...commonProps}
        positions={dashboardState.positions}
        summary={summary}
        performanceData={dashboardState.performanceData}
      />
    );
  };

  if (booting) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <StatusBar barStyle="light-content" />
        <ExpoStatusBar style="light" />
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={styles.bootText}>Menyiapkan sesi mobile...</Text>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ExpoStatusBar style="light" />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ExpoStatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Investment Journal Mobile</Text>
        <Text style={styles.title}>Pantau investasi dari ponsel Anda</Text>
        <Text style={styles.subtitle}>Halo, {session.user.name}. Semua data memakai API backend yang sama dengan versi web.</Text>
      </View>

      <View style={styles.content}>{renderActiveScreen()}</View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
            <Text style={[styles.tabLabel, activeTab === tab.key ? styles.tabLabelActive : null]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  bootContainer: {
    flex: 1,
    backgroundColor: palette.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootText: {
    color: palette.white,
    fontSize: 16,
  },
  header: {
    backgroundColor: palette.surfaceDark,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 6,
  },
  eyebrow: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: palette.white,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textOnDarkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabLabelActive: {
    color: palette.accentDark,
  },
});
