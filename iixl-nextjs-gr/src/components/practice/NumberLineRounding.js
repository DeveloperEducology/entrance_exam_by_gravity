'use client';

import React from 'react';
import styles from './NumberLineRounding.module.css';

export default function NumberLineRounding({ min, max, mid, current, distLow, distHigh, distMid }) {
    // Canvas dimensions
    const width = 1000;
    const height = 320;
    const padding = 80;
    const lineY = 200;

    // Helper to map values to SVG x-coordinates
    const getX = (val) => {
        const percentage = (val - min) / (max - min);
        return padding + percentage * (width - 2 * padding);
    };

    const minX = getX(min);
    const maxX = getX(max);
    const midX = getX(mid);
    const currX = getX(current);

    // Dynamic ticks (more granular for smaller ranges)
    const range = max - min;
    let tickInterval = 10;
    if (range <= 10) tickInterval = 1;
    else if (range <= 20) tickInterval = 2;
    else if (range <= 50) tickInterval = 5;
    else if (range <= 200) tickInterval = 10;
    else if (range <= 1000) tickInterval = 100;
    else tickInterval = 500;

    let ticks = [];
    for (let t = Math.ceil(min / tickInterval) * tickInterval; t <= max; t += tickInterval) {
        if (t >= min) ticks.push(t);
    }
    
    // Ensure min, max, and mid are in the ticks array for rendering
    if (!ticks.includes(min)) ticks.push(min);
    if (!ticks.includes(max)) ticks.push(max);
    if (!ticks.includes(mid)) ticks.push(mid);
    
    // Remove duplicates and sort
    ticks = [...new Set(ticks)].sort((a, b) => a - b);

    // Arc calculations for "Distances"
    const getArc = (startVal, endVal) => {
        const x1 = getX(startVal);
        const x2 = getX(endVal);
        const midX = (x1 + x2) / 2;
        const h = Math.abs(x2 - x1) * 0.35; // Arc height
        return `M ${x1} ${lineY} Q ${midX} ${lineY - h} ${x2} ${lineY}`;
    };

    return (
        <div className={styles.container}>
            <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
                {/* 1. Main Number Line */}
                <line x1={minX - 20} y1={lineY} x2={maxX + 20} y2={lineY} className={styles.mainLine} />
                
                {/* 2. Ticks and Labels */}
                {ticks.map(t => {
                    const tx = getX(t);
                    const isMajor = t === min || t === max || t === mid;
                    return (
                        <g key={t}>
                            <line 
                                x1={tx} y1={lineY - (isMajor ? 8 : 4)} 
                                x2={tx} y2={lineY + (isMajor ? 8 : 4)} 
                                className={isMajor ? styles.majorTick : styles.minorTick} 
                            />
                            {isMajor && (
                                <text x={tx} y={lineY + 28} className={styles.tickLabel}>
                                    {t.toLocaleString('en-IN')}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* 3. Distance Arcs */}
                <path d={getArc(min, current)} className={styles.arcPath} />
                <path d={getArc(current, max)} className={styles.arcPathDashed} />

                {/* 4. Distance Labels */}
                <g className={styles.distanceLabelGroup}>
                    <text x={(minX + currX) / 2} y={lineY - distLow * 0.15 - 30} className={styles.distanceText}>
                        +{distLow}
                    </text>
                    <text x={(currX + maxX) / 2} y={lineY - distHigh * 0.1 - 30} className={styles.distanceTextQuestion}>
                        ?
                    </text>
                </g>

                {/* 5. Icons */}
                {/*🥕 Carrots at benchmarks */}
                <text x={minX} y={lineY - 12} className={styles.emojiIcon} style={{ textAnchor: 'middle' }}>🥕</text>
                <text x={maxX} y={lineY - 12} className={styles.emojiIcon} style={{ textAnchor: 'middle' }}>🥕</text>
                
                {/*🐇 Rabbit at current position */}
                <g className={styles.rabbitGroup}>
                    <text x={currX} y={lineY - 22} className={styles.rabbitIcon} style={{ textAnchor: 'middle' }}>
                        🐇
                    </text>
                    <text x={currX} y={lineY + 54} className={styles.currentNumLabel}>
                        {current.toLocaleString('en-IN')}
                    </text>
                </g>

                {/* 6. Highlighting the selection */}
                <circle cx={currX} cy={lineY} r="4" fill="#ff4d4d" />
            </svg>
        </div>
    );
}
