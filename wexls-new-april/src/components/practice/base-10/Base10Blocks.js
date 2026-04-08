"use client";

import React from 'react';
import styles from './Base10.module.css';
import { motion } from 'framer-motion';

/**
 * BASE-10 BLOCKS (Visual Manipulatives)
 * Represents Units (1), Rods (10), Flats (100), and Cubes (1000).
 */
export default function Base10Blocks({ type, value, interactive = false, onChange }) {
  const blocks = Array.from({ length: value }, (_, i) => i);
  
  return (
    <div className={styles.container}>
       <div className={styles.label}>{type.toUpperCase()}S: {value}</div>
       <div className={`${styles.blockGrid} ${styles[type]}`}>
          {blocks.map((b) => (
            <motion.div 
              key={b}
              className={styles.block}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: b * 0.05 }}
              whileHover={interactive ? { scale: 1.1 } : {}}
            >
               {type === 'flat' && <div className={styles.gridOverlay} />}
               {type === 'rod' && <div className={styles.rodOverlay} />}
            </motion.div>
          ))}
       </div>
    </div>
  );
}

export function Base10Representer({ thousands = 0, hundreds = 0, tens = 0, ones = 0 }) {
  return (
    <div className={styles.representer}>
       {thousands > 0 && <Base10Blocks type="cube" value={thousands} />}
       {hundreds > 0 && <Base10Blocks type="flat" value={hundreds} />}
       {tens > 0 && <Base10Blocks type="rod" value={tens} />}
       {ones > 0 && <Base10Blocks type="unit" value={ones} />}
    </div>
  );
}
