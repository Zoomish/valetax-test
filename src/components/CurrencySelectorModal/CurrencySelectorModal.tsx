import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CurrencySelectorModal.module.scss";

type Props = {
    visible: boolean;
    onClose: () => void;
    currencies: string[];
    selected?: string;
    onSelect: (code: string) => void;
    namesMap?: Record<string, string>;
};

export default function CurrencySelectorModal({
    visible,
    onClose,
    currencies,
    selected,
    onSelect,
    namesMap = {},
}: Props) {
    const [q, setQ] = useState("");
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => inputRef.current?.focus(), 10);
        } else {
            setQ("");
            setCursor(0);
        }
    }, [visible]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!visible) return;
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
                setCursor((c) => Math.min(c + 1, filtered.length - 1));
                e.preventDefault();
            }
            if (e.key === "ArrowUp") {
                setCursor((c) => Math.max(c - 1, 0));
                e.preventDefault();
            }
            if (e.key === "Enter") {
                if (filtered[cursor]) {
                    onSelect(filtered[cursor]);
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [visible, cursor]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return currencies.filter((code) => {
            const name = (namesMap[code] || "").toLowerCase();
            return !qq || code.toLowerCase().includes(qq) || name.includes(qq);
        });
    }, [q, currencies, namesMap]);

    return !visible ? null : (
        <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <input
                        ref={inputRef}
                        placeholder="Search currency code or name..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className={styles.search}
                        aria-label="Search currencies"
                    />
                    <button onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>
                <ul className={styles.list}>
                    {filtered.map((code, i) => (
                        <li
                            key={code}
                            className={`${styles.item} ${
                                code === selected ? styles.selected : ""
                            } ${i === cursor ? styles.cursor : ""}`}
                            onClick={() => onSelect(code)}
                        >
                            <span className={styles.code}>{code}</span>
                            <span className={styles.name}>{namesMap[code] || ""}</span>
                        </li>
                    ))}
                    {filtered.length === 0 && <li className={styles.empty}>No currencies found</li>}
                </ul>
            </div>
        </div>
    );
}
