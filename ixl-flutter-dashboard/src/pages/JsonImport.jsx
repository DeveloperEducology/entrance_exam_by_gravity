
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, FileJson, Layers, HelpCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function JsonImport() {
    const navigate = useNavigate();
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    
    // Import Mode
    const [importMode, setImportMode] = useState('questions'); // 'questions' | 'micro_skills' | 'lessons' | 'full'

    // State for Cascading Dropdowns
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [microSkills, setMicroSkills] = useState([]);
    
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedSkill, setSelectedSkill] = useState('');

    // Fetch Grades on load
    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async () => {
        try {
            const res = await fetch('/api/grades?order=sort_order&ascending=true');
            const result = await res.json();
            setGrades(result.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchSubjects = async (gradeId) => {
        try {
            const res = await fetch(`/api/subjects?grade_id=${gradeId}`);
            const result = await res.json();
            setSubjects(result.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchUnits = async (subjectId) => {
        try {
            const res = await fetch(`/api/units?subject_id=${subjectId}&order=sort_order&ascending=true`);
            const result = await res.json();
            setUnits(result.data || []);
        } catch (e) { console.error(e); }
    };

    const fetchMicroSkills = async (unitId) => {
        try {
            const res = await fetch(`/api/micro_skills?unit_id=${unitId}&order=sort_order&ascending=true`);
            const result = await res.json();
            setMicroSkills(result.data || []);
        } catch (e) { console.error(e); }
    };

    const handleGradeChange = (e) => {
        const gradeId = e.target.value;
        setSelectedGrade(gradeId);
        setSelectedSubject('');
        setSelectedUnit('');
        setSelectedSkill('');
        setSubjects([]);
        setUnits([]);
        setMicroSkills([]);
        if (gradeId) fetchSubjects(gradeId);
    };

    const handleSubjectChange = (e) => {
        const subjectId = e.target.value;
        setSelectedSubject(subjectId);
        setSelectedUnit('');
        setSelectedSkill('');
        setUnits([]);
        setMicroSkills([]);
        if (subjectId) fetchUnits(subjectId);
    };

    const handleUnitChange = (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);
        setSelectedSkill('');
        setMicroSkills([]);
        if (unitId) fetchMicroSkills(unitId);
    };

    // Normalization helper for questions
    const normalizeQuestion = (item, skillId) => {
        const q = { ...item };
        
        // ID Normalization
        const _id = q._id || q.id || crypto.randomUUID();
        
        // Handle various naming conventions for question text
        const question_text = q.question_text || q.questionText || q.instruction || q.scaffold?.instruction || '';
        
        // Parts
        let parts = q.parts || [];
        if (typeof parts === 'string') { try { parts = JSON.parse(parts); } catch (e) { parts = []; } }
        if (parts.length === 0 && question_text) { 
            parts = [{ type: 'text', content: question_text }]; 
        }

        // Drag & Drop / Classification Mapping
        const drag_groups = q.drag_groups || q.dropGroups || [];
        const drag_items = q.drag_items || q.dragItems || [];

        // Data Source Mapping (Template generation data)
        const data_source = q.data_source || q.dataSource || q.question_data || q.config || null;

        // Scaffold Mapping
        const scaffold = q.scaffold || q.scaffolding || null;

        // Solution Mapping
        let solution = q.solution || [];
        if (solution.length === 0 && q.validation?.steps) {
            solution = q.validation.steps.map(s => ({
                type: 'text',
                content: `Step ${s.step || ''}: ${s.note || s.text || ''}`,
                isVertical: true
            }));
        }

        // Handle correct answer text (could be primitive or array/object for complex types)
        let correct_answer_text = q.correct_answer_text || q.correctAnswerText || q.validation?.answer || null;
        if (correct_answer_text !== null && typeof correct_answer_text === 'object') {
            correct_answer_text = JSON.stringify(correct_answer_text);
        } else if (correct_answer_text !== null) {
            correct_answer_text = String(correct_answer_text);
        }

        return {
            ...q,
            _id,
            id: _id, // ensure double mapping for safety
            type: q.type || (q.template_id ? 'template' : 'mcq'),
            micro_skill_id: q.micro_skill_id || q.microSkillId || (Array.isArray(q.micro_skill_ids) && q.micro_skill_ids.length > 0 ? q.micro_skill_ids[0] : null) || skillId,
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks: parseInt(q.marks) || 1,
            question_text,
            parts,
            drag_groups,
            drag_items,
            data_source,
            scaffold,
            concepts: q.concepts || q.concept_list || [],
            solution,
            correct_answer_text,
            show_submit_button: q.show_submit_button ?? q.showSubmitButton ?? q.layout_config?.show_submit ?? true,
            is_vertical: q.is_vertical ?? q.isVertical ?? (q.layout_config?.orientation === 'vertical') ?? true,
            is_multi_select: q.is_multi_select ?? q.isMultiSelect ?? false
        };
    };

    const handleImport = async () => {
        if (!jsonInput.trim()) {
            setStatus({ type: 'error', message: 'Please paste valid JSON code.' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Processing import...' });

        try {
            const parsedData = JSON.parse(jsonInput);
            
            // FULL STRUCTURE MODE
            if (importMode === 'full') {
                const results = [];
                for (const table of ['grades', 'subjects', 'units', 'micro_skills', 'questions']) {
                    if (parsedData[table]) {
                        const items = Array.isArray(parsedData[table]) ? parsedData[table].flat() : [parsedData[table]];
                        const res = await fetch(`/api/${table}/upsert`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(items)
                        });
                        if (!res.ok) throw new Error(`Failed to import ${table}`);
                        results.push(`✓ ${items.length} ${table}`);
                    }
                }
                setStatus({ type: 'success', message: 'Import Complete: ' + results.join(', ') });
                setJsonInput('');
                return;
            }

            // MICRO SKILLS MODE
            if (importMode === 'micro_skills') {
                if (!selectedUnit) throw new Error('Please select a Target Unit.');
                const items = (Array.isArray(parsedData) ? parsedData : [parsedData]).flat();
                const payload = items.map(item => ({
                    ...item,
                    unit_id: selectedUnit,
                    id: item.id || crypto.randomUUID()
                }));

                const res = await fetch('/api/micro_skills/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to import micro skills');
                
                setStatus({ type: 'success', message: `Successfully imported ${payload.length} Micro Skills!` });
                setJsonInput('');
                return;
            }

            // QUESTIONS MODE
            if (importMode === 'questions') {
                if (!selectedSkill) throw new Error('Please select a Target Micro Skill.');
                const items = (Array.isArray(parsedData) ? parsedData : [parsedData]).flat();
                const payload = items.map(item => normalizeQuestion(item, selectedSkill));

                const res = await fetch('/api/questions/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) {
                    const errorDetails = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
                    console.error('Server error details:', errorDetails);
                    throw new Error(`Failed to import questions: ${errorDetails.error?.message || 'Unknown error'}`);
                }

                setStatus({ type: 'success', message: `Successfully imported ${payload.length} questions!` });
                setJsonInput('');
            }

            // LESSONS MODE
            if (importMode === 'lessons') {
                const items = (Array.isArray(parsedData) ? parsedData : [parsedData]).flat();
                
                const payload = items.map(item => ({
                    ...item,
                    microskillId: selectedSkill || item.microskillId,
                    id: item.id || crypto.randomUUID()
                }));
 
                const res = await fetch('/api/lessons/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to import lessons');
                
                setStatus({ type: 'success', message: `Successfully imported ${payload.length} lessons!` });
                setJsonInput('');
                return;
            }
 
            // TEMPLATES MODE
            if (importMode === 'templates') {
                const items = (Array.isArray(parsedData) ? parsedData : [parsedData]).flat();
                
                const payload = items.map(item => ({
                    ...item,
                    grade_id: selectedGrade || item.grade_id,
                    subject_id: selectedSubject || item.subject_id,
                    unit_id: selectedUnit || item.unit_id,
                    micro_skill_id: selectedSkill || item.micro_skill_id,
                    id: item.id || crypto.randomUUID()
                }));
 
                const res = await fetch('/api/templates/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to import templates');
                
                setStatus({ type: 'success', message: `Successfully imported ${payload.length} templates!` });
                setJsonInput('');
                return;
            }

        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <header className="flex items-center gap-4 py-6 border-b border-slate-200">
                <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bulk Import Center</h1>
                    <p className="text-slate-500 text-sm">Import structural data or questions in bulk via JSON.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Control Panel */}
                <div className="space-y-6">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <Layers className="w-5 h-5 text-indigo-500" />
                            Import Type
                        </h3>
                        
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'questions', label: 'Questions', icon: HelpCircle },
                                { id: 'micro_skills', label: 'Micro Skills', icon: Code },
                                { id: 'templates', label: 'Templates', icon: Layers },
                                { id: 'lessons', label: 'Lessons', icon: Layers },
                                { id: 'full', label: 'Whole Repository', icon: FileJson }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setImportMode(mode.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                                        importMode === mode.id 
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold" 
                                            : "border-slate-100 hover:border-slate-200 text-slate-500"
                                    )}
                                >
                                    <mode.icon className={cn("w-5 h-5", importMode === mode.id ? "text-indigo-600" : "text-slate-400")} />
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {importMode !== 'full' && (
                        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                Target Location
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grade</label>
                                    <select value={selectedGrade} onChange={handleGradeChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">Select Grade</option>
                                        {grades.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subject</label>
                                    <select value={selectedSubject} onChange={handleSubjectChange} disabled={!selectedGrade} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unit</label>
                                    <select value={selectedUnit} onChange={handleUnitChange} disabled={!selectedSubject} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                                        <option value="">Select Unit</option>
                                        {units.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                                    </select>
                                </div>

                                {['questions', 'templates', 'lessons'].includes(importMode) && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Micro Skill</label>
                                        <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)} disabled={!selectedUnit} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                                            <option value="">Select Micro Skill</option>
                                            {microSkills.map(ms => <option key={ms.id || ms._id} value={ms.id || ms._id}>{ms.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={loading || !jsonInput.trim()}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /> Execute Import</>}
                    </button>

                    {status.message && (
                        <div className={cn(
                            "p-4 rounded-2xl flex gap-3 border shadow-sm",
                            status.type === 'error' ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-800"
                        )}>
                            {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                            <p className="text-sm font-medium leading-relaxed">{status.message}</p>
                        </div>
                    )}
                </div>

                {/* Editor Panel */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <FileJson className="w-4 h-4" /> JSON Code Payload
                        </label>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Array of Objects expected</span>
                    </div>
                    <div className="relative group">
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            className="w-full h-[650px] font-mono text-[11px] bg-slate-900 text-slate-300 p-6 rounded-3xl focus:ring-4 focus:ring-indigo-500/20 border-0 outline-none resize-none leading-relaxed shadow-2xl"
                            placeholder={
                                importMode === 'questions' ? "// Paste Questions Array here..." :
                                importMode === 'micro_skills' ? "// Paste Micro Skills Array here (e.g. { name: '..', code: '..' })" :
                                importMode === 'lessons' ? "// Paste Lessons Array here..." :
                                " // Paste Whole DB Object here { grades: [], units: [], ... }"
                            }
                        />
                        <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                            <FileJson className="w-10 h-10 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Code = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
const RefreshCw = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>;

