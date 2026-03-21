import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';

export default function NoticeBanner({ message, tone = 'success' }) {
  if (!message) {
    return null;
  }

  const isError = tone === 'error';

  return (
    <View style={[styles.banner, isError ? styles.errorBanner : styles.successBanner]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  successBanner: {
    backgroundColor: palette.successSoft,
    borderColor: '#a7f3d0',
  },
  errorBanner: {
    backgroundColor: palette.dangerSoft,
    borderColor: '#fecaca',
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  successText: {
    color: palette.success,
  },
  errorText: {
    color: palette.danger,
  },
});
