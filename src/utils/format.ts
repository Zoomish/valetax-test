export const parseAmountInput = (s: string): number | null => {
    if (!s) return null;
    const cleaned = s.trim().replace(/\s+/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
};

export const formatNumber = (n: number, digits = 4) =>
    n.toLocaleString(undefined, { maximumFractionDigits: digits });
