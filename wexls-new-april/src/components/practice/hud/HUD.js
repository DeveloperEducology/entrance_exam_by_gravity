"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Star } from 'lucide-react';
import styles from './HUD.module.css';

export function SmartScore({ score }) {
  return (
    <div className={styles.smartScore}>
      <div className={styles.scoreHeader}>
         <Target size={16} />
         <span>SmartScore</span>
      </div>
      <div className={styles.scoreValue}>
        {score}
      </div>
      <div className={styles.scoreLabel}>out of 100</div>
       {/* Animated Progress Ring */}
      <svg className={styles.scoreRing} viewBox="0 0 100 100">
        <circle className={styles.ringBackground} cx="50" cy="50" r="45" />
        <motion.circle 
          className={styles.ringFill} 
          cx="50" cy="50" r="45" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 1.5 }}
        />
      </svg>
    </div>
  );
}

export function ProgressBar({ tokens, stage }) {
  const displayProgress = (tokens % 3) / 3;
  return (
    <div className={styles.progressContainer}>
        <div className={styles.stageLabel}>STAGE {stage}</div>
        <div className={styles.tokenTrack}>
          <motion.div 
            className={styles.tokenFill}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress * 100}%` }}
          />
          <div className={styles.tokenIcons}>
            {[1, 2, 3].map((t) => (
              <div key={t} className={`${styles.tokenSpot} ${ (tokens % 3) >= t ? styles.tokenFilled : ''}`}>
                 <Star size={12} fill={ (tokens % 3) >= t ? "white" : "none"} />
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
