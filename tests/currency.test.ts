import { describe, it, expect } from 'vitest';
import {
  currencyDigits,
  toMinorUnits,
  fromMinorUnits,
  formatAmount,
  KNOWN_CURRENCIES,
} from '../src/shared/currency';

describe('currencyDigits', () => {
  it('returns 2 for CNY/USD/EUR', () => {
    expect(currencyDigits('CNY')).toBe(2);
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('EUR')).toBe(2);
  });
  it('returns 0 for JPY/KRW', () => {
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('KRW')).toBe(0);
  });
  it('returns 3 for KWD', () => {
    expect(currencyDigits('KWD')).toBe(3);
  });
  it('defaults to 2 for unknown', () => {
    expect(currencyDigits('XXX')).toBe(2);
  });
});

describe('toMinorUnits / fromMinorUnits', () => {
  it('CNY: 12.5 -> 1250, back to 12.5', () => {
    expect(toMinorUnits(12.5, 'CNY')).toBe(1250);
    expect(fromMinorUnits(1250, 'CNY')).toBe(12.5);
  });
  it('JPY: 1200 -> 1200 (no scaling)', () => {
    expect(toMinorUnits(1200, 'JPY')).toBe(1200);
    expect(fromMinorUnits(1200, 'JPY')).toBe(1200);
  });
  it('rounds fractional cents', () => {
    expect(toMinorUnits(0.005, 'USD')).toBe(1); // banker's rounding not required; use Math.round
  });
});

describe('formatAmount', () => {
  it('CNY 1250 -> ¥12.50 by default', () => {
    expect(formatAmount(1250, 'CNY')).toBe('¥12.50');
  });
  it('JPY 1200 -> ¥1,200', () => {
    expect(formatAmount(1200, 'JPY')).toBe('¥1,200');
  });
  it('USD 800 -> $8.00', () => {
    expect(formatAmount(800, 'USD')).toBe('$8.00');
  });
  it('withSymbol=false drops symbol', () => {
    expect(formatAmount(1250, 'CNY', { withSymbol: false })).toBe('12.50');
  });
});

describe('KNOWN_CURRENCIES', () => {
  it('contains at least CNY / USD / JPY', () => {
    expect(KNOWN_CURRENCIES).toContain('CNY');
    expect(KNOWN_CURRENCIES).toContain('USD');
    expect(KNOWN_CURRENCIES).toContain('JPY');
  });
});
