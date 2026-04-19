'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FillInTheBlankRenderer.module.css';
import { getImageSrc, hasInlineHtml, hydrateTemplate, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';
import {
    extractLatexPlaceholderIds,
    latexWithInteractivePlaceholders,
    latexWithPlaceholderBoxes,
    renderLatexToHtml
} from './latexUtils';
import FractionModelVisual from './FractionModelVisual';
import ArithmeticBlock from './ArithmeticBlock';
import BaseTenBlocks from './BaseTenBlocks';
import NumberLineRounding from './NumberLineRounding';
import DotsGroupingVisual from './DotsGroupingVisual';
import DotArrayVisual from './DotArrayVisual';

function InlineLatexBlanks({
    part,
    html,
    placeholderIds,
    userAnswer,
    isAnswered,
    onInputChange,
    onFocus,
    getInputConfig,
    inputRefs,
    showKeypad,
    correctAnswers,
    isCorrect,
    interactions = {},
    allBlankIds = [],
    renderInput 
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
    }, [html, placeholderIds]);

    const visibleAnchors = anchors.length > 0 ? anchors : placeholderIds.map((id, i) => ({
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
                    const height = Math.max(24, Math.min(38, (anchor.height || 34) - 2));
                    const top = anchor.top + Math.max(0, ((anchor.height || height) - height) / 2);
                    
                    return (
                        <div 
                            key={`latex-box-${anchor.id}`}
                            style={{
                                position: 'absolute',
                                top: `${top}px`,
                                left: `${anchor.left}px`,
                                width: anchor.width,
                                height: `${height}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {renderInput(anchor.id, {
                                ...(interactions[anchor.id] || {}),
                                allBlankIds,
                                style: { width: '100%', height: '100%' }
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const parseBooleanLike = (value, fallback = true) => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return fallback;
};

export default function FillInTheBlankRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const arithmeticCellRefs = useRef({});
    const containerRef = useRef(null);
    const [lastFocusedId, setLastFocusedId] = useState(null);
    const config = question?.adaptiveConfig || {};
    const [activeArithmeticCellId, setActiveArithmeticCellId] = useState(null);
    const [viewportWidth, setViewportWidth] = useState(null);
    const [showKeypad, setShowKeypad] = useState(false);


    const getValue = (id) => {
        let raw = '';
        if (typeof userAnswer === 'object' && userAnswer !== null) {
            raw = userAnswer[id] ?? '';
        } else {
            raw = userAnswer != null ? String(userAnswer) : '';
        }
        
        // If we accidentally got a metadata object, extract the value string
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
            return String(raw.value);
        }
        return String(raw ?? '');
    };

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
                // Prioritize input with autoFocus property
                const autoFocusInput = Array.from(inputs).find(i => i.hasAttribute('data-autofocus') || i.getAttribute('data-autofocus') === 'true');
                const targetInput = autoFocusInput || inputs[0];

                // Find the first input that isn't from a "fixed" or "text" cell in arithmetic
                // (Unless it's explicitly marked for auto-focus)
                if (targetInput.tabIndex !== -1) {
                    targetInput.focus();
                    if (targetInput.select) targetInput.select();
                } else {
                   // Fallback loop if target was fixed (which shouldn't happen with correct usage)
                    for (const input of Array.from(inputs)) {
                        if (input.tabIndex !== -1 && !input.closest(`.${styles.arFixedCell}`)) {
                            input.focus();
                            if (input.select) input.select();
                            break;
                        }
                    }
                }
            }
        }, 120);
        return () => clearTimeout(timeoutId);
    }, [question?.id]);

    const q = useMemo(() => {
        if (!question) return { type: 'fillInTheBlank', parts: [] };

        const normalize = (obj, inheritedVars = null) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            const res = { ...obj };

            // Normalize common root and part fields
            if (res.question_text !== undefined && res.questionText === undefined) res.questionText = res.question_text;
            if (res.adaptive_config !== undefined && res.adaptiveConfig === undefined) res.adaptiveConfig = res.adaptive_config;
            if (typeof res.adaptiveConfig === 'string') {
                try {
                    res.adaptiveConfig = JSON.parse(res.adaptiveConfig);
                } catch {
                    // stay as string
                }
            }
            if (res.show_submit_button !== undefined && res.showSubmitButton === undefined) res.showSubmitButton = res.show_submit_button;
            if (res.is_vertical !== undefined && res.isVertical === undefined) res.isVertical = res.is_vertical;
            if (res.inVertical !== undefined && res.isVertical === undefined) res.isVertical = res.inVertical;
            if (res.in_vertical !== undefined && res.isVertical === undefined) res.isVertical = res.in_vertical;
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

            const currentVars = res.adaptiveConfig?.variables || inheritedVars;

            // Recursively normalize parts
            if (Array.isArray(res.parts)) {
                res.parts = res.parts.map(p => normalize(p, currentVars));
            } else if (res.parts === undefined || res.parts === null) {
                // If it's a table-type question without parts, it's effectively its own part
                res.parts = [];
            }


            // Case 1 Implementation: Hydrate templates with variables from adaptiveConfig
            if (currentVars) {
                if (typeof res.questionText === 'string' && res.questionText.includes('{')) {
                    res.questionText = hydrateTemplate(res.questionText, currentVars);
                }
                if (typeof res.content === 'string' && res.content.includes('{')) {
                    res.content = hydrateTemplate(res.content, currentVars);
                }
                if (typeof res.question_text === 'string' && res.question_text.includes('{')) {
                    res.question_text = hydrateTemplate(res.question_text, currentVars);
                }
            }

            return res;
        };

        return normalize(question);
    }, [question]);

    useEffect(() => {
        const configShow = q.adaptiveConfig?.showKeypad ?? q.showKeypad;
        if (configShow !== undefined) {
            setShowKeypad(Boolean(configShow));
        }
    }, [q.adaptiveConfig?.showKeypad, q.showKeypad]);

    const getRepeatCount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return Math.min(Math.floor(parsed), 24);
    };

    const parseCorrectAnswers = () => {
        const raw = q.correctAnswerText;
        if (raw === undefined || raw === null || raw === '') return {};

        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'string' || typeof parsed === 'number') {
                return { __default: String(parsed) };
            }
            return {};
        } catch {
            return { __default: String(raw) };
        }
    };

    const correctAnswers = parseCorrectAnswers();
    const getExpectedAnswer = (partId) => {
        let raw = '';
        if (partId && correctAnswers?.[partId] !== undefined) {
            raw = correctAnswers[partId];
        } else {
            raw = correctAnswers?.__default ?? '';
        }

        // If it's a config object like { value: "6", size: "small" }, return the value
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
            return raw.value;
        }
        return raw;
    };

    const getInputConfig = (part) => {
        const declaredType = String(part?.answerType || part?.answer_type || '').toLowerCase();
        if (declaredType === 'number' || declaredType === 'numeric') {
            return { inputMode: 'numeric', pattern: '[0-9]*' };
        }
        if (declaredType === 'decimal') {
            return { inputMode: 'decimal', pattern: '[-+]?[0-9]*[.]?[0-9]+' };
        }

        const expected = getExpectedAnswer(part.id);
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

        // Auto-advance logic
        const inputEl = arithmeticCellRefs.current[inputId];
        const maxLen = inputEl?.maxLength || (q.adaptiveConfig?.autoAdvance ? 1 : 0);
        
        if (q.adaptiveConfig?.autoAdvance && value.length >= maxLen && value.length > 0) {
            const inputs = Array.from(containerRef.current?.querySelectorAll('input:not([disabled])') || []);
            const currentIndex = inputs.indexOf(inputEl);
            if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
                setTimeout(() => {
                    inputs[currentIndex + 1].focus();
                    if (inputs[currentIndex + 1].select) inputs[currentIndex + 1].select();
                }, 10);
            }
        }
    };

    const renderInput = (partId, properties = {}) => {
        const inputConfig = getInputConfig({ id: partId, ...properties });
        const val = getValue(partId);
        // Hard-sanitized value for the input
        const displayValue = (typeof val === 'string') ? val : '';
        
        // Dynamic maxLength based on correct result if available
        const expected = getExpectedAnswer(partId);
        const defaultMax = expected ? String(expected).length : 4;
        const maxLength = Number.isFinite(Number(properties?.maxLength)) 
            ? Number(properties.maxLength) 
            : defaultMax;
        
        const isPartCorrect = isAnswered && (
            Array.isArray(expected) 
                ? expected.includes(String(val).trim())
                : String(val).trim() === String(expected).trim()
        );

        const explicitSize = String(properties?.size || '').toLowerCase();
        const sizeClassName = explicitSize === 'small'
            ? styles.inputSmall
            : explicitSize === 'medium'
                ? styles.inputMedium
                : explicitSize === 'large'
                    ? styles.inputLarge
                    : explicitSize === 'one-digit'
                        ? styles.inputOneDigit
                        : '';
        
        const feedbackClass = isAnswered 
            ? (isPartCorrect ? styles.inputCorrect : styles.inputIncorrect) 
            : (config.instantFeedback && val 
                ? (isPartCorrect ? styles.inputCorrect : styles.inputInstantHint) 
                : '');

        // Guided Mode: Disable input if a previous blank is not yet correct
        let isLocked = false;
        if (config.guidedMode) {
            const allBlankIds = Array.isArray(properties.allBlankIds) ? properties.allBlankIds : [];
            const myIndex = allBlankIds.indexOf(partId);
            if (myIndex > 0) {
                for (let i = 0; i < myIndex; i++) {
                    const prevId = allBlankIds[i];
                    const prevExpected = getExpectedAnswer(prevId);
                    const prevVal = getValue(prevId);
                    const prevCorrect = Array.isArray(prevExpected) 
                        ? prevExpected.includes(String(prevVal).trim())
                        : String(prevVal).trim() === String(prevExpected).trim();
                    if (!prevCorrect) {
                        isLocked = true;
                        break;
                    }
                }
            }
        }

        const resolvedWidth = properties.width
            || (explicitSize
                ? undefined // Allow CSS to control width for small/medium/large
                : (maxLength <= 1 ? '52px' : `${Math.max(52, maxLength * 12 + 16)}px`));

        const interaction = properties || {};
        
        // Handle MCQ Dropdowns (from metadata or explicit type)
        const isMcq = interaction.type === 'mcq' || properties.type === 'mcq' || Array.isArray(interaction.options);
        
        if (isMcq) {
            const options = Array.isArray(interaction.options) ? interaction.options : (Array.isArray(properties.options) ? properties.options : []);
            return (
                <select
                    key={`mcq-select-${partId}`}
                    className={`${styles.select} ${feedbackClass}`.trim()}
                    value={displayValue}
                    onChange={(e) => handleInputChange(partId, e.target.value)}
                    onFocus={() => setLastFocusedId(partId)}
                    disabled={isAnswered || isLocked}
                    style={{ opacity: isLocked ? 0.5 : 1 }}
                >
                    <option value="">Select...</option>
                    {options.map((opt, i) => {
                        const optValue = typeof opt === 'object' ? (opt.value ?? opt.label) : opt;
                        const optLabel = typeof opt === 'object' ? (opt.label ?? opt.value) : opt;
                        return (
                            <option key={i} value={String(optValue)}>
                                {String(optLabel)}
                            </option>
                        );
                    })}
                </select>
            );
        }

        // Standard Text Input
        return (
            <input
                key={`raw-input-${partId}`}
                type="text"
                className={`${styles.input} ${sizeClassName} ${feedbackClass}`.trim()}
                value={displayValue}
                onChange={(e) => handleInputChange(partId, e.target.value)}
                onFocus={() => setLastFocusedId(partId)}
                ref={(el) => {
                    if (el) arithmeticCellRefs.current[partId] = el;
                }}
                disabled={isAnswered || isLocked}
                placeholder={isLocked ? '🔒' : (typeof properties.placeholder === 'string' ? properties.placeholder : '')}
                aria-label={properties.placeholder || partId || 'blank input'}
                style={{ width: resolvedWidth, opacity: isLocked ? 0.5 : 1 }}
                inputMode={showKeypad ? 'none' : inputConfig.inputMode}
                pattern={inputConfig.pattern}
                maxLength={maxLength}
            />
        );
    };

    const wrapPart = (part, index, content) => {
        if (content === null) return null;
        const isVertical = Boolean(part?.isVertical ?? q.isVertical);
        return (
            <div
                key={`wrap-${index}`}
                className={`${styles.partWrapper} ${isVertical ? styles.verticalPart : styles.inlinePart}`}
            >
                {content}
            </div>
        );
    };

    const renderCompositePart = (part, index) => {
        const childParts = Array.isArray(part?.parts) ? part.parts : [];
        if (childParts.length === 0) return null;

        return (
            <div className={styles.pairedRow}>
                {childParts.map((child, childIndex) => renderPart(child, `${index}-${childIndex}`))}
            </div>
        );
    };

    const renderTextWithBlanks = (text, keyPrefix = '', options = {}) => {
        let normalized = String(text ?? '');
        
        // Basic Markdown-like preprocessing for headers
        normalized = normalized.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        normalized = normalized.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        normalized = normalized.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Convert newlines to <br/> if not already handled
        if (!normalized.includes('<br')) {
            normalized = normalized.replace(/\n/g, '<br/>');
        }

        const tokens = normalized.split(/(!\[.*?\]\(.*?\)|\[\[.*?\]\]|\[.*?\]|\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$)/g).filter(Boolean);

        const allBlankIds = tokens
            .filter(t => (t.startsWith('[[') && t.endsWith(']]')) || (t.startsWith('[') && t.endsWith(']')))
            .map(t => t.startsWith('[[') ? t.slice(2, -2).trim() : t.slice(1, -1).trim())
            .filter(id => id && !id.startsWith('!'));

        const renderTokens = (tkns, kp) => tkns.map((token, idx) => {
            // Handle Markdown Image: ![alt](url)
            if (token.startsWith('!') && token.includes('[') && token.includes('(')) {
                const imgMatch = token.match(/!\[(.*?)\]\((.*?)\)/);
                if (imgMatch) {
                    const alt = imgMatch[1];
                    const url = imgMatch[2];
                    return (
                        <span key={`${kp}-${idx}`} className={styles.inlineImageWrapper}>
                            <img src={url} alt={alt} className={styles.inlineImage} />
                        </span>
                    );
                }
            }
            if ((token.startsWith('[[') && token.endsWith(']]')) || (token.startsWith('[') && token.endsWith(']'))) {
                let blankId = '';
                if (token.startsWith('[[') && token.endsWith(']]')) {
                    blankId = token.slice(2, -2).trim();
                } else if (token.startsWith('[blank:')) {
                    blankId = token.slice(7, -1).trim();
                } else if (token.startsWith('[input:')) {
                    blankId = token.slice(7, -1).trim();
                } else {
                    blankId = token.slice(1, -1).trim();
                }
                return (
                    <span key={`blank-${kp}-${idx}`} className={styles.inlineBlankWrap}>
                        {renderInput(blankId || `md_p_${kp}_${idx}`, { 
                            placeholder: '',
                            ...(options.interactions?.[blankId] || {}),
                            allBlankIds
                        })}
                    </span>
                );
            }
            const isStandardLatex = (token.startsWith('\\(') && token.endsWith('\\)')) || (token.startsWith('\\[') && token.endsWith('\\]'));
            const isShorthandLatex = (token.startsWith('$') && token.endsWith('$'));
            
            if (isStandardLatex || isShorthandLatex) {
                const isDisplay = token.startsWith('\\[') || token.startsWith('$$');
                const sliceN = (token.startsWith('$$')) ? 2 : (token.startsWith('$') ? 1 : 2);
                const latexContent = token.slice(sliceN, -sliceN).trim();

                if (latexContent.includes('[') && latexContent.includes(']')) {
                    const latexHoles = latexWithInteractivePlaceholders(latexContent);
                    const placeholderIds = extractLatexPlaceholderIds(latexContent);
                    const html = renderLatexToHtml(latexHoles, isDisplay);
                    
                    return (
                        <div key={`latex-int-${kp}-${idx}`} className={isDisplay ? styles.mathLatexDisplay : styles.mathLatexInteractive}>
                            <InlineLatexBlanks
                                part={{ content: latexContent }}
                                html={html}
                                placeholderIds={placeholderIds}
                                userAnswer={userAnswer}
                                isAnswered={isAnswered}
                                onInputChange={handleInputChange}
                                onFocus={setLastFocusedId}
                                inputRefs={arithmeticCellRefs}
                                getInputConfig={getInputConfig}
                                showKeypad={showKeypad}
                                correctAnswers={correctAnswers}
                                isCorrect={isCorrect}
                                interactions={options.interactions || {}}
                                allBlankIds={allBlankIds}
                                renderInput={renderInput}
                            />
                        </div>
                    );
                }

                return (
                    <span 
                        key={`latex-${kp}-${idx}`} 
                        className={isDisplay ? styles.mathLatexDisplay : styles.mathLatexInline}
                        dangerouslySetInnerHTML={{ __html: renderLatexToHtml(latexContent, isDisplay) }}
                    />
                );
            }

            const subTokens = token.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
            return subTokens.map((st, sidx) => {
                if (st.startsWith('**') && st.endsWith('**')) return <strong key={sidx}>{st.slice(2, -2)}</strong>;
                if (st.startsWith('*') && st.endsWith('*')) return <em key={sidx}>{st.slice(1, -1)}</em>;
                if (st.startsWith('`') && st.endsWith('`')) return <code key={sidx}>{st.slice(1, -1)}</code>;
                
                if (options.allowHtml) {
                    return (
                        <span 
                            key={sidx}
                            dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(st) }}
                        />
                    );
                }
                return <span key={sidx}>{st}</span>;
            });
        });

        // Markdown Table Support
        if (normalized.includes('|') && normalized.includes('---')) {
            const lines = normalized.trim().split('\n');
            const tableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

            if (tableLines.length >= 3) {
                const parseRow = (line) => line.trim().split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
                const headers = parseRow(tableLines[0]);
                const separator = parseRow(tableLines[1]);

                if (separator.every(s => s.includes('-'))) {
                    const rows = tableLines.slice(2).map(parseRow);
                    return (
                        <div className={styles.markdownTableWrap}>
                            <table className={styles.smartTable}>
                                <thead>
                                    <tr>
                                        {headers.map((h, i) => <th key={i} className={styles.smartTableHeaderCell}>{renderTokens(h.split(/(\[.*?\])/g), `h${i}`)}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, ri) => (
                                        <tr key={ri}>
                                            {row.map((cell, ci) => (
                                                <td key={ci} className={styles.smartTableCell}>
                                                    {renderTokens(cell.split(/(\[.*?\])/g), `r${ri}c${ci}`)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
            }
        }

        return renderTokens(tokens, keyPrefix);
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
            const maxLen = inputEl ? inputEl.maxLength : (currentVal.length + (keyValue.length || 1));
            // If it's a multi-character string (word/emoji) and we are at maxLen, should we replace or ignore?
            // For strings, we usually want to allow them if they fit.
            if (maxLen <= 0 || currentVal.length + keyValue.length <= maxLen || (inputEl && inputEl.type !== 'text')) {
                // If maxLen is 1 (digit) and we have a value, replace if it's a single char, or append if it fits.
                if (maxLen === 1 && currentVal.length > 0) newVal = keyValue;
                else newVal = currentVal + keyValue;
            } else if (maxLen > 0 && keyValue.length >= maxLen) {
                // If the key itself is longer than or equal to maxLen, let it replace the whole thing if it fits maxLen
                newVal = keyValue.slice(0, maxLen);
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
            const rawText = String(text || '');
            const tokens = [];
            let i = 0;
            let lenCount = 0;
            while (i < rawText.length) {
                if (rawText[i] === '*' && i + 1 < rawText.length) {
                    tokens.push({ char: rawText[i + 1], highlight: true });
                    i += 2;
                } else {
                    tokens.push({ char: rawText[i], highlight: false });
                    i += 1;
                }
                lenCount += 1;
            }
            const pad = Math.max(0, maxColumns - lenCount);
            return (
                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                    {Array.from({ length: pad }).map((_, idx) => (
                        <span key={`pad-${idx}`} className={styles.arGridCell} />
                    ))}
                    {tokens.map((token, idx) => (
                        <span 
                            key={`ch-${idx}`} 
                            className={`${styles.arGridCell} ${token.highlight ? styles.arGridCellHighlighted : ''}`}
                        >
                            {token.char}
                        </span>
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
                                                inputMode={showKeypad ? 'none' : "numeric"}
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
                        const startCol = leftPad + 1;
                        const endCol = maxColumns + 1;
                        const isJoined = row.variant === 'joined' || row.isJoined;

                        return (
                            <div key={`ar-row-${rowIndex}`} className={styles.arAnswerRow}>
                                <div className={styles.arGridRow} style={{ '--cols': maxColumns }}>
                                    {Array.from({ length: leftPad }).map((_, i) => (
                                        <span key={`ans-pad-${i}`} className={styles.arGridCell} />
                                    ))}
                                    
                                    <div 
                                        className={isJoined ? styles.arAnswerJoinedGroup : styles.arAnswerSimpleGroup}
                                        style={{ gridColumn: `${startCol} / ${endCol}` }}
                                    >
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
                                                        style={{ ...cell.style }}
                                                        disabled={isAnswered || isRowLocked}
                                                        readOnly={useDigitPad}
                                                        inputMode={(showKeypad || useDigitPad) ? 'none' : cfg.inputMode}
                                                        pattern={cfg.pattern}
                                                        maxLength={cfg.maxLength}
                                                        data-autofocus={cell.autoFocus || cell.autofocus}
                                                    />
                                                </span>
                                            );
                                        })}
                                    </div>
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
    const renderVerticalMultiply = (part) => {
        const cfg = part?.layout || {};
        const inputId = part.id || 'vertical_input';
        const expectedAns = String(cfg.expect || cfg.ans || cfg.answer || '');
        const inputFromLeftToRight = cfg.inputFromLeftToRight !== undefined
            ? parseBooleanLike(cfg.inputFromLeftToRight, true)
            : cfg.input_from_left_to_right !== undefined
                ? parseBooleanLike(cfg.input_from_left_to_right, true)
                : q?.adaptiveConfig?.data_source?.input_from_left_to_right !== undefined
                    ? parseBooleanLike(q.adaptiveConfig.data_source.input_from_left_to_right, true)
                    : true;

        return (
            <ArithmeticBlock
                v1={cfg.v1}
                v2={cfg.v2}
                operator={cfg.operator}
                result={expectedAns}
                inputId={inputId}
                userValue={getValue(inputId)}
                onInputChange={handleInputChange}
                isAnswered={isAnswered}
                showQuestionMark={cfg.showQuestionMark}
                carries={Array.isArray(cfg.carries) ? cfg.carries : []}
                inputFromLeftToRight={inputFromLeftToRight}
            />
        );
    };

    const renderBoxMethodMultiply = (part) => {
        const layout = part?.layout || {};
        const topParts = Array.isArray(layout.top_parts) ? layout.top_parts : [];
        const leftParts = Array.isArray(layout.left_parts) ? layout.left_parts : [];
        const cells = Array.isArray(layout.cells) ? layout.cells : [];
        const sumInputs = Array.isArray(layout.sum_inputs) ? layout.sum_inputs : [];
        const finalInput = layout.final_input || {};

        const topInput = sumInputs[0] || { id: 'row_sum_top', size: 'large' };
        const bottomInput = sumInputs[1] || { id: 'row_sum_bottom', size: 'large' };
        const finalId = finalInput.id || 'ans';

        const renderBoxMethodField = ({ id, segments = 4, active = false, offset = false }) => {
            const value = getValue(id);
            const showComma = segments >= 4;
            const showCursor = active && !value;

            return (
                <div
                    className={[
                        styles.boxMethodField,
                        active ? styles.boxMethodFieldActive : '',
                        segments === 4 ? styles.boxMethodFieldFour : styles.boxMethodFieldThree,
                        offset ? styles.boxMethodFieldOffset : ''
                    ].filter(Boolean).join(' ')}
                >
                    <div className={styles.boxMethodGuides} aria-hidden="true">
                        {Array.from({ length: segments - 1 }).map((_, guideIdx) => (
                            <span key={`${id}-guide-${guideIdx}`} className={styles.boxMethodGuide} />
                        ))}
                    </div>
                    {showComma ? <span className={styles.boxMethodComma}>,</span> : null}
                    {showCursor ? <span className={styles.boxMethodCursor}>|</span> : null}
                    <input
                        type="text"
                        className={styles.boxMethodFieldInput}
                        value={value}
                        onChange={(e) => handleInputChange(id, e.target.value)}
                        onFocus={() => setLastFocusedId(id)}
                        ref={(el) => {
                            if (el) arithmeticCellRefs.current[id] = el;
                        }}
                        disabled={isAnswered}
                        inputMode={showKeypad ? 'none' : 'numeric'}
                        pattern="[0-9,]*"
                        maxLength={5}
                        aria-label={id}
                    />
                </div>
            );
        };

        return (
            <div className={styles.boxMethodWrap}>
                <div className={styles.boxMethodBoard}>
                    <div className={styles.boxMethodTopLabel}>
                        {topParts.join(' + ')}
                    </div>
                    <div className={styles.boxMethodBody}>
                        <div className={styles.boxMethodLeftLabel}>
                            {leftParts.map((item, idx) => (
                                <span key={`left-${idx}`}>{idx > 0 ? `+ ${item}` : item}</span>
                            ))}
                        </div>
                        <div className={styles.boxMethodGridArea}>
                            <div className={styles.boxMethodGrid}>
                                {cells.map((cell, idx) => (
                                    <div key={`cell-${idx}`} className={styles.boxMethodCell}>{cell}</div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.boxMethodSums}>
                            <div className={styles.boxMethodRowInput}>
                                {renderBoxMethodField({ id: topInput.id, segments: 4, active: true })}
                            </div>
                            <div className={styles.boxMethodPlusRow}>
                                <span className={styles.boxMethodPlus}>+</span>
                                {renderBoxMethodField({ id: bottomInput.id, segments: 3, offset: true })}
                            </div>
                            <div className={styles.boxMethodDivider} />
                            <div className={styles.boxMethodRowInput}>
                                {renderBoxMethodField({ id: finalId, segments: 4 })}
                            </div>
                        </div>
                    </div>
                </div>
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
                        inputMode={showKeypad ? "none" : "numeric"}
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
                        inputMode={showKeypad ? "none" : "numeric"}
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
                        inputMode={showKeypad ? "none" : "numeric"}
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
                            value={getValue(inputId)}
                            onChange={(e) => handleInputChange(inputId, e.target.value)}
                            disabled={isAnswered}
                            aria-label={inputId}
                            inputMode={showKeypad ? "none" : inputConfig.inputMode}
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
                                    value={getValue(inputId)}
                                    onChange={(e) => handleInputChange(inputId, e.target.value)}
                                    disabled={isAnswered}
                                    aria-label={inputId}
                                    inputMode={showKeypad ? 'none' : inputConfig.inputMode}
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
        // Handle New Grid Format (from WEXLS Math Architect Blueprint)
        if (part.config && Array.isArray(part.cells)) {
            const rowCount = Number(part.config.rows || 1);
            const colCount = Number(part.config.cols || 1);
            const alignment = part.config.alignment || 'center';
            const showBorders = part.config.showBorders !== false;

            const grid = Array.from({ length: rowCount }).map(() => Array.from({ length: colCount }).fill(null));
            const focusFlow = [];

            // Calculate focus flow: rows top-to-bottom
            // within each row: if right-aligned, go Right-to-Left
            for (let r = 0; r < rowCount; r++) {
                const rowInputs = [];
                part.cells.forEach(cell => {
                    if (Number(cell.r) === r && cell.type === 'input') {
                        rowInputs.push(cell);
                    }
                    if (cell.r < rowCount && cell.c < colCount) grid[cell.r][cell.c] = cell;
                });
                
                // Sort by column
                rowInputs.sort((a, b) => Number(a.c) - Number(b.c));
                if (alignment === 'right' || part.className?.includes('arithmeticWork')) {
                   rowInputs.reverse(); // Ones -> Tens -> Hundreds (Pedagogical math flow)
                }
                rowInputs.forEach(ri => focusFlow.push(ri.id));
            }

            return (
                <div className={`${styles.smartTableOuter} ${part.className || ''}`}>
                    <div className={styles.smartTableContainer} style={{ border: showBorders ? undefined : 'none' }}>

                        <div className={styles.smartTableScroll}>
                            <table className={`${styles.smartTable} ${alignment === 'right' ? styles.smartTableRightAlign : ''}`} style={{ border: showBorders ? undefined : 'none' }}>
                                <tbody>
                                    {grid.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            {row.map((cell, cIdx) => {
                                                if (!cell) return <td key={cIdx} className={styles.smartTableCell} />;
                                                
                                                const isInput = cell.type === 'input';
                                                const isCarry = cell.id?.startsWith('c_') || rIdx === 0;
                                                const hasHighlight = cell.highlight === true;

                                                if (isInput) {
                                                    const maxLen = isCarry ? 1 : (cell.maxLength || 1);
                                                    return (
                                                        <td key={cIdx} className={`${styles.smartTableCell} ${hasHighlight ? styles.smartTableCellHighlighted : ''}`}>
                                                            <input
                                                                type="text"
                                                                className={isCarry ? styles.smartTableCarryInput : styles.smartTableInput}
                                                                value={getValue(cell.id)}
                                                                ref={(el) => {
                                                                    if (el) arithmeticCellRefs.current[cell.id] = el;
                                                                }}
                                                                inputMode={showKeypad ? 'none' : "numeric"}
                                                                placeholder={cell.placeholder || ''}
                                                                onChange={(e) => {
                                                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                                                    if (maxLen) val = val.slice(0, maxLen);
                                                                    handleInputChange(cell.id, val);
                                                                    
                                                                    // Auto-advance logic
                                                                    if (val.length >= maxLen && maxLen === 1 && !isAnswered) {
                                                                        const currentIdx = focusFlow.indexOf(cell.id);
                                                                        if (currentIdx !== -1 && currentIdx < focusFlow.length - 1) {
                                                                            const nextId = focusFlow[currentIdx + 1];
                                                                            setTimeout(() => {
                                                                                arithmeticCellRefs.current[nextId]?.focus();
                                                                            }, 10);
                                                                        }
                                                                    }
                                                                }}
                                                                onFocus={() => setLastFocusedId(cell.id)}
                                                                style={cell.style}
                                                                maxLength={maxLen}
                                                                disabled={isAnswered}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td 
                                                        key={cIdx} 
                                                        className={`${styles.smartTableCell} ${hasHighlight ? styles.smartTableCellHighlighted : ''}`}
                                                        style={{ color: cell.color || undefined, fontWeight: cell.fontWeight || undefined }}
                                                    >
                                                        <span className={cell.prefix ? styles.smartTablePrefixWrap : ''}>
                                                            {cell.prefix && <span className={styles.smartTablePrefix}>{cell.prefix}</span>}
                                                            {cell.content}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // Legacy Column/Row Format
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
                                                                value={getValue(cellValue.id)}
                                                                ref={(el) => {
                                                                    if (el) arithmeticCellRefs.current[cellValue.id] = el;
                                                                }}
                                                                inputMode={showKeypad ? 'none' : (isCarryInput ? 'numeric' : 'text')}
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
                        {hasInlineHtml(part.content) && !(part.content.includes('[[') || part.content.includes('[')) ? (
                            <div
                                className={styles.text}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(part.content) }}
                            />
                        ) : (
                            <div className={styles.text}>
                                {(() => {
                                    const normalized = String(part.content ?? '');
                                    if (!normalized) return null;

                                    if (normalized.includes('|') && normalized.includes('---')) {
                                        const lines = normalized.trim().split('\n');
                                        const tableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
                                        
                                        if (tableLines.length >= 3) {
                                            const parseRow = (line) => line.trim().split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim());
                                            const headers = parseRow(tableLines[0]);
                                            const separator = parseRow(tableLines[1]);

                                            if (separator.every(s => s.includes('-'))) {
                                                const rows = tableLines.slice(2).map(parseRow);
                                                return (
                                                    <div className={styles.markdownTableWrap}>
                                                        <table className={styles.smartTable}>
                                                            <thead>
                                                                <tr>
                                                                    {headers.map((h, i) => <th key={i} className={styles.smartTableHeaderCell}>{renderTextWithBlanks(h, `h${i}`)}</th>)}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rows.map((row, ri) => (
                                                                    <tr key={ri}>
                                                                        {row.map((cell, ci) => (
                                                                            <td key={ci} className={styles.smartTableCell}>
                                                                                {renderTextWithBlanks(cell, `r${ri}c${ci}`)}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            }
                                        }
                                    }

                                    return renderTextWithBlanks(normalized, 'main', { allowHtml: true });
                                })()}
                            </div>
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

            case 'svg': {
                const content = String(part.content || '');
                
                if (content.includes('[[') && content.includes(']]')) {
                    // Robust SVG Token Overlay System
                    const blanks = [];
                    // Regex to find foreignObject tags containing [[id]]
                    const foRegex = /<foreignObject\s+[^>]*x="([^"]+)"\s+[^>]*y="([^"]+)"\s+[^>]*width="([^"]+)"\s+[^>]*height="([^"]+)"[^>]*>[\s\S]*?\[\[(.*?)]][\s\S]*?<\/foreignObject>/gi;
                    
                    let match;
                    let sanitizedContent = content;
                    while ((match = foRegex.exec(content)) !== null) {
                        const [fullMatch, x, y, width, height, blankId] = match;
                        blanks.push({
                            id: blankId.trim(),
                            x: parseFloat(x),
                            y: parseFloat(y),
                            w: parseFloat(width),
                            h: parseFloat(height)
                        });
                        // Remove the token from the SVG to prevent double rendering if it's visible
                        sanitizedContent = sanitizedContent.replace(fullMatch, fullMatch.replace(`[[${blankId}]]`, ''));
                    }

                    return wrapPart(part, index, (
                        <div className={styles.svgInteractiveWrapper} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                            <div 
                                className={styles.svgBase}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(sanitizedContent) }}
                                style={{ width: '100%' }}
                            />
                            {/* Absolute Overlay for Blanks */}
                            <div className={styles.svgBlanksOverlay} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                {blanks.map((b, bi) => (
                                    <div 
                                        key={`${index}-svg-blank-${bi}`}
                                        style={{
                                            position: 'absolute',
                                            left: `${b.x}px`,
                                            top: `${b.y}px`,
                                            width: `${b.w}px`,
                                            height: `${b.h}px`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        {renderInput(b.id, { size: 'small', placeholder: '' })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ));
                }

                return wrapPart(part, index, (
                    <div
                        className={styles.svgContainer}
                        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(content) }}
                    />
                ));
            }

            case 'html': {
                const content = String(part.content || '');
                if (content.includes('[') && content.includes(']')) {
                    // Use renderTextWithBlanks to handle markers inside HTML
                    return wrapPart(part, index, (
                        <div className={styles.htmlWithBlanks}>
                            {renderTextWithBlanks(content, `html_${index}`, { allowHtml: true })}
                        </div>
                    ));
                }
                return wrapPart(part, index, (
                    <div
                        className={styles.htmlContainer}
                        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(content) }}
                    />
                ));
            }

            case 'box_display': {
                const values = Array.isArray(part.content) ? part.content : [];
                const handleBoxItemClick = (val) => {
                    if (!lastFocusedId || isAnswered) return;
                    handleInputChange(lastFocusedId, String(val));
                };
                return wrapPart(part, index, (
                    <div className={styles.boxDisplay}>
                        {values.map((value, valueIndex) => (
                            <button
                                key={`${index}-${valueIndex}`}
                                className={styles.boxDisplayItem}
                                onClick={() => handleBoxItemClick(value)}
                                disabled={isAnswered}
                                type="button"
                            >
                                {String(value)}
                            </button>
                        ))}
                    </div>
                ));
            }

            case 'sequence':
                const isCommaSeparated = Boolean(part?.isCommaSeparated || part?.is_comma_separated);
                const children = Array.isArray(part.children) ? part.children : [];
                return wrapPart(part, index, (
                    <div className={`${styles.sequence} ${isCommaSeparated ? styles.commaSeparated : ''}`}>
                        {children.map((child, childIndex) => (
                            <span key={`${index}-${childIndex}`} className={styles.sequenceItem}>
                                {renderPart(child, `${index}-${childIndex}`)}
                                {isCommaSeparated && childIndex < children.length - 1 && (
                                    <span className={styles.sequenceComma}>,</span>
                                )}
                            </span>
                        ))}
                    </div>
                ));

            case 'pair':
                return wrapPart(part, index, renderCompositePart(part, index));

            case 'digit_blank':
                return wrapPart(part, index, (
                    <span className={styles.inlineBlankWrap}>
                        {renderInput(part.id || `digit_blank_${index}`, {
                            placeholder: part.placeholder || '',
                            answerType: part.answerType || 'number',
                            maxLength: Number(part.size) > 0 ? Number(part.size) : 1,
                        })}
                    </span>
                ));

            case 'blank':
            case 'input':
                return wrapPart(part, index, renderInput(part.id, part));

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
                        showKeypad={showKeypad}
                        correctAnswers={correctAnswers}
                        isCorrect={isCorrect}
                        interactions={{ [part.id]: part }}
                        allBlankIds={[part.id]}
                        renderInput={renderInput}
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

            case 'verticalMultiply':
            case 'v1v2Multiply':
                return wrapPart(part, index, renderVerticalMultiply(part));

            case 'boxMethodMultiply':
                return wrapPart(part, index, renderBoxMethodMultiply(part));

            case 'blank':
                return wrapPart(part, index, (
                    <span className={styles.inlineBlankWrap}>
                         {renderInput(part.id || `blank_${index}`, { placeholder: part.placeholder || '' })}
                    </span>
                ));

            case 'table':
                if (part.content && typeof part.content === 'string' && part.content.includes('|')) {
                    return wrapPart(part, index, (
                        <div className={styles.markdownTableWrap}>
                             {renderTextWithBlanks(part.content, `table_${index}`)}
                        </div>
                    ));
                }
                return wrapPart(part, index, renderSmartTable(part));

            case 'smartTable':
                return wrapPart(part, index, renderSmartTable(part));

            case 'labeledBaseTenGrid': {
                const hasThousands = Number(part.thousands || 0) > 0 || part.showThousands;
                const columns = hasThousands ? 4 : 3;
                return wrapPart(part, index, (
                    <div style={{ width: '100%', overflowX: 'auto', margin: '1.5rem 0', WebkitOverflowScrolling: 'touch' }}>
                        <div style={{ 
                            margin: '0 auto', 
                            minWidth: hasThousands ? '600px' : '450px',
                            maxWidth: hasThousands ? '1000px' : '800px',
                            border: '2px solid #000', 
                            background: '#fff', 
                            fontFamily: 'system-ui, -apple-system, sans-serif' 
                        }}>
                            <div style={{ 
                                borderBottom: '2px solid #000', 
                                padding: '0.75rem', 
                                textAlign: 'center', 
                                fontSize: '1.4rem', 
                                fontWeight: 800,
                                color: '#000'
                            }}>
                                Blocks
                            </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                            {hasThousands && (
                                <div style={{ 
                                    borderRight: '2px solid #000', 
                                    padding: '1.5rem 1rem', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    minHeight: '260px'
                                }}>
                                    <div><BaseTenBlocks thousands={part.thousands || 0} variant="green" /></div>
                                    <div style={{ 
                                        border: '2px solid #000', 
                                        padding: '0.4rem 1.2rem', 
                                        fontWeight: 800, 
                                        fontSize: '1.2rem', 
                                        color: '#000',
                                        marginTop: '2rem'
                                    }}>Thousands</div>
                                </div>
                            )}

                            <div style={{ 
                                borderRight: '2px solid #000', 
                                padding: '1.5rem 1rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                minHeight: '260px'
                            }}>
                                <div><BaseTenBlocks hundreds={part.hundreds || 0} variant="green" /></div>
                                <div style={{ 
                                    border: '2px solid #000', 
                                    padding: '0.4rem 1.2rem', 
                                    fontWeight: 800, 
                                    fontSize: '1.2rem', 
                                    color: '#000',
                                    marginTop: '2rem'
                                }}>Hundreds</div>
                            </div>
                            
                            <div style={{ 
                                borderRight: '2px solid #000', 
                                padding: '1.5rem 1rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                minHeight: '260px'
                            }}>
                                <div><BaseTenBlocks tens={part.tens || 0} variant="green" /></div>
                                <div style={{ 
                                    border: '2px solid #000', 
                                    padding: '0.4rem 1.2rem', 
                                    fontWeight: 800, 
                                    fontSize: '1.2rem', 
                                    color: '#000',
                                    marginTop: '2rem'
                                }}>Tens</div>
                            </div>

                            <div style={{ 
                                padding: '1.5rem 1rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                minHeight: '260px'
                            }}>
                                <div><BaseTenBlocks ones={part.ones || 0} variant="green" /></div>
                                <div style={{ 
                                    border: '2px solid #000', 
                                    padding: '0.4rem 1.2rem', 
                                    fontWeight: 800, 
                                    fontSize: '1.2rem', 
                                    color: '#000',
                                    marginTop: '2rem'
                                }}>Ones</div>
                            </div>
                        </div>
                    </div>
                    </div>
                ));
            }

            case 'base10Visual':
            case 'baseTenBlocks':
            case 'base_ten_blocks':
                return wrapPart(part, index, (
                    <BaseTenBlocks
                        thousands={part.value ? Math.floor(Number(part.value) / 1000) : (part.thousands || 0)}
                        hundreds={part.value ? Math.floor((Number(part.value) % 1000) / 100) : (part.hundreds || 0)}
                        tens={part.value ? Math.floor((Number(part.value) % 100) / 10) : (part.tens || 0)}
                        ones={part.value ? (Number(part.value) % 10) : (part.ones || 0)}
                    />
                ));

            case 'numberLineRounding':
                return wrapPart(part, index, (
                    <NumberLineRounding
                        min={Number(part.min || 0)}
                        max={Number(part.max || 0)}
                        mid={Number(part.mid || 0)}
                        current={Number(part.current || 0)}
                        distLow={Number(part.distLow || 0)}
                        distHigh={Number(part.distHigh || 0)}
                        distMid={Number(part.distMid || 0)}
                    />
                ));

            case 'dotsGrouping':
            case 'dots_grouping':
                return wrapPart(part, index, <DotsGroupingVisual part={part} />);

            case 'dotArray':
            case 'dot_array':
                return wrapPart(part, index, <DotArrayVisual part={part} />);

            case 'shadeGrid':
            case 'fractionModel':
                return wrapPart(part, index, <FractionModelVisual part={part} />);

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

            if (isEquationLabel && isPairableInput && !q.isVertical) {
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
    // Logic updated to ensure instructions are handled separately
    const showQuestionText = Boolean(questionText);

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.questionCard}>
                {showQuestionText && (
                    <div className={styles.questionTextRow}>
                        <span className={styles.questionText}>{renderTextWithBlanks(questionText, 'qtext')}</span>
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
                    {renderQuestionParts().filter(row => {
                         // Skip rendering the part if it's an exact duplicate of the header text we already showed
                         if (!row) return false;
                         const partIndex = row.key?.split('-')[1];
                         const part = q.parts[partIndex];
                         return !(part?.type === 'text' && String(part?.content || '').trim() === questionText);
                    })}
                </div>

                {!isAnswered && showKeypad && (
                    <div className={styles.virtualKeypad}>
                        {(q.adaptiveConfig?.keypadKeys || q.keypadKeys || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '>', '<', '=', '⌫']).map((key, i) => {
                            const label = typeof key === 'object' ? key.label : key;
                            const value = typeof key === 'object' ? key.value : (key === '⌫' ? 'BACKSPACE' : key);
                            const isIcon = typeof key === 'object' && (key.icon || key.image);
                            
                            return (
                                <button
                                    key={typeof key === 'object' ? (key.id || `key-${i}`) : `key-${key}-${i}`}
                                    type="button"
                                    className={`${styles.keypadButton} ${String(label).length > 2 ? styles.keypadButtonWide : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Keep focus on input
                                        handleKeypadPress(value);
                                    }}
                                >
                                    {isIcon ? (
                                        <SafeImage src={key.icon || key.image} alt={label} width={24} height={24} />
                                    ) : (isInlineSvg(label) ? (
                                        <div 
                                            className={styles.keypadSvgWrap} 
                                            dangerouslySetInnerHTML={{ __html: label }} 
                                        />
                                    ) : label)}
                                </button>
                            );
                        })}
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
