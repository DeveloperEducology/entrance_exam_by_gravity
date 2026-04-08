import React from 'react';

export function FractionModelRenderer({ config }) {
    if (!config) return null;

    const modelType = config.modelType || 'square';
    const denominator = parseInt(config.denominator) || 1;
    const segments = parseInt(config.segments) || denominator || 1;
    const targetShaded = parseInt(config.targetShaded) || 0;
    const shadedIndices = Array.isArray(config.shadedIndices) ? config.shadedIndices : [];
    const cols = parseInt(config.cols) || 5;
    const rows = parseInt(config.rows) || Math.ceil(segments / cols) || 5;
    const fillColor = config.fillColor || '#F59E0B';
    const lineColor = config.lineColor || '#1F2937';
    const baseColor = config.baseColor || '#FFFFFF';

    const items = Array.from({ length: segments });

    if (modelType === 'pie') {
        let cumulativePercent = 0;
        return (
            <svg viewBox="0 0 100 100" className="w-[150px] sm:w-[200px] h-auto drop-shadow-md mx-auto inline-block align-middle">
                {items.map((_, i) => {
                    const isShaded = i < targetShaded;
                    const slicePercent = 1 / segments;
                    const startX = Math.cos(2 * Math.PI * cumulativePercent) * 50 + 50;
                    const startY = Math.sin(2 * Math.PI * cumulativePercent) * 50 + 50;
                    cumulativePercent += slicePercent;
                    const endX = Math.cos(2 * Math.PI * cumulativePercent) * 50 + 50;
                    const endY = Math.sin(2 * Math.PI * cumulativePercent) * 50 + 50;

                    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                    const d = segments === 1
                        ? "M 50, 50 m -50, 0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0" // Full circle
                        : `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                    return (
                        <path
                            key={i}
                            d={d}
                            fill={isShaded ? fillColor : baseColor}
                            stroke={lineColor}
                            strokeWidth="1"
                        />
                    );
                })}
            </svg>
        );
    }

    if (modelType === 'bar') {
        return (
            <div
                className="flex w-[200px] sm:w-[300px] h-12 sm:h-16 drop-shadow-md mx-auto inline-flex"
                style={{ border: `2px solid ${lineColor}` }}
            >
                {items.map((_, i) => {
                    const isShaded = i < targetShaded;
                    return (
                        <div
                            key={i}
                            className="flex-1 border-r last:border-r-0"
                            style={{
                                backgroundColor: isShaded ? fillColor : baseColor,
                                borderColor: lineColor
                            }}
                        />
                    );
                })}
            </div>
        );
    }

    if (modelType === 'coordinate') {
        const gridItems = Array.from({ length: cols * rows });

        return (
            <div className="relative isolate mx-auto w-[200px] sm:w-[250px] mb-6 ml-4 mt-2 inline-block">
                {/* Y Axis Labels */}
                <div className="absolute top-0 bottom-0 -left-6 h-full">
                    {Array.from({ length: rows + 1 }).map((_, i) => (
                        <div key={i} className="text-[10px] text-slate-500 font-bold flex items-center justify-end w-4" style={{ position: 'absolute', top: `${(i / rows) * 100}%`, transform: 'translateY(-50%)' }}>
                            {rows - i}
                        </div>
                    ))}
                </div>

                <div
                    className="grid drop-shadow-sm w-full h-full"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        borderBottom: `2px solid ${lineColor}`,
                        borderLeft: `2px solid ${lineColor}`,
                    }}
                >
                    {gridItems.map((_, i) => {
                        const isShaded = shadedIndices.includes(i);
                        return (
                            <div
                                key={i}
                                className="aspect-square"
                                style={{
                                    backgroundColor: isShaded ? fillColor : baseColor,
                                    borderRight: `1px solid ${lineColor}40`,
                                    borderTop: `1px solid ${lineColor}40`,
                                }}
                            />
                        );
                    })}
                </div>

                {/* X Axis Labels */}
                <div className="absolute left-0 right-0 -bottom-6 w-full h-4">
                    {Array.from({ length: cols + 1 }).map((_, i) => (
                        <div key={i} className="text-[10px] text-slate-500 font-bold text-center" style={{ position: 'absolute', left: `${(i / cols) * 100}%`, transform: 'translateX(-50%)' }}>
                            {i}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default: square / grid
    const sqCols = (config.cols && parseInt(config.cols) > 0) ? parseInt(config.cols) : Math.ceil(Math.sqrt(segments));

    return (
        <div
            className="grid gap-0 w-[150px] sm:w-[250px] mx-auto drop-shadow-md inline-grid align-middle"
            style={{
                gridTemplateColumns: `repeat(${sqCols}, minmax(0, 1fr))`,
                borderTop: `2px solid ${lineColor}`,
                borderLeft: `2px solid ${lineColor}`
            }}
        >
            {items.map((_, i) => {
                const isShaded = i < targetShaded;
                return (
                    <div
                        key={i}
                        className="aspect-square"
                        style={{
                            backgroundColor: isShaded ? fillColor : baseColor,
                            borderRight: `2px solid ${lineColor}`,
                            borderBottom: `2px solid ${lineColor}`
                        }}
                    />
                );
            })}
        </div>
    );
}
