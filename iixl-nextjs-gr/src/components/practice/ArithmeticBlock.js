'use client';

import React, { useRef, useEffect } from 'react';
import styles from './ArithmeticBlock.module.css';

const DigitRow = ({ value, highlights = [], useExtraSpacing = false }) => {
    const digits = String(value).split('');
    return (
        <div className={`${styles.vertMultRow} ${useExtraSpacing ? styles.vertMultSpacingWide : styles.vertMultSpacingNormal}`}>
            {digits.map((d, i) => (
                <span
                    key={i}
                    className={highlights.includes(i) ? styles.vertMultDigitHighlight : ''}
                >
                    {d}
                </span>
            ))}
        </div>
    );
};

const CarryRow = ({ carries = [], maxColumns = 3 }) => {
    // Carries are provided as an array where index 0 is ones place, etc.
    // We reverse it for display: hundreds tens ones
    const displayArray = [...carries].reverse();
    // Padding logic to align with digits below
    while (displayArray.length < maxColumns) {
        displayArray.unshift('');
    }
    return (
        <div className={styles.vertMultCarryRow}>
            {displayArray.map((c, i) => (
                <div key={i} className={styles.vertMultCarryCell}>
                    {c}
                </div>
            ))}
        </div>
    );
};

export default function ArithmeticBlock({ 
    v1, 
    v2, 
    operator = '×', 
    result = '', 
    inputId = null, 
    userValue = '', 
    onInputChange = null, 
    isAnswered = false, 
    showQuestionMark = false,
    highlights = { top: [], bottom: [], result: [] },
    carries = [], // New: Array of carry digits
    extraSpacing = false,
    className = ''
}) {
    const inputRefs = useRef([]);
    const expectedLength = String(result || '').length || 3;
    const userDigits = String(userValue || '').split('');
    const topStr = String(v1 || '');
    const bottomStr = String(v2 || '');
    const maxColumns = Math.max(topStr.length, bottomStr.length, expectedLength);

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, expectedLength);
    }, [expectedLength]);

    const handleDigitChange = (val, index) => {
        if (!/^\d*$/.test(val)) return;
        const digit = val.slice(-1);
        const nextDigits = [...userDigits];
        while (nextDigits.length < expectedLength) nextDigits.push('');
        nextDigits[index] = digit;
        const newVal = nextDigits.join('');
        onInputChange?.(inputId, newVal);
        if (digit !== "" && index < expectedLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !userDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className={`${styles.vertMultContainer} ${className}`}>
            {/* Carry Row */}
            {carries.length > 0 && <CarryRow carries={carries} maxColumns={maxColumns} />}

            {/* Top operand row */}
            <DigitRow value={v1} highlights={highlights.top} />
            
            {/* Middle row */}
            <div className={styles.vertMultMiddleRow}>
                <span className={`${styles.vertMultOperator} ${highlights.bottom?.length > 0 ? styles.vertMultDigitHighlight : ''}`}>
                    {operator}
                </span>
                <DigitRow value={v2} highlights={highlights.bottom} />
            </div>

            {/* Bottom row */}
            <div className={styles.vertMultBottomRow}>
                {showQuestionMark ? (
                    <div className={styles.vertMultQuestionMark}>?</div>
                ) : inputId && !isAnswered ? (
                    <div className={styles.vertMultInputGroup}>
                        {Array.from({ length: expectedLength }).map((_, i) => (
                            <input
                                key={`${inputId}-digit-${i}`}
                                ref={el => { if(el) inputRefs.current[i] = el; }}
                                type="text"
                                className={styles.vertMultInput}
                                value={userDigits[i] ?? ''}
                                onChange={(e) => handleDigitChange(e.target.value, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                maxLength={1}
                                inputMode="numeric"
                                onFocus={(e) => e.target.select()}
                            />
                        ))}
                    </div>
                ) : (
                    <DigitRow 
                        value={result || userValue} 
                        highlights={highlights.result} 
                        useExtraSpacing={extraSpacing}
                    />
                )}
            </div>
        </div>
    );
}
