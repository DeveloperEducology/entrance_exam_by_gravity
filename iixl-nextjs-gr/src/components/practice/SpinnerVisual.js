'use client';

import React from 'react';
import styles from './SpinnerVisual.module.css';

function describeSectorPath(cx, cy, radius, startAngle, endAngle) {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

export default function SpinnerVisual({ part }) {
  const slices = Array.isArray(part?.slices) ? part.slices : [];
  const totalWeight = slices.reduce((acc, s) => acc + (Number(s.weight) || 0), 0) || 1;
  const size = part?.size || 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 10;
  
  // Use startRotation from part (degrees) converted to radians
  const startRotationDeg = Number(part?.start_rotation || part?.startRotation || 0);
  const startRotationRad = (startRotationDeg * Math.PI) / 180;

  let currentAngle = (-Math.PI / 2) + startRotationRad; // Start at top + offset

  return (
    <div className={styles.container}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className={styles.spinnerSvg}
      >
        {/* Render Slices */}
        {slices.map((slice, index) => {
          const weight = Number(slice.weight) || 0;
          const sliceAngle = (weight / totalWeight) * (Math.PI * 2);
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceAngle;
          currentAngle = endAngle;

          return (
            <path
              key={`slice-${index}`}
              d={describeSectorPath(cx, cy, radius, startAngle, endAngle)}
              fill={slice.color || '#ccc'}
              stroke="#333"
              strokeWidth="2"
            />
          );
        })}

        {/* Outer Circle */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={radius} 
          fill="none" 
          stroke="#333" 
          strokeWidth="3" 
        />

        {/* Needle */}
        <g className={styles.needleGroup} style={{ transform: `translate(${cx}px, ${cy}px)` }}>
          <path 
            d="M -5 0 L 0 -80 L 5 0 Z" 
            fill="#333" 
            transform="rotate(45)" // Slightly tilted like in the image
            className={styles.needle}
          />
          <circle cx="0" cy="0" r="6" fill="#000" />
        </g>
      </svg>
    </div>
  );
}
