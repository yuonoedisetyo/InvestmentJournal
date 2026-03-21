import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvestmentStore } from './useInvestmentStore';
import { portfolioApi } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    portfolioApi: {
      listPortfolios: vi.fn(),
      activatePortfolio: vi.fn(),
      createPortfolio: vi.fn(),
    },
  };
});

describe('useInvestmentStore', () => {
  it('loads portfolios and exposes selected summary state', async () => {
    portfolioApi.listPortfolios.mockResolvedValue([
      { id: 1, name: 'Growth', is_active: false },
      { id: 2, name: 'Income', is_active: true },
    ]);

    const { result } = renderHook(() => useInvestmentStore());

    await waitFor(() => {
      expect(result.current.selectedPortfolioId).toBe(2);
    });

    expect(result.current.portfolios).toHaveLength(2);
  });

  it('can activate and create portfolios', async () => {
    portfolioApi.listPortfolios.mockResolvedValue([{ id: 1, name: 'Growth', is_active: true }]);
    portfolioApi.activatePortfolio.mockResolvedValue({});
    portfolioApi.createPortfolio.mockResolvedValue({ id: 2, name: 'Income', is_active: true });

    const { result } = renderHook(() => useInvestmentStore());

    await waitFor(() => {
      expect(result.current.portfolios).toHaveLength(1);
    });

    await act(async () => {
      await result.current.setActivePortfolio(1);
    });

    await act(async () => {
      await result.current.createPortfolio({ name: 'Income' });
    });

    expect(portfolioApi.activatePortfolio).toHaveBeenCalledWith(1);
    expect(result.current.portfolios).toHaveLength(2);
    expect(result.current.selectedPortfolioId).toBe(2);
  });
});
