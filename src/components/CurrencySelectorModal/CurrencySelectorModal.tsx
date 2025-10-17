import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CurrencySelectorModal.module.scss';
import type { CurrencyMeta } from '../../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  items: CurrencyMeta[];
  selected?: string;
  onSelect: (code: string) => void;
};

export default function CurrencySelectorModal({ visible, onClose, items, selected, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQ('');
      setCursor(0);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const code = it.code.toLowerCase();
      const name = it.name.toLowerCase();
      const symbol = (it.symbol || '').toLowerCase();
      return code.includes(qq) || name.includes(qq) || symbol.includes(qq);
    });
  }, [q, items]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        setCursor((c) => Math.min(c + 1, filtered.length - 1));
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') {
        setCursor((c) => Math.max(c - 1, 0));
        e.preventDefault();
      }
      if (e.key === 'Enter') {
        if (filtered[cursor]) onSelect(filtered[cursor].code);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, cursor, filtered, onClose, onSelect]);

  if (!visible) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <input
            ref={inputRef}
            placeholder="Search currency code, name or symbol..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            className={styles.search}
            aria-label="Search currencies"
          />
          <button onClick={onClose} aria-label="Close" className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <ul className={styles.list}>
          {filtered.map((it, i) => (
            <li
              key={it.code}
              className={`${styles.item} ${it.code === selected ? styles.selected : ''} ${i === cursor ? styles.cursor : ''}`}
              onClick={() => onSelect(it.code)}
              role="option"
              aria-selected={it.code === selected}
            >
              <img src={it.flagSrc} alt={`${it.code} flag`} className={styles.flag} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className={styles.main}>
                <div className={styles.row}>
                  <span className={styles.code}>{it.code}</span>
                  <span className={styles.symbol}>{it.symbol}</span>
                </div>
                <div className={styles.name}>{it.name}</div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className={styles.empty}>No currencies found</li>}
        </ul>
      </div>
    </div>
  );
}
