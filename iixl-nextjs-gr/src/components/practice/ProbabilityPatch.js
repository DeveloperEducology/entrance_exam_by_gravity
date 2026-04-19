'use client';

import React from 'react';
import styles from './ProbabilityPatch.module.css';

const MarbleSVG = ({ color = 'black' }) => {
  const isPurple = color.toLowerCase() === 'purple';
  
  // Define unique IDs for gradients to avoid conflicts across multiple marbles
  const idRef = React.useRef(Math.random().toString(36).slice(2, 9));
  const gradientId = `marble-grad-${color}-${idRef.current}`;

  return (
    <svg viewBox="0 0 100 100" className={styles.marbleSvg}>
      <defs>
        {isPurple ? (
          <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#E1BEE7" />
            <stop offset="50%" stopColor="#9C27B0" />
            <stop offset="100%" stopColor="#4A148C" />
          </radialGradient>
        ) : (
          <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#424242" />
            <stop offset="50%" stopColor="#212121" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        )}
        
        {/* Simple stardust effect using a pattern or filter could be complex, 
            so we'll just add some small white circles as "stardust" */}
      </defs>
      
      {/* Base Marble */}
      <circle cx="50" cy="50" r="45" fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      
      {/* Shine */}
      <ellipse cx="35" cy="35" rx="15" ry="10" fill="white" opacity="0.3" transform="rotate(-30, 35, 35)" />
      
      {/* Stardust Speckles */}
      <circle cx="45" cy="40" r="1.5" fill="white" opacity="0.6" />
      <circle cx="60" cy="35" r="1" fill="white" opacity="0.4" />
      <circle cx="55" cy="60" r="1.2" fill="white" opacity="0.5" />
      <circle cx="35" cy="65" r="1" fill="white" opacity="0.4" />
      <circle cx="70" cy="55" r="1.5" fill="white" opacity="0.6" />
      <circle cx="50" cy="75" r="1" fill="white" opacity="0.3" />
      <circle cx="25" cy="50" r="1" fill="white" opacity="0.4" />
      <circle cx="65" cy="25" r="0.8" fill="white" opacity="0.5" />
      
      {/* Bottom Highlight */}
      <path d="M20 70 Q50 90 80 70" fill="none" stroke="white" strokeWidth="2" opacity="0.2" />
    </svg>
  );
};

export default function ProbabilityPatch({ items = [], width = 300, height = 200 }) {
  if (!Array.isArray(items)) return null;

  const patchKey = React.useMemo(() => Math.random().toString(36).slice(2, 9), [items]);

  return (
    <div 
      key={patchKey}
      className={styles.container} 
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {items.map((item) => (
        <div 
          key={item.id} 
          className={styles.marbleWrapper}
          style={{ 
            top: `${item.top}px`, 
            left: `${item.left}px`,
            zIndex: item.top // Overlap based on Y position
          }}
        >
          <MarbleSVG color={item.color} />
        </div>
      ))}
    </div>
  );
}
