export type RatesResponse = {
  base: string;
  date?: string;
  rates: Record<string, number>;
};

export type CurrencyMeta = {
  name: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
  code: string;
  namePlural: string;
  countryCodeISO2?: string;
  flagSrc?: string;
};
