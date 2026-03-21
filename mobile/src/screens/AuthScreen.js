import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Field from '../components/Field';
import NoticeBanner from '../components/NoticeBanner';
import { authApi } from '../services/api';
import { palette } from '../theme';

function getReadableNetworkMessage(error) {
  if (error?.message === 'Network Error' && !error?.response) {
    return 'Tidak dapat terhubung ke server. Periksa API URL, backend Laravel, dan koneksi jaringan Anda.';
  }

  return error?.response?.data?.message || 'Login gagal. Periksa kembali akun Anda.';
}

function logAuthError(context, error) {
  console.error(`[AuthScreen] ${context} failed`, {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    message: error?.message,
    status: error?.response?.status,
    responseData: error?.response?.data,
    hasRequest: Boolean(error?.request),
    code: error?.code,
  });
}

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState('success');
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ identity: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', identity: '', password: '' });

  function updateLogin(name, value) {
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateRegister(name, value) {
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin() {
    const identity = loginForm.identity.trim();
    const password = loginForm.password;

    if (!identity || !password) {
      setNoticeTone('error');
      setNotice('Email / nohp dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      const data = await authApi.login({ identity, password });
      await onAuthSuccess({
        token: data.token,
        user: data.user,
      });
    } catch (error) {
      logAuthError('login', error);
      setNoticeTone('error');
      setNotice(getReadableNetworkMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    const payload = {
      name: registerForm.name.trim(),
      identity: registerForm.identity.trim(),
      password: registerForm.password,
    };

    if (!payload.name || !payload.identity || !payload.password) {
      setNoticeTone('error');
      setNotice('Semua field register wajib diisi.');
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      await authApi.register(payload);
      setRegisterForm({ name: '', identity: '', password: '' });
      setLoginForm({ identity: payload.identity, password: '' });
      setMode('login');
      setNoticeTone('success');
      setNotice('Register berhasil. Silakan login dengan akun baru Anda.');
    } catch (error) {
      logAuthError('register', error);
      setNoticeTone('error');
      setNotice(error?.response?.data?.message || 'Register gagal. Coba lagi sebentar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Investment Journal</Text>
            <Text style={styles.title}>Login dulu untuk akses dashboard investasi di ponsel.</Text>
            <Text style={styles.subtitle}>Versi mobile ini langsung terhubung ke backend Laravel yang sama seperti frontend web.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' ? styles.tabActive : null]}>
                <Text style={[styles.tabText, mode === 'login' ? styles.tabTextActive : null]}>Login</Text>
              </Pressable>
              <Pressable onPress={() => setMode('register')} style={[styles.tab, mode === 'register' ? styles.tabActive : null]}>
                <Text style={[styles.tabText, mode === 'register' ? styles.tabTextActive : null]}>Register</Text>
              </Pressable>
            </View>

            <NoticeBanner message={notice} tone={noticeTone} />

            {mode === 'login' ? (
              <View style={styles.form}>
                <Field
                  label="Email / nohp"
                  value={loginForm.identity}
                  onChangeText={(value) => updateLogin('identity', value)}
                  placeholder="nama@email.com atau 0812xxxx"
                  autoCapitalize="none"
                />
                <Field
                  label="Password"
                  value={loginForm.password}
                  onChangeText={(value) => updateLogin('password', value)}
                  placeholder="Masukkan password"
                  secureTextEntry
                />
                <Pressable style={styles.submitButton} onPress={handleLogin} disabled={submitting}>
                  <Text style={styles.submitText}>{submitting ? 'Memproses...' : 'Masuk ke aplikasi'}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Field
                  label="Nama"
                  value={registerForm.name}
                  onChangeText={(value) => updateRegister('name', value)}
                  placeholder="Nama lengkap"
                />
                <Field
                  label="Email / nohp"
                  value={registerForm.identity}
                  onChangeText={(value) => updateRegister('identity', value)}
                  placeholder="nama@email.com atau 0812xxxx"
                  autoCapitalize="none"
                />
                <Field
                  label="Password"
                  value={registerForm.password}
                  onChangeText={(value) => updateRegister('password', value)}
                  placeholder="Buat password"
                  secureTextEntry
                />
                <Pressable style={styles.submitButton} onPress={handleRegister} disabled={submitting}>
                  <Text style={styles.submitText}>{submitting ? 'Memproses...' : 'Buat akun'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceDark,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    gap: 18,
    backgroundColor: palette.background,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: palette.white,
  },
  tabText: {
    color: '#475569',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  form: {
    gap: 12,
  },
  submitButton: {
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
