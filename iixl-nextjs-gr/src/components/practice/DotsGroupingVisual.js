import React from 'react';
import styles from './DotsGroupingVisual.module.css';

const DOT_POSITIONS = {
  1: [{ x: 50, y: 50 }],
  2: [{ x: 35, y: 50 }, { x: 65, y: 50 }],
  3: [{ x: 50, y: 35 }, { x: 35, y: 65 }, { x: 65, y: 65 }],
  4: [{ x: 35, y: 35 }, { x: 65, y: 35 }, { x: 35, y: 65 }, { x: 65, y: 65 }],
  5: [{ x: 50, y: 50 }, { x: 35, y: 35 }, { x: 65, y: 35 }, { x: 35, y: 65 }, { x: 65, y: 65 }],
  6: [{ x: 35, y: 30 }, { x: 65, y: 30 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 70 }, { x: 65, y: 70 }],
  7: [{ x: 50, y: 50 }, { x: 35, y: 30 }, { x: 65, y: 30 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 70 }, { x: 65, y: 70 }], // Note: simplified
  8: [{ x: 30, y: 30 }, { x: 50, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 }, { x: 30, y: 50 }, { x: 70, y: 50 }],
  9: [{ x: 30, y: 30 }, { x: 50, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 }],
  10: [{ x: 30, y: 25 }, { x: 50, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 41 }, { x: 50, y: 41 }, { x: 70, y: 41 }, { x: 30, y: 57 }, { x: 50, y: 57 }, { x: 70, y: 57 }, { x: 50, y: 75 }]
};

export default function DotsGroupingVisual({ part }) {
  const numGroups = parseInt(part.numGroups || 1);
  const dotsPerGroup = parseInt(part.dotsPerGroup || 1);
  const color = part.color || '#00BFFF';
  const showGroupLabels = part.showGroupLabels || false;
  const showDotLabels = part.showDotLabels || false; // Only for first group usually

  const dotPositions = DOT_POSITIONS[dotsPerGroup] || DOT_POSITIONS[1];

  return (
    <div className={styles.container}>
      {Array.from({ length: numGroups }).map((_, gIndex) => (
        <div key={gIndex} className={styles.groupWrapper}>
          <svg viewBox="0 0 100 100" className={styles.circleSvg}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="#D1D5DB" strokeWidth="2" />
            {dotPositions.map((pos, dIndex) => (
              <g key={dIndex}>
                <circle cx={pos.x} cy={pos.y} r="10" fill={color} />
                {showDotLabels && gIndex === 0 && (
                  <text 
                    x={pos.x} 
                    y={pos.y} 
                    dy=".35em" 
                    textAnchor="middle" 
                    className={styles.dotLabel}
                  >
                    {dIndex + 1}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {showGroupLabels && (
            <div className={styles.groupLabel}>{gIndex + 1}</div>
          )}
        </div>
      ))}
    </div>
  );
}
