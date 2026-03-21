import { fireEvent, render, screen } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('renders title and subtitle', () => {
    render(<Header />);

    expect(screen.getByText('Investment Journal')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Tracker Saham')).toBeInTheDocument();
  });

  it('shows greeting and logout when auth props are provided', () => {
    const onLogout = vi.fn();

    render(<Header userName="Yedi" onLogout={onLogout} />);

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByText('Halo, Yedi')).toBeInTheDocument();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
