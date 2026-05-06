import React from 'react';
import styles from './NumberLineSync.module.css';

export default function NumberLineSync({ 
  sequence, 
  range = [0, 50], 
  highlightIndices = [], 
  onTargetClick,
  selectedItem,
  baseSequence,
  part
}) {
  const [min, max] = range;
  const spread = max - min;
  
  const getPos = (val) => ((val - min) / spread) * 100;

  const ticks = [];
  const step = spread > 20 ? 5 : 1;
  for (let i = min; i <= max; i += step) {
    ticks.push(i);
  }

  return (
    <div className={styles.container}>
      <div className={styles.axisContainer}>
        <div className={styles.axisLine} />
        
        {ticks.map(tick => (
          <div key={tick} className={styles.tickWrapper} style={{ left: `${getPos(tick)}%` }}>
            <div className={styles.tick} />
            <div className={styles.tickLabel}>{tick}</div>
          </div>
        ))}

        {baseSequence.map((item, idx) => {
          const isBlank = typeof item === 'string' && isNaN(parseFloat(item));
          const targetValue = isBlank ? (part?.targetValues?.[idx] || null) : null;
          const currentValue = isBlank ? (sequence[idx] || null) : item;
          const displayValue = currentValue !== null ? currentValue : targetValue;
          
          if (displayValue === null) return null;
          
          const isHighlighted = highlightIndices.includes(idx);
          const isTargetable = isBlank && selectedItem;

          return (
            <div 
              key={`dot-${idx}`}
              onClick={() => isBlank && onTargetClick?.(item)}
              className={`
                ${styles.dot} 
                ${isHighlighted ? styles.highlightDot : ''} 
                ${isTargetable && currentValue === null ? styles.targetDot : ''}
                ${isBlank ? styles.clickableDot : ''}
              `}
              style={{ 
                left: `${getPos(displayValue)}%`,
                transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: (currentValue === null && isTargetable) ? 0.6 : (currentValue === null ? 0.2 : 1),
                cursor: isBlank ? 'pointer' : 'default'
              }}
            >
              {currentValue !== null && <div className={styles.dotLabel}>{currentValue}</div>}
              {currentValue === null && isTargetable && <div className={styles.pulse} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
