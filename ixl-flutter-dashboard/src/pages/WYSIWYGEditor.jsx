
import React, { useState, useEffect, useRef } from 'react';
import { 
    Type, 
    Table as TableIcon, 
    Edit3, 
    Eye, 
    Code, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    RotateCcw,
    ChevronDown,
    Save,
    PlusCircle,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    Search,
    Bold,
    Italic,
    Underline,
    Palette,
    Monitor,
    Zap,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Layout,
    Layers,
    BookOpen,
    GraduationCap,
    Clock,
    Wand2,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadToR2 } from '../lib/r2';
import { compressImage } from '../lib/image';
import { supabase as api } from '../lib/supabaseClient';

// --- Media Library Modal (Ported from CreateQuestion) ---
function MediaLibraryModal({ isOpen, onClose, onSelect }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) fetchImages();
    }, [isOpen]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await api.from('media').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setImages(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filtered = images.filter(img => 
        img.name?.toLowerCase().includes(search.toLowerCase()) || 
        img.url?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-brand-600" /> Media Registry
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select an asset to insert into your content</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search images..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                            <p className="text-xs font-bold uppercase tracking-widest">Accessing Cloud Assets...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-sm font-medium">No results found in registry</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filtered.map((img) => (
                                <button 
                                    key={img.id}
                                    onClick={() => onSelect(img.url)}
                                    className="group relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:border-brand-500 hover:shadow-lg transition-all"
                                >
                                    <img src={img.url} alt={img.name} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-900/80 to-transparent">
                                        <p className="text-[8px] text-white font-bold truncate text-center">{img.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Quick Parser Panel ---
function QuickParserPanel({ onParse, onClose }) {
    const [text, setText] = useState('');

    const handleProcess = () => {
        // Simple robust parsing for "parts: [a, b], options: [c, d], solution: [e, f]"
        const partsMatch = text.match(/parts:\s*\[(.*?)\]/is);
        const optionsMatch = text.match(/options:\s*\[(.*?)\]/is);
        const solutionMatch = text.match(/solution:\s*\[(.*?)\]/is);
        const difficultyMatch = text.match(/difficulty:\s*(\w+)/i);
        const marksMatch = text.match(/marks:\s*(\d+)/i);

        const updates = {};

        if (partsMatch) {
            const raw = partsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            updates.parts = raw.map(c => ({ type: 'text', content: c, isVertical: true, hasAudio: true }));
        }

        if (optionsMatch) {
            const raw = optionsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            updates.options = raw.map(c => ([{ type: 'text', content: c, isVertical: true, hasAudio: true }]));
        }

        if (solutionMatch) {
            const raw = solutionMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            updates.solutionParts = raw.map(c => ({ type: 'text', content: c, isVertical: true, hasAudio: true }));
        }

        if (difficultyMatch) {
            updates.difficulty = difficultyMatch[1].toLowerCase();
        }

        if (marksMatch) {
            updates.marks = parseInt(marksMatch[1]);
        }

        if (Object.keys(updates).length > 0) {
            onParse(updates);
            setText('');
            onClose();
        } else {
            alert("No recognizable format found! Use: parts: [a], options: [b], solution: [c], difficulty: easy, marks: 1");
        }
    };

    return (
        <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-800 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-brand-400" /> Quick Import Parser
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Paste shorthand text to instantly populate the form.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>
            
            <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Example:\nparts: [What is 2+2?]\noptions: [3, 4, 5]\nsolution: [2+2 equals 4. It's simple addition.]\ndifficulty: easy\nmarks: 1"}
                className="w-full h-40 bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 text-brand-50 font-mono text-sm focus:border-brand-500 outline-none transition-all placeholder:text-slate-600"
            />

            <div className="flex justify-end mt-6">
                <button 
                    onClick={handleProcess}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-500 text-white rounded-xl font-black text-sm hover:bg-brand-600 transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                >
                    GENERATE FORM DATA
                </button>
            </div>
        </div>
    );
}

// --- Metadata Selection Panel ---
function MetadataSettings({ data, onChange, grades, units, skills, subjects }) {
    // Determine units belonging to the selected grade (either directly or via subject)
    const filteredUnits = units.filter(u => {
        if (!data.grade_id) return false;
        // Direct match
        if (u.grade_id === data.grade_id) return true;
        // Match via subject
        if (u.subject_id) {
            const sub = subjects.find(s => s._id === u.subject_id || s.id === u.subject_id);
            return sub && (sub.grade_id === data.grade_id);
        }
        return false;
    });

    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 flex flex-wrap gap-6 items-center">
            {/* Class Select (Grade) */}
            <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3 h-3" /> Class
                </label>
                <select 
                    value={data.grade_id || ''} 
                    onChange={(e) => {
                        onChange({ 
                            grade_id: e.target.value,
                            unit_id: '',
                            skill_id: ''
                        });
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                >
                    <option value="">Select Class</option>
                    {grades.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.name}</option>)}
                </select>
            </div>

            {/* Unit Select */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> Learning Unit
                </label>
                <select 
                    value={data.unit_id || ''} 
                    disabled={!data.grade_id}
                    onChange={(e) => {
                        onChange({ 
                            unit_id: e.target.value,
                            skill_id: ''
                        });
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-30"
                >
                    <option value="">Select Unit</option>
                    {filteredUnits.map(u => (
                        <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
                    ))}
                </select>
            </div>

            {/* Micro Skill Select */}
            <div className="flex-[2] min-w-[250px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Micro Skill
                </label>
                <select 
                    value={data.skill_id || ''} 
                    disabled={!data.unit_id}
                    onChange={(e) => onChange({ skill_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all disabled:opacity-30"
                >
                    <option value="">Select Micro Skill</option>
                    {skills.filter(s => s.unit_id === data.unit_id).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
            </div>

            {/* Difficulty & Marks */}
            <div className="flex gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
                    <select 
                        value={data.difficulty || 'medium'} 
                        onChange={(e) => onChange({ difficulty: e.target.value })}
                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Marks</label>
                    <input 
                        type="number"
                        value={data.marks || 1} 
                        onChange={(e) => onChange({ marks: parseInt(e.target.value) })}
                        className="w-16 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

// --- Rich Text Component (Ultra-Stable Cursor Management) ---
function RichTextPart({ value, onChange, placeholder = "Type here...", isVertical = false, textAlign = 'left', onToggleVertical, onUpdate, onRemove }) {
    const editorRef = useRef(null);
    const [isEmpty, setIsEmpty] = useState(!value || value === '<br>' || value === '');

    // Sync content ONLY when strictly necessary (Initial load or External changes)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
            setIsEmpty(!value || value === '<br>' || value === '');
        }
    }, [value]);

    const handleInput = () => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        // Strip single <br> if that's all there is
        const cleanHtml = (html === '<br>' || html === '<div><br></div>') ? '' : html;
        setIsEmpty(!cleanHtml);
        onChange(cleanHtml);
    };

    const execCommand = (command) => {
        document.execCommand(command, false, null);
        handleInput();
    };

    return (
        <div className={cn(
            "relative group/rich min-w-[50px] align-middle transition-all duration-300",
            isVertical ? "block w-full" : "inline-block",
            // If centered/right but not explicitly vertical, we still need width to see the alignment
            (!isVertical && textAlign !== 'left') ? "inline-block min-w-[200px]" : ""
        )}>
            <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onBlur={handleInput}
                style={{ textAlign: textAlign }}
                className={cn(
                    "outline-none min-h-[1.5em] px-3 py-1.5 rounded-xl transition-all whitespace-pre-wrap selection:bg-brand-500/30",
                    isEmpty ? "border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-brand-300" : "hover:bg-slate-100/30",
                    "focus:bg-white focus:shadow-sm focus:ring-2 focus:ring-brand-500/5 focus:border-brand-200"
                )}
            />
            
            {/* Hover Toolbar */}
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-slate-100 rounded-xl p-1 flex items-center gap-0.5 opacity-0 group-hover/rich:opacity-100 transition-all z-20 pointer-events-auto scale-95 group-hover/rich:scale-100">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"><Underline className="w-3.5 h-3.5" /></button>
                
                <div className="w-px h-4 bg-slate-100 mx-1" />
                
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onUpdate?.({ textAlign: 'left' }); }} className={cn("p-1.5 rounded-lg transition-all", textAlign === 'left' ? "bg-brand-50 text-brand-600" : "hover:bg-slate-50 text-slate-400 hover:text-slate-900")}><AlignLeft className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onUpdate?.({ textAlign: 'center' }); }} className={cn("p-1.5 rounded-lg transition-all", textAlign === 'center' ? "bg-brand-50 text-brand-600" : "hover:bg-slate-50 text-slate-400 hover:text-slate-900")}><AlignCenter className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onUpdate?.({ textAlign: 'right' }); }} className={cn("p-1.5 rounded-lg transition-all", textAlign === 'right' ? "bg-brand-50 text-brand-600" : "hover:bg-slate-50 text-slate-400 hover:text-slate-900")}><AlignRight className="w-3.5 h-3.5" /></button>

                <div className="w-px h-4 bg-slate-100 mx-1" />
                
                <button 
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onToggleVertical?.(); }} 
                    className={cn("p-1.5 rounded-lg transition-all", isVertical ? "bg-[#FFF4B1] text-[#B8860B]" : "hover:bg-slate-50 text-slate-400 hover:text-slate-900")}
                    title="Toggle Vertical Stacking"
                >
                    <Palette className="w-3.5 h-3.5 rotate-90" />
                </button>

                <div className="w-px h-4 bg-slate-100 mx-1" />
                <button 
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onRemove?.(); }}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="Remove Block"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {isEmpty && (
                <div 
                    className="absolute inset-x-3 inset-y-0 shadow-none pointer-events-none flex items-center text-[11px] font-bold text-slate-300 uppercase tracking-widest opacity-60 overflow-hidden whitespace-nowrap"
                    style={{ justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start' }}
                >
                    {placeholder}
                </div>
            )}
        </div>
    );
}

// --- Image Part Component ---
function ImagePartValue({ url, width, height, isVertical = false, onChange, onRemove }) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className={cn(
            "relative group/img align-middle mx-1",
            isVertical ? "block w-full my-4" : "inline-block"
        )}>
            <div className="relative cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
                <img 
                    src={url} 
                    style={{ width: width || 'auto', height: height || '60px' }} 
                    className="max-w-full rounded-lg border border-slate-100 shadow-sm"
                    alt="inline"
                />
            </div>

            {isEditing && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-2xl border border-slate-200 rounded-xl p-4 z-20 w-48 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image settings</span>
                        <button onClick={() => onRemove()} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-tighter">Width</label>
                            <input 
                                type="text" 
                                value={width} 
                                onChange={(e) => onChange({ width: e.target.value })}
                                placeholder="Auto"
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-tighter">Height</label>
                            <input 
                                type="text" 
                                value={height} 
                                onChange={(e) => onChange({ height: e.target.value })}
                                placeholder="60px"
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                    </div>
                    <div>
                        <button 
                            onClick={() => onChange({ isVertical: !isVertical })}
                            className={cn(
                                "w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                                isVertical ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            )}
                        >
                            <Palette className="w-3 h-3 rotate-90" /> {isVertical ? 'Stacked Layout' : 'Inline Layout'}
                        </button>
                    </div>
                    <button onClick={() => setIsEditing(false)} className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Done</button>
                </div>
            )}
        </div>
    );
}

// --- Excel Style Smart Table ---
// --- Smart Table Part (Excel Style) ---
function SmartTablePart({ headers = [], rows = [], settings = {}, title, onChange, onRemove, data }) {
    // Migration: If we have 'data' (flat array) but no 'rows', convert to single row
    const normalizedRows = rows.length > 0 ? rows : (data ? [data] : [new Array(headers.length).fill("")]);
    const tableTitle = title || settings.title || "Table Title";
    const headerBgColor = settings.headerBgColor || "#f1f5f9";

    const addColumn = () => {
        onChange({
            headers: [...headers, "NEW COL"],
            rows: normalizedRows.map(r => [...r, ""]),
            settings: { ...settings, title: tableTitle, headerBgColor }
        });
    };

    const addRow = () => {
        onChange({
            headers,
            rows: [...normalizedRows, new Array(headers.length).fill("")],
            settings: { ...settings, title: tableTitle, headerBgColor }
        });
    };

    const deleteRow = (rIdx) => {
        if (normalizedRows.length <= 1) return;
        onChange({
            headers,
            rows: normalizedRows.filter((_, i) => i !== rIdx),
            settings: { ...settings, title: tableTitle, headerBgColor }
        });
    };

    const deleteColumn = (cIdx) => {
        if (headers.length <= 1) return;
        onChange({
            headers: headers.filter((_, i) => i !== cIdx),
            rows: normalizedRows.map(r => r.filter((_, i) => i !== cIdx)),
            settings: { ...settings, title: tableTitle, headerBgColor }
        });
    };

    const editHeader = (idx, val) => {
        const newHeaders = [...headers];
        newHeaders[idx] = val;
        onChange({ headers: newHeaders, rows: normalizedRows, settings: { ...settings, title: tableTitle, headerBgColor } });
    };

    const editCell = (rIdx, cIdx, val) => {
        const newRows = [...normalizedRows];
        newRows[rIdx] = [...newRows[rIdx]];
        newRows[rIdx][cIdx] = val;
        onChange({ headers, rows: newRows, settings: { ...settings, title: tableTitle, headerBgColor } });
    };

    const updateSettings = (updates) => {
        onChange({ headers, rows: normalizedRows, settings: { ...settings, ...updates } });
    };

    return (
        <div className="relative group/table block my-8 w-full max-w-4xl">
            {/* Table Controls */}
            <div className="absolute -top-10 right-0 flex items-center gap-2 opacity-0 group-hover/table:opacity-100 transition-all bg-white shadow-xl border border-slate-100 rounded-xl p-1.5 z-30">
                <div className="flex items-center gap-1.5 px-2 border-r border-slate-100 mr-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Excel Table</span>
                </div>
                <button type="button" onClick={addRow} className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-brand-600 rounded-lg transition-colors flex items-center gap-1" title="Add Row">
                    <Plus className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">ROW</span>
                </button>
                <button type="button" onClick={addColumn} className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-brand-600 rounded-lg transition-colors flex items-center gap-1" title="Add Column">
                    <Plus className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">COL</span>
                </button>
                <div className="w-px h-4 bg-slate-100 mx-1" />
                <div className="flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    <input 
                        type="color" 
                        value={headerBgColor} 
                        onChange={(e) => updateSettings({ headerBgColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer p-0 border-0 bg-transparent"
                    />
                </div>
                <div className="w-px h-4 bg-slate-100 mx-1" />
                <button type="button" onClick={onRemove} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="overflow-hidden border-2 border-slate-900 rounded-[24px] shadow-2xl bg-white">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <input 
                        value={tableTitle}
                        onChange={(e) => updateSettings({ title: e.target.value })}
                        placeholder="TABLE TITLE..."
                        className="bg-transparent text-white font-black text-sm outline-none border-b-2 border-transparent focus:border-brand-400 w-full tracking-widest uppercase"
                    />
                </div>

                <div className="overflow-x-auto p-2">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: headerBgColor }}>
                                {headers.map((h, i) => (
                                    <th key={i} className="border-2 border-slate-900 p-0 min-w-[120px] relative group/col">
                                        <div className="p-3 text-center">
                                            <span className="text-[10px] font-black tracking-widest text-slate-900 uppercase">
                                                <RichTextPart 
                                                    value={h} 
                                                    onChange={(val) => editHeader(i, val)} 
                                                    textAlign="center"
                                                />
                                            </span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => deleteColumn(i)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover/col:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:scale-110 active:scale-90"
                                        >
                                            <span className="leading-none select-none text-xs">×</span>
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {normalizedRows.map((row, rIdx) => (
                                <tr key={rIdx} className="group/row">
                                    {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="border-2 border-slate-900 p-0 relative">
                                            <div className="p-4 text-center flex items-center justify-center min-h-[60px]">
                                                <span className="text-[18px] font-black text-slate-900 tracking-tight w-full">
                                                    <RichTextPart 
                                                        value={cell} 
                                                        onChange={(val) => editCell(rIdx, cIdx, val)} 
                                                        textAlign="center"
                                                    />
                                                </span>
                                            </div>
                                            {cIdx === row.length - 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => deleteRow(rIdx)}
                                                    className="absolute -right-8 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all hover:scale-125"
                                                    title="Delete Row"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Parts Builder (Generic Mixed Content) ---
function WYSIWYGPartsBuilder({ parts, onChange, className }) {
    const [showMediaModal, setShowMediaModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const updatePart = (idx, updates) => {
        const newParts = [...parts];
        newParts[idx] = { ...newParts[idx], ...updates };
        onChange(newParts);
    };

    const removePart = (idx) => {
        onChange(parts.filter((_, i) => i !== idx));
    };

    const addTextPart = () => {
        onChange([...parts, { type: 'text', content: '', isVertical: true }]);
    };

    const addImagePart = (url) => {
        const newPart = { type: 'image', content: url, width: 'auto', height: '60px', isVertical: true };
        // If there's only one empty text part, replace it
        if (parts.length === 1 && parts[0].type === 'text' && (!parts[0].content || parts[0].content === '<br>' || parts[0].content === '')) {
            onChange([newPart]);
        } else {
            onChange([...parts, newPart]);
        }
        setShowMediaModal(false);
    };

    const addTablePart = () => {
        const tablePart = { 
            type: 'smartTable', 
            headers: ["Label", "Description"], 
            rows: [
                ["Row 1", "Data"],
                ["Row 2", "Data"]
            ],
            settings: {
                title: 'New Feature Table',
                headerBgColor: '#f1f5f9'
            },
            isVertical: true
        };
        if (parts.length === 1 && parts[0].type === 'text' && (!parts[0].content || parts[0].content === '<br>' || parts[0].content === '')) {
            onChange([tablePart]);
        } else {
            onChange([...parts, tablePart]);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const compressed = await compressImage(file, 600, 50);
            const fileName = `wysiwyg-${Date.now()}.jpg`;
            const url = await uploadToR2(compressed, fileName);
            
            // Save to registry
            const cleanName = file.name.replace(/\.[^/.]+$/, "") || "Untitled";
            await api.from('media').insert({ name: cleanName, url });
            
            addImagePart(url);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-4">
                {parts.map((part, idx) => {
                    const isVertical = part.isVertical;
                    if (part.type === 'text') {
                        return (
                            <RichTextPart 
                                key={idx} 
                                value={part.content} 
                                isVertical={isVertical}
                                textAlign={part.textAlign || 'left'}
                                onToggleVertical={() => updatePart(idx, { isVertical: !isVertical })}
                                onUpdate={(updates) => updatePart(idx, updates)}
                                onRemove={() => removePart(idx)}
                                onChange={(val) => updatePart(idx, { content: val })} 
                            />
                        );
                    }
                    if (part.type === 'image') {
                        return (
                            <ImagePartValue 
                                key={idx}
                                url={part.content}
                                width={part.width}
                                height={part.height}
                                isVertical={isVertical}
                                onChange={(updates) => updatePart(idx, updates)}
                                onRemove={() => removePart(idx)}
                            />
                        );
                    }
                    if (part.type === 'smartTable') {
                        return (
                            <div key={idx} className="w-full">
                                <SmartTablePart 
                                    headers={part.headers}
                                    rows={part.rows}
                                    settings={part.settings}
                                    title={part.title}
                                    data={part.data}
                                    onChange={(updates) => updatePart(idx, updates)}
                                    onRemove={() => removePart(idx)}
                                />
                            </div>
                        );
                    }
                    return null;
                })}
            </div>

            {/* Add Toolset */}
            <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity border-t border-slate-50 pt-2">
                <button onClick={addTextPart} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all flex items-center gap-2" title="Add Text Block">
                    <PlusSquare className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">Add Text</span>
                </button>
                <button onClick={addTablePart} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all flex items-center gap-2" title="Add Smart Table">
                    <TableIcon className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">Add Table</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button onClick={() => setShowMediaModal(true)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all flex items-center gap-2" title="Pick from Gallery">
                    <ImageIcon className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-wider">Gallery</span>
                </button>
                <label className="cursor-pointer p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-600 transition-all flex items-center gap-2">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>

            <MediaLibraryModal 
                isOpen={showMediaModal} 
                onClose={() => setShowMediaModal(false)} 
                onSelect={addImagePart} 
            />
        </div>
    );
}

// --- Specific Editor Components ---

function MCQOptionsEditor({ options, correctIndices = [], isVertical = true, onChange, onCorrectChange, onToggleVertical }) {
    const handleToggleCorrect = (idx) => {
        const isMulti = false; // Add multiselect support later if needed
        if (isMulti) {
            const newIndices = correctIndices.includes(idx) 
                ? correctIndices.filter(i => i !== idx)
                : [...correctIndices, idx];
            onCorrectChange(newIndices);
        } else {
            onCorrectChange([idx]);
        }
    };

    const updateOptionParts = (idx, parts) => {
        const newOpts = [...options];
        newOpts[idx] = parts;
        onChange(newOpts);
    };

    const addOption = () => {
        onChange([...options, [{ type: 'text', content: "" }]]);
    };

    const removeOption = (idx) => {
        onChange(options.filter((_, i) => i !== idx));
        // Update correct indices if removing an option that was correct
        onCorrectChange(correctIndices.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Answer Options</h4>
                <button 
                    onClick={onToggleVertical}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all border",
                        isVertical 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}
                >
                    <Monitor className="w-3.5 h-3.5" />
                    {isVertical ? "List Layout" : "Grid Layout"}
                </button>
            </div>

            <div className={cn(
                "grid gap-4",
                isVertical ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
            {options.map((optParts, i) => {
                const isCorrect = correctIndices.includes(i);
                return (
                    <div 
                        key={i} 
                        className={cn(
                            "group flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-default relative",
                            isCorrect 
                                ? "border-[#A6CE39] bg-[#F7FBE6]" 
                                : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                    >
                        <button 
                            onClick={() => handleToggleCorrect(i)}
                            className={cn(
                                "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-1",
                                isCorrect ? "bg-[#A6CE39] border-[#A6CE39]" : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-h-[30px]">
                            <WYSIWYGPartsBuilder 
                                parts={optParts} 
                                onChange={(parts) => updateOptionParts(i, parts)} 
                            />
                        </div>

                        <button 
                            onClick={() => removeOption(i)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all mt-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}

            <div className="col-span-full">
                <button 
                    onClick={addOption}
                    className="flex items-center gap-2 text-[13px] font-black text-[#2D5DF6] hover:underline transition-all mt-2 ml-4"
                >
                    <PlusCircle className="w-4 h-4" /> Add Option
                </button>
            </div>
        </div>
    </div>
    );
}

// --- Component to render FIB with inline parts ---
function FIBPartsEditor({ parts, onChange, answers, onAnswersChange }) {
    const [showMediaModal, setShowMediaModal] = useState(false);

    const updatePart = (idx, updates) => {
        const newParts = [...parts];
        newParts[idx] = { ...newParts[idx], ...updates };
        onChange(newParts);
    };

    const removePart = (idx) => {
        onChange(parts.filter((_, i) => i !== idx));
    };

    const addText = () => onChange([...parts, { type: 'text', content: '' }]);
    const addInput = () => {
        const id = `ans${parts.filter(p => p.type === 'input').length + 1}`;
        onChange([...parts, { type: 'input', id }]);
        onAnswersChange({ ...answers, [id]: "" });
    };
    const addImage = (url) => {
        onChange([...parts, { type: 'image', content: url, width: 'auto', height: '60px' }]);
        setShowMediaModal(false);
    };
    const addTable = () => {
        onChange([...parts, { 
            type: 'smartTable', 
            headers: ["HUNDREDS", "TENS", "ONES"], 
            data: ["0", "0", "0"] 
        }]);
    };

    return (
        <div className="space-y-12 group">
            <div className="flex flex-col gap-6 leading-[1.8]">
                {parts.map((part, idx) => {
                    if (part.type === 'text') {
                        return (
                            <RichTextPart 
                                key={idx} 
                                value={part.content} 
                                isVertical={part.isVertical}
                                textAlign={part.textAlign || 'left'}
                                onToggleVertical={() => updatePart(idx, { isVertical: !part.isVertical })}
                                onUpdate={(updates) => updatePart(idx, updates)}
                                onChange={(val) => updatePart(idx, { content: val })} 
                            />
                        );
                    }
                    if (part.type === 'input') {
                        const isVertical = part.isVertical;
                        return (
                            <div key={idx} className={cn(
                                "relative group/input align-middle mx-2",
                                isVertical ? "block w-full my-4" : "inline-block"
                            )}>
                                <span className={cn(
                                    "h-10 bg-[#E9F1FF] border border-blue-100 rounded-lg shadow-inner flex items-center justify-center transition-all",
                                    isVertical ? "w-full" : "w-[120px]"
                                )}>
                                    <span className="text-[10px] font-black text-blue-400">{part.id}</span>
                                </span>
                                
                                {/* Hover Actions for Input */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white shadow-xl border border-slate-100 rounded-lg p-1 flex gap-0.5 opacity-0 group-hover/input:opacity-100 transition-opacity z-10 pointer-events-auto">
                                    <button 
                                        onClick={() => updatePart(idx, { isVertical: !isVertical })}
                                        className={cn("p-1.5 rounded transition-colors", isVertical ? "bg-brand-50 text-brand-600" : "hover:bg-slate-100 text-slate-600")}
                                        title="Toggle Vertical Stacking"
                                    >
                                        <Palette className="w-3 h-3 rotate-90" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-100 mx-0.5" />
                                    <button onClick={() => removePart(idx)} className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        );
                    }
                    if (part.type === 'smartTable') {
                        return (
                            <SmartTablePart 
                                key={idx}
                                headers={part.headers}
                                data={part.data}
                                onChange={(updates) => updatePart(idx, updates)}
                                onRemove={() => removePart(idx)}
                            />
                        );
                    }
                    if (part.type === 'image') {
                        return (
                            <ImagePartValue 
                                key={idx}
                                url={part.content}
                                width={part.width}
                                height={part.height}
                                onChange={(updates) => updatePart(idx, updates)}
                                onRemove={() => removePart(idx)}
                            />
                        );
                    }
                    return null;
                })}
            </div>

            {/* FIB Toolbar */}
            <div className="flex items-center gap-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity border-t border-slate-50 mt-4">
                <button onClick={addText} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600">
                    <Type className="w-4 h-4" /> Add Text
                </button>
                <button onClick={addInput} className="flex items-center gap-2 px-4 py-2 bg-[#E9F1FF] hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-600">
                    <Edit3 className="w-4 h-4" /> Add Blank
                </button>
                <button onClick={addTable} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600">
                    <TableIcon className="w-4 h-4" /> Add Table
                </button>
                <button onClick={() => setShowMediaModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600">
                    <ImageIcon className="w-4 h-4" /> Add Image
                </button>
            </div>

            <MediaLibraryModal isOpen={showMediaModal} onClose={() => setShowMediaModal(false)} onSelect={addImage} />

            {/* Answers List */}
            <div className="mt-12 p-8 bg-[#F8FAFC] rounded-2xl border border-slate-100">
                <div className="mb-6">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Correct Answers</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(answers).map((key) => (
                        <div key={key} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-5 shadow-sm hover:border-[#2D5DF6] transition-all group">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wide">{key}</span>
                            <div className="flex-1 font-bold text-slate-800">
                                <RichTextPart 
                                    value={answers[key]} 
                                    onChange={(val) => onAnswersChange({ ...answers, [key]: val })} 
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Preview Component ---
function QuestionPreview({ payload }) {
    const solution = typeof payload.solution === 'string' ? JSON.parse(payload.solution) : payload.solution;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Question Card */}
            <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-10 space-y-8">
                    {/* Stem */}
                    <div className="text-[20px] font-bold text-slate-800 leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-3">
                        {payload.parts.map((part, i) => (
                            part.type === 'text' ? (
                                <span key={i} className={cn(part.isVertical ? "block w-full my-2" : "inline")} style={{ textAlign: part.textAlign || 'left' }} dangerouslySetInnerHTML={{ __html: part.content }} />
                            ) : part.type === 'image' ? (
                                <img key={i} src={part.content} style={{ width: part.width, height: part.height }} className={cn("rounded-lg", part.isVertical ? "block w-full my-4 mx-auto" : "inline-block")} />
                            ) : part.type === 'input' ? (
                                <input 
                                    key={i} 
                                    type="text" 
                                    className={cn(
                                        "h-10 bg-[#E9F1FF] border-2 border-blue-200 rounded-xl px-4 font-bold text-blue-600 outline-none transition-all",
                                        part.isVertical ? "block w-full my-4" : "w-[120px] mx-1"
                                    )} 
                                    placeholder="?" 
                                    readOnly 
                                />
                            ) : (part.type === 'table' || part.type === 'smartTable') ? (
                                <div key={i} className="w-full my-6 bg-white border-2 border-slate-900 rounded-[24px] overflow-hidden shadow-2xl">
                                    {(part.settings?.title || part.title) && (
                                        <div className="bg-slate-900 px-6 py-4 border-b-2 border-slate-900">
                                            <h5 className="text-white font-black text-xs uppercase tracking-widest leading-none">{part.settings?.title || part.title}</h5>
                                        </div>
                                    )}
                                    <div className="overflow-x-auto p-2">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr style={{ backgroundColor: part.settings?.headerBgColor || '#FFCC00' }}>
                                                    {part.headers?.map((h, hi) => (
                                                        <th key={hi} className="border-2 border-slate-900 p-4 text-[10px] font-black text-slate-900 uppercase tracking-wider">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Support both new 2D array and old object array for robustness */}
                                                {(part.rows && part.rows.length > 0) ? (
                                                    part.rows.map((row, ri) => (
                                                        Array.isArray(row) ? (
                                                            <tr key={ri} className="bg-white">
                                                                {row.map((cell, ci) => (
                                                                    <td key={ci} className="border-2 border-slate-900 p-6 text-center font-black text-slate-900 text-xl tracking-tight">
                                                                        <span dangerouslySetInnerHTML={{ __html: cell }} />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ) : (
                                                            <tr key={ri} className="bg-white" style={{ backgroundColor: row._style?.bgColor }}>
                                                                {part.headers?.map((h, ci) => (
                                                                    <td key={ci} className="border-2 border-slate-900 p-6 text-center font-black text-slate-900 text-xl tracking-tight">
                                                                        <span dangerouslySetInnerHTML={{ __html: row[h] || row[ci] }} />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        )
                                                    ))
                                                ) : (
                                                    <tr className="bg-white">
                                                        {(part.data || []).map((cell, ci) => (
                                                            <td key={ci} className="border-2 border-slate-900 p-6 text-center font-black text-slate-900 text-xl tracking-tight">
                                                                <span dangerouslySetInnerHTML={{ __html: typeof cell === 'object' ? cell.value : cell }} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null
                        ))}
                    </div>

                    {/* Options Grid */}
                    {(payload.type === 'mcq' || payload.type === 'imageChoice') && (
                        <div className={cn(
                            "grid gap-4",
                            payload.is_vertical ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                        )}>
                            {payload.options.map((optParts, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50/20 transition-all cursor-pointer group">
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-brand-500 shrink-0 self-start mt-1" />
                                    <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-3">
                                        {optParts.map((p, pi) => (
                                            p.type === 'text' ? (
                                                <span key={pi} className={cn("font-bold text-slate-700", p.isVertical ? "block w-full my-1" : "inline")} dangerouslySetInnerHTML={{ __html: p.content }} />
                                            ) : p.type === 'image' ? (
                                                <img key={pi} src={p.content} style={{ width: p.width, height: p.height }} className={cn("rounded-lg shadow-sm border border-slate-50", p.isVertical ? "block w-full my-2" : "inline-block")} />
                                            ) : null
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Solution Card */}
            <div className="bg-[#FFF9F2] rounded-[32px] border border-orange-100 p-8 space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Solution Explanation</span>
                </div>
                <div className="text-[15px] font-medium text-slate-700 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-4">
                    {solution.map((part, i) => (
                        part.type === 'text' ? (
                            <div key={i} className={cn(part.isVertical ? "block w-full" : "inline")} dangerouslySetInnerHTML={{ __html: part.content }} />
                        ) : part.type === 'image' ? (
                            <img key={i} src={part.content || part.imageUrl} style={{ width: part.width, height: part.height }} className={cn("rounded-xl shadow-md border border-white", part.isVertical ? "block w-full" : "inline-block")} />
                        ) : (part.type === 'table' || part.type === 'smartTable') ? (
                            <div key={i} className="w-full my-6 bg-white border-2 border-slate-900 rounded-[20px] overflow-hidden shadow-xl">
                                {(part.settings?.title || part.title) && (
                                    <div className="bg-slate-900 px-6 py-3 border-b-2 border-slate-900">
                                        <h5 className="text-white font-black text-[10px] uppercase tracking-widest leading-none">{part.settings?.title || part.title}</h5>
                                    </div>
                                )}
                                <div className="overflow-x-auto p-1.5">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr style={{ backgroundColor: part.settings?.headerBgColor || '#FFF4B1' }}>
                                                {part.headers?.map((h, hi) => (
                                                    <th key={hi} className="border-2 border-slate-900 p-3 text-[10px] font-black text-slate-900 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(part.rows && part.rows.length > 0) ? (
                                                part.rows.map((row, ri) => (
                                                    Array.isArray(row) ? (
                                                        <tr key={ri} className="bg-white">
                                                            {row.map((cell, ci) => (
                                                                <td key={ci} className="border-2 border-slate-900 p-4 text-center font-black text-slate-900 text-[16px]">
                                                                    <span dangerouslySetInnerHTML={{ __html: cell }} />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ) : (
                                                        <tr key={ri} className="bg-white" style={{ backgroundColor: row._style?.bgColor }}>
                                                            {part.headers?.map((h, ci) => (
                                                                <td key={ci} className="border-2 border-slate-900 p-4 text-center font-black text-slate-900 text-[16px]">
                                                                    <span dangerouslySetInnerHTML={{ __html: row[h] || row[ci] }} />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    )
                                                ))
                                            ) : (
                                                <tr className="bg-white">
                                                    {(part.data || []).map((cell, ci) => (
                                                        <td key={ci} className="border-2 border-slate-900 p-4 text-center font-black text-slate-900 text-[16px]">
                                                            <span dangerouslySetInnerHTML={{ __html: typeof cell === 'object' ? cell.value : cell }} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : part.type === 'svg' ? (
                            <div key={i} className={cn("flex justify-center my-4", part.isVertical ? "w-full" : "inline-block")} dangerouslySetInnerHTML={{ __html: part.content }} />
                        ) : null
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---

const EMPTY_TEMPLATES = {
    mcq: {
        type: 'mcq',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ],
        options: [
            [{ type: 'text', content: "", isVertical: true, hasAudio: true }],
            [{ type: 'text', content: "", isVertical: true, hasAudio: true }]
        ],
        correct_answer_indices: [],
        is_multi_select: false,
        is_vertical: true,
        complexity: 8,
        solutionParts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ]
    },
    fillBlank: {
        type: 'fillInTheBlank',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ],
        answers: {},
        solutionParts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ]
    },
    table: {
        type: 'table',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ],
        headers: ["Column 1", "Column 2"],
        data: ["", ""],
        solutionParts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ]
    },
    imageChoice: {
        type: 'imageChoice',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ],
        options: [
            [{ type: 'image', content: "", imageUrl: "", width: 'auto', height: '80px', count: 1, hasAudio: false }],
            [{ type: 'image', content: "", imageUrl: "", width: 'auto', height: '80px', count: 1, hasAudio: false }]
        ],
        correct_answer_indices: [],
        is_multi_select: false,
        is_vertical: true,
        complexity: 8,
        solutionParts: [
            { type: 'text', content: "", isVertical: true, hasAudio: true }
        ]
    }
};

const EXAMPLE_QUESTIONS = {
    mcq: {
        type: 'mcq',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "Which of these is a prime number?", isVertical: false, hasAudio: true }
        ],
        options: [
            [{ type: 'text', content: "4", isVertical: false, hasAudio: true }],
            [{ type: 'text', content: "9", isVertical: false, hasAudio: true }],
            [{ type: 'text', content: "11", isVertical: false, hasAudio: true }],
            [{ type: 'text', content: "15", isVertical: false, hasAudio: true }]
        ],
        correct_answer_indices: [2],
        is_multi_select: false,
        is_vertical: true,
        complexity: 8,
        solutionParts: [
            { type: 'text', content: "11 is a prime number because it only has two factors: 1 and itself.", isVertical: true, hasAudio: true }
        ]
    },
    fillBlank: {
        type: 'fillInTheBlank',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "The capital of France is ", isVertical: false, hasAudio: true },
            { type: 'input', id: 'ans1' },
            { type: 'text', content: " and the capital of UK is ", isVertical: false, hasAudio: true },
            { type: 'input', id: 'ans2' }
        ],
        answers: {
            ans1: "Paris",
            ans2: "London"
        },
        solutionParts: [
            { type: 'text', content: "Paris and London are the capitals.", isVertical: true, hasAudio: true }
        ]
    },
    table: {
        type: 'smartTable',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "Complete the place value chart for 2,332:", isVertical: false, hasAudio: true }
        ],
        headers: ["THOUSANDS", "HUNDREDS", "TENS", "ONES"],
        data: ["2", "3", "3", "2"],
        solutionParts: [
            { type: 'text', content: "2,332 has 2 thousands, 3 hundreds, 3 tens, and 2 ones.", isVertical: true, hasAudio: true }
        ]
    },
    imageChoice: {
        type: 'imageChoice',
        difficulty: 'medium',
        marks: 1,
        parts: [
            { type: 'text', content: "Which of these represents the number 2?", isVertical: false, hasAudio: true }
        ],
        options: [
            [{ type: 'image', content: "https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1773484418376-norxwu3nja.jpg", imageUrl: "https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1773484418376-norxwu3nja.jpg", width: 'auto', height: '80px', count: 1, hasAudio: false }],
            [{ type: 'image', content: "https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1773484351761-4iiizqpq85i.jpg", imageUrl: "https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1773484351761-4iiizqpq85i.jpg", width: 'auto', height: '80px', count: 1, hasAudio: false }]
        ],
        correct_answer_indices: [1],
        is_multi_select: false,
        is_vertical: true,
        complexity: 8,
        solutionParts: [
            { type: 'text', content: "The second image correctly represents the number 2.", isVertical: true, hasAudio: true }
        ]
    }
};

const PlusSquare = ({ className }) => <Plus className={className} />;

export function WYSIWYGEditor() {
    const [activeTab, setActiveTab] = useState('mcq');
    const [viewMode, setViewMode] = useState('visual'); // visual | json
    const [data, setData] = useState(EMPTY_TEMPLATES.mcq);
    const [saving, setSaving] = useState(false);
    const [showParser, setShowParser] = useState(false);

    // Metadata States
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [skills, setSkills] = useState([]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [gRes, subRes, uRes, sRes] = await Promise.all([
                api.from('grades').select('*').order('name'),
                api.from('subjects').select('*').order('name'),
                api.from('units').select('*').order('name'),
                api.from('micro_skills').select('*').order('name')
            ]);
            setGrades(gRes.data || []);
            setSubjects(subRes.data || []);
            setUnits(uRes.data || []);
            setSkills(sRes.data || []);
        } catch (err) {
            console.error("Error fetching metadata:", err);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setData({
            ...EMPTY_TEMPLATES[tab],
            grade_id: data.grade_id,
            unit_id: data.unit_id,
            skill_id: data.skill_id
        });
    };

    const updateData = (updates) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const handleCreateNew = () => {
        if (window.confirm("Start a new question? This will reset all fields to default.")) {
            setData({
                ...EMPTY_TEMPLATES[activeTab],
                grade_id: data.grade_id, // Keep metadata context
                unit_id: data.unit_id,
                skill_id: data.skill_id
            });
        }
    };

    const handleSaveToDb = async () => {
        if (!data.skill_id) {
            alert("Please select a Micro Skill first!");
            return;
        }

        setSaving(true);
        try {
            const payload = generatePayload();
            const { data: res, error } = await api.from('questions').insert(payload);
            if (error) throw error;
            alert("Question saved successfully!");
        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const generatePayload = () => {
        const mapPart = (p) => {
            if (p.type === 'smartTable' || p.type === 'table') {
                return {
                    type: 'table',
                    headers: p.headers || [],
                    rows: p.rows || [p.data || []],
                    isVertical: p.isVertical !== undefined ? p.isVertical : true
                };
            }
            if (p.type === 'image') {
                return {
                    type: 'image',
                    imageUrl: p.imageUrl || p.content || '',
                    isVertical: p.isVertical !== undefined ? p.isVertical : true,
                    count: p.count || 1
                };
            }
            if (p.type === 'svg') {
                return {
                    type: 'svg',
                    content: p.content || '',
                    isVertical: p.isVertical !== undefined ? p.isVertical : true
                };
            }
            return {
                type: p.type || 'text',
                content: p.content || '',
                isVertical: p.isVertical !== undefined ? p.isVertical : true,
                hasAudio: p.hasAudio !== undefined ? p.hasAudio : true
            };
        };

        const payload = {
            type: data.type,
            difficulty: (data.difficulty || 'medium').toLowerCase(),
            micro_skill_id: data.skill_id || "5887f670-eb14-4cff-8ab1-e7c006e2b528",
            grade_id: data.grade_id,
            unit_id: data.unit_id,
            solution: JSON.stringify(data.solutionParts.map(mapPart)),
            marks: data.marks || 1,
            is_multi_select: data.is_multi_select || false,
            is_vertical: data.is_vertical !== undefined ? data.is_vertical : true,
            question_text: null,
            complexity: data.complexity || 8,
            show_submit_button: false,
            adaptive_config: {
                conceptTags: data.adaptive_config?.conceptTags || ["place_value", "hundreds"],
                misconceptionCode: data.adaptive_config?.misconceptionCode || "",
                targetComplexityBand: data.adaptive_config?.targetComplexityBand || "low",
                inputMode: "default",
                gridMode: "auto",
                orientation: "vertical",
                showKeypad: true,
                autoAdvance: true,
                keypadKeys: [
                    { label: "⭐", value: "⭐" },
                    { label: "🟩", value: "🟩" },
                    "⌫"
                ]
            },
            parts: data.parts.map(mapPart),
            options: (data.options || []).map(optParts => optParts.map(mapPart)),
            correct_answer_index: data.correct_answer_indices?.[0] ?? -1,
            correct_answer_text: data.type === 'fillInTheBlank' ? JSON.stringify(data.answers) : null,
            drag_groups: [],
            drag_items: [],
            correct_answer_indices: data.correct_answer_indices || []
        };

        // Special handling for legacy Smart Table question type if it was active
        if (data.type === 'table' && activeTab === 'table') {
            payload.parts = [{
                type: 'table',
                headers: data.headers || [],
                rows: [data.data || []],
                isVertical: true
            }];
        }

        return payload;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4 font-sans selection:bg-brand-500/20">
            {/* Toolbar */}
            <div className="w-full max-w-5xl mb-12 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-[900] text-slate-900 tracking-tight mb-1">Gravity <span className="text-brand-600">Rich</span> Editor</h1>
                    <p className="text-sm text-slate-500 font-medium tracking-tight">Mixed content support: Text, Cloud Images, and Dynamic Parts.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowParser(!showParser)}
                        className={cn(
                            "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border transition-all active:scale-95 text-sm font-black shadow-sm",
                            showParser ? "bg-slate-900 border-slate-900 text-white" : "bg-white text-brand-600 border-brand-100 hover:border-brand-200"
                        )}
                    >
                        <Wand2 className="w-4 h-4" />
                        QUICK IMPORT
                    </button>

                    <button 
                        onClick={handleSaveToDb}
                        disabled={saving}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 text-sm font-black hover:bg-brand-700 transition-all disabled:opacity-50 active:scale-95"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "SAVING..." : "SAVE QUESTION"}
                    </button>
                    
                    <div className="relative group">
                        <button className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-sm font-black text-slate-700 hover:border-brand-500 transition-all min-w-[240px]">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                                {activeTab === 'mcq' && <Type className="w-4 h-4" />}
                                {activeTab === 'imageChoice' && <ImageIcon className="w-4 h-4" />}
                                {activeTab === 'fillBlank' && <Edit3 className="w-4 h-4" />}
                                {activeTab === 'table' && <TableIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 text-left">
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">Question Type</span>
                                <span className="block capitalize">{activeTab === 'fillBlank' ? 'Fill in the Blank' : activeTab === 'imageChoice' ? 'Image Choice' : activeTab.toUpperCase()}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform" />
                        </button>

                        <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-[110]">
                            {[
                                { id: 'mcq', label: 'Multiple Choice', icon: Type, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { id: 'imageChoice', label: 'Image Choice', icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
                                { id: 'fillBlank', label: 'Fill in the Blank', icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50' },
                                { id: 'table', label: 'Smart Table', icon: TableIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-bold",
                                        activeTab === item.id ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg, item.color)}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    {item.label}
                                    {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            <div className="w-full max-w-5xl mb-6 flex justify-end">
                <div className="flex bg-slate-200/50 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('visual')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                            viewMode === 'visual' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Edit3 className="w-3.5 h-3.5" /> Visual
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                            viewMode === 'preview' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button
                        onClick={() => setViewMode('json')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                            viewMode === 'json' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Code className="w-3.5 h-3.5" /> JSON
                    </button>
                </div>
            </div>

            {/* Main Editor Card */}
            <div className="w-full max-w-5xl space-y-10">
                {showParser && (
                    <QuickParserPanel 
                        onParse={updateData} 
                        onClose={() => setShowParser(false)} 
                    />
                )}

                {viewMode === 'visual' && (
                    <MetadataSettings 
                        data={data} 
                        onChange={updateData} 
                        grades={grades} 
                        units={units} 
                        skills={skills}
                        subjects={subjects} 
                    />
                )}

                {viewMode === 'visual' ? (
                    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
                        {/* Question Block */}
                        <div className="flex bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 min-h-[350px] group">
                            <div className="w-[44px] bg-[#A6CE39] flex flex-col items-center justify-center p-2 relative shrink-0">
                                <span className="rotate-[-90deg] whitespace-nowrap text-[11px] font-[900] text-white uppercase tracking-[0.4em] origin-center">
                                    QUESTION
                                </span>
                            </div>
                            <div className="flex-1 p-12 space-y-10">
                                <div className="text-[20px] font-bold text-slate-800 leading-[1.6]">
                                    {activeTab === 'fillBlank' ? (
                                        <FIBPartsEditor 
                                            parts={data.parts} 
                                            onChange={(parts) => updateData({ parts: parts })}
                                            answers={data.answers}
                                            onAnswersChange={(ans) => updateData({ answers: ans })}
                                        />
                                    ) : (
                                        <WYSIWYGPartsBuilder 
                                            parts={data.parts} 
                                            onChange={(parts) => updateData({ parts: parts })} 
                                        />
                                    )}
                                </div>

                                {(activeTab === 'mcq' || activeTab === 'imageChoice') && (
                                    <MCQOptionsEditor 
                                        options={data.options} 
                                        correctIndices={data.correct_answer_indices}
                                        isVertical={data.is_vertical}
                                        onToggleVertical={() => updateData({ is_vertical: !data.is_vertical })}
                                        onChange={(opts) => updateData({ options: opts })} 
                                        onCorrectChange={(indices) => updateData({ correct_answer_indices: indices })}
                                    />
                                )}

                                {activeTab === 'table' && (
                                    <SmartTablePart 
                                        headers={data.headers} 
                                        data={data.data}
                                        onChange={(updates) => updateData(updates)}
                                        onRemove={() => handleTabChange('mcq')}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Solution Block */}
                        <div className="flex bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 min-h-[160px] group">
                            <div className="w-[44px] bg-[#F7931E] flex flex-col items-center justify-center p-2 shrink-0">
                                <span className="rotate-[-90deg] whitespace-nowrap text-[11px] font-[900] text-white uppercase tracking-[0.4em] origin-center">
                                    SOLUTION
                                </span>
                            </div>
                            <div className="flex-1 p-12 relative flex flex-col justify-start">
                                <div className="text-[15px] font-medium text-slate-600 leading-relaxed">
                                    <WYSIWYGPartsBuilder 
                                        parts={data.solutionParts} 
                                        onChange={(parts) => updateData({ solutionParts: parts })} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'preview' ? (
                    <QuestionPreview payload={generatePayload()} />
                ) : (
                    <div className="bg-slate-900 rounded-[32px] p-10 border border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            <span className="ml-4 text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] font-black">Production API Payload</span>
                        </div>
                        <pre className="text-brand-300 font-mono text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-blue-500/30">
                            {JSON.stringify(generatePayload(), null, 2)}
                        </pre>
                    </div>
                )}

                {/* Footer Metadata */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between opacity-50">
                    <div className="flex gap-10">
                        <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            <ChevronDown className="w-4 h-4" />
                            Difficulty: <span className="text-slate-900">{data.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            Marks: <span className="text-slate-900">{data.marks}</span>
                        </div>
                    </div>
                    <div className="italic text-[12px] font-serif text-slate-400 tracking-wide">
                        Rich Schema v2.0
                    </div>
                </div>
            </div>
        </div>
    );
}
