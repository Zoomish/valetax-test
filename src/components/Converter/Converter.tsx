import { useCallback, useEffect, useMemo, useState } from "react";
import currenciesData from "../../data/currencies.json";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchRates, isCacheStale, readCachedRates, saveRatesToCache } from "../../services/rates";
import type { CurrencyMeta } from "../../types";
import { formatCurrency, parseAmountInput } from "../../utils/format";
import CurrencySelectorModal from "../CurrencySelectorModal/CurrencySelectorModal";
import styles from "./Converter.module.scss";
const LOCAL_KEY = "cc_state_v1";

type AppState = {
    from: string;
    to: string;
    amount: string;
};

const DEFAULTS: AppState = { from: "EUR", to: "USD", amount: "1" };

export default function Converter() {
    const currencies: CurrencyMeta[] = currenciesData as CurrencyMeta[];

    const [state, setState] = useState<AppState>(() => {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            return raw ? (JSON.parse(raw) as AppState) : DEFAULTS;
        } catch {
            return DEFAULTS;
        }
    });

    const [ratesResp, setRatesResp] = useState<null | {
        base: string;
        rates: Record<string, number>;
        timestamp?: number;
    }>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFromModal, setShowFromModal] = useState(false);
    const [showToModal, setShowToModal] = useState(false);
    const [manualRefreshLock, setManualRefreshLock] = useState(false);

    const [online, setOnline] = useState<boolean>(navigator.onLine);
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    }, [state]);

    const loadRates = useCallback(async (force = false) => {
        setError(null);
        setLoading(true);
        try {
            const cached = readCachedRates();
            if (!force && cached && !isCacheStale(cached)) {
                setRatesResp({
                    base: cached.resp.base,
                    rates: cached.resp.rates,
                    timestamp: cached.timestamp,
                });
                setLoading(false);
                return;
            }

            const resp = await fetchRates();
            saveRatesToCache(resp);
            setRatesResp({ base: resp.base || "EUR", rates: resp.rates, timestamp: Date.now() });
            setLoading(false);
        } catch (err: any) {
            const cached = readCachedRates();
            if (cached) {
                setRatesResp({
                    base: cached.resp.base,
                    rates: cached.resp.rates,
                    timestamp: cached.timestamp,
                });
                setError("Using cached rates due to network error.");
            } else {
                setError("Failed to load rates.");
                setRatesResp(null);
            }
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRates(false);
    }, [loadRates]);

    const debouncedAmount = useDebounce(state.amount, 250);

    const currenciesMap = useMemo(() => {
        const m = new Map<string, CurrencyMeta>();
        for (const c of currencies) m.set(c.code, c);
        return m;
    }, [currencies]);

    const availableCurrencies = useMemo(() => {
        if (!ratesResp) {
            // fallback to currencies.json codes
            return currencies.map((c) => c.code);
        }
        // intersection: rates keys ∪ currencies.json
        const set = new Set<string>(Object.keys(ratesResp.rates));
        for (const c of currencies) set.add(c.code);
        return Array.from(set).sort();
    }, [ratesResp, currencies]);

    const computeRate = useCallback(
        (from: string, to: string) => {
            if (!ratesResp) return null;
            const { rates } = ratesResp;
            const rBaseToA = rates[from];
            const rBaseToB = rates[to];
            if (rBaseToA === undefined || rBaseToB === undefined) return null;
            return rBaseToB / rBaseToA;
        },
        [ratesResp]
    );

    const conversion = useMemo(() => {
        const amt = parseAmountInput(debouncedAmount);
        if (amt === null) return { ok: false, msg: "Enter a valid amount" };
        if (!ratesResp) return { ok: false, msg: "Rates not loaded" };
        const rate = computeRate(state.from, state.to);
        if (rate === null) return { ok: false, msg: "Unknown currency code" };
        const value = amt * rate;

        const toMeta = currenciesMap.get(state.to);
        const digits = toMeta?.decimalDigits ?? 4;
        const formatted = formatCurrency(value, toMeta?.symbolNative ?? toMeta?.symbol, digits);
        return { ok: true, rate, value, formatted, digits };
    }, [debouncedAmount, state.from, state.to, ratesResp, computeRate, currenciesMap]);

    const onSwap = () => {
        setState((s) => ({ ...s, from: s.to, to: s.from }));
    };

    const manualRefresh = async () => {
        if (manualRefreshLock) return;
        setManualRefreshLock(true);
        await loadRates(true);
        setTimeout(() => setManualRefreshLock(false), 1000);
    };

    const selectedFromMeta = currenciesMap.get(state.from);
    const selectedToMeta = currenciesMap.get(state.to);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Currency Converter</h1>
                <div className={styles.network}>
                    {online ? "Online" : "Offline"}
                    {!online && ratesResp && (
                        <span>
                            {" "}
                            · Using cached rates from{" "}
                            {ratesResp.timestamp
                                ? new Date(ratesResp.timestamp).toLocaleString()
                                : ""}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.controls}>
                <div className={styles.input}>
                    <input
                        aria-label="Amount"
                        value={state.amount}
                        onChange={(e) => setState((s) => ({ ...s, amount: e.target.value }))}
                        placeholder="0.00"
                        inputMode="decimal"
                    />
                    <button className={styles.currencyBtn} onClick={() => setShowFromModal(true)}>
                        {selectedFromMeta?.flagSrc && (
                            <img
                                src={selectedFromMeta.flagSrc}
                                alt={state.from}
                                className={styles.flagSmall}
                            />
                        )}
                        <span style={{ marginLeft: 8 }}>{state.from}</span>
                    </button>
                </div>

                <button className={styles.swap} aria-label="Swap currencies" onClick={onSwap}>
                    ↕
                </button>

                <div className={styles.input}>
                    <button className={styles.currencyBtn} onClick={() => setShowToModal(true)}>
                        {selectedToMeta?.flagSrc && (
                            <img
                                src={selectedToMeta.flagSrc}
                                alt={state.to}
                                className={styles.flagSmall}
                            />
                        )}
                        <span style={{ marginLeft: 8 }}>{state.to}</span>
                    </button>
                </div>

                <div className={styles.actions}>
                    <button
                        onClick={manualRefresh}
                        disabled={manualRefreshLock || loading}
                        className={styles.currencyBtn}
                    >
                        Refresh rates
                    </button>
                    {loading && <div className={styles.spinner} aria-hidden />}
                </div>
            </div>

            <div className={styles.result}>
                {error && <div className={styles.small}>{error}</div>}
                {!conversion.ok ? (
                    <div className={styles.small}>{conversion.msg}</div>
                ) : (
                    <>
                        <div>
                            <strong>
                                {formatCurrency(
                                    Number(parseFloat(debouncedAmount || "0") || 0),
                                    selectedFromMeta?.symbolNative ?? selectedFromMeta?.symbol,
                                    selectedFromMeta?.decimalDigits ?? 2
                                )}
                            </strong>{" "}
                            {state.from}
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <strong>{conversion.formatted}</strong> {state.to}
                        </div>

                        <div className={styles.small} style={{ marginTop: 8 }}>
                            Rate: 1 {state.from} = {conversion.rate.toFixed(6)} {state.to}
                        </div>

                        {ratesResp?.timestamp && (
                            <div className={styles.small}>
                                Rates base: {ratesResp.base} · fetched:{" "}
                                {new Date(ratesResp.timestamp).toLocaleString()}
                            </div>
                        )}
                    </>
                )}
            </div>

            <CurrencySelectorModal
                visible={showFromModal}
                onClose={() => setShowFromModal(false)}
                items={currencies.filter((c) => availableCurrencies.includes(c.code))}
                selected={state.from}
                onSelect={(c) => {
                    setState((s) => ({ ...s, from: c }));
                    setShowFromModal(false);
                }}
            />

            <CurrencySelectorModal
                visible={showToModal}
                onClose={() => setShowToModal(false)}
                items={currencies.filter((c) => availableCurrencies.includes(c.code))}
                selected={state.to}
                onSelect={(c) => {
                    setState((s) => ({ ...s, to: c }));
                    setShowToModal(false);
                }}
            />
        </div>
    );
}
