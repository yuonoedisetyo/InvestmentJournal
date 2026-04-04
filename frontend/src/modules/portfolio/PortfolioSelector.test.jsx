import { fireEvent, render, screen } from '@testing-library/react';
import PortfolioSelector from './PortfolioSelector';

describe('PortfolioSelector', () => {
  it('calls onChange when a portfolio chip is clicked', () => {
    const onChange = vi.fn();
    const onOpenCreateForm = vi.fn();

    render(
      <PortfolioSelector
        portfolios={[
          { id: 1, name: 'Growth', is_active: true },
          { id: 2, name: 'Income', is_active: false },
        ]}
        selectedPortfolioId={1}
        onChange={onChange}
        onOpenCreateForm={onOpenCreateForm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Income/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('opens separate create portfolio page', () => {
    const onOpenCreateForm = vi.fn();

    render(
      <PortfolioSelector
        portfolios={[]}
        selectedPortfolioId={null}
        onChange={vi.fn()}
        onOpenCreateForm={onOpenCreateForm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Portfolio' }));

    expect(onOpenCreateForm).toHaveBeenCalledTimes(1);
  });
});
