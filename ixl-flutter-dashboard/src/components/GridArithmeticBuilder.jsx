import React, { useState, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { cn } from '../lib/utils';
import { Maximize, Settings, FileJson, Grid3X3, ArrowRight, X, MousePointerClick, AlertCircle } from 'lucide-react';

export function GridArithmeticBuilder({ control, register, setValue, watch }) {
    const jsonStr = useWatch({ control, name: 'grid_arithmetic_json' });
    const [isParsed, setIsParsed] = useState(false);

    const [editorMode, setEditorMode] = useState('visual');

    const [gridData, setGridData] = useState({
        rows: 7,
        cols: 6,
        cellSize: 46,
        showBg: true,
        cells: [],
        borders: [],
        correctAnswers: {}
    });

    const [selectedCell, setSelectedCell] = useState(null);

    // Initial load
    useEffect(() => {
        if (!isParsed && jsonStr) {
            try {
                const parsed = JSON.parse(jsonStr);
                const part = parsed.parts?.[0];
                let answers = {};
                try {
                    answers = typeof parsed.correct_answer_text === 'string' ? JSON.parse(parsed.correct_answer_text) : parsed.correct_answer_text;
                } catch (e) { }

                if (part && part.layout) {
                    setGridData({
                        rows: part.layout.rows || 7,
                        cols: part.layout.cols || 6,
                        cellSize: part.layout.cellSize || 46,
                        showBg: part.layout.showBackgroundGrid !== false,
                        cells: part.layout.cells || [],
                        borders: part.layout.borders || [],
                        correctAnswers: answers || {}
                    });
                }
            } catch (e) {
                console.error("Invalid initial JSON", e);
            }
            setIsParsed(true);
        }
    }, [jsonStr, isParsed]);

    // Update Form string map on gridData changes
    useEffect(() => {
        if (!isParsed) return;
        const newJson = {
            parts: [
                {
                    id: "grid_1",
                    type: "gridArithmetic",
                    isVertical: true,
                    layout: {
                        rows: gridData.rows,
                        cols: gridData.cols,
                        cellSize: gridData.cellSize,
                        showBackgroundGrid: gridData.showBg,
                        cells: gridData.cells,
                        borders: gridData.borders
                    }
                }
            ],
            correct_answer_text: JSON.stringify(gridData.correctAnswers)
        };
        setValue('grid_arithmetic_json', JSON.stringify(newJson, null, 2), { shouldDirty: true });
    }, [gridData, isParsed, setValue]);

    const handleGridChange = (key, val) => setGridData(prev => ({ ...prev, [key]: val }));

    const handleCellClick = (r, c) => {
        setSelectedCell({ r, c });
    };

    const handleCellConfigChange = (updates, explicitR = null, explicitC = null) => {
        const r = explicitR || selectedCell?.r;
        const c = explicitC || selectedCell?.c;
        if (!r || !c) return;

        setGridData(prev => {
            let newCells = [...prev.cells];
            let newCorrectAnswers = { ...prev.correctAnswers };
            let newBorders = [...prev.borders];

            const cellIdx = newCells.findIndex(x => x.r === r && x.c === c);
            const borderIdx = newBorders.findIndex(x => x.r === r && x.c === c);
            let activeCell = cellIdx !== -1 ? { ...newCells[cellIdx] } : { r, c, kind: 'fixed', value: '' };
            let activeBorder = borderIdx !== -1 ? { ...newBorders[borderIdx] } : { r, c, top: false, bottom: false, left: false, right: false };

            let hasCellUpdate = false;
            let hasBorderUpdate = false;

            if ('kind' in updates) {
                activeCell.kind = updates.kind;
                if (updates.kind === 'input' && !activeCell.id) activeCell.id = `a_${r}_${c}`;
                if (updates.kind === 'fixed') delete activeCell.id;
                hasCellUpdate = true;
            }
            if ('value' in updates) {
                if (activeCell.kind === 'fixed') {
                    activeCell.value = updates.value;
                } else if (activeCell.kind === 'input') {
                    if (activeCell.id) {
                        newCorrectAnswers[activeCell.id] = updates.value;
                    }
                }
                hasCellUpdate = true;
            }
            if ('id' in updates && activeCell.kind === 'input') {
                const oldId = activeCell.id;
                activeCell.id = updates.id;
                if (oldId && newCorrectAnswers[oldId] !== undefined) {
                    newCorrectAnswers[updates.id] = newCorrectAnswers[oldId];
                    delete newCorrectAnswers[oldId];
                }
                hasCellUpdate = true;
            }
            // Borders
            ['top', 'bottom', 'left', 'right'].forEach(b => {
                if (b in updates) {
                    activeBorder[b] = updates[b];
                    hasBorderUpdate = true;
                }
            });

            if (hasCellUpdate) {
                if (cellIdx !== -1) newCells[cellIdx] = activeCell;
                else newCells.push(activeCell);
            }
            if (hasBorderUpdate) {
                const isAllFalse = !activeBorder.top && !activeBorder.bottom && !activeBorder.left && !activeBorder.right;
                if (isAllFalse && borderIdx !== -1) {
                    newBorders.splice(borderIdx, 1);
                } else if (!isAllFalse) {
                    if (borderIdx !== -1) newBorders[borderIdx] = activeBorder;
                    else newBorders.push(activeBorder);
                }
            }

            return { ...prev, cells: newCells, borders: newBorders, correctAnswers: newCorrectAnswers };
        });
    };

    const getSelectedActiveCell = () => {
        if (!selectedCell) return { r: 1, c: 1, kind: 'empty', value: '' };
        return gridData.cells.find(x => x.r === selectedCell.r && x.c === selectedCell.c) || { r: selectedCell.r, c: selectedCell.c, kind: 'empty', value: '' };
    };

    const getSelectedActiveBorder = () => {
        if (!selectedCell) return { r: 1, c: 1, top: false, bottom: false, left: false, right: false };
        return gridData.borders.find(x => x.r === selectedCell.r && x.c === selectedCell.c) || { r: selectedCell.r, c: selectedCell.c, top: false, bottom: false, left: false, right: false };
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setEditorMode('visual')}
                    className={cn("px-4 py-1.5 text-xs font-medium rounded-md", editorMode === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <Grid3X3 className="w-3.5 h-3.5 inline mr-1.5" />
                    Visual Builder
                </button>
                <button
                    type="button"
                    onClick={() => setEditorMode('json')}
                    className={cn("px-4 py-1.5 text-xs font-medium rounded-md", editorMode === 'json' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                >
                    <FileJson className="w-3.5 h-3.5 inline mr-1.5" />
                    Raw JSON
                </button>
            </div>

            {editorMode === 'json' ? (
                <div>
                    <p className="text-xs text-slate-500 mb-2">Edit JSON manually to fine-tune properties.</p>
                    <textarea
                        {...register('grid_arithmetic_json')}
                        className="w-full h-[600px] font-mono text-xs bg-slate-900 text-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-brand-500 border-0 resize-y leading-relaxed"
                        placeholder='{}'
                    />
                </div>
            ) : (
                <div className="flex gap-6 items-start">
                    {/* Left: Settings */}
                    <div className="w-[280px] shrink-0 space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                                <Settings className="w-4 h-4" /> Grid Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Rows</label>
                                    <input type="number" value={gridData.rows} onChange={e => handleGridChange('rows', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 text-sm border border-slate-300 rounded" min={1} max={20} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cols</label>
                                    <input type="number" value={gridData.cols} onChange={e => handleGridChange('cols', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 text-sm border border-slate-300 rounded" min={1} max={20} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cell Size (px)</label>
                                    <input type="number" value={gridData.cellSize} onChange={e => handleGridChange('cellSize', parseInt(e.target.value) || 20)} className="w-full px-2 py-1 text-sm border border-slate-300 rounded" min={20} max={100} />
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer mt-auto">
                                        <input type="checkbox" checked={gridData.showBg} onChange={e => handleGridChange('showBg', e.target.checked)} className="text-brand-600 text-sm rounded border-slate-300" />
                                        <span className="text-xs font-medium text-slate-600">Show BG</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Cell Settings (Visible when a cell is selected) */}
                        {selectedCell ? (
                            <div className="space-y-3 bg-white p-3 rounded-lg border border-brand-200 shadow-sm relative">
                                <button type="button" onClick={() => setSelectedCell(null)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                <h4 className="font-semibold text-brand-800 flex items-center gap-2 text-xs">
                                    Cell (Row {selectedCell.r}, Col {selectedCell.c})
                                </h4>

                                {(() => {
                                    const cell = getSelectedActiveCell();
                                    const border = getSelectedActiveBorder();
                                    const isInput = cell.kind === 'input';
                                    const displayValue = isInput ? (gridData.correctAnswers[cell.id] || '') : cell.value || '';

                                    return (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                                                <select value={cell.kind} onChange={e => handleCellConfigChange({ kind: e.target.value })} className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-brand-500">
                                                    <option value="fixed">Fixed Text</option>
                                                    <option value="input">User Input (Blank)</option>
                                                    <option value="empty">Empty (Hidden)</option>
                                                </select>
                                            </div>

                                            {cell.kind !== 'empty' && (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">{isInput ? 'Correct Answer' : 'Text Content'}</label>
                                                    <input
                                                        type="text"
                                                        value={displayValue}
                                                        onChange={e => handleCellConfigChange({ value: e.target.value })}
                                                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded font-bold text-center focus:border-brand-500"
                                                        maxLength={isInput ? 2 : 10}
                                                        placeholder={isInput ? "Answer" : "Text"}
                                                    />
                                                </div>
                                            )}

                                            {isInput && (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cell ID</label>
                                                    <input type="text" value={cell.id || ''} onChange={e => handleCellConfigChange({ id: e.target.value })} className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-slate-50" />
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-xs font-medium text-slate-600 mb-2 block border-t border-slate-100 pt-2 mt-2">Borders (Thick)</label>
                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={border.top} onChange={e => handleCellConfigChange({ top: e.target.checked })} /> Top</label>
                                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={border.bottom} onChange={e => handleCellConfigChange({ bottom: e.target.checked })} /> Bottom</label>
                                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={border.left} onChange={e => handleCellConfigChange({ left: e.target.checked })} /> Left</label>
                                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={border.right} onChange={e => handleCellConfigChange({ right: e.target.checked })} /> Right</label>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center bg-white space-y-2">
                                <MousePointerClick className="w-6 h-6 text-slate-400 mx-auto" />
                                <p className="text-xs text-slate-500 italic">Click any cell to configure,<br /> or double-click to toggle Blank.</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Note</span>
                                    <p className="text-[10px] text-amber-600 leading-relaxed">
                                        Use <b>Borders</b> to create separators for vertical arithmetic.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Right: Grid Area */}
                    <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto min-h-[400px] flex items-center justify-center">
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${gridData.cols}, ${gridData.cellSize}px)`,
                                gridTemplateRows: `repeat(${gridData.rows}, ${gridData.cellSize}px)`,
                                gap: '0px'
                            }}
                            className={cn(gridData.showBg ? "bg-slate-100 p-px" : "")}
                        >
                            {Array.from({ length: gridData.rows }).map((_, rIdx) => {
                                const r = rIdx + 1;
                                return Array.from({ length: gridData.cols }).map((_, cIdx) => {
                                    const c = cIdx + 1;
                                    const cell = gridData.cells.find(x => x.r === r && x.c === c);
                                    const border = gridData.borders.find(x => x.r === r && x.c === c);
                                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;

                                    const isInput = cell?.kind === 'input';
                                    const displayValue = isInput ? (gridData.correctAnswers[cell?.id] || '') : (cell?.value || '');

                                    const isEmpty = !cell || cell.kind === 'empty';

                                    return (
                                        <div
                                            key={`${r}-${c}`}
                                            onClick={() => handleCellClick(r, c)}
                                            style={{
                                                width: gridData.cellSize,
                                                height: gridData.cellSize,
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                const newKind = isInput ? 'fixed' : 'input';
                                                handleCellConfigChange({ kind: newKind }, r, c);
                                            }}
                                            className={cn(

                                                "relative flex items-center justify-center cursor-pointer transition-colors bg-white hover:bg-brand-50 text-slate-800 font-bold",
                                                gridData.showBg && "border-[0.5px] border-slate-200",
                                                isSelected && "ring-2 ring-brand-500 z-10 bg-brand-50",
                                                border?.top && "border-t-[3px] border-t-slate-800 z-10",
                                                border?.bottom && "border-b-[3px] border-b-slate-800 z-10",
                                                border?.left && "border-l-[3px] border-l-slate-800 z-10",
                                                border?.right && "border-r-[3px] border-r-slate-800 z-10",
                                                isInput && "text-brand-600 bg-brand-50/50",
                                                isEmpty && "text-slate-200"
                                            )}
                                        >
                                            {isInput && <span className="absolute top-1 left-1 text-[8px] text-brand-300 font-mono leading-none pointer-events-none">{cell.id}</span>}
                                            <input
                                                value={displayValue}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (isEmpty || !cell) {
                                                        handleCellConfigChange({ kind: 'fixed', value: val }, r, c);
                                                    } else {
                                                        handleCellConfigChange({ value: val }, r, c);
                                                    }
                                                }}
                                                className="w-full h-full bg-transparent text-center outline-none focus:outline-none focus:ring-0 font-bold"
                                                maxLength={isInput ? 2 : 10}
                                            />
                                            {isInput && !displayValue && <span className="w-1/2 h-0.5 bg-brand-300 rounded opacity-50 absolute bottom-2 pointer-events-none" />}
                                        </div>
                                    )
                                })
                            })}
                        </div>
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm leading-none text-[10px]">Double-Click</kbd> to toggle Blank</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-brand-50 border border-brand-200 rounded-full"></div> Input Cell</span>
                            </div>
                            <span>{gridData.rows} Rows × {gridData.cols} Cols</span>
                        </div>
                    </div>
                </div>

            )}
        </div>
    );
}
