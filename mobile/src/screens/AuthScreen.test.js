import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AuthScreen from './AuthScreen';
import { authApi } from '../services/api';
import { sampleUser } from '../test-utils/mockData';

jest.mock('../services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('shows validation error when login is empty', async () => {
    render(<AuthScreen onAuthSuccess={jest.fn()} />);

    fireEvent.press(screen.getByText('Masuk ke aplikasi'));

    expect(await screen.findByText('Email / nohp dan password wajib diisi.')).toBeTruthy();
  });

  it('submits login and forwards the session', async () => {
    const onAuthSuccess = jest.fn();
    authApi.login.mockResolvedValue({
      token: 'token-123',
      user: sampleUser,
    });

    render(<AuthScreen onAuthSuccess={onAuthSuccess} />);

    fireEvent.changeText(screen.getByPlaceholderText('nama@email.com atau 0812xxxx'), 'yedisetyo@gmail.com');
    fireEvent.changeText(screen.getByPlaceholderText('Masukkan password'), '123456');
    fireEvent.press(screen.getByText('Masuk ke aplikasi'));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        identity: 'yedisetyo@gmail.com',
        password: '123456',
      });
      expect(onAuthSuccess).toHaveBeenCalledWith({
        token: 'token-123',
        user: sampleUser,
      });
    });
  });

  it('submits register then returns to login mode', async () => {
    authApi.register.mockResolvedValue({ message: 'ok' });

    render(<AuthScreen onAuthSuccess={jest.fn()} />);

    fireEvent.press(screen.getByText('Register'));
    fireEvent.changeText(screen.getByPlaceholderText('Nama lengkap'), 'Yedi');
    fireEvent.changeText(screen.getByPlaceholderText('nama@email.com atau 0812xxxx'), '08123456789');
    fireEvent.changeText(screen.getByPlaceholderText('Buat password'), '123456');
    fireEvent.press(screen.getByText('Buat akun'));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: 'Yedi',
        identity: '08123456789',
        password: '123456',
      });
    });

    expect(await screen.findByText('Register berhasil. Silakan login dengan akun baru Anda.')).toBeTruthy();
  });

  it('shows clearer message and logs details on network error during login', async () => {
    authApi.login.mockRejectedValue({
      message: 'Network Error',
      request: {},
      code: 'ERR_NETWORK',
    });

    render(<AuthScreen onAuthSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('nama@email.com atau 0812xxxx'), 'yedisetyo@gmail.com');
    fireEvent.changeText(screen.getByPlaceholderText('Masukkan password'), '123456');
    fireEvent.press(screen.getByText('Masuk ke aplikasi'));

    expect(
      await screen.findByText('Tidak dapat terhubung ke server. Periksa API URL, backend Laravel, dan koneksi jaringan Anda.')
    ).toBeTruthy();

    expect(console.error).toHaveBeenCalledWith('[AuthScreen] login failed', {
      apiBaseUrl: 'http://localhost:8000',
      message: 'Network Error',
      status: undefined,
      responseData: undefined,
      hasRequest: true,
      code: 'ERR_NETWORK',
    });
  });
});
