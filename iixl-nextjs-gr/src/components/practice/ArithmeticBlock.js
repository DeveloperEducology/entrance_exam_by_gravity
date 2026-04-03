'use client';

import React, { useRef, useEffect } from 'react';
import styles from './ArithmeticBlock.module.css';

const buildCells = (value, maxColumns) => {
    const digits = String(value ?? '').split('');
    const padding = Math.max(0, maxColumns - digits.length);
    return [
        ...Array.from({ length: padding }, () => ''),
        ...digits
    ];
};

const DigitRow = ({ value, highlights = [], maxColumns, useExtraSpacing = false }) => {
    const digits = buildCells(value, maxColumns);
    const offset = Math.max(0, maxColumns - String(value ?? '').length);

    return (
        <div className={`${styles.vertMultRow} ${useExtraSpacing ? styles.vertMultSpacingWide : styles.vertMultSpacingNormal}`}>
            <span className={styles.vertMultOperatorSpacer} aria-hidden="true" />
            {digits.map((d, i) => (
                <span
                    key={i}
                    className={`${styles.vertMultDigitCell} ${d === '' ? styles.vertMultDigitPlaceholder : ''} ${highlights.includes(i - offset) ? styles.vertMultDigitHighlight : ''}`}
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
            <span className={styles.vertMultOperatorSpacer} aria-hidden="true" />
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
    inputFromLeftToRight = true,
    extraSpacing = false,
    className = ''
}) {
    const inputRefs = useRef([]);
    const hasInitializedFocusRef = useRef(false);
    const expectedLength = String(result || '').length || 3;
    const normalizedUserDigits = (() => {
        const raw = String(userValue || '').split('');
        if (inputFromLeftToRight) {
            const digits = [...raw];
            while (digits.length < expectedLength) digits.push('');
            return digits.slice(0, expectedLength);
        }
        return buildCells(userValue, expectedLength);
    })();
    const topStr = String(v1 || '');
    const bottomStr = String(v2 || '');
    const maxColumns = Math.max(topStr.length, bottomStr.length, expectedLength);

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, expectedLength);
    }, [expectedLength]);

    useEffect(() => {
        hasInitializedFocusRef.current = false;
    }, [inputId, expectedLength, inputFromLeftToRight]);

    useEffect(() => {
        if (isAnswered || !inputId || hasInitializedFocusRef.current) return;
        const indices = Array.from({ length: expectedLength }, (_, idx) => idx);
        const ordered = inputFromLeftToRight ? indices : [...indices].reverse();
        const firstEmptyIndex = ordered.find((idx) => !(normalizedUserDigits[idx] ?? ''));
        const targetIndex = firstEmptyIndex ?? ordered[0];
        const target = inputRefs.current[targetIndex];
        if (target && document.activeElement !== target) {
            target.focus();
            target.select?.();
            hasInitializedFocusRef.current = true;
        }
    }, [inputId, expectedLength, inputFromLeftToRight, isAnswered, normalizedUserDigits]);

    const handleDigitChange = (val, index) => {
        if (!/^\d*$/.test(val)) return;
        const digit = val.slice(-1);
        const nextDigits = [...normalizedUserDigits];
        while (nextDigits.length < expectedLength) nextDigits.push('');
        nextDigits[index] = digit;
        const newVal = nextDigits.join('');
        onInputChange?.(inputId, newVal);
        if (digit !== "") {
            const nextIndex = inputFromLeftToRight ? index + 1 : index - 1;
            if (nextIndex >= 0 && nextIndex < expectedLength) {
                inputRefs.current[nextIndex]?.focus();
            }
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !normalizedUserDigits[index]) {
            const nextIndex = inputFromLeftToRight ? index - 1 : index + 1;
            if (nextIndex >= 0 && nextIndex < expectedLength) {
                inputRefs.current[nextIndex]?.focus();
            }
        }
    };

    return (
        <div
            className={`${styles.vertMultContainer} ${className}`}
            style={{ '--cols': maxColumns, '--answer-cols': expectedLength }}
        >
            {/* Carry Row */}
            {carries.length > 0 && <CarryRow carries={carries} maxColumns={maxColumns} />}

            {/* Top operand row */}
            <DigitRow value={v1} highlights={highlights.top} maxColumns={maxColumns} />
            
            {/* Middle row */}
            <div className={styles.vertMultMiddleRow}>
                <span className={`${styles.vertMultOperator} ${highlights.bottom?.length > 0 ? styles.vertMultDigitHighlight : ''}`}>
                    {operator}
                </span>
                {buildCells(v2, maxColumns).map((digit, index) => {
                    const offset = Math.max(0, maxColumns - bottomStr.length);
                    return (
                        <span
                            key={`bottom-${index}`}
                            className={`${styles.vertMultDigitCell} ${digit === '' ? styles.vertMultDigitPlaceholder : ''} ${highlights.bottom?.includes(index - offset) ? styles.vertMultDigitHighlight : ''}`}
                        >
                            {digit}
                        </span>
                    );
                })}
            </div>

            {/* Bottom row */}
            <div className={styles.vertMultBottomRow}>
                {showQuestionMark ? (
                    <>
                        <span className={styles.vertMultOperatorSpacer} aria-hidden="true" />
                        <div className={styles.vertMultQuestionMark}>?</div>
                    </>
                ) : inputId && !isAnswered ? (
                    <>
                        <span className={styles.vertMultOperatorSpacer} aria-hidden="true" />
                        <div className={styles.vertMultInputGroup}>
                        {Array.from({ length: expectedLength }).map((_, i) => (
                            <input
                                key={`${inputId}-digit-${i}`}
                                ref={el => { if(el) inputRefs.current[i] = el; }}
                                type="text"
                                className={styles.vertMultInput}
                                value={normalizedUserDigits[i] ?? ''}
                                onChange={(e) => handleDigitChange(e.target.value, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                maxLength={1}
                                inputMode="numeric"
                                onFocus={(e) => e.target.select()}
                            />
                        ))}
                        </div>
                    </>
                ) : (
                    <DigitRow 
                        value={result || userValue} 
                        highlights={highlights.result} 
                        maxColumns={maxColumns}
                        useExtraSpacing={extraSpacing}
                    />
                )}
            </div>
        </div>
    );
}
