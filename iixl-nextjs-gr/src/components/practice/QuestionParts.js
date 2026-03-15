'use client';

import { useMemo } from 'react';
import styles from './QuestionParts.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SpeakerButton from './SpeakerButton';
import SafeImage from './SafeImage';
import { latexWithPlaceholderBoxes, renderLatexToHtml } from './latexUtils';
import FractionModelVisual from './FractionModelVisual';

/**
 * @typedef {Object} QuestionPart
 * @property {string} type
 * @property {string} [content]
 * @property {string} [imageUrl]
 * @property {QuestionPart[]} [children]
 * @property {boolean} [isVertical] - Defaults to false when omitted.
 * @property {boolean} [hasAudio] - Show speaker only when true.
 * @property {number} [count] - Repeat image part this many times.
 */

function renderInlineMarkdown(text) {
    const normalized = String(text ?? '');
    if (!normalized) return null;

    const tokens = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);

    return tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
            return <strong key={`md-b-${idx}`}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
            return <em key={`md-i-${idx}`}>{token.slice(1, -1)}</em>;
        }
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
            return <code key={`md-c-${idx}`}>{token.slice(1, -1)}</code>;
        }
        return <span key={`md-t-${idx}`}>{token}</span>;
    });
}

function renderLongMultiply(part, index, styles) {
    const cfg = part?.layout || {};
    const operator = String(cfg.operator || '×');
    const top = String(cfg.top ?? cfg.multiplicand ?? '');
    const bottom = String(cfg.bottom ?? cfg.multiplier ?? '');
    const answer = String(cfg.answer ?? '');
    const answerColor = String(cfg.answerColor || '#4f57ff');
    const boxCount = Number(cfg.boxCount ?? 0);

    const explicitCols = Number(cfg.cols);
    const topChars = Array.isArray(cfg.topDigits) ? cfg.topDigits : top.split('');
    const bottomChars = Array.isArray(cfg.bottomDigits) ? cfg.bottomDigits : bottom.split('');
    const resultChars = Array.isArray(cfg.resultDigits) ? cfg.resultDigits : answer.split('');
    const autoCols = Math.max(topChars.length, bottomChars.length, resultChars.length, 1);
    const cols = Number.isFinite(explicitCols) && explicitCols > 0 ? explicitCols : autoCols;

    const toCellObject = (item, fallbackColor = '') => {
        if (item && typeof item === 'object') {
            return { value: String(item.value ?? ''), color: String(item.color || fallbackColor) };
        }
        return { value: String(item ?? ''), color: fallbackColor };
    };

    const rightAlignCells = (source, fallbackColor = '') => {
        const normalized = (Array.isArray(source) ? source : []).map((item) => toCellObject(item, fallbackColor));
        const pad = Math.max(0, cols - normalized.length);
        return [
            ...Array.from({ length: pad }).map(() => ({ value: '', color: '' })),
            ...normalized.slice(-cols),
        ];
    };

    const carrySlots = Array.from({ length: cols }).map(() => ({ value: '', color: '' }));
    const carries = Array.isArray(cfg.carries) ? cfg.carries : [];
    carries.forEach((entry) => {
        const col = Number(entry?.col);
        if (!Number.isFinite(col) || col < 0 || col >= cols) return;
        carrySlots[col] = {
            value: String(entry?.value ?? ''),
            color: String(entry?.color || '#16a34a'),
        };
    });
    const carryText = String(cfg.carry ?? '');
    if (carryText && carries.length === 0) {
        const chars = carryText.split('').map((ch) => ({ value: ch, color: '#16a34a' }));
        const aligned = rightAlignCells(chars);
        aligned.forEach((cell, idxCell) => {
            carrySlots[idxCell] = cell;
        });
    }

    const topSlots = rightAlignCells(topChars);
    const bottomFallbackColor = String(cfg.bottomColor || '');
    const topFallbackColor = String(cfg.topColor || '');
    topSlots.forEach((cell) => {
        if (!cell.color) cell.color = topFallbackColor;
    });
    const bottomSlots = rightAlignCells(bottomChars, bottomFallbackColor);
    const resultFallbackColor = String(cfg.resultColor || answerColor);
    const resultSlots = rightAlignCells(resultChars, resultFallbackColor);

    if (boxCount > 0) {
        return (
            <div key={index} className={styles.longMultiply}>
                <div className={styles.longRow}>{top}</div>
                <div className={styles.longRow}>
                    <span className={styles.longOperator}>{operator}</span>
                    <span>{bottom}</span>
                </div>
                <div className={styles.longDivider} />
                <div className={styles.longBoxes}>
                    {Array.from({ length: boxCount }).map((_, boxIdx) => (
                        <span key={`box-${index}-${boxIdx}`} className={styles.longBox}>
                            {answer[boxIdx] ?? ''}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div key={index} className={styles.longMultiplyGrid} style={{ '--long-cols': cols }}>
            <div className={styles.longCarryRow}>
                <span className={styles.longOpCell} />
                {carrySlots.map((cell, slotIdx) => (
                    <span key={`carry-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell} />
                {topSlots.map((cell, slotIdx) => (
                    <span key={`top-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell}>{operator}</span>
                {bottomSlots.map((cell, slotIdx) => (
                    <span key={`bot-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
            <div className={styles.longDividerRow}>
                <span className={styles.longOpCell} />
                <span className={styles.longDivider} />
            </div>
            <div className={styles.longMathRow}>
                <span className={styles.longOpCell} />
                {resultSlots.map((cell, slotIdx) => (
                    <span key={`res-${index}-${slotIdx}`} className={styles.longCell} style={{ color: cell.color || undefined }}>
                        {cell.value}
                    </span>
                ))}
            </div>
        </div>
    );
}
function renderPictureEquation(part, index, styles) {
    const cfg = part?.layout || {};
    const left = { emoji: cfg.left?.emoji || '🍐', count: Number(cfg.left?.count || 0) };
    const right = { emoji: cfg.right?.emoji || '🍐', count: Number(cfg.right?.count || 0) };
    const totalCount = Number(cfg.total?.count || 0);

    const emojiLine = (emoji, count) => Array.from({ length: Math.min(count, 20) }).map(() => emoji).join('');

    return (
        <div key={index} className={styles.pictureEq}>
            <div className={styles.pictureTerm}>
                <div className={styles.pictureEmoji}>{emojiLine(left.emoji, left.count)}</div>
                <div className={styles.pictureBoxStatic}>{left.count}</div>
            </div>
            <div className={styles.pictureOp}>+</div>
            <div className={styles.pictureTerm}>
                <div className={styles.pictureEmoji}>{emojiLine(right.emoji, right.count)}</div>
                <div className={styles.pictureBoxStatic}>{right.count}</div>
            </div>
            <div className={styles.pictureOp}>=</div>
            <div className={styles.pictureTerm}>
                <div className={styles.pictureEmoji} />
                <div className={styles.pictureBoxStatic}>{totalCount || '?'}</div>
            </div>
        </div>
    );
}

function renderButterflyFraction(part, index, styles) {
    const layout = part?.layout || {};
    const canvasWidth = Number(layout?.canvas?.width || 620);
    const canvasHeight = Number(layout?.canvas?.height || 460);

    return (
        <div key={index} className={styles.butterflyStatic} style={{ '--bf-w': canvasWidth, '--bf-h': canvasHeight }}>
            <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className={styles.bfSvg}>
                <path d="M220 142 C255 178, 300 200, 360 225" fill="none" stroke="#f29bb2" strokeWidth="4" />
                <path d="M360 142 C325 178, 280 200, 220 225" fill="none" stroke="#f29bb2" strokeWidth="4" />
                <text x="220" y="145" className={styles.bfText}>{layout.leftFraction?.num}</text>
                <text x="220" y="230" className={styles.bfText}>{layout.leftFraction?.den}</text>
                <text x="360" y="145" className={styles.bfText}>{layout.rightFraction?.num}</text>
                <text x="360" y="230" className={styles.bfText}>{layout.rightFraction?.den}</text>
            </svg>
        </div>
    );
}

function renderArithmeticLayout(part, index, styles) {
    const rows = Array.isArray(part?.layout?.rows) ? part.layout.rows : [];
    return (
        <div key={index} className={styles.arithmeticStatic}>
            {rows.map((row, rIdx) => {
                const kind = String(row?.kind || '').toLowerCase();
                if (kind === 'divider') return <div key={rIdx} className={styles.arDivider} />;
                const text = row.text || (row.cells || []).map(c => c.text || c.value || c.correctValue || '').join('') || row.prefix || '';
                return <div key={rIdx} className={styles.arRow}>{text}</div>;
            })}
        </div>
    );
}

function renderGridArithmetic(part, index, styles) {
    const layout = part?.layout || {};
    const rows = Number(layout.rows || 1);
    const cols = Number(layout.cols || 1);
    const cells = Array.isArray(layout.cells) ? layout.cells : [];

    const grid = Array.from({ length: rows }).map(() => Array.from({ length: cols }).fill(null));
    cells.forEach(c => {
        if (c.r < rows && c.c < cols) grid[c.r][c.c] = c.value;
    });

    return (
        <div key={index} className={styles.gridStatic} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {grid.flat().map((val, i) => (
                <div key={i} className={styles.gridCellStatic}>{val}</div>
            ))}
        </div>
    );
}

function renderSmartTable(part, index, styles) {
    const title = part?.title || '';
    const columns = Array.isArray(part?.columns) ? part.columns : [];
    const rows = Array.isArray(part?.rows) ? part.rows : [];

    return (
        <div key={index} className={styles.smartTableOuter}>
            <div className={styles.smartTableContainer}>
                {title && <div className={styles.smartTableTitle}>{title}</div>}
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
                                const isCarry = rowLabel === 'carry' || rowLabel === 'borrow' || row.kind === 'carry';
                                return (
                                    <tr key={rowIndex} className={`${isTotal ? styles.smartTableRowTotal : ''} ${isCarry ? styles.smartTableRowCarry : ''}`}>
                                        {columns.map((col, colIndex) => {
                                            const cellValue = row[col.key];
                                            const isLabelColumn = col.key === 'label';
                                            const val = (cellValue && typeof cellValue === 'object')
                                                ? (cellValue.value || cellValue.correctValue || '')
                                                : cellValue;
                                            return (
                                                <td
                                                    key={`${rowIndex}-${colIndex}`}
                                                    className={`${styles.smartTableCell} ${isLabelColumn ? styles.smartTableLabelCell : ''} ${!col.header ? styles.smartTableNarrowCell : ''}`}
                                                >
                                                    {isCarry && !isLabelColumn && val !== "" ? (
                                                        <span className={styles.smartTableCarryCircle}>{val}</span>
                                                    ) : val}
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
}

export default function QuestionParts({ parts, isVertical: defaultVertical = false, className = '' }) {
    const safeParts = useMemo(() => {
        let rawParts = parts;
        if (typeof parts === 'string') {
            try {
                rawParts = JSON.parse(parts);
            } catch {
                rawParts = [];
            }
        }
        if (!Array.isArray(rawParts)) rawParts = [];

        const normalize = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            const res = { ...obj };
            // Root/part normalization
            if (res.question_text !== undefined && res.questionText === undefined) res.questionText = res.question_text;
            if (res.is_vertical !== undefined && res.isVertical === undefined) res.isVertical = res.is_vertical;
            if (res.inVertical !== undefined && res.isVertical === undefined) res.isVertical = res.inVertical;
            if (res.in_vertical !== undefined && res.isVertical === undefined) res.isVertical = res.in_vertical;
            if (res.correct_answer_value !== undefined && res.correctAnswerValue === undefined) res.correctAnswerValue = res.correct_answer_value;
            if (res.micro_skill_id !== undefined && res.microSkillId === undefined) res.microSkillId = res.micro_skill_id;
            if (res.is_multi_select !== undefined && res.isMultiSelect === undefined) res.isMultiSelect = res.is_multi_select;

            // Simple table normalization (headers: [], rows: [[]])
            if ((res.type === 'table' || res.type === 'smartTable') && Array.isArray(res.headers) && !res.columns) {
                res.columns = res.headers.map((h, i) => ({ key: `col_${i}`, header: h }));
                if (Array.isArray(res.rows)) {
                    res.rows = res.rows.map(row => {
                        if (Array.isArray(row)) {
                            const rowObj = {};
                            row.forEach((cell, i) => { rowObj[`col_${i}`] = cell; });
                            return rowObj;
                        }
                        return row;
                    });
                }
            }

            if (Array.isArray(res.children)) {
                res.children = res.children.map(normalize);
            }
            if (Array.isArray(res.parts)) {
                res.parts = res.parts.map(normalize);
            }
            return res;
        };

        return rawParts.map(normalize);
    }, [parts]);
    const getRepeatCount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return Math.min(Math.floor(parsed), 24);
    };

    const renderImageSet = (imageSrc, part, index) => {
        const repeatCount = getRepeatCount(part?.count);
        if (isInlineSvg(imageSrc)) {
            return (
                <div key={index} className={styles.svgContainer}>
                    {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                        <div
                            key={`svg-${index}-${imageIndex}`}
                            dangerouslySetInnerHTML={{ __html: imageSrc }}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div key={index} className={styles.imageContainer}>
                {Array.from({ length: repeatCount }).map((_, imageIndex) => (
                    (() => {
                        const isAboveFoldImage = index === 0 && imageIndex === 0;
                        return (
                            <SafeImage
                                key={`img-${index}-${imageIndex}`}
                                src={imageSrc}
                                alt={`Question image ${imageIndex + 1}`}
                                className={styles.image}
                                width={320}
                                height={150}
                                style={{
                                    maxWidth: part.width ? `${part.width}px` : undefined,
                                    maxHeight: part.height ? `${part.height}px` : undefined,
                                }}
                                sizes="(max-width: 768px) 70vw, 320px"
                                priority={isAboveFoldImage}
                                loading={isAboveFoldImage ? 'eager' : 'lazy'}
                            />
                        );
                    })()
                ))}
            </div>
        );
    };

    const renderPartContent = (part, index) => {
        const imageSrc = getImageSrc(part?.imageUrl || part?.content);

        switch (part.type) {
            case 'text':
                if (isInlineSvg(part.content)) {
                    return (
                        <div
                            key={index}
                            className={styles.svgContainer}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                        />
                    );
                }
                if (isImageUrl(part.content)) {
                    const isAboveFoldImage = index === 0;
                    return (
                        <div key={index} className={styles.imageContainer}>
                            <SafeImage
                                src={part.content}
                                alt="Question visual"
                                className={styles.urlImage}
                                width={320}
                                height={150}
                                sizes="(max-width: 768px) 70vw, 320px"
                                priority={isAboveFoldImage}
                                loading={isAboveFoldImage ? 'eager' : 'lazy'}
                            />
                        </div>
                    );
                }
                return (
                    <div key={index} className={styles.textRow}>
                        {Boolean(part?.hasAudio) && <SpeakerButton text={part.content} />}
                        {hasInlineHtml(part.content) ? (
                            <span
                                className={styles.text}
                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(part.content) }}
                            />
                        ) : (
                            <span className={styles.text}>
                                {renderInlineMarkdown(part.content)}
                            </span>
                        )}
                    </div>
                );

            case 'image':
                return renderImageSet(imageSrc, part, index);

            case 'svg':
                return (
                    <div
                        key={index}
                        className={styles.svgContainer}
                        dangerouslySetInnerHTML={{ __html: part.content }}
                    />
                );

            case 'sequence':
                const isCommaSeparated = Boolean(part?.isCommaSeparated || part?.is_comma_separated);
                const children = Array.isArray(part.children) ? part.children : [];
                return (
                    <div key={index} className={`${styles.sequence} ${isCommaSeparated ? styles.commaSeparated : ''}`}>
                        {children.map((child, childIndex) => (
                            <span key={`${index}-${childIndex}`} className={styles.sequenceItem}>
                                {renderPart(child, `${index}-${childIndex}`)}
                                {isCommaSeparated && childIndex < children.length - 1 && (
                                    <span className={styles.sequenceComma}>,</span>
                                )}
                            </span>
                        ))}
                    </div>
                );

            case 'input':
                // Input rendering handled by FillInTheBlank renderer
                return null;

            case 'math':
            case 'mathLatex': {
                const displayMode = Boolean(part?.displayMode ?? part?.isDisplayMode);
                const latex = latexWithPlaceholderBoxes(part.content);
                return (
                    <div key={index} className={`${styles.mathLatex} ${displayMode ? styles.mathLatexDisplay : ''}`}>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: renderLatexToHtml(latex, displayMode),
                            }}
                        />
                    </div>
                );
            }

            case 'math':
                return (
                    <div key={index} className={styles.mathLatex}>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: renderLatexToHtml(part.content, false),
                            }}
                        />
                    </div>
                );

            case 'mathText':
                return (
                    <span key={index} className={styles.math}>
                        {String(part.content ?? '')}
                    </span>
                );

            case 'arithmeticLayout':
                return renderArithmeticLayout(part, index, styles);

            case 'gridArithmetic':
                return renderGridArithmetic(part, index, styles);

            case 'butterflyFraction':
                return renderButterflyFraction(part, index, styles);

            case 'pictureEquation':
                return renderPictureEquation(part, index, styles);

            case 'longMultiply':
                return renderLongMultiply(part, index, styles);

            case 'table':
            case 'smartTable':
                return renderSmartTable(part, index, styles);

            default:
                return null;
        }
    };

    const renderPart = (part, index) => {
        const content = renderPartContent(part, index);
        if (content === null) return null;

        const isVertical = Boolean(part?.isVertical ?? defaultVertical);
        return (
            <div
                key={`wrap-${index}`}
                className={`${styles.partWrapper} ${isVertical ? styles.verticalPart : styles.inlinePart}`}
            >
                {content}
            </div>
        );
    };

    return (
        <div className={`${styles.container} ${className}`}>
            {safeParts.map((part, index) => renderPart(part, index))}
        </div>
    );
}
