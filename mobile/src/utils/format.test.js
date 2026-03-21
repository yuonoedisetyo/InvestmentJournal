import { formatCompactDate, formatIDR, formatPercent, formatThousandsInput, normalizeDigits } from './format';

describe('mobile format utils', () => {
  it('formats rupiah values', () => {
    expect(formatIDR(500000)).toContain('500');
  });

  it('formats percent values', () => {
    expect(formatPercent(12.3456)).toBe('12.35%');
  });

  it('formats compact dates', () => {
    expect(formatCompactDate('2026-03-21')).toMatch(/21/);
  });

  it('formats thousand separator input and normalizes digits', () => {
    expect(formatThousandsInput('1250000')).toBe('1.250.000');
    expect(normalizeDigits('1.250.000')).toBe('1250000');
  });
});
