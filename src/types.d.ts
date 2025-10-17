export type RatesResponse = {
    base: string;
    date?: string;
    rates: Record<string, number>;
};
