'use client';

import React, { useMemo } from 'react';
import styles from './CountingVisual.module.css';
import SafeImage from './SafeImage';

const FireflySVG = ({ color = '#FFD700' }) => (
    <svg viewBox="0 0 100 100" className={styles.iconSvg}>
        <ellipse cx="50" cy="50" rx="20" ry="35" fill="#444" />
        <ellipse cx="35" cy="40" rx="15" ry="25" fill="#888" transform="rotate(-20 35 40)" opacity="0.6" />
        <ellipse cx="65" cy="40" rx="15" ry="25" fill="#888" transform="rotate(20 65 40)" opacity="0.6" />
        <circle cx="50" cy="75" r="15" fill={color} className={styles.glow} />
        <circle cx="43" cy="25" r="3" fill="#000" />
        <circle cx="57" cy="25" r="3" fill="#000" />
    </svg>
);

const LadybugSVG = () => (
    <svg viewBox="0 0 100 100" className={styles.iconSvg}>
        <circle cx="50" cy="55" r="40" fill="#FF4B4B" />
        <path d="M50 15 V95" stroke="#000" strokeWidth="2" />
        <circle cx="50" cy="25" r="18" fill="#000" />
        <circle cx="30" cy="45" r="5" fill="#000" />
        <circle cx="70" cy="45" r="5" fill="#000" />
        <circle cx="35" cy="70" r="5" fill="#000" />
        <circle cx="65" cy="70" r="5" fill="#000" />
    </svg>
);

const StarSVG = () => (
    <svg viewBox="0 0 100 100" className={styles.iconSvg}>
        <path d="M50 5 L64 38 L98 38 L71 58 L81 91 L50 71 L19 91 L29 58 L2 38 L36 38 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="2" />
    </svg>
);

const AppleSVG = () => (
    <svg viewBox="0 0 100 100" className={styles.iconSvg}>
        <path d="M50 90 C20 90 10 70 10 45 C10 20 30 15 50 25 C70 15 90 20 90 45 C90 70 80 90 50 90 Z" fill="#FF4444" />
        <path d="M50 25 V10" stroke="#5D4037" strokeWidth="4" />
        <path d="M50 15 C65 5 75 10 75 10 C75 10 70 20 55 20" fill="#4CAF50" />
    </svg>
);

const BiscuitSVG = () => (
  <svg viewBox="0 0 100 100" className={styles.iconSvg}>
    {/* Head */}
    <circle cx="50" cy="25" r="15" fill="#D2B48C" stroke="#8B4513" strokeWidth="1" />
    <circle cx="45" cy="22" r="2" fill="#000" />
    <circle cx="55" cy="22" r="2" fill="#000" />
    <path d="M43 28 Q50 33 57 28" fill="none" stroke="#fff" strokeWidth="1" />
    {/* Body */}
    <path d="M50 40 L50 70" stroke="#D2B48C" strokeWidth="25" strokeLinecap="round" />
    {/* Arms */}
    <path d="M30 50 L70 50" stroke="#D2B48C" strokeWidth="12" strokeLinecap="round" />
    {/* Legs */}
    <path d="M40 70 L35 90" stroke="#D2B48C" strokeWidth="12" strokeLinecap="round" />
    <path d="M60 70 L65 90" stroke="#D2B48C" strokeWidth="12" strokeLinecap="round" />
    {/* Details */}
    <circle cx="50" cy="48" r="3" fill="#FF4444" />
    <circle cx="50" cy="58" r="3" fill="#4CAF50" />
    <circle cx="50" cy="68" r="3" fill="#2196F3" />
  </svg>
);

const IconMap = {
    firefly: FireflySVG,
    ladybug: LadybugSVG,
    star: StarSVG,
    apple: AppleSVG,
    biscuit: BiscuitSVG,
};

export default function CountingVisual({
    num = 1,
    objectType = 'ladybug',
    imageUrl = null,
    arrangement = 'grid',
    showNumbers = false,
    highlightLast = false,
    width = '100%'
}) {
    const Icon = IconMap[objectType] || IconMap.ladybug;

    const renderObject = () => {
        if (imageUrl) {
            return (
                <SafeImage 
                    src={imageUrl} 
                    alt="Counting object" 
                    width={80} 
                    height={80} 
                    className={styles.objectImage}
                />
            );
        }
        return <Icon />;
    };

    const items = useMemo(() => {
        const result = [];
        const cols = 5;
        
        for (let i = 0; i < num; i++) {
            let style = {};
            if (arrangement === 'scatter') {
                // Determine a pseudo-random but stable position
                // Using i as a seed for basic stability
                const seed = (i + 1) * 123.456;
                const x = 5 + (Math.sin(seed) * 0.5 + 0.5) * 85;
                const y = 5 + (Math.cos(seed * 0.7) * 0.5 + 0.5) * 85;
                style = {
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${(Math.sin(seed * 2) * 20).toFixed(1)}deg)`
                };
            }
            result.push({ id: i, style });
        }
        return result;
    }, [num, arrangement]);

    return (
        <div 
            className={`${styles.container} ${arrangement === 'scatter' ? styles.scatter : styles.grid}`}
            style={{ width }}
        >
            {items.map((item, idx) => {
                const isLast = idx === num - 1;
                return (
                    <div key={item.id} className={styles.itemWrapper} style={item.style}>
                        <div className={`${styles.iconContainer} ${showNumbers ? styles.faded : ''}`}>
                            {renderObject()}
                        </div>
                        {showNumbers && (
                            <div className={styles.overlay}>
                                {highlightLast && isLast ? (
                                    <div className={styles.starHighlight}>
                                        <StarSVG />
                                        <span className={styles.numberInStar}>{idx + 1}</span>
                                    </div>
                                ) : (
                                    <div className={styles.numberCircle}>
                                        {idx + 1}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
