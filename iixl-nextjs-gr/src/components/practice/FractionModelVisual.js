import React from 'react';
import styles from './FractionModelVisual.module.css';

function parseFinite(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeColor(value, fallback) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    const safeColorPattern = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]{1,64}\)|hsla?\([^)]{1,64}\)|[a-zA-Z]{3,24})$/;
    return safeColorPattern.test(raw) ? raw : fallback;
}

function normalizeAngle(angle) {
    const twoPi = Math.PI * 2;
    return ((angle % twoPi) + twoPi) % twoPi;
}

function describeSectorPath(cx, cy, radius, startAngle, endAngle) {
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

function resolveGrid(config) {
    const explicitRows = parseFinite(config.gridRows) ?? parseFinite(config.rows);
    const explicitCols = parseFinite(config.gridCols) ?? parseFinite(config.cols);
    const orientation = String(
        config.orientation || config.gridOrientation || config.barOrientation || 'vertical'
    ).toLowerCase() === 'horizontal'
        ? 'horizontal'
        : 'vertical';
    const gridMode = String(config.gridMode || 'auto').toLowerCase();

    const denominator = parseFinite(config.denominator) || 1;
    const shouldUseFractionBar = (
        gridMode === 'fractionbar' ||
        (gridMode === 'auto' && denominator > 1 && denominator <= 20 && !explicitRows && !explicitCols)
    );

    let rows = explicitRows;
    let cols = explicitCols;

    if (shouldUseFractionBar && denominator > 1) {
        if (orientation === 'horizontal') {
            rows = denominator;
            cols = 1;
        } else {
            rows = 1;
            cols = denominator;
        }
    } else if (!rows || !cols) {
        if (denominator === 100) {
            rows = 10;
            cols = 10;
        } else {
            rows = 1;
            cols = denominator > 0 ? denominator : 1;
        }
    }

    rows = Math.max(1, Math.min(20, Math.floor(rows)));
    cols = Math.max(1, Math.min(20, Math.floor(cols)));
    const modelType = String(config.modelType || config.visualModel || config.shapeModel || '').toLowerCase();
    const isPieModel = modelType === 'pie' || modelType === 'fractioncircle' || modelType === 'circlefraction';

    const totalCells = isPieModel
        ? Math.max(2, Math.min(36, Math.floor(parseFinite(config.segments) || denominator || (rows * cols))))
        : (rows * cols);

    const target = Math.max(0, Math.min(totalCells, Math.round(parseFinite(config.targetShaded) || 0)));
    const isBarModel = (rows === 1 && cols >= 5) || (cols === 1 && rows >= 5);
    const shape = String(config.cellShape || config.shape || 'square').toLowerCase() === 'circle'
        ? 'circle'
        : 'square';

    const fillColor = normalizeColor(config.fillColor || config.shadedColor, '#F59E0B');
    const lineColor = normalizeColor(config.lineColor || config.strokeColor, '#1F2937');
    const baseColor = normalizeColor(config.baseColor || config.unshadedColor, '#FFFFFF');
    const gap = Math.max(0, Math.min(6, Math.floor(parseFinite(config.cellGap) ?? 0)));

    return { rows, cols, target, totalCells, isBarModel, orientation, shape, fillColor, lineColor, baseColor, gap, isPieModel };
}

export default function FractionModelVisual({ part }) {
    const config = part?.modelConfig || {};
    const {
        rows,
        cols,
        target,
        totalCells,
        isBarModel,
        orientation,
        shape,
        fillColor,
        lineColor,
        baseColor,
        gap,
        isPieModel,
    } = resolveGrid(config);

    const cellIds = Array.from({ length: totalCells }, (_, i) => String(i));
    const selected = new Set(Array.from({ length: target }, (_, i) => String(i)));

    return (
        <div className={styles.container}>
            {isPieModel ? (
                <svg
                    className={styles.pieSvg}
                    viewBox="0 0 240 240"
                    role="img"
                    aria-label={`Fraction circle showing ${target} out of ${totalCells} parts shaded`}
                >
                    {Array.from({ length: totalCells }, (_, index) => {
                        const start = (-Math.PI / 2) + ((Math.PI * 2 * index) / totalCells);
                        const end = (-Math.PI / 2) + ((Math.PI * 2 * (index + 1)) / totalCells);
                        const id = String(index);
                        return (
                            <path
                                key={id}
                                d={describeSectorPath(120, 120, 108, start, end)}
                                fill={selected.has(id) ? fillColor : baseColor}
                                stroke={lineColor}
                                strokeWidth="2"
                            />
                        );
                    })}
                    <circle cx="120" cy="120" r="108" fill="none" stroke={lineColor} strokeWidth="3" />
                </svg>
            ) : (
                <div
                    className={`${styles.grid} ${isBarModel ? styles.barGrid : ''} ${isBarModel && orientation === 'horizontal' ? styles.barHorizontal : ''}`}
                    style={{
                        '--rows': rows,
                        '--cols': cols,
                        '--grid-line-color': lineColor,
                        '--grid-base-color': baseColor,
                        '--grid-fill-color': fillColor,
                        '--cell-gap': `${gap}px`,
                        '--cell-inset': `${Math.max(1, gap + 1)}px`,
                    }}
                    role="img"
                    aria-label={`Fraction model showing ${target} out of ${totalCells} parts shaded`}
                >
                    {cellIds.map((cellId) => (
                        <div
                            key={cellId}
                            className={`${styles.cell} ${shape === 'circle' ? styles.cellCircle : ''} ${selected.has(cellId) ? styles.shaded : ''}`}
                            aria-hidden="true"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
