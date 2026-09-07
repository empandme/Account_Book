const DIGITS: Record<string, number> = {
  JPY: 0, KRW: 0, VND: 0,
  KWD: 3, BHD: 3, JOD: 3, OMR: 3, TND: 3,
};

const SYMBOLS: Record<string, string> = {
  CNY: '¥', JPY: '¥', USD: '$', EUR: '€', GBP: '£',
  HKD: 'HK$', KRW: '₩', TWD: 'NT$',
};

export const KNOWN_CURRENCIES = ['CNY', 'USD'] as const;

export function currencyDigits(code: string): number {
  return DIGITS[code] ?? 2;
}

export function toMinorUnits(major: number, code: string): number {
  const scale = 10 ** currencyDigits(code);
  return Math.round(major * scale);
}

export function fromMinorUnits(minor: number, code: string): number {
  const scale = 10 ** currencyDigits(code);
  return minor / scale;
}

export function formatAmount(
  minor: number,
  code: string,
  opts: { withSymbol?: boolean } = {},
): string {
  const withSymbol = opts.withSymbol !== false;
  const digits = currencyDigits(code);
  const value = fromMinorUnits(minor, code);
  const body = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return withSymbol ? `${SYMBOLS[code] ?? code + ' '}${body}` : body;
}
