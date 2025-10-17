import type { RatesResponse } from "../types";

const BASE_URL = (import.meta.env.VATE_API_BASE || "https://api.vatcomply.com").replace(/\/$/, "");

const CACHE_KEY = "rates_cache_v1";
const CACHE_TTL = Number(import.meta.env.VITE_CACHE_TTL_MS || 300000);

type Cached = {
    resp: RatesResponse;
    timestamp: number;
};

export async function fetchRates(): Promise<RatesResponse> {
    const url = `${BASE_URL}/rates`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Rates fetch failed: ${resp.status}`);
    const data = await resp.json();
    return data as RatesResponse;
}

export function saveRatesToCache(resp: RatesResponse) {
    const payload: Cached = { resp, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function readCachedRates(): Cached | null {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Cached;
        return parsed;
    } catch {
        return null;
    }
}

export function isCacheStale(cached: Cached | null) {
    if (!cached) return true;
    return Date.now() - cached.timestamp > CACHE_TTL;
}
