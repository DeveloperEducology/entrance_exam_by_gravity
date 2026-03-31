'use client';

import React from 'react';
import styles from './BaseTenBlocks.module.css';

const getVariantColors = (variant) => {
    switch (variant) {
        case 'purple':
            return {
                main: '#9c27b0',    // Material Purple 500
                light: '#ba68c8',   // Material Purple 300
                dark: '#7b1fa2',    // Material Purple 700
                stroke: '#4a148c'   // Material Purple 900
            };
        case 'blue':
            return {
                main: '#2196f3',
                light: '#64b5f6',
                dark: '#1976d2',
                stroke: '#0d47a1'
            };
        case 'orange':
            return {
                main: '#ff9800',
                light: '#ffb74d',
                dark: '#f57c00',
                stroke: '#e65100'
            };
        case 'green':
        default:
            return {
                main: '#00bfa5',
                light: '#42ebd4',
                dark: '#008675',
                stroke: '#00695c'
            };
    }
};

const ThousandCube = ({ isGlowing, onClick, variant = 'green' }) => {
    const colors = getVariantColors(variant);
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="308" height="308" viewBox="20 20 308 308" 
            className={`${styles.svgBlock} ${isGlowing ? styles.glow : ''}`}
            onClick={onClick}
        >
            <rect x="20" y="108" width="220" height="220" fill={colors.main} stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="130" x2="240" y2="130" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="42" y1="108" x2="42" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="152" x2="240" y2="152" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="64" y1="108" x2="64" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="174" x2="240" y2="174" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="86" y1="108" x2="86" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="196" x2="240" y2="196" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="108" y1="108" x2="108" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="218" x2="240" y2="218" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="130" y1="108" x2="130" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="240" x2="240" y2="240" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="152" y1="108" x2="152" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="262" x2="240" y2="262" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="174" y1="108" x2="174" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="284" x2="240" y2="284" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="196" y1="108" x2="196" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="306" x2="240" y2="306" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="218" y1="108" x2="218" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <polygon points="20,108 108,20 328,20 240,108" fill={colors.light} stroke={colors.stroke} strokeWidth="1"/>
            <polygon points="240,108 328,20 328,240 240,328" fill={colors.dark} stroke={colors.stroke} strokeWidth="1"/>
            <line x1="28.8" y1="99.2" x2="248.8" y2="99.2" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="42" y1="108" x2="130" y2="20" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="240" y1="130" x2="328" y2="42" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="248.8" y1="99.2" x2="248.8" y2="319.2" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="37.6" y1="90.4" x2="257.6" y2="90.4" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="64" y1="108" x2="152" y2="20" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="240" y1="152" x2="328" y2="64" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="257.6" y1="90.4" x2="257.6" y2="310.4" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="72.8" y1="55.2" x2="292.8" y2="55.2" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="152" y1="108" x2="240" y2="20" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="240" y1="240" x2="328" y2="152" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="292.8" y1="55.2" x2="292.8" y2="275.2" stroke={colors.stroke} strokeWidth="1"/>
        </svg>
    );
};

const HundredFlat = ({ isGlowing, onClick, variant = 'green' }) => {
    const colors = getVariantColors(variant);
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="228" height="229" viewBox="20 99 228 229" 
            className={`${styles.svgBlock} ${isGlowing ? styles.glow : ''}`}
            onClick={onClick}
        >
            <rect x="20" y="108" width="220" height="220" fill={colors.main} stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="130" x2="240" y2="130" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="42" y1="108" x2="42" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="152" x2="240" y2="152" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="64" y1="108" x2="64" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="174" x2="240" y2="174" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="86" y1="108" x2="86" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="196" x2="240" y2="196" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="108" y1="108" x2="108" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="218" x2="240" y2="218" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="130" y1="108" x2="130" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="240" x2="240" y2="240" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="152" y1="108" x2="152" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="262" x2="240" y2="262" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="174" y1="108" x2="174" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="284" x2="240" y2="284" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="196" y1="108" x2="196" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="20" y1="306" x2="240" y2="306" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="218" y1="108" x2="218" y2="328" stroke={colors.stroke} strokeWidth="1"/>
            <polygon points="20,108 28.8,99.2 248.8,99.2 240,108" fill={colors.light} stroke={colors.stroke} strokeWidth="1"/>
            <polygon points="240,108 248.8,99.2 248.8,319.2 240,328" fill={colors.dark} stroke={colors.stroke} strokeWidth="1"/>
            <line x1="42" y1="108" x2="50.8" y2="99.2" stroke={colors.stroke} strokeWidth="1"/>
            <line x1="240" y1="130" x2="248.8" y2="121.2" stroke={colors.stroke} strokeWidth="1"/>
        </svg>
    );
};

const TenRod = ({ isGlowing, isHovered, onMouseEnter, onMouseLeave, onClick, variant = 'green' }) => {
    const colors = getVariantColors(variant);
    return (
        <div 
            className={styles.svgWrapper}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="31" height="229" viewBox="20 99 31 229" 
                className={`${styles.svgBlock} ${isGlowing || isHovered ? styles.glow : ''}`}
                onClick={onClick}
            >
                <rect x="20" y="108" width="22" height="220" fill={colors.main} stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="130" x2="42" y2="130" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="152" x2="42" y2="152" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="174" x2="42" y2="174" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="196" x2="42" y2="196" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="218" x2="42" y2="218" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="240" x2="42" y2="240" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="262" x2="42" y2="262" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="284" x2="42" y2="284" stroke={colors.stroke} strokeWidth="1"/>
                <line x1="20" y1="306" x2="42" y2="306" stroke={colors.stroke} strokeWidth="1"/>
                <polygon points="20,108 28.8,99.2 50.8,99.2 42,108" fill={colors.light} stroke={colors.stroke} strokeWidth="1"/>
                <polygon points="42,108 50.8,99.2 50.8,319.2 42,328" fill={colors.dark} stroke={colors.stroke} strokeWidth="1"/>
            </svg>
            {isHovered && <div className={styles.label}>+10</div>}
        </div>
    );
};

const UnitCube = ({ isGlowing, isHovered, onMouseEnter, onMouseLeave, onClick, variant = 'green' }) => {
    const colors = getVariantColors(variant);
    return (
        <div 
            className={styles.svgWrapper}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="31" height="31" viewBox="20 99 31 31" 
                className={`${styles.svgBlock} ${isGlowing || isHovered ? styles.glow : ''}`}
                onClick={onClick}
            >
                <rect x="20" y="108" width="22" height="22" fill={colors.main} stroke={colors.stroke} strokeWidth="1"/>
                <polygon points="20,108 28.8,99.2 50.8,99.2 42,108" fill={colors.light} stroke={colors.stroke} strokeWidth="1"/>
                <polygon points="42,108 50.8,99.2 50.8,121.2 42,130" fill={colors.dark} stroke={colors.stroke} strokeWidth="1"/>
            </svg>
            {isHovered && <div className={styles.label}>+1</div>}
        </div>
    );
};


export default function BaseTenBlocks({ thousands = 0, hundreds = 0, tens = 0, ones = 0, variant = 'green' }) {
    const t = Number(thousands);
    const h = Number(hundreds);
    const ts = Number(tens);
    const o = Number(ones);
    const [glowType, setGlowType] = React.useState(null);
    const [hoverType, setHoverType] = React.useState(null);

    const triggerGlow = (type) => {
        setGlowType(type);
        setTimeout(() => setGlowType(null), 1000);
    };

    return (
        <div className={styles.container}>
            {t > 0 && (
                <div className={`${styles.group} ${styles.thousands}`}>
                    <div className={styles.thousandsGrid}>
                        {Array.from({ length: t }).map((_, i) => (
                            <ThousandCube 
                                key={i} 
                                isGlowing={glowType === 'thousands'} 
                                onClick={() => triggerGlow('thousands')}
                                variant={variant}
                            />
                        ))}
                    </div>
                </div>
            )}
            {h > 0 && (
                <div className={`${styles.group} ${styles.hundreds}`}>
                    <div className={styles.hundredsGrid}>
                        {Array.from({ length: h }).map((_, i) => (
                            <HundredFlat 
                                key={i} 
                                isGlowing={glowType === 'hundreds'} 
                                onClick={() => triggerGlow('hundreds')}
                                variant={variant}
                            />
                        ))}
                    </div>
                </div>
            )}
            {ts > 0 && (
                <div 
                    className={`${styles.group} ${styles.tens}`}
                >
                    {Array.from({ length: ts }).map((_, i) => (
                        <TenRod 
                            key={i} 
                            isGlowing={glowType === 'tens'} 
                            isHovered={hoverType === 'tens'}
                            onMouseEnter={() => setHoverType('tens')}
                            onMouseLeave={() => setHoverType(null)}
                            onClick={() => triggerGlow('tens')}
                            variant={variant}
                        />
                    ))}
                </div>
            )}
            {o > 0 && (
                <div 
                    className={`${styles.group} ${styles.ones}`}
                >
                    <div className={styles.onesStack}>
                        {Array.from({ length: o }).map((_, i) => (
                            <UnitCube 
                                key={i} 
                                isGlowing={glowType === 'ones'} 
                                isHovered={hoverType === 'ones'}
                                onMouseEnter={() => setHoverType('ones')}
                                onMouseLeave={() => setHoverType(null)}
                                onClick={() => triggerGlow('ones')}
                                variant={variant}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

