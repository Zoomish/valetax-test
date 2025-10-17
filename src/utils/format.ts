export const parseAmountInput = (s: string): number | null => {
  if (!s) return null;
  const cleaned = s.trim().replace(/\s+/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export const formatNumber = (n: number, digits = 4) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const formatCurrency = (n: number, symbol: string | undefined, digits = 2) => {
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return symbol ? `${symbol} ${formatted}` : formatted;
};
