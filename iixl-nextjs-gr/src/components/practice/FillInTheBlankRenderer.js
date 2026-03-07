'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FillInTheBlankRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';
import {
    extractLatexPlaceholderIds,
    latexWithInteractivePlaceholders,
    latexWithPlaceholderBoxes,
    renderLatexToHtml
} from './latexUtils';

function InlineLatexBlanks({
    part,
    html,
    placeholderIds,
    userAnswer,
    isAnswered,
    onInputChange,
    onFocus,
    getInputConfig,
    inputRefs
}) {
    const wrapperRef = useRef(null);
    const [anchors, setAnchors] = useState([]);

    const recomputeAnchors = () => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        const nodes = Array.from(wrapper.querySelectorAll('[data-blank-id]'));
        const next = nodes
            .map((node) => {
                const id = String(node.getAttribute('data-blank-id') || '').trim();
                if (!id) return null;
                const rect = node.getBoundingClientRect();
                return {
                    id,
                    top: rect.top - wrapperRect.top,
                    left: rect.left - wrapperRect.left,
                    width: rect.width,
                    height: rect.height
                };
            })
            .filter(Boolean);
        setAnchors(next);
    };

    useEffect(() => {
        recomputeAnchors();
        const handle = () => recomputeAnchors();
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [html, placeholderIds.join('|')]);

    const fallbackIds = useMemo(() => placeholderIds, [placeholderIds]);
    const visibleAnchors = anchors.length > 0 ? anchors : fallbackIds.map((id, i) => ({
        id,
        top: 0,
        left: i * 90,
        width: 78,
        height: 38,
    }));

    return (
        <div className={styles.mathLatexWrap}>
            <div ref={wrapperRef} className={`${styles.mathLatex} ${styles.mathLatexInteractive}`}>
                <span dangerouslySetInnerHTML={{ __html: html }} />
                {visibleAnchors.map((anchor) => {
                    const inputConfig = getInputConfig({ id: anchor.id, answerType: part?.answerType });
                    const maxLength = Number.isFinite(Number(part?.maxLength)) ? Number(part.maxLength) : 1;
                    const hasExplicitWidth = part?.blankWidth !== undefined && part?.blankWidth !== null && String(part.blankWidth).trim() !== '';
                    const autoWidth = maxLength <= 1
                        ? Math.max(30, Math.min(44, (anchor.width || 40) * 0.62))
                        : Math.max(46, Math.min(98, (anchor.width || 56) * 0.8));
                    const width = hasExplicitWidth
                        ? (typeof part.blankWidth === 'number' ? `${part.blankWidth}px` : String(part.blankWidth))
                        : `${autoWidth}px`;
                    const height = Math.max(24, Math.min(38, (anchor.height || 34) - 2));
                    const top = anchor.top + Math.max(0, ((anchor.height || height) - height) / 2);
                    const left = anchor.left + Math.max(0, ((anchor.width || autoWidth) - autoWidth) / 2);
                    return (
                        <input
                            key={`latex-inline-${anchor.id}`}
                            type="text"
                            className={`${styles.input} ${styles.latexInlineInput}`}
                            value={userAnswer?.[anchor.id] ?? ''}
                            onChange={(e) => onInputChange(anchor.id, e.target.value)}
                            disabled={isAnswered}
                            aria-label={anchor.id}
                            inputMode={inputConfig.inputMode}
                            pattern={inputConfig.pattern}
                            maxLength={Number.isFinite(Number(part?.maxLength)) ? Number(part.maxLength) : undefined}
                            ref={(el) => {
                                if (el && inputRefs) inputRefs.current[anchor.id] = el;
                            }}
                            onFocus={() => onFocus?.(anchor.id)}
                            style={{
                                top: `${top}px`,
                                left: `${left}px`,
                                width,
                                height: `${height}px`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default function FillInTheBlankRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const arithmeticCellRefs = useRef({});
    const containerRef = useRef(null);
    const [lastFocusedId, setLastFocusedId] = useState(null);
    const [viewportWidth, setViewportWidth] = useState(null);
    const [showKeypad, setShowKeypad] = useState(false);

    useEffect(() => {
        const updateViewport = () => {
            if (typeof window === 'undefined') return;
            setViewportWidth(window.innerWidth || null);
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!containerRef.current) return;
            const inputs = containerRef.current.querySelectorAll('input:not([disabled]):not([readonly]):not([type="hidden"])');
            if (inputs && inputs.length > 0) {
                // Find the first input that isn't from a "fixed" or "text" cell in arithmetic
                for (const input of Array.from(inputs)) {
                    if (input.tabIndex !== -1 && !input.closest(`.${styles.arFixedCell}`)) {
                        input.focus();
                        if (input.select) input.select();
                        break;
                    }
                }
            }
        }, 120);
        return () => clearTimeout(timeoutId);
    }, [question?.id]);

    const q = useMemo(() => {
        if (!question) return { type: 'fillInTheBlank', parts: [] };

        const normalize = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            const res = { ...obj };

            // Normalize common root and part fields
            if (res.question_text !== undefined && res.questionText === undefined) res.questionText = res.question_text;
            if (res.adaptive_config !== undefined && res.adaptiveConfig === undefined) res.adaptiveConfig = res.adaptive_config;
            if (res.show_submit_button !== undefined && res.showSubmitButton === undefined) res.showSubmitButton = res.show_submit_button;
            if (res.is_vertical !== undefined && res.isVertical === undefined) res.isVertical = res.is_vertical;
            if (res.correct_answer_text !== undefined && res.correctAnswerText === undefined) res.correctAnswerText = res.correct_answer_text;
            if (res.correct_answer_index !== undefined && res.correctAnswerIndex === undefined) res.correctAnswerIndex = res.correct_answer_index;
            if (res.micro_skill_id !== undefined && res.microSkillId === undefined) res.microSkillId = res.micro_skill_id;

            // Handle stringified parts
            if (typeof res.parts === 'string') {
                try {
                    res.parts = JSON.parse(res.parts);
                } catch {
                    res.parts = [];
                }
            }

            // Recursively normalize parts
            if (Array.isArray(res.parts)) {
                res.parts = res.parts.map(normalize);
            } else if (res.parts === undefined || res.parts === null) {
                // If it's a table-type question without parts, it's effectively its own part
                res.parts = [];
            }

            return res;
        };

        return normalize(question);
    }, [question]);

    const getRepeatCount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return Math.min(Math.floor(parsed), 24);
    };

    const parseCorrectAnswers = () => {
        try {
            const parsed = JSON.parse(q.correctAnswerText || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const correctAnswers = parseCorrectAnswers();

    const getInputConfig = (part) => {
        const declaredType = String(part?.answerType || part?.answer_type || '').toLowerCase();
        if (declaredType === 'number' || declaredType === 'numeric') {
            return { inputMode: 'numeric', pattern: '[0-9]*' };
        }
        if (declaredType === 'decimal') {
            return { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
        }

        const expected = correctAnswers?.[part.id];
        if (typeof expected === 'number') {
            return Number.isInteger(expected)
                ? { inputMode: 'numeric', pattern: '[0-9]*' }
                : { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
        }

        if (typeof expected === 'string') {
            const trimmed = expected.trim();
            if (/^-?\d+$/.test(trimmed)) {
                return { inputMode: 'numeric', pattern: '[-]?[0-9]*' };
            }
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                return { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
            }
        }

        return { inputMode: 'text', pattern: undefined };
    };

    const handleInputChange = (inputId, value) => {
        const newAnswer = { ...(userAnswer || {}), [inputId]: value };
        onAnswer(newAnswer);

        // Check if we should move focus (shared logic for keypad and keyboard)
        const inputEl = arithmeticCellRefs.current[inputId];
        if (inputEl && value.length > 0 && inputEl.maxLength > 0 && value.length >= inputEl.maxLength) {
            // Find current focus flow for tables or arithmetic
            // This is a bit complex as focusFlow is local to renderers.
            // For now, let's keep it simple or lift focusFlow if needed.
        }
    };

    const handleKeypadPress = (keyValue) => {
        if (!lastFocusedId || isAnswered) return;
        const currentVal = String(userAnswer?.[lastFocusedId] ?? '');
        const inputEl = arithmeticCellRefs.current[lastFocusedId];
        let newVal = currentVal;

        if (keyValue === 'BACKSPACE') {
            newVal = currentVal.slice(0, -1);
        } else if (keyValue === 'CLEAR') {
            newVal = '';
        } else {
            const maxLen = inputEl ? inputEl.maxLength : (currentVal.length + 1);
            if (maxLen <= 0 || currentVal.length < maxLen || (inputEl && inputEl.type !== 'text')) {
                // If maxLen is 1 (digit) and we have a value, replace or ignore?
                // Sudoku-style: replace if maxLen is 1.
                if (maxLen === 1) newVal = keyValue;
                else newVal = currentVal + keyValue;
            }
        }

        handleInputChange(lastFocusedId, newVal);

        // Re-focus to keep keyboard away on mobile if desired, or keep our focused state
        inputEl?.focus();
    };

    const getCellInputConfig = (cell) => {
        const rawType = String(cell?.type || cell?.answerType || '').toLowerCase();
        if (rawType === 'digit') return { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 1 };
        if (rawType === 'number' || rawType === 'numeric') return { inputMode: 'numeric', pattern: '[-]?[0-9]*', maxLength: 6 };
        return { inputMode: 'text', pattern: undefined, maxLength: 1 };
    };

    const renderArithmeticLayout = (part) => {
        const rows = Array.isArray(part?.layout?.rows) ? part.layout.rows : [];
        const arithmeticInputMode = String(
            part?.layout?.inputMode ||
            part?.layout?.input_mode ||
            q.adaptiveConfig?.inputMode ||
            q.adaptiveConfig?.input_mode ||
            ''
        ).toLowerCase();
        const useDigitPad = arithmeticInputMode === 'digitpad' || arithmeticInputMode === 'digit_pad';
        const isBeginnerMode =
            String(q.adaptiveConfig?.mode || '').toLowerCase() === 'beginner' ||
            String(part?.layout?.mode || '').toLowerCase() === 'beginner';
        const measureColumns = (text) => String(text || '').length;
        const maxColumns = rows.reduce((max, row) => {
            const kind = String(row?.kind || '').toLowerCase();
            if (kind === 'answer') {
                const cells = Array.isArray(row?.cells) ? row.cells.length : 0;
                const prefixWidth = (row?.prefix || '').length;
                return Math.max(max, prefixWidth + cells);
            }
            if (kind === 'divider') return max;
            const rowText = String(row?.text || '');
            // For rows like "+ 923", we want to ensure the "+" is in its own column.
            return Math.max(max, rowText.length);
        }, 0);

        const renderTextGrid = (text) => {
            const chars = String(text || '').split('');
            const pad = Math.max(0, maxColumns - chars.length);
            return (
                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                    {Array.from({ length: pad }).map((_, i) => (
                        <span key={`pad-${i}`} className={styles.arGridCell} />
                    ))}
                    {chars.map((ch, i) => (
                        <span key={`ch-${i}`} className={styles.arGridCell}>{ch}</span>
                    ))}
                </div>
            );
        };

        const answerRows = rows
            .map((row, rowIndex) => ({
                row,
                rowIndex,
                kind: String(row?.kind || '').toLowerCase(),
                cells: Array.isArray(row?.cells) ? row.cells : [],
            }))
            .filter((entry) => entry.kind === 'answer' || entry.kind === 'carry');

        const rowStepByIndex = new Map();
        answerRows.forEach((entry, stepIdx) => {
            rowStepByIndex.set(entry.rowIndex, stepIdx);
        });

        const getPreviousAnswerRow = (rowIndex) => {
            const step = rowStepByIndex.get(rowIndex);
            if (typeof step !== 'number' || step <= 0) return null;
            return answerRows[step - 1] || null;
        };

        const applyCarryDigits = ({ currentRowIndex, currentCellIndex, typedValue, updates }) => {
            const carrySource = String(typedValue || '').replace(/[^0-9]/g, '');
            if (carrySource.length <= 1) return false;

            const carryRow = getPreviousAnswerRow(currentRowIndex);
            if (!carryRow || !Array.isArray(carryRow.cells) || carryRow.cells.length === 0) return false;

            const carryDigits = carrySource.slice(0, -1);
            let carryPlaced = false;
            let targetIndex = currentCellIndex - 1;

            for (let i = carryDigits.length - 1; i >= 0; i -= 1) {
                if (targetIndex < 0) break;
                const carryCellId = String(carryRow.cells[targetIndex]?.id || `cell_${carryRow.rowIndex}_${targetIndex}`);
                updates[carryCellId] = carryDigits[i];
                carryPlaced = true;
                targetIndex -= 1;
            }

            return carryPlaced;
        };
        const cellMetaById = new Map();
        answerRows.forEach((entry) => {
            entry.cells.forEach((cell, cellIndex) => {
                const id = String(cell?.id || `cell_${entry.rowIndex}_${cellIndex}`);
                cellMetaById.set(id, { rowIndex: entry.rowIndex, cellIndex, cells: entry.cells });
            });
        });

        const stepCompletion = answerRows.map((entry) =>
            entry.cells.length > 0 &&
            entry.cells.every((cell, idx) => {
                const id = String(cell?.id || `cell_${entry.rowIndex}_${idx}`);
                return String(userAnswer?.[id] ?? '').trim() !== '';
            })
        );
        const firstIncompleteStep = stepCompletion.findIndex((complete) => !complete);
        const resolvedActiveStep = firstIncompleteStep === -1
            ? Math.max(0, answerRows.length - 1)
            : firstIncompleteStep;
        const activeRow = answerRows[resolvedActiveStep] || null;

        const getCellId = (rowIndex, cells, cellIndex) =>
            String(cells[cellIndex]?.id || `cell_${rowIndex}_${cellIndex}`);

        const getPreferredCellIdForRow = (rowEntry) => {
            if (!rowEntry) return null;
            const cells = Array.isArray(rowEntry.cells) ? rowEntry.cells : [];
            if (cells.length === 0) return null;
            for (let i = cells.length - 1; i >= 0; i -= 1) {
                const candidateId = getCellId(rowEntry.rowIndex, cells, i);
                if (String(userAnswer?.[candidateId] ?? '').trim() === '') return candidateId;
            }
            return getCellId(rowEntry.rowIndex, cells, cells.length - 1);
        };

        const getActiveCellIdForPad = () => {
            if (activeArithmeticCellId) {
                const meta = cellMetaById.get(activeArithmeticCellId);
                if (meta) {
                    const rowStep = rowStepByIndex.get(meta.rowIndex) ?? 0;
                    const isLocked = isBeginnerMode && rowStep !== resolvedActiveStep;
                    if (!isLocked) return activeArithmeticCellId;
                }
            }
            return getPreferredCellIdForRow(activeRow);
        };

        const handleDigitPadPress = (digit) => {
            if (isAnswered) return;
            const targetId = getActiveCellIdForPad();
            if (!targetId) return;
            const meta = cellMetaById.get(targetId);
            if (!meta) return;

            const updates = { ...(userAnswer || {}), [targetId]: String(digit) };
            onAnswer(updates);

            const nextIndex = Math.max(0, meta.cellIndex - 1);
            const nextId = getCellId(meta.rowIndex, meta.cells, nextIndex);
            setActiveArithmeticCellId(nextId);
            arithmeticCellRefs.current[nextId]?.focus();
        };

        const handleDigitPadBackspace = () => {
            if (isAnswered) return;
            const targetId = getActiveCellIdForPad();
            if (!targetId) return;
            const meta = cellMetaById.get(targetId);
            if (!meta) return;

            const currentValue = String(userAnswer?.[targetId] ?? '');
            const updates = { ...(userAnswer || {}) };

            if (currentValue !== '') {
                updates[targetId] = '';
                onAnswer(updates);
                setActiveArithmeticCellId(targetId);
                arithmeticCellRefs.current[targetId]?.focus();
                return;
            }

            if (meta.cellIndex < meta.cells.length - 1) {
                const rightId = getCellId(meta.rowIndex, meta.cells, meta.cellIndex + 1);
                updates[rightId] = '';
                onAnswer(updates);
                setActiveArithmeticCellId(rightId);
                arithmeticCellRefs.current[rightId]?.focus();
            }
        };

        const handleDigitPadClearRow = () => {
            if (isAnswered || !activeRow) return;
            const updates = { ...(userAnswer || {}) };
            activeRow.cells.forEach((cell, index) => {
                const id = getCellId(activeRow.rowIndex, activeRow.cells, index);
                updates[id] = '';
            });
            onAnswer(updates);
            const startId = getPreferredCellIdForRow(activeRow);
            setActiveArithmeticCellId(startId);
            if (startId) arithmeticCellRefs.current[startId]?.focus();
        };

        return (
            <div className={styles.arithmeticLayout} style={{ '--cols': maxColumns }}>
                {rows.map((row, rowIndex) => {
                    const kind = String(row?.kind || '').toLowerCase();

                    if (kind === 'divider') {
                        return <div key={`ar-row-${rowIndex}`} className={styles.arDivider} />;
                    }

                    if (kind === 'header') {
                        const cells = Array.isArray(row?.cells) ? row.cells : [];
                        const text = String(row?.text || '');
                        // If text is provided, we respect spaces for alignment. 
                        // We take the last 'maxColumns' characters or pad to 'maxColumns'.
                        const rawChars = text ? text.split('') : cells.map(c => c.text || c.value || '');
                        const chars = rawChars.length > maxColumns
                            ? rawChars.slice(-maxColumns)
                            : [...Array.from({ length: maxColumns - rawChars.length }).map(() => ' '), ...rawChars];

                        return (
                            <div key={`ar-header-${rowIndex}`} className={styles.arHeaderRow} style={{ '--cols': maxColumns }}>
                                {chars.map((ch, i) => (
                                    <span key={`h-cell-${i}`} className={styles.arHeaderCell}>
                                        {String(ch).trim()}
                                    </span>
                                ))}
                            </div>
                        );
                    }

                    if (kind === 'carry') {
                        const cells = Array.isArray(row?.cells) ? row.cells : [];
                        const pad = Math.max(0, maxColumns - cells.length);
                        return (
                            <div key={`ar-carry-${rowIndex}`} className={styles.arCarryRow} style={{ '--cols': maxColumns }}>
                                {Array.from({ length: pad }).map((_, i) => <span key={`c-pad-${i}`} className={styles.arCarryCell} />)}
                                {cells.map((cell, idx) => {
                                    const id = String(cell?.id || `cell_${rowIndex}_${idx}`);
                                    const isActive = useDigitPad && activeArithmeticCellId === id;
                                    const cfg = getCellInputConfig(cell);
                                    return (
                                        <div key={id} className={styles.arCarryCell}>
                                            <input
                                                ref={(el) => { if (el) arithmeticCellRefs.current[id] = el; }}
                                                type="text"
                                                className={`${styles.arCarryInput} ${isActive ? styles.arCarryInputActive : ''}`}
                                                value={userAnswer?.[id] ?? ''}
                                                onChange={(e) => {
                                                    if (useDigitPad) return;
                                                    let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
                                                    handleInputChange(id, val);
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                onClick={() => setActiveArithmeticCellId(id)}
                                                disabled={isAnswered}
                                                readOnly={useDigitPad}
                                                inputMode="numeric"
                                                maxLength={1}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (kind === 'answer') {
                        const cells = Array.isArray(row?.cells) ? row.cells : [];
                        const rowStep = rowStepByIndex.get(rowIndex) ?? 0;
                        const isRowLocked = isBeginnerMode && rowStep !== resolvedActiveStep;
                        const prefix = String(row?.prefix || '').replace(/\s+/g, '');
                        const prefixChars = prefix.split('');
                        const usedColumns = prefixChars.length + cells.length;
                        const leftPad = Math.max(0, maxColumns - usedColumns);
                        return (
                            <div key={`ar-row-${rowIndex}`} className={styles.arAnswerRow}>
                                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                                    {Array.from({ length: leftPad }).map((_, i) => (
                                        <span key={`ans-pad-${i}`} className={styles.arGridCell} />
                                    ))}
                                    {prefixChars.map((ch, i) => (
                                        <span key={`pre-${i}`} className={`${styles.arGridCell} ${styles.arPrefixCell}`}>{ch}</span>
                                    ))}
                                    {cells.map((cell, cellIndex) => {
                                        const cellKind = String(cell?.kind || '').toLowerCase();
                                        if (cellKind === 'text' || cellKind === 'fixed') {
                                            return (
                                                <span key={`cell-static-${cellIndex}`} className={`${styles.arGridCell} ${styles.arFixedCell}`}>
                                                    {cell.text || cell.value || ''}
                                                </span>
                                            );
                                        }

                                        const id = String(cell?.id || `cell_${rowIndex}_${cellIndex}`);
                                        const cfg = getCellInputConfig(cell);
                                        const isActiveCell = useDigitPad && activeArithmeticCellId === id;
                                        return (
                                            <span key={id} className={styles.arGridCell}>
                                                <input
                                                    ref={(el) => {
                                                        if (el) arithmeticCellRefs.current[id] = el;
                                                    }}
                                                    type="text"
                                                    className={`${styles.arCellInput} ${isActiveCell ? styles.arCellInputActive : ''}`}
                                                    value={userAnswer?.[id] ?? ''}
                                                    onChange={(e) => {
                                                        if (useDigitPad) return;
                                                        let next = e.target.value.toUpperCase();
                                                        if (cfg.inputMode === 'numeric' || cfg.pattern?.includes('[0-9]')) {
                                                            next = next.replace(/[^0-9-]/g, '');
                                                        }
                                                        next = next.slice(0, 8);

                                                        // If a two-digit sum is typed in one box, auto-carry leading digit(s) to the row above.
                                                        if (next.length > 1 && cfg.maxLength === 1) {
                                                            const updates = { ...(userAnswer || {}) };
                                                            const lastDigit = next.slice(-1);
                                                            updates[id] = lastDigit;
                                                            applyCarryDigits({
                                                                currentRowIndex: rowIndex,
                                                                currentCellIndex: cellIndex,
                                                                typedValue: next,
                                                                updates,
                                                            });
                                                            onAnswer(updates);

                                                            if (cellIndex > 0) {
                                                                const leftId = String(cells[cellIndex - 1]?.id || `cell_${rowIndex}_${cellIndex - 1}`);
                                                                arithmeticCellRefs.current[leftId]?.focus();
                                                            }
                                                            return;
                                                        }

                                                        // Support paste/multi-digit entry: fill current row from right to left.
                                                        if (next.length > 1) {
                                                            const chars = next.slice(0, cells.length).split('');
                                                            const updates = { ...(userAnswer || {}) };
                                                            let cursor = cellIndex;
                                                            chars.forEach((char) => {
                                                                if (cursor < 0) return;
                                                                const targetId = String(cells[cursor]?.id || `cell_${rowIndex}_${cursor}`);
                                                                updates[targetId] = char;
                                                                cursor -= 1;
                                                            });
                                                            onAnswer(updates);
                                                            const focusId = String(cells[Math.max(0, cellIndex - chars.length)]?.id || `cell_${rowIndex}_${Math.max(0, cellIndex - chars.length)}`);
                                                            arithmeticCellRefs.current[focusId]?.focus();
                                                            return;
                                                        }

                                                        next = next.slice(0, cfg.maxLength);
                                                        handleInputChange(id, next);

                                                        // Move cursor from ones -> tens -> hundreds (right to left).
                                                        if (next && cellIndex > 0) {
                                                            const leftId = String(cells[cellIndex - 1]?.id || `cell_${rowIndex}_${cellIndex - 1}`);
                                                            arithmeticCellRefs.current[leftId]?.focus();
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const currentVal = String(userAnswer?.[id] ?? '');
                                                        if (e.key === 'Backspace' && !currentVal && cellIndex < cells.length - 1) {
                                                            const rightId = String(cells[cellIndex + 1]?.id || `cell_${rowIndex}_${cellIndex + 1}`);
                                                            arithmeticCellRefs.current[rightId]?.focus();
                                                        }
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    onClick={() => setActiveArithmeticCellId(id)}
                                                    disabled={isAnswered || isRowLocked}
                                                    readOnly={useDigitPad}
                                                    inputMode={useDigitPad ? 'none' : cfg.inputMode}
                                                    pattern={cfg.pattern}
                                                    maxLength={cfg.maxLength}
                                                />
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    const text = String(row?.text || '');
                    if (!text) return null;
                    if (kind === 'text') {
                        const words = text.trim().split(/\s+/).filter(Boolean);
                        return (
                            <div key={`ar-row-${rowIndex}`} className={styles.arLabelRow}>
                                {words.length > 0 ? words.map((word, wordIndex) => (
                                    <span key={`label-${rowIndex}-${wordIndex}`} className={styles.arLabelWord}>
                                        {word}
                                    </span>
                                )) : <span className={styles.arLabelWord}>{text}</span>}
                            </div>
                        );
                    }
                    return (
                        <div key={`ar-row-${rowIndex}`} className={styles.arTextRow}>
                            {renderTextGrid(text)}
                        </div>
                    );
                })}
                {useDigitPad && !isAnswered && (
                    <div className={styles.arDigitPad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
                            <button
                                key={`pad-${digit}`}
                                type="button"
                                className={styles.arPadBtn}
                                onClick={() => handleDigitPadPress(digit)}
                            >
                                {digit}
                            </button>
                        ))}
                        <button type="button" className={styles.arPadBtn} onClick={handleDigitPadBackspace}>
                            Del
                        </button>
                        <button type="button" className={styles.arPadBtn} onClick={handleDigitPadClearRow}>
                            Clear
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderPictureEquation = (part) => {
        const cfg = part?.layout || {};
        const left = cfg.left || {};
        const right = cfg.right || {};
        const total = cfg.total || {};
        const footer = String(cfg.footerEmojis || cfg.footer || '');

        const normalizeEmojiLine = (emoji, count) => {
            const unit = String(emoji || '🍐');
            const qty = Number(count);
            const safeCount = Number.isFinite(qty) ? Math.max(0, Math.min(30, Math.floor(qty))) : 0;
            return Array.from({ length: safeCount }).map(() => unit).join('');
        };

        const leftLine = normalizeEmojiLine(left.emoji, left.count);
        const rightLine = normalizeEmojiLine(right.emoji, right.count);

        return (
            <div className={styles.pictureEq}>
                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji}>{leftLine}</div>
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[left.inputId || 'left_count'] ?? ''}
                        onChange={(e) => handleInputChange(left.inputId || 'left_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                <div className={styles.pictureOp}>+</div>

                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji}>{rightLine}</div>
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[right.inputId || 'right_count'] ?? ''}
                        onChange={(e) => handleInputChange(right.inputId || 'right_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                <div className={styles.pictureOp}>=</div>

                <div className={styles.pictureTerm}>
                    <div className={styles.pictureEmoji} />
                    <input
                        type="text"
                        className={styles.pictureBox}
                        value={userAnswer?.[total.inputId || 'total_count'] ?? ''}
                        onChange={(e) => handleInputChange(total.inputId || 'total_count', e.target.value)}
                        disabled={isAnswered}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                </div>

                {footer ? <div className={styles.pictureFooter}>{footer}</div> : null}
            </div>
        );
    };

    const renderGridArithmetic = (part) => {
        const layout = part?.layout || {};
        const rows = Math.max(1, Math.min(30, Number(layout?.rows || 6)));
        const cols = Math.max(1, Math.min(30, Number(layout?.cols || 6)));
        const cellSize = Math.max(24, Math.min(80, Number(layout?.cellSize || 42)));
        const isMobileViewport = Number.isFinite(viewportWidth) && viewportWidth <= 768;
        const mobileSidePadding = 88;
        const mobileMaxGridWidth = isMobileViewport
            ? Math.max(180, Number(viewportWidth) - mobileSidePadding)
            : null;
        const fittedCellSize = mobileMaxGridWidth
            ? Math.max(18, Math.min(cellSize, Math.floor(mobileMaxGridWidth / cols)))
            : cellSize;
        const showBackgroundGrid = Boolean(layout?.showBackgroundGrid);
        const cells = Array.isArray(layout?.cells) ? layout.cells : [];
        const borders = Array.isArray(layout?.borders) ? layout.borders : [];

        const cellByCoord = new Map();
        cells.forEach((cell) => {
            const r = Number(cell?.r);
            const c = Number(cell?.c);
            if (!Number.isFinite(r) || !Number.isFinite(c)) return;
            cellByCoord.set(`${r}:${c}`, cell);
        });

        const borderByCoord = new Map();
        borders.forEach((border) => {
            const r = Number(border?.r);
            const c = Number(border?.c);
            if (!Number.isFinite(r) || !Number.isFinite(c)) return;
            borderByCoord.set(`${r}:${c}`, border);
        });

        const items = [];
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const key = `${r}:${c}`;
                const cell = cellByCoord.get(key);
                const border = borderByCoord.get(key);
                const kind = String(cell?.kind || '').toLowerCase();
                const hasDefinedCell = kind === 'fixed' || kind === 'input';

                let inner = null;
                if (kind === 'fixed') {
                    inner = <span className={styles.gridFixedText}>{String(cell?.value ?? '')}</span>;
                } else if (kind === 'input') {
                    const inputId = String(cell?.id || `cell_${r}_${c}`);
                    const inputConfig = getInputConfig({ id: inputId, answerType: cell?.answerType || 'number' });
                    inner = (
                        <input
                            type="text"
                            className={styles.gridCellInput}
                            value={userAnswer?.[inputId] ?? ''}
                            onChange={(e) => handleInputChange(inputId, e.target.value)}
                            disabled={isAnswered}
                            aria-label={inputId}
                            inputMode={inputConfig.inputMode}
                            pattern={inputConfig.pattern}
                            maxLength={Number.isFinite(Number(cell?.maxLength)) ? Number(cell.maxLength) : 1}
                        />
                    );
                }

                items.push(
                    <div
                        key={`ga-${r}-${c}`}
                        className={`${styles.gridCell} ${showBackgroundGrid && hasDefinedCell ? styles.gridBackground : ''} ${kind === 'input' ? styles.gridInputHost : ''}`}
                        style={{
                            borderTop: border?.top ? '2px solid #111827' : undefined,
                            borderRight: border?.right ? '2px solid #111827' : undefined,
                            borderBottom: border?.bottom ? '2px solid #111827' : undefined,
                            borderLeft: border?.left ? '2px solid #111827' : undefined,
                        }}
                    >
                        {inner}
                    </div>
                );
            }
        }

        return (
            <div className={styles.gridArithmeticWrap}>
                <div
                    className={styles.gridArithmetic}
                    style={{
                        gridTemplateColumns: `repeat(${cols}, ${fittedCellSize}px)`,
                        gridTemplateRows: `repeat(${rows}, ${fittedCellSize}px)`,
                    }}
                >
                    {items}
                </div>
            </div>
        );
    };

    const renderButterflyFraction = (part) => {
        const layout = part?.layout || {};
        const canvasWidth = Math.max(320, Math.min(900, Number(layout?.canvas?.width || 620)));
        const canvasHeight = Math.max(280, Math.min(900, Number(layout?.canvas?.height || 460)));
        const effectiveWidth = Number.isFinite(viewportWidth)
            ? Math.max(260, viewportWidth - 84)
            : canvasWidth;
        const isMobileViewport = Number.isFinite(viewportWidth) && viewportWidth <= 768;
        const scale = isMobileViewport
            ? Math.min(1, effectiveWidth / canvasWidth)
            : 1;

        const leftNum = String(layout?.leftFraction?.num ?? '2');
        const leftDen = String(layout?.leftFraction?.den ?? '3');
        const rightNum = String(layout?.rightFraction?.num ?? '3');
        const rightDen = String(layout?.rightFraction?.den ?? '4');
        const showCrossLines = layout?.showCrossLines !== false;
        const showDenominatorArc = layout?.showDenominatorArc !== false;
        const showResultFraction = layout?.showResultFraction !== false;
        const inputs = Array.isArray(layout?.inputs) ? layout.inputs : [];
        const autoPositionInputs = layout?.autoPositionInputs !== false;

        const roleDefaults = {
            cross_left_to_right: { x: 116, y: 94, w: 50, h: 36 },
            cross_right_to_left: { x: 250, y: 94, w: 50, h: 36 },
            denominator_product: { x: 208, y: 336, w: 56, h: 38 },
            final_numerator: { x: 452, y: 192, w: 56, h: 38 },
            final_denominator: { x: 452, y: 258, w: 56, h: 38 },
        };

        const xPct = (value) => `${(Number(value || 0) / canvasWidth) * 100}%`;
        const yPct = (value) => `${(Number(value || 0) / canvasHeight) * 100}%`;
        const wPct = (value) => `${(Number(value || 40) / canvasWidth) * 100}%`;
        const hPct = (value) => `${(Number(value || 34) / canvasHeight) * 100}%`;

        return (
            <div className={styles.butterflyWrap}>
                <div
                    className={styles.butterflyStage}
                    style={{
                        '--bf-width': `${canvasWidth}px`,
                        '--bf-height': `${canvasHeight}px`,
                        '--bf-scale': scale,
                    }}
                >
                    <div className={styles.butterflyCanvas}>
                        <svg
                            className={styles.butterflySvg}
                            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <line x1="180" y1="170" x2="420" y2="170" stroke="#111827" strokeWidth="3" />
                            <text x="220" y="145" className={styles.bfNumber}>{leftNum}</text>
                            <text x="220" y="230" className={styles.bfNumber}>{leftDen}</text>
                            <text x="360" y="145" className={styles.bfNumber}>{rightNum}</text>
                            <text x="360" y="230" className={styles.bfNumber}>{rightDen}</text>

                            <text x="292" y="190" className={styles.bfOperator}>+</text>
                            <text x="292" y="285" className={styles.bfOperator}>×</text>
                            <text x="455" y="190" className={styles.bfOperator}>=</text>

                            {showCrossLines && (
                                <>
                                    <path d="M220 142 C255 178, 300 200, 360 225" fill="none" stroke="#f29bb2" strokeWidth="4" />
                                    <path d="M360 142 C325 178, 280 200, 220 225" fill="none" stroke="#f29bb2" strokeWidth="4" />
                                </>
                            )}
                            {showDenominatorArc && (
                                <path d="M220 238 C250 285, 330 285, 360 238" fill="none" stroke="#3b82f6" strokeWidth="4" />
                            )}
                        </svg>

                        {showResultFraction && (
                            <div className={styles.bfResultColumn}>
                                <span className={styles.bfResultBar} />
                            </div>
                        )}

                        {inputs.map((input) => {
                            const inputId = String(input?.id || '');
                            if (!inputId) return null;
                            const role = String(input?.role || '').trim();
                            const defaults = roleDefaults[role] || {};
                            const resolved = autoPositionInputs
                                ? {
                                    x: defaults.x ?? input?.x ?? 0,
                                    y: defaults.y ?? input?.y ?? 0,
                                    w: defaults.w ?? input?.w ?? 40,
                                    h: defaults.h ?? input?.h ?? 34,
                                }
                                : {
                                    x: input?.x ?? defaults.x ?? 0,
                                    y: input?.y ?? defaults.y ?? 0,
                                    w: input?.w ?? defaults.w ?? 40,
                                    h: input?.h ?? defaults.h ?? 34,
                                };
                            const inputConfig = getInputConfig({
                                id: inputId,
                                answerType: input?.answerType || 'number',
                            });
                            return (
                                <input
                                    key={`bf-${inputId}`}
                                    type="text"
                                    className={styles.bfInput}
                                    value={userAnswer?.[inputId] ?? ''}
                                    onChange={(e) => handleInputChange(inputId, e.target.value)}
                                    disabled={isAnswered}
                                    aria-label={inputId}
                                    inputMode={inputConfig.inputMode}
                                    pattern={inputConfig.pattern}
                                    maxLength={Number.isFinite(Number(input?.maxLength)) ? Number(input.maxLength) : 4}
                                    style={{
                                        left: xPct(resolved.x),
                                        top: yPct(resolved.y),
                                        width: wPct(resolved.w),
                                        height: hPct(resolved.h),
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderSmartTable = (part) => {
        const columns = Array.isArray(part?.columns) ? part.columns : [];
        const rows = Array.isArray(part?.rows) ? part.rows : [];
        if (columns.length === 0 && rows.length === 0) return null;

        const title = part?.title || '';
        const features = part?.features || {};

        // Calculate focus flow
        const focusFlow = [];
        const isMathTable = String(part?.features?.type || '').toLowerCase() === 'math_place_value' ||
            rows.some(r => ['total', 'carry', 'borrow'].includes(String(r.label || '').toLowerCase()));
        if (isMathTable) {
            // Addition/Subtraction logic: Right to Left, zig-zagging Answer -> Carry
            const columnKeys = columns.slice(1).map(c => c.key).reverse();
            columnKeys.forEach(key => {
                const resultRow = rows.find(r => ['total', 'answer'].includes(String(r.label || '').toLowerCase()));
                const carryRow = rows.find(r => ['carry', 'borrow'].includes(String(r.label || '').toLowerCase()) || r.kind === 'carry');

                const resultCell = resultRow?.[key];
                const carryCell = carryRow?.[key];

                if (resultCell?.id) focusFlow.push(resultCell.id);
                if (carryCell?.id) focusFlow.push(carryCell.id);
            });

            // Specific user tweak: Focus Tens Carry first if it's Addition
            const isAddition = rows.some(r => String(r.label || '') === '+');
            if (isAddition) {
                const carryRow = rows.find(r => String(r.label || '').toLowerCase() === 'carry' || r.kind === 'carry');
                const tensCarryId = carryRow?.t?.id;
                if (tensCarryId && focusFlow.includes(tensCarryId)) {
                    const idx = focusFlow.indexOf(tensCarryId);
                    focusFlow.splice(idx, 1);
                    focusFlow.unshift(tensCarryId);
                }
            }
        } else {
            // General Table: Top-to-Bottom, Left-to-Right
            rows.forEach(row => {
                columns.forEach(col => {
                    const cell = row[col.key];
                    if (cell?.id) focusFlow.push(cell.id);
                });
            });
        }
        return (
            <div className={styles.smartTableOuter}>
                <div className={styles.smartTableContainer}>
                    {title && (
                        <div className={styles.smartTableTitle}>
                            <span>{title}</span>
                            {features.exportable && (
                                <button className={styles.exportButton} onClick={() => { }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Export to Sheets
                                </button>
                            )}
                        </div>
                    )}
                    <div className={styles.smartTableScroll}>
                        <table className={styles.smartTable}>
                            <thead>
                                <tr>
                                    {columns.map((col, i) => (
                                        <th key={col.key || i} className={`${styles.smartTableHeaderCell} ${!col.header ? styles.smartTableNarrowCell : ''}`}>
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIndex) => {
                                    const rowLabel = String(row.label || '').toLowerCase();
                                    const isTotal = rowLabel === 'total';
                                    const isCarry = rowLabel === 'carry' || row.kind === 'carry';
                                    return (
                                        <tr key={rowIndex} className={`${isTotal ? styles.smartTableRowTotal : ''} ${isCarry ? styles.smartTableRowCarry : ''}`}>
                                            {columns.map((col, colIndex) => {
                                                const cellValue = row[col.key];
                                                const isLabelColumn = col.key === 'label';

                                                if (cellValue && typeof cellValue === 'object' && cellValue.id) {
                                                    const isCarryInput = isCarry && !isLabelColumn;
                                                    const maxLen = isCarryInput ? 1 : (cellValue?.maxLength ? Number(cellValue.maxLength) : undefined);
                                                    return (
                                                        <td key={`${rowIndex}-${colIndex}`} className={`${styles.smartTableCell} ${!col.header ? styles.smartTableNarrowCell : ''}`}>
                                                            <input
                                                                type="text"
                                                                className={isCarryInput ? styles.smartTableCarryInput : styles.smartTableInput}
                                                                value={userAnswer?.[cellValue.id] ?? ''}
                                                                ref={(el) => {
                                                                    if (el) arithmeticCellRefs.current[cellValue.id] = el;
                                                                }}
                                                                placeholder={cellValue.placeholder || ''}
                                                                onChange={(e) => {
                                                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                                                    if (maxLen) val = val.slice(0, maxLen);

                                                                    handleInputChange(cellValue.id, val);

                                                                    // Custom focus flow: only auto-move if maxLen is small (digits)
                                                                    if (maxLen === 1 && val.length === 1 && !isAnswered) {
                                                                        const currentIdx = focusFlow.indexOf(cellValue.id);
                                                                        if (currentIdx !== -1 && currentIdx < focusFlow.length - 1) {
                                                                            const nextId = focusFlow[currentIdx + 1];
                                                                            arithmeticCellRefs.current[nextId]?.focus();
                                                                        }
                                                                    }
                                                                }}
                                                                onFocus={() => setLastFocusedId(cellValue.id)}
                                                                maxLength={maxLen}
                                                                disabled={isAnswered}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`${styles.smartTableCell} ${isLabelColumn ? styles.smartTableLabelCell : ''} ${!col.header ? styles.smartTableNarrowCell : ''}`}
                                                    >
                                                        {cellValue}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        // Focus logic for Arithmetic and Smart Tables
        const parts = Array.isArray(q?.parts) ? q.parts : [];
        const arithmeticPart = parts.find(p => p.type === 'arithmeticLayout');
        // Check if question itself is a table or has a table part
        const tablePart = ((q.type === 'smartTable' || q.type === 'table') && (q.columns || q.rows))
            ? q
            : parts.find(p => p.type === 'smartTable' || p.type === 'table');

        if (arithmeticPart) {
            const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
            const answerRows = rows
                .map((row, rowIndex) => ({
                    rowIndex,
                    kind: String(row?.kind || '').toLowerCase(),
                    cells: Array.isArray(row?.cells) ? row.cells : [],
                }))
                .filter((entry) => entry.kind === 'answer');

            if (answerRows.length > 0) {
                const stepCompletion = answerRows.map((entry) =>
                    entry.cells.length > 0 &&
                    entry.cells.every((cell, idx) => {
                        const id = String(cell?.id || `cell_${entry.rowIndex}_${idx}`);
                        return String(userAnswer?.[id] ?? '').trim() !== '';
                    })
                );
                const firstIncompleteStep = stepCompletion.findIndex((complete) => !complete);
                const activeStep = firstIncompleteStep === -1 ? Math.max(0, answerRows.length - 1) : firstIncompleteStep;
                const targetRow = answerRows[activeStep];
                const cells = Array.isArray(targetRow?.cells) ? targetRow.cells : [];
                if (cells.length > 0) {
                    let targetIndex = cells.length - 1;
                    for (let i = cells.length - 1; i >= 0; i -= 1) {
                        const id = String(cells[i]?.id || `cell_${targetRow.rowIndex}_${i}`);
                        if (String(userAnswer?.[id] ?? '').trim() === '') {
                            targetIndex = i;
                            break;
                        }
                    }
                    const targetId = String(cells[targetIndex]?.id || `cell_${targetRow.rowIndex}_${targetIndex}`);
                    arithmeticCellRefs.current[targetId]?.focus();
                }
            }
        } else if (tablePart) {
            // Unified focus for all table types: Find first empty input in DOM order
            const inputs = Array.from(containerRef.current?.querySelectorAll('input:not(:disabled)') || []);
            const firstEmpty = inputs.find(input => !input.value) || inputs[0];

            // Special case for addition: Start with Tens Carry if it exists and is empty
            const rows = Array.isArray(tablePart.rows) ? tablePart.rows : [];
            const carryRow = rows.find(r => ['carry', 'borrow'].includes(String(r.label || '').toLowerCase()) || r.kind === 'carry');
            const tensCarryId = carryRow?.t?.id;

            if (tensCarryId && !userAnswer?.[tensCarryId] && arithmeticCellRefs.current[tensCarryId]) {
                arithmeticCellRefs.current[tensCarryId].focus();
            } else if (firstEmpty) {
                firstEmpty.focus();
            }
        }
    }, [question?.id, isAnswered]);

    const wrapPart = (part, index, content) => {
        if (content === null) return null;
        const isVertical = Boolean(part?.isVertical);
        return (
            <div
                key={`wrap-${index}`}
                className={`${styles.partWrapper} ${isVertical ? styles.verticalPart : styles.inlinePart}`}
            >
                {content}
            </div>
        );
    };

    const renderPart = (part, index) => {
        switch (part.type) {
            case 'text':
                if (isInlineSvg(part.content)) {
                    return wrapPart(part, index, (
                        <div
                            className={styles.imageContainer}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                    ));
                }
                if (isImageUrl(part.content)) {
                    return wrapPart(part, index, (
                        <div key={index} className={styles.imageContainer}>
                            <SafeImage
                                src={part.content}
                                alt="Question visual"
                                className={styles.image}
                                width={220}
                                height={150}
                                sizes="(max-width: 768px) 44vw, 220px"
                            />
                        </div>
                    ));
                }
                return wrapPart(part, index, (
                    <span className={styles.textWithSpeaker}>
                        {Boolean(part?.hasAudio) && (
                            <SpeakerButton text={part.content} className={styles.inlineSpeaker} />
                        )}
                        {hasInlineHtml(part.content) ? (
                            <span
                                className={styles.text}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(part.content) }}
                            />
                        ) : (
                            <span className={styles.text}>{part.content}</span>
                        )}
                    </span>
                ));

            case 'image':
                if (isInlineSvg(getImageSrc(part.imageUrl))) {
                    const repeatCount = getRepeatCount(part?.count);
                    return wrapPart(part, index, (
                        <div className={styles.imageContainer}>
                            {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                                <div
                                    key={`svg-${index}-${imageIndex}`}
                                    dangerouslySetInnerHTML={{ __html: getImageSrc(part.imageUrl) }}
                                />
                            ))}
                        </div>
                    ));
                }
                const repeatCount = getRepeatCount(part?.count);
                return wrapPart(part, index, (
                    <div className={styles.imageContainer}>
                        {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                            <SafeImage
                                key={`img-${index}-${imageIndex}`}
                                src={getImageSrc(part.imageUrl)}
                                alt={`Question image ${imageIndex + 1}`}
                                className={styles.image}
                                width={220}
                                height={150}
                                style={{
                                    width: part.width ? `${part.width}px` : 'auto',
                                    height: part.height ? `${part.height}px` : 'auto',
                                }}
                                sizes="(max-width: 768px) 44vw, 220px"
                            />
                        ))}
                    </div>
                ));

            case 'sequence':
                return wrapPart(part, index, (
                    <div className={styles.sequence}>
                        {part.children.map((child, childIndex) => renderPart(child, `${index}-${childIndex}`))}
                    </div>
                ));

            case 'blank':
            case 'input':
                const inputConfig = getInputConfig(part);
                return wrapPart(part, index, (
                    <input
                        type="text"
                        className={styles.input}
                        value={userAnswer?.[part.id] ?? ''}
                        onChange={(e) => handleInputChange(part.id, e.target.value)}
                        onFocus={() => setLastFocusedId(part.id)}
                        ref={(el) => {
                            if (el) arithmeticCellRefs.current[part.id] = el;
                        }}
                        disabled={isAnswered}
                        placeholder={part?.placeholder || ''}
                        aria-label={part?.placeholder || part?.id || 'blank input'}
                        style={{ width: part.width || '80px' }}
                        inputMode={inputConfig.inputMode}
                        pattern={inputConfig.pattern}
                        maxLength={Number.isFinite(Number(part?.maxLength)) ? Number(part.maxLength) : undefined}
                    />
                ));

            case 'arithmeticLayout':
                return wrapPart(part, index, renderArithmeticLayout(part));

            case 'mathLatex': {
                const displayMode = Boolean(part?.displayMode ?? part?.isDisplayMode);
                const latex = latexWithInteractivePlaceholders(part.content);
                const placeholderIds = extractLatexPlaceholderIds(part.content);
                const html = renderLatexToHtml(latex, displayMode);
                return wrapPart(part, index, (
                    <InlineLatexBlanks
                        part={part}
                        html={html}
                        placeholderIds={placeholderIds}
                        userAnswer={userAnswer}
                        isAnswered={isAnswered}
                        onInputChange={handleInputChange}
                        onFocus={setLastFocusedId}
                        inputRefs={arithmeticCellRefs}
                        getInputConfig={getInputConfig}
                    />
                ));
            }

            case 'math':
                return wrapPart(part, index, (
                    <div className={styles.mathLatex}>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: renderLatexToHtml(latexWithPlaceholderBoxes(part.content), false),
                            }}
                        />
                    </div>
                ));

            case 'pictureEquation':
                return wrapPart(part, index, renderPictureEquation(part));

            case 'gridArithmetic':
                return wrapPart(part, index, renderGridArithmetic(part));

            case 'butterflyFraction':
                return wrapPart(part, index, renderButterflyFraction(part));

            case 'table':
            case 'smartTable':
                return wrapPart(part, index, renderSmartTable(part));

            default:
                return null;
        }
    };

    const renderQuestionParts = () => {
        if ((q.type === 'table' || q.type === 'smartTable') && q.parts.length === 0) {
            return [renderPart(q, 0)];
        }
        const parts = q.parts;
        const rows = [];
        for (let index = 0; index < parts.length; index += 1) {
            const part = parts[index];
            const nextPart = parts[index + 1];
            const isEquationLabel =
                part?.type === 'text' &&
                typeof part?.content === 'string' &&
                part.content.trim().endsWith('=');
            const isPairableInput = nextPart?.type === 'input' || nextPart?.type === 'blank';

            if (isEquationLabel && isPairableInput) {
                rows.push(
                    <div key={`pair-${index}`} className={styles.pairedRow}>
                        {renderPart(part, index)}
                        {renderPart(nextPart, index + 1)}
                    </div>
                );
                index += 1;
                continue;
            }

            rows.push(renderPart(part, index));
        }

        return rows;
    };

    const questionText = String(q?.questionText || '').trim();
    const hasMatchingTextPart = Array.isArray(q?.parts) && q.parts.some((part) => {
        if (String(part?.type || '').toLowerCase() !== 'text') return false;
        return String(part?.content || '').trim() === questionText;
    });
    const showQuestionText = Boolean(questionText) && !hasMatchingTextPart;

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.questionCard}>
                {showQuestionText && (
                    <div className={styles.questionTextRow}>
                        <span className={styles.questionText}>{questionText}</span>
                    </div>
                )}

                {!isAnswered && (
                    <button
                        className={styles.keypadToggle}
                        onClick={() => setShowKeypad(!showKeypad)}
                        title={showKeypad ? "Hide keypad" : "Show keypad"}
                        aria-label={showKeypad ? "Hide keypad" : "Show keypad"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                            <path d="M7 8h.01M10 8h.01M13 8h.01M16 8h.01M17 11h.01M14 11h.01M11 11h.01M8 11h.01" />
                        </svg>
                    </button>
                )}

                <div className={styles.questionContent}>
                    {renderQuestionParts()}
                </div>

                {!isAnswered && showKeypad && (
                    <div className={styles.virtualKeypad}>
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '>', '<', '=', '⌫'].map((key) => (
                            <button
                                key={key}
                                type="button"
                                className={styles.keypadButton}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Keep focus on input
                                    handleKeypadPress(key === '⌫' ? 'BACKSPACE' : key);
                                }}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                )}

                {q.showSubmitButton && userAnswer && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit()}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}
