'use client';

import React from 'react';
import styles from './NumberLineJumps.module.css';

export default function NumberLineJumps({ 
  start = 0, 
  target = 10, 
  interval = 2,
  width = 500
}) {
  const range = target - start;
  // Show a bit beyond the target to see the "miss"
  const totalRange = Math.max(range + interval, interval * 5);
  const end = start + totalRange;
  
  const steps = [];
  let current = start;
  while (current <= end) {
      steps.push(current);
      current += interval;
  }

  const getX = (val) => ((val - start) / totalRange) * (width - 40) + 20;

  return (
    <div className={styles.container} style={{ width }}>
      <svg viewBox={`0 0 ${width} 120`} className={styles.svg}>
        {/* Main Axis */}
        <line x1="20" y1="90" x2={width - 20} y2="90" className={styles.axis} />
        
        {/* Tick Marks & Labels */}
        {Array.from({ length: totalRange + 1 }).map((_, i) => {
            const val = start + i;
            if (val > end) return null;
            const x = getX(val);
            const isTarget = val === target;
            const isLanded = (val - start) % interval === 0;
            
            return (
                <g key={`tick-${val}`}>
                    <line x1={x} y1="85" x2={x} y2="95" className={isTarget ? styles.targetTick : styles.tick} />
                    {(val % 2 === 0 || isTarget) && (
                        <text x={x} y="110" className={`${styles.label} ${isTarget ? styles.targetLabel : ''}`} textAnchor="middle">
                            {val}
                        </text>
                    )}
                </g>
            );
        })}

        {/* Jumps (Arcs) */}
        {steps.map((val, i) => {
            if (i === 0) return null;
            const prevX = getX(steps[i-1]);
            const currX = getX(val);
            const midX = (prevX + currX) / 2;
            const height = 40;
            const isHit = val === target;
            const isMiss = steps[i-1] < target && val > target;

            return (
                <path
                    key={`jump-${i}`}
                    d={`M ${prevX} 85 Q ${midX} ${85 - height} ${currX} 85`}
                    className={`${styles.jumpPath} ${isHit ? styles.jumpHit : ''} ${isMiss ? styles.jumpMiss : ''}`}
                    fill="none"
                />
            );
        })}

        {/* Target Indicator */}
        <circle cx={getX(target)} cy="90" r="4" className={steps.includes(target) ? styles.hitCircle : styles.missCircle} />
      </svg>
      <div className={styles.legend}>
          {steps.includes(target) 
            ? "✅ Landed right on the target!" 
            : "❌ Skipped over the target!"}
      </div>
    </div>
  );
}
