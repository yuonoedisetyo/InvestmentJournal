import { calculateDcf } from './dcf';

describe('calculateDcf', () => {
  it('returns valuation result for valid input', () => {
    const result = calculateDcf({
      currentFcf: 1000,
      growthRate: 10,
      discountRate: 15,
      terminalGrowthRate: 4,
      sharesOutstanding: 100,
      cash: 200,
      debt: 50,
      marketPrice: 20,
    });

    expect(result.projections).toHaveLength(5);
    expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
    expect(['Undervalued', 'Fair', 'Overvalued']).toContain(result.status);
  });

  it('throws clear error when discount rate is invalid', () => {
    expect(() =>
      calculateDcf({
        currentFcf: 1000,
        growthRate: 10,
        discountRate: 4,
        terminalGrowthRate: 4,
        sharesOutstanding: 100,
        cash: 0,
        debt: 0,
        marketPrice: 20,
      })
    ).toThrow('Discount rate harus lebih besar dari terminal growth rate.');
  });
});
