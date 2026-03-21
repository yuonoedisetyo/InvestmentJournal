import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders label, value, and hint', () => {
    render(<StatCard label="Total" value="Rp10.000" hint="Naik 2%" accent="#0f766e" />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Rp10.000')).toBeInTheDocument();
    expect(screen.getByText('Naik 2%')).toBeInTheDocument();
  });
});
