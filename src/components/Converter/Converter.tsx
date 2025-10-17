import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchRates, isCacheStale, readCachedRates, saveRatesToCache } from "../../services/rates";
import { formatNumber, parseAmountInput } from "../../utils/format";
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

    // network online/offline
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

    // load rates (with cache + stale check)
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
            setRatesResp({
                base: resp.base || "EUR",
                rates: resp.rates,
                timestamp: Date.now(),
            });
            setLoading(false);
        } catch (e) {
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
    }, []);

    const debouncedAmount = useDebounce(state.amount, 250);

    const availableCurrencies = useMemo(() => {
        return ratesResp ? Object.keys(ratesResp.rates).sort() : ["EUR", "USD"];
    }, [ratesResp]);

    const namesMap = useMemo(() => {
        return {} as Record<string, string>;
    }, []);

    const computeRate = useCallback(
        (from: string, to: string) => {
            if (!ratesResp) return null;
            const { rates, base } = ratesResp;
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
        return { ok: true, rate, value };
    }, [debouncedAmount, state.from, state.to, ratesResp, computeRate]);

    const onSwap = () => {
        setState((s) => ({ ...s, from: s.to, to: s.from }));
    };

    const manualRefresh = async () => {
        if (manualRefreshLock) return;
        setManualRefreshLock(true);
        await loadRates(true);
        setTimeout(() => setManualRefreshLock(false), 1000);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Currency Converter</h1>
                <div className={styles.network}>
                    {online ? "Online" : "Offline"}{" "}
                    {!online && ratesResp && (
                        <span>
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
                        {state.from}
                    </button>
                </div>

                <button className={styles.swap} aria-label="Swap currencies" onClick={onSwap}>
                    ↕
                </button>

                <div className={styles.input}>
                    <input readOnly value="" style={{ display: "none" }} />
                    <button className={styles.currencyBtn} onClick={() => setShowToModal(true)}>
                        {state.to}
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
                                {formatNumber(Number.parseFloat(debouncedAmount || "0") || 0)}
                            </strong>{" "}
                            {state.from}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <strong>{formatNumber(conversion.value || 0)}</strong> {state.to}
                        </div>
                        <div className={styles.small} style={{ marginTop: 8 }}>
                            Rate: 1 {state.from} = {formatNumber(conversion.rate || 0, 6)}{" "}
                            {state.to}
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
                currencies={availableCurrencies}
                selected={state.from}
                namesMap={namesMap}
                onSelect={(c) => {
                    setState((s) => ({ ...s, from: c }));
                    setShowFromModal(false);
                }}
            />
            <CurrencySelectorModal
                visible={showToModal}
                onClose={() => setShowToModal(false)}
                currencies={availableCurrencies}
                selected={state.to}
                namesMap={namesMap}
                onSelect={(c) => {
                    setState((s) => ({ ...s, to: c }));
                    setShowToModal(false);
                }}
            />
        </div>
    );
}
