import React, { useState, useEffect, useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { cn } from '../lib/utils';
import {
    Plus, Trash2, Settings, FileJson, Grid3X3,
    GripVertical, ChevronDown, ChevronUp, AlertCircle,
    Info, Save, Download
} from 'lucide-react';

export function SmartTableEditor({ control, register, setValue, watch }) {
    const jsonStr = useWatch({ control, name: 'smart_table_json' });
    const [isParsed, setIsParsed] = useState(false);
    const [editorMode, setEditorMode] = useState('visual');
    const [activeCell, setActiveCell] = useState(null); // { rowIndex, colKey }

    const [tableData, setTableData] = useState({
        columns: [
            { header: 'Label', key: 'label' },
            { header: 'Tens', key: 'tens' },
            { header: 'Ones', key: 'ones' }
        ],
        rows: [
            { label: '', tens: '', ones: '' },
            { label: '', tens: '', ones: '' }
        ],
        settings: {
            type: 'default',
            title: 'Table Title',
            headerBgColor: '#f1f5f9',
            showBorders: true,
            compact: false
        }
    });

    // Helper: Parse cell text to JSON object if it follows {{id:..., max:...}} syntax
    const parseCellValue = (val) => {
        if (typeof val !== 'string') return val;
        const match = val.match(/^{{(.+)}}$/);
        if (match) {
            const parts = match[1].split(',').reduce((acc, part) => {
                const [k, v] = part.split(':').map(s => s.trim());
                if (k === 'max') acc.maxLength = parseInt(v) || 1;
                else if (k === 'val') acc.value = v;
                else acc[k] = v;
                return acc;
            }, {});
            return {
                id: parts.id || `ans_${Math.random().toString(36).substr(2, 5)}`,
                maxLength: parts.maxLength || 1,
                placeholder: parts.placeholder || '',
                value: parts.value || ''
            };
        }
        return val;
    };

    // Helper: Convert cell object back to text syntax
    const formatCellValue = (cell) => {
        if (typeof cell === 'object' && cell !== null) {
            let res = `{{id:${cell.id}, max:${cell.maxLength || 1}`;
            if (cell.value) res += `, val:${cell.value}`;
            res += `}}`;
            return res;
        }
        return cell || '';
    };


    // Initial load from form
    useEffect(() => {
        if (!isParsed && jsonStr) {
            try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.columns && parsed.rows) {
                    const formattedRows = (parsed.rows || []).map(row => {
                        const newRow = { ...row };
                        Object.keys(newRow).forEach(k => {
                            newRow[k] = formatCellValue(newRow[k]);
                        });
                        return newRow;
                    });
                    setTableData({
                        columns: parsed.columns || [],
                        rows: formattedRows,
                        settings: parsed.settings || { type: 'default' }
                    });
                }
            } catch (e) {
                console.error("Invalid initial Smart Table JSON", e);
            }
            setIsParsed(true);
        }
    }, [jsonStr, isParsed]);

    // Update Form string on tableData changes
    useEffect(() => {
        if (!isParsed) return;

        // Final JSON construction
        const finalRows = tableData.rows.map(row => {
            const newRow = { ...row };
            Object.keys(newRow).forEach(key => {
                newRow[key] = parseCellValue(newRow[key]);
            });
            return newRow;
        });

        const newJson = {
            type: "smartTable",
            columns: tableData.columns,
            rows: finalRows,
            settings: tableData.settings
        };

        setValue('smart_table_json', JSON.stringify(newJson, null, 2), { shouldDirty: true });
    }, [tableData, isParsed, setValue]);

    const handleAddRow = () => {
        const newRow = tableData.columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { _style: { bgColor: '' } });
        setTableData(prev => ({
            ...prev,
            rows: [...prev.rows, newRow]
        }));
    };

    const handleDeleteRow = (index) => {
        if (tableData.rows.length <= 1) return;
        setTableData(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== index)
        }));
    };

    const handleAddColumn = () => {
        const newKey = `col_${tableData.columns.length + 1}`;
        setTableData(prev => ({
            ...prev,
            columns: [...prev.columns, { header: `New Col`, key: newKey, width: '150px' }],
            rows: prev.rows.map(row => ({ ...row, [newKey]: '' }))
        }));
    };

    const handleDeleteColumn = (key) => {
        if (tableData.columns.length <= 1) return;
        setTableData(prev => ({
            ...prev,
            columns: prev.columns.filter(c => c.key !== key),
            rows: prev.rows.map(row => {
                const { [key]: deleted, ...rest } = row;
                return rest;
            })
        }));
    };

    const updateHeader = (index, field, value) => {
        setTableData(prev => {
            const newCols = [...prev.columns];
            const oldKey = newCols[index].key;
            newCols[index] = { ...newCols[index], [field]: value };

            let newRows = prev.rows;
            if (field === 'key' && value !== oldKey) {
                newRows = prev.rows.map(row => {
                    const { [oldKey]: oldVal, ...rest } = row;
                    return { ...rest, [value]: oldVal };
                });
            }

            return { ...prev, columns: newCols, rows: newRows };
        });
    };

    const updateCell = (rowIndex, colKey, value) => {
        setTableData(prev => {
            const newRows = [...prev.rows];
            newRows[rowIndex] = { ...newRows[rowIndex], [colKey]: value };
            return { ...prev, rows: newRows };
        });
    };

    const handleActiveCellUpdate = (field, val) => {
        if (!activeCell) return;
        const { rowIndex, colKey } = activeCell;
        const cellVal = tableData.rows[rowIndex][colKey];
        const parsed = parseCellValue(cellVal);

        if (typeof parsed === 'object') {
            const newParsed = { ...parsed, [field]: val };
            updateCell(rowIndex, colKey, formatCellValue(newParsed));
        } else {
            updateCell(rowIndex, colKey, val);
        }
    };

    const toggleMathLogic = () => {
        setTableData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                type: prev.settings.type === 'math_place_value' ? 'default' : 'math_place_value'
            }
        }));
    };

    const updateSettings = (field, value) => {
        setTableData(prev => ({
            ...prev,
            settings: { ...prev.settings, [field]: value }
        }));
    };

    const updateRowStyle = (rowIndex, styleUpdates) => {
        setTableData(prev => {
            const newRows = [...prev.rows];
            newRows[rowIndex] = { ...newRows[rowIndex], _style: { ...newRows[rowIndex]._style, ...styleUpdates } };
            return { ...prev, rows: newRows };
        });
    };

    const moveRow = (from, to) => {
        if (to < 0 || to >= tableData.rows.length) return;
        setTableData(prev => {
            const newRows = [...prev.rows];
            const [moved] = newRows.splice(from, 1);
            newRows.splice(to, 0, moved);
            return { ...prev, rows: newRows };
        });
    };

    const isInputCell = (val) => {
        if (!val) return false;
        if (typeof val === 'object' && val.id) return true;
        if (typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}')) return true;
        return false;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setEditorMode('visual')}
                        className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                            editorMode === 'visual' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <Grid3X3 className="w-3.5 h-3.5 inline mr-1.5" />
                        Visual Editor
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditorMode('json')}
                        className={cn("px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                            editorMode === 'json' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <FileJson className="w-3.5 h-3.5 inline mr-1.5" />
                        Raw JSON
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleAddColumn}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-md text-xs font-semibold hover:bg-brand-100 transition-colors border border-brand-100"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Column
                    </button>
                    <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-md text-xs font-semibold hover:bg-brand-100 transition-colors border border-brand-100"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                </div>
            </div>

            {editorMode === 'json' ? (
                <div className="relative group">
                    <textarea
                        {...register('smart_table_json')}
                        className="w-full h-[600px] font-mono text-xs bg-slate-900 text-slate-200 p-6 rounded-xl border-0 focus:ring-2 focus:ring-brand-500 resize-y leading-relaxed shadow-inner"
                        placeholder='{ "columns": [], "rows": [], "settings": {} }'
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-mono">JSON MODE</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                    {/* Main Table Area */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full overflow-x-auto">
                        
                        {tableData.settings.title && (
                            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">{tableData.settings.title}</h2>
                            </div>
                        )}

                        <div className="overflow-x-auto p-4">
                            <table className="w-full border-collapse text-sm border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                                <thead>
                                    <tr 
                                        style={{ backgroundColor: tableData.settings.headerBgColor || '#f8fafc' }}
                                        className="border-b border-slate-300 shadow-sm"
                                    >
                                        <th className="w-10 p-2 border-r border-slate-200"></th>
                                        {tableData.columns.map((col, cIdx) => (
                                            <th key={cIdx} className="p-0 border-r border-slate-200 last:border-r-0" style={{ width: col.width || '150px' }}>
                                                <div className="flex flex-col p-2 gap-1.5">
                                                    <div className="flex items-center justify-between group">
                                                        <input
                                                            value={col.header}
                                                            onChange={(e) => updateHeader(cIdx, 'header', e.target.value)}
                                                            className="bg-transparent font-black text-slate-900 outline-none w-full mr-2 focus:bg-white focus:px-1 rounded transition-all placeholder:text-slate-400"
                                                            placeholder="Header Label"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteColumn(col.key)}
                                                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        value={col.key}
                                                        onChange={(e) => updateHeader(cIdx, 'key', e.target.value)}
                                                        className="bg-transparent text-[10px] font-mono text-slate-500/60 outline-none w-full focus:text-brand-600 focus:bg-white rounded px-1"
                                                        placeholder="backend_key"
                                                    />
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">W:</span>
                                                        <input
                                                            value={col.width || '150px'}
                                                            onChange={(e) => updateHeader(cIdx, 'width', e.target.value)}
                                                            className="bg-transparent text-[9px] font-mono text-slate-400 outline-none w-12 focus:text-brand-600 focus:bg-white rounded px-1 border border-transparent focus:border-slate-200"
                                                            placeholder="150px"
                                                        />
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.rows.map((row, rIdx) => (
                                        <tr 
                                            key={rIdx} 
                                            style={{ backgroundColor: row._style?.bgColor || 'transparent' }}
                                            className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                                        >
                                            <td className="p-2 text-center border-r border-slate-100 bg-slate-50/10">
                                                <div className="flex flex-col items-center gap-1">
                                                    <button type="button" onClick={() => moveRow(rIdx, rIdx - 1)} className="text-slate-300 hover:text-brand-500 transition-colors disabled:opacity-30" disabled={rIdx === 0}>
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <GripVertical className="w-3 h-3 text-slate-300 cursor-grab" />
                                                    <button type="button" onClick={() => moveRow(rIdx, rIdx + 1)} className="text-slate-300 hover:text-brand-500 transition-colors disabled:opacity-30" disabled={rIdx === tableData.rows.length - 1}>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                            {tableData.columns.map((col, cIdx) => {
                                                const value = row[col.key] || '';
                                                const isInput = isInputCell(value);
                                                const isLabelCol = col.key === 'label';

                                                return (
                                                    <td
                                                        key={cIdx}
                                                        className={cn(
                                                            "p-2 border-r border-slate-100 last:border-r-0 relative min-h-[40px]",
                                                            isInput && "bg-blue-50/50 ring-1 ring-inset ring-blue-100"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isLabelCol && (
                                                                <div className="flex-1">
                                                                    <select
                                                                        value={value}
                                                                        onChange={(e) => updateCell(rIdx, col.key, e.target.value)}
                                                                        className="w-full bg-transparent outline-none font-medium text-slate-600 appearance-none hover:bg-slate-100 px-1 rounded transition-colors"
                                                                    >
                                                                        <option value="">(None)</option>
                                                                        <option value="Carry">Carry</option>
                                                                        <option value="Borrow">Borrow</option>
                                                                        <option value="+">+</option>
                                                                        <option value="-">-</option>
                                                                        <option value="Total">Total</option>
                                                                        <option value="custom">Custom...</option>
                                                                    </select>
                                                                </div>
                                                            )}

                                                            {!isLabelCol && (
                                                                <div className="relative w-full">
                                                                    <input
                                                                        value={typeof value === 'object' ? formatCellValue(value) : value}
                                                                        onFocus={() => setActiveCell({ rowIndex: rIdx, colKey: col.key })}
                                                                        onChange={(e) => updateCell(rIdx, col.key, e.target.value)}
                                                                        className={cn(
                                                                            "w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-brand-200 rounded transition-all py-1.5 px-2 text-sm",
                                                                            isInput
                                                                                ? "text-blue-700 font-bold bg-blue-50/50 border border-blue-100 shadow-sm"
                                                                                : "text-slate-700 font-medium"
                                                                        )}
                                                                        onDoubleClick={() => {
                                                                            if (!value || !isInput) {
                                                                                const newId = `ans_${Math.random().toString(36).substr(2, 5)}`;
                                                                                updateCell(rIdx, col.key, `{{id:${newId}, max:1}}`);
                                                                            } else if (isInput) {
                                                                                // If already input, maybe clear it or keep as text?
                                                                                // For now, toggle to empty string
                                                                                updateCell(rIdx, col.key, '');
                                                                            }
                                                                        }}
                                                                        placeholder={isLabelCol ? "Label" : "0"}
                                                                    />
                                                                    {isInput && (
                                                                        <div className="absolute -top-1 -right-1">
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full border border-white shadow-sm" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(rIdx)}
                                                    className="text-slate-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm leading-none">Double-Click</kbd> to convert to Input</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-100 border border-blue-200 rounded-full"></div> Input Cell</span>
                            </div>
                            <span>{tableData.rows.length} Rows × {tableData.columns.length} Columns</span>
                        </div>
                    </div>

                    {/* Sidebar: Settings */}
                    <div className="w-full lg:w-72 shrink-0 space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
                                <Settings className="w-4 h-4 text-brand-600" />
                                <h3>Table Settings</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Table Title</label>
                                    <input
                                        value={tableData.settings.title || ''}
                                        onChange={(e) => updateSettings('title', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-semibold text-slate-700"
                                        placeholder="Enter table title..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Header Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={tableData.settings.headerBgColor || '#f1f5f9'}
                                            onChange={(e) => updateSettings('headerBgColor', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={tableData.settings.headerBgColor || ''}
                                            onChange={(e) => updateSettings('headerBgColor', e.target.value)}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 h-8 text-xs font-mono"
                                            placeholder="#RRGGBB"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center justify-between group cursor-pointer border-t border-slate-50 pt-3">
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-semibold text-slate-700">Math Place Value</span>
                                        <p className="text-[10px] text-slate-500 leading-tight">Enables carrying & place-value logic</p>
                                    </div>
                                    <div
                                        onClick={toggleMathLogic}
                                        className={cn(
                                            "w-10 h-5 rounded-full relative transition-all duration-200",
                                            tableData.settings.type === 'math_place_value' ? "bg-brand-500" : "bg-slate-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                                            tableData.settings.type === 'math_place_value' ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Cell Settings (Only if cell selected) */}
                        {activeCell && (
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
                                    <Grid3X3 className="w-4 h-4 text-blue-600" />
                                    <h3>Cell Settings</h3>
                                </div>

                                <div className="space-y-4">
                                    {(() => {
                                        const cellVal = tableData.rows[activeCell.rowIndex][activeCell.colKey];
                                        const parsed = parseCellValue(cellVal);
                                        const isInput = typeof parsed === 'object';

                                        if (!isInput) {
                                            return <p className="text-xs text-slate-500 italic">This is a fixed text cell. Double-click to convert to Input box.</p>;
                                        }

                                        return (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct Answer</label>
                                                    <input
                                                        value={parsed.value || ''}
                                                        onChange={(e) => handleActiveCellUpdate('value', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20"
                                                        placeholder="Answer"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Length</label>
                                                        <input
                                                            type="number"
                                                            value={parsed.maxLength || 1}
                                                            onChange={(e) => handleActiveCellUpdate('maxLength', parseInt(e.target.value))}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</label>
                                                        <input
                                                            value={parsed.id || ''}
                                                            onChange={(e) => handleActiveCellUpdate('id', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-slate-100 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Row Background</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={tableData.rows[activeCell.rowIndex]._style?.bgColor || '#ffffff'}
                                                                onChange={(e) => updateRowStyle(activeCell.rowIndex, { bgColor: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                                                            />
                                                            <button 
                                                                onClick={() => updateRowStyle(activeCell.rowIndex, { bgColor: '' })}
                                                                className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-500 transition-colors"
                                                            >
                                                                Clear Color
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Instructions</span>
                                    <p className="text-[11px] text-amber-600 leading-relaxed">
                                        <b>Fixed Mode:</b> Type directly to show text.<br />
                                        <b>Input Mode:</b> Double-click to create a blank. Use the sidebar to set the correct answer.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
                                <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-500 mb-1" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Export</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
                                <Save className="w-4 h-4 text-slate-400 group-hover:text-brand-500 mb-1" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Template</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
