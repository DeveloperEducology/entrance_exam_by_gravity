import React from 'react';
import { useWatch } from 'react-hook-form';
import { Settings, PieChart, Square, Grid, Palette } from 'lucide-react';

export function ShadeGridEditor({ control, register, setValue }) {
    const config = useWatch({ control, name: 'adaptiveConfig' }) || {};

    const modelType = config.modelType || 'square';
    const denominator = parseInt(config.denominator) || 1;
    // segments might be same as denominator, or different based on row/column layout. Let's assume they are total segments for now if denominator isn't enough, but usually denominator is right.
    const segments = parseInt(config.segments) || denominator || 1;
    const targetShaded = parseInt(config.targetShaded) || 0;
    const shadedIndices = Array.isArray(config.shadedIndices) ? config.shadedIndices : [];
    const cols = parseInt(config.cols) || 5;
    const rows = parseInt(config.rows) || Math.ceil(segments / cols) || 5;
    const fillColor = config.fillColor || '#F59E0B';
    const lineColor = config.lineColor || '#1F2937';
    const baseColor = config.baseColor || '#FFFFFF';

    const handleShadeClick = (index) => {
        if (modelType === 'coordinate') {
            let newArray = [...shadedIndices];
            if (newArray.includes(index)) {
                newArray = newArray.filter(i => i !== index);
            } else {
                newArray.push(index);
            }
            setValue('adaptiveConfig.shadedIndices', newArray, { shouldDirty: true });
            setValue('adaptiveConfig.targetShaded', newArray.length, { shouldDirty: true });
        } else {
            let newShaded = targetShaded;
            if (targetShaded === index + 1) {
                newShaded = index; // unshade this one
            } else {
                newShaded = index + 1; // shade up to this one
            }
            setValue('adaptiveConfig.targetShaded', newShaded, { shouldDirty: true });
        }
    };

    // Render Preview
    const renderPreview = () => {
        const items = Array.from({ length: segments });

        if (modelType === 'pie') {
            // Simple SVG Pie
            let cumulativePercent = 0;
            return (
                <svg viewBox="0 0 100 100" className="w-full max-w-[200px] h-auto drop-shadow-md mx-auto">
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
                                onClick={() => handleShadeClick(i)}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                        );
                    })}
                </svg>
            );
        }

        if (modelType === 'bar') {
            return (
                <div
                    className="flex w-full max-w-[300px] h-16 drop-shadow-md mx-auto"
                    style={{ border: `2px solid ${lineColor}` }}
                >
                    {items.map((_, i) => {
                        const isShaded = i < targetShaded;
                        return (
                            <div
                                key={i}
                                onClick={() => handleShadeClick(i)}
                                className="flex-1 cursor-pointer hover:opacity-80 transition-opacity border-r last:border-r-0"
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
                <div className="relative isolate mx-auto w-full max-w-[250px] mb-6 ml-4 mt-2">
                    {/* Y Axis Labels */}
                    <div className="absolute top-0 bottom-0 -left-6 h-full">
                        {Array.from({ length: rows + 1 }).map((_, i) => (
                            <div key={i} className="text-[10px] text-slate-500 font-bold flex items-center justify-end w-4" style={{ position: 'absolute', top: `${(i / rows) * 100}%`, transform: 'translateY(-50%)' }}>
                                {rows - i}
                            </div>
                        ))}
                    </div>

                    <div
                        className="grid drop-shadow-sm w-full"
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
                                    onClick={() => handleShadeClick(i)}
                                    className="aspect-square cursor-pointer transition-colors"
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
        // Use explicit cols or find rough square root for grid layout
        const sqCols = (config.cols && parseInt(config.cols) > 0) ? parseInt(config.cols) : Math.ceil(Math.sqrt(segments));

        return (
            <div
                className="grid gap-0 w-full max-w-[250px] mx-auto drop-shadow-md"
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
                            onClick={() => handleShadeClick(i)}
                            className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
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
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Form Settings */}
            <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
                    <Grid className="w-4 h-4 text-brand-600" />
                    <h3>Shade Grid Designer</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Type</label>
                        <select {...register('adaptiveConfig.modelType')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20">
                            <option value="square">Square / Grid</option>
                            <option value="coordinate">Coordinate Grid (Cartesian)</option>
                            <option value="pie">Pie Chart</option>
                            <option value="bar">Bar / Fraction Strip</option>
                            <option value="modal">Modal (Generic)</option>
                        </select>
                    </div>

                    {modelType === 'coordinate' ? (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cols (X Axis)</label>
                                <input type="number" {...register('adaptiveConfig.cols', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="5" min="1" max="20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rows (Y Axis)</label>
                                <input type="number" {...register('adaptiveConfig.rows', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="5" min="1" max="20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Denominator</label>
                                <input type="number" {...register('adaptiveConfig.denominator', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="e.g., 2" min="1" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correct Answer (Shaded)</label>
                                <input type="number" {...register('adaptiveConfig.targetShaded', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="e.g., 1" min="0" max={segments} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Denominator (Total Value)</label>
                                <input type="number" {...register('adaptiveConfig.denominator', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="e.g., 2" min="1" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Segments</label>
                                <input type="number" {...register('adaptiveConfig.segments', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="e.g., 2" min="1" />
                            </div>

                            {modelType === 'square' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cols (Optional)</label>
                                    <input type="number" {...register('adaptiveConfig.cols', { valueAsNumber: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20" placeholder="Auto" min="1" max="25" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold mb-3">
                        <Palette className="w-4 h-4 text-brand-500" />
                        <h4 className="text-sm">Colors</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fill Color</label>
                            <input type="color" {...register('adaptiveConfig.fillColor')} className="w-full h-8 border border-slate-200 rounded p-0 cursor-pointer" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Line Color</label>
                            <input type="color" {...register('adaptiveConfig.lineColor')} className="w-full h-8 border border-slate-200 rounded p-0 cursor-pointer" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Color</label>
                            <input type="color" {...register('adaptiveConfig.baseColor')} className="w-full h-8 border border-slate-200 rounded p-0 cursor-pointer" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Preview */}
            <div className="w-full lg:w-80 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-700">Live Preview</h3>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 shadow-sm">Interactive</span>
                </div>

                <div className="flex items-center justify-center min-h-[200px] bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                    {renderPreview()}
                </div>

                <p className="text-xs text-slate-500 text-center mt-4 italic">
                    Click segments to set the correct answer.
                </p>
            </div>
        </div>
    );
}
