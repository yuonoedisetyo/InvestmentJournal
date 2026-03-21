import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NoticeBanner from './NoticeBanner';

describe('NoticeBanner', () => {
  it('renders nothing when no message is present', () => {
    const view = render(<NoticeBanner message="" />);
    expect(view.toJSON()).toBeNull();
  });

  it('renders success and error messages', () => {
    const { rerender } = render(<NoticeBanner message="Sukses disimpan." tone="success" />);
    expect(screen.getByText('Sukses disimpan.')).toBeTruthy();

    rerender(<NoticeBanner message="Gagal disimpan." tone="error" />);
    expect(screen.getByText('Gagal disimpan.')).toBeTruthy();
  });
});
