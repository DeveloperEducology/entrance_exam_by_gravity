"use client";

import React, { useState } from 'react';
import styles from './ShadeGrid.module.css';
import { motion } from 'framer-motion';

/**
 * SHADE GRID (Fractions & Decimals)
 * Renders an interactive 10x10 or 10x1 grid.
 */
export default function ShadeGrid({ rows = 10, cols = 10, initialShaded = 0, onChange }) {
  const total = rows * cols;
  const [shadedCount, setShadedCount] = useState(initialShaded);

  const handleClick = (index) => {
    const newCount = index + 1;
    setShadedCount(newCount);
    if (onChange) onChange(newCount);
  };

  return (
    <div className={styles.container}>
       <div className={styles.gridContainer} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: total }, (_, i) => (
            <motion.div 
              key={i}
              className={`${styles.cell} ${i < shadedCount ? styles.shaded : ''}`}
              onClick={() => handleClick(i)}
              whileHover={{ scale: 1.05, zIndex: 1 }}
              whileTap={{ scale: 0.95 }}
            />
          ))}
       </div>
       <div className={styles.label}>
          <span>Shaded: <b>{shadedCount}</b></span>
          <span>Target: <b>{ (shadedCount / total * 100).toFixed(0) }%</b></span>
       </div>
    </div>
  );
}
