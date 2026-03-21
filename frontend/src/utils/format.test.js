import { formatCompactDate, formatIDR, formatPercent } from './format';

describe('format utils', () => {
  it('formats IDR currency', () => {
    expect(formatIDR(15000)).toContain('15.000');
  });

  it('formats percentage with two decimals', () => {
    expect(formatPercent(12.3456)).toBe('12.35%');
  });

  it('formats compact date', () => {
    expect(formatCompactDate('2026-03-21')).toMatch(/21/);
  });
});
