'use client';

import React from 'react';
import styles from './NumberPairs.module.css';

export default function NumberPairs({ num = 0 }) {
  const pairs = Math.floor(num / 2);
  const single = num % 2;

  return (
    <div className={styles.container}>
      <div className={styles.label}>Visual for {num}:</div>
      <div className={styles.pairsWrap}>
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={`pair-${i}`} className={styles.pair} aria-label="A pair of dots">
            <span className={styles.dot}>●</span>
            <span className={styles.dot}>●</span>
          </div>
        ))}
        {single === 1 && (
          <div className={styles.lonelyDot} aria-label="A lonely dot">
             <span className={styles.dot}>●</span>
             <span className={styles.partnerEmpty}>?</span>
          </div>
        )}
      </div>
      <div className={styles.footer}>
        {single === 0 ? "Every dot has a partner! (Even)" : "One dot is lonely! (Odd)"}
      </div>
    </div>
  );
}
