import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PortfolioSelector from './PortfolioSelector';

describe('PortfolioSelector', () => {
  it('calls onChange when a portfolio chip is clicked', () => {
    const onChange = vi.fn();

    render(
      <PortfolioSelector
        portfolios={[
          { id: 1, name: 'Growth', is_active: true },
          { id: 2, name: 'Income', is_active: false },
        ]}
        selectedPortfolioId={1}
        onChange={onChange}
        onCreate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Income/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('submits create form payload', async () => {
    const onCreate = vi.fn().mockResolvedValue({});

    render(
      <PortfolioSelector
        portfolios={[]}
        selectedPortfolioId={null}
        onChange={vi.fn()}
        onCreate={onCreate}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Contoh: Growth Portfolio'), {
      target: { value: 'Dividend Portfolio' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '250000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat Portfolio' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Dividend Portfolio',
        currency: 'IDR',
        initial_capital: 250000,
        is_active: true,
      });
    });
  });
});
