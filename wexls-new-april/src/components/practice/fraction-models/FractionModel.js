"use client";

import React from 'react';
import styles from './FractionModel.module.css';
import { motion } from 'framer-motion';

/**
 * FRACTION MODEL COMPONENT
 * Renders an interactive or static fraction (circle or bar).
 */
export default function FractionModel({ 
  totalParts, 
  shadedParts, 
  interactive = false, 
  onChange 
}) {
  const parts = Array.from({ length: totalParts }, (_, i) => i);
  const [currentShaded, setCurrentShaded] = React.useState(shadedParts || 0);

  const handleClick = (index) => {
    if (!interactive) return;
    const newShaded = index + 1;
    setCurrentShaded(newShaded);
    if (onChange) onChange(newShaded);
  };

  return (
    <div className={styles.container}>
      <div className={styles.circle}>
        {parts.map((p) => {
          const angle = 360 / totalParts;
          const rotation = p * angle;
          const isShaded = p < currentShaded;

          return (
            <motion.div
              key={p}
              className={`${styles.slice} ${isShaded ? styles.shaded : ''} ${interactive ? styles.interactive : ''}`}
              style={{
                '--rotation': `${rotation}deg`,
                '--angle': `${angle}deg`,
                clipPath: totalParts > 1 ? `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((angle / 2) * Math.PI / 180)}% 0%, 50% 50%)` : 'none',
                transform: `rotate(${rotation}deg)`,
              }}
              onClick={() => handleClick(p)}
              whileHover={interactive ? { scale: 1.05 } : {}}
              whileTap={interactive ? { scale: 0.95 } : {}}
            />
          );
        })}
      </div>
      <div className={styles.fractionText}>
        <span className={styles.numerator}>{currentShaded}</span>
        <div className={styles.divider} />
        <span className={styles.denominator}>{totalParts}</span>
      </div>
    </div>
  );
}
