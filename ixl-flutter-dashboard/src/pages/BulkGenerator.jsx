
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Grid3X3, ArrowLeft, Plus, Trash2,
    Save, Play, FileJson, CheckCircle,
    Info, Settings, Wand2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const GENERATOR_PATTERNS = [
    {
        id: 'place_value_tens_ones',
        name: 'Place Value (Tens & Ones)',
        description: 'Generates a smart table asking for Tens and Ones for a range of numbers.',
        defaultPrompt: 'Drag the numbers to complete the table:',
        generate: (start, end, step) => {
            const results = [];
            for (let i = start; i <= end; i += step) {
                const tens = Math.floor(i / 10);
                const ones = i % 10;
                results.push({
                    type: 'smartTable',
                    difficulty: i < 20 ? 'easy' : i < 50 ? 'medium' : 'hard',
                    marks: 1,
                    complexity: 5,
                    question_text: `Break down the number ${i} into Tens and Ones.`,
                    smart_table_json: {
                        columns: [
                            { header: 'Number', key: 'num' },
                            { header: 'Tens', key: 'tens' },
                            { header: 'Ones', key: 'ones' }
                        ],
                        rows: [
                            {
                                num: String(i),
                                tens: `{{id:t_${i}, max:1, val:${tens}}}`,
                                ones: `{{id:o_${i}, max:1, val:${ones}}}`
                            }
                        ],
                        settings: { type: 'default' }
                    },
                    parts: [
                        {
                            type: 'smartTable',
                            columns: [
                                { header: 'Number', key: 'num' },
                                { header: 'Tens', key: 'tens' },
                                { header: 'Ones', key: 'ones' }
                            ],
                            rows: [
                                {
                                    num: String(i),
                                    tens: `{{id:t_${i}, max:1, val:${tens}}}`,
                                    ones: `{{id:o_${i}, max:1, val:${ones}}}`
                                }
                            ],
                            settings: { type: 'default' }
                        }
                    ],
                    solutionParts: [
                        { type: 'text', content: `${i} is ${tens} tens and ${ones} ones.`, isVertical: true }
                    ]
                });
            }
            return results;
        }
    },
    {
        id: 'basic_addition_smart_table',
        name: 'Addition Breakdown',
        description: 'Generates tables showing parts of an addition sum.',
        defaultPrompt: 'Fill in the missing numbers to show the addition.',
        generate: (start, end, step) => {
            const results = [];
            for (let i = start; i <= end; i += step) {
                const part1 = i;
                const part2 = Math.floor(Math.random() * 10) + 1;
                const sum = part1 + part2;
                results.push({
                    type: 'smartTable',
                    difficulty: 'medium',
                    marks: 1,
                    complexity: 6,
                    question_text: `Complete the sum: ${part1} + ${part2}`,
                    smart_table_json: {
                        columns: [
                            { header: 'First Part', key: 'p1' },
                            { header: 'Second Part', key: 'p2' },
                            { header: 'Total', key: 'sum' }
                        ],
                        rows: [
                            {
                                p1: String(part1),
                                p2: String(part2),
                                sum: `{{id:s_${i}_${part2}, max:3, val:${sum}}}`
                            }
                        ],
                        settings: { type: 'default' }
                    },
                    parts: [
                        {
                            type: 'smartTable',
                            columns: [
                                { header: 'First Part', key: 'p1' },
                                { header: 'Second Part', key: 'p2' },
                                { header: 'Total', key: 'sum' }
                            ],
                            rows: [
                                {
                                    p1: String(part1),
                                    p2: String(part2),
                                    sum: `{{id:s_${i}_${part2}, max:3, val:${sum}}}`
                                }
                            ],
                            settings: { type: 'default' }
                        }
                    ]
                });
            }
            return results;
        }
    }
];

export function BulkGenerator() {
    const navigate = useNavigate();
    const [selectedPattern, setSelectedPattern] = useState(GENERATOR_PATTERNS[0].id);
    const [config, setConfig] = useState({
        start: 1,
        end: 10,
        step: 1
    });

    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Skills selection for direct import
    const [grades, setGrades] = useState([]);
    const [units, setUnits] = useState([]);
    const [microSkills, setMicroSkills] = useState([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedSkill, setSelectedSkill] = useState('');

    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase.from('grades').select('*');
            if (data) setGrades(data);
        };
        fetchData();
    }, []);

    const fetchUnits = async (gradeId) => {
        const { data: subjects } = await supabase.from('subjects').select('id').eq('grade_id', gradeId);
        if (subjects?.length > 0) {
            const { data: units } = await supabase.from('units').select('*').in('subject_id', subjects.map(s => s.id));
            setUnits(units || []);
        }
    };

    const fetchSkills = async (unitId) => {
        const { data } = await supabase.from('micro_skills').select('*').eq('unit_id', unitId);
        setMicroSkills(data || []);
    };

    const handleRunPreview = () => {
        setIsGenerating(true);
        const pattern = GENERATOR_PATTERNS.find(p => p.id === selectedPattern);
        if (pattern) {
            const results = pattern.generate(config.start, config.end, config.step);
            setGeneratedQuestions(results);
        }
        setIsGenerating(false);
    };

    const handleImportAll = async () => {
        if (!selectedSkill) {
            setStatus({ type: 'error', message: 'Please select a Micro Skill first.' });
            return;
        }
        if (generatedQuestions.length === 0) {
            setStatus({ type: 'error', message: 'No questions to import. Run preview first.' });
            return;
        }

        setStatus({ type: 'info', message: `Importing ${generatedQuestions.length} questions...` });

        try {
            const payload = generatedQuestions.map(q => {
                // Determine parts from smart_table_json if type is smartTable
                let finalParts = q.parts || [];
                let correctAnswerText = q.correct_answer_text || "{}";

                if (q.type === 'smartTable' && q.smart_table_json) {
                    const table = typeof q.smart_table_json === 'string' ? JSON.parse(q.smart_table_json) : q.smart_table_json;
                    finalParts = [{
                        type: 'smartTable',
                        columns: table.columns,
                        rows: table.rows,
                        settings: table.settings
                    }];

                    // Extract answers for correct_answer_text
                    const answers = {};
                    (table.rows || []).forEach(row => {
                        Object.keys(row).forEach(key => {
                            const val = row[key];
                            if (typeof val === 'string' && val.includes('{{id:')) {
                                const idMatch = val.match(/id:\s*([^,}]+)/);
                                const valMatch = val.match(/val:\s*([^,}]+)/);
                                if (idMatch && valMatch) {
                                    answers[idMatch[1].trim()] = valMatch[1].trim();
                                }
                            }
                        });
                    });
                    correctAnswerText = JSON.stringify(answers);
                }

                return {
                    type: q.type,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    complexity: q.complexity,
                    question_text: q.question_text,
                    parts: finalParts,
                    smart_table_json: typeof q.smart_table_json === 'object' ? JSON.stringify(q.smart_table_json) : q.smart_table_json,
                    correct_answer_text: correctAnswerText,
                    solution: JSON.stringify(q.solutionParts || []),
                    micro_skill_id: selectedSkill
                };
            });

            const { error } = await supabase.from('questions').insert(payload);
            if (error) throw error;

            setStatus({ type: 'success', message: `Successfully imported ${payload.length} questions!` });
            setGeneratedQuestions([]);
        } catch (err) {
            setStatus({ type: 'error', message: 'Import failed: ' + err.message });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex items-center justify-between py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Bulk Question Generator</h1>
                        <p className="text-slate-500 text-sm">Create dozens of questions systematically using patterns.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRunPreview}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Run Generator
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* LEFT: Config */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-slate-400" /> Pattern Config
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Pattern</label>
                                <select
                                    className="w-full border-slate-300 rounded-lg text-sm"
                                    value={selectedPattern}
                                    onChange={(e) => setSelectedPattern(e.target.value)}
                                >
                                    {GENERATOR_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start No.</label>
                                    <input
                                        type="number"
                                        className="w-full border-slate-300 rounded-lg text-sm"
                                        value={config.start}
                                        onChange={(e) => setConfig({ ...config, start: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End No.</label>
                                    <input
                                        type="number"
                                        className="w-full border-slate-300 rounded-lg text-sm"
                                        value={config.end}
                                        onChange={(e) => setConfig({ ...config, end: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Step (Gap)</label>
                                <input
                                    type="number"
                                    className="w-full border-slate-300 rounded-lg text-sm"
                                    value={config.step}
                                    onChange={(e) => setConfig({ ...config, step: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400">
                                {GENERATOR_PATTERNS.find(p => p.id === selectedPattern)?.description}
                            </p>
                        </div>
                    </section>

                    <section className="bg-brand-50/50 p-5 rounded-xl border border-brand-100 space-y-4">
                        <h3 className="font-bold text-brand-900 flex items-center gap-2">
                            <Save className="w-4 h-4 text-brand-600" /> Target Import
                        </h3>

                        <div className="space-y-3">
                            <select
                                className="w-full border-brand-200 rounded-lg text-sm"
                                value={selectedGrade}
                                onChange={(e) => {
                                    setSelectedGrade(e.target.value);
                                    fetchUnits(e.target.value);
                                }}
                            >
                                <option value="">Select Grade</option>
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>

                            <select
                                className="w-full border-brand-200 rounded-lg text-sm disabled:opacity-50"
                                disabled={!selectedGrade}
                                value={selectedUnit}
                                onChange={(e) => {
                                    setSelectedUnit(e.target.value);
                                    fetchSkills(e.target.value);
                                }}
                            >
                                <option value="">Select Unit</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>

                            <select
                                className="w-full border-brand-200 rounded-lg text-sm disabled:opacity-50"
                                disabled={!selectedUnit}
                                value={selectedSkill}
                                onChange={(e) => setSelectedSkill(e.target.value)}
                            >
                                <option value="">Select Micro Skill</option>
                                {microSkills.map(ms => <option key={ms.id} value={ms.id}>{ms.name}</option>)}
                            </select>

                            <button
                                onClick={handleImportAll}
                                disabled={!selectedSkill || generatedQuestions.length === 0}
                                className="w-full py-2 bg-brand-600 text-white rounded-lg font-bold shadow-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Import {generatedQuestions.length} Questions
                            </button>
                        </div>

                        {status.message && (
                            <div className={cn(
                                "p-3 rounded-lg text-[10px] font-medium leading-tight",
                                status.type === 'error' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                            )}>
                                {status.message}
                            </div>
                        )}
                    </section>
                </div>

                {/* RIGHT: Preview */}
                <div className="lg:col-span-3 space-y-4">
                    {generatedQuestions.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-[500px] flex flex-col items-center justify-center text-slate-400">
                            <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium text-lg">Generator Ready</p>
                            <p className="text-sm">Set your number range and click "Run Generator" to preview.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Previewing {generatedQuestions.length} Questions</span>
                                <button
                                    onClick={() => {
                                        const json = JSON.stringify(generatedQuestions, null, 2);
                                        navigator.clipboard.writeText(json);
                                        setStatus({ type: 'success', message: 'JSON copied to clipboard!' });
                                        setTimeout(() => setStatus({ type: '', message: '' }), 2000);
                                    }}
                                    className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                                >
                                    <FileJson className="w-4 h-4" /> Copy Full JSON
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {generatedQuestions.map((q, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 transform translate-x-1/2 -translate-y-1/2 bg-slate-100 group-hover:bg-brand-600 hover:bg-brand-600 rounded-full w-12 h-12 flex items-center justify-center transition-colors">
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-white mr-2 mt-2">{idx + 1}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-100 text-brand-700 rounded uppercase">{q.difficulty}</span>
                                                <span className="text-[10px] font-bold text-slate-400">MARK: {q.marks}</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">{q.question_text}</p>

                                            {/* Minimal Table Preview */}
                                            {q.type === 'smartTable' && q.smart_table_json && (() => {
                                                const table = typeof q.smart_table_json === 'string' ? JSON.parse(q.smart_table_json) : q.smart_table_json;
                                                return (
                                                    <div className="border border-slate-100 rounded-lg bg-slate-50/50 p-2">
                                                        <table className="w-full text-[10px]">
                                                            <thead>
                                                                <tr className="border-b border-slate-200">
                                                                    {table.columns?.map((c, i) => (
                                                                        <th key={i} className="py-1 text-slate-400 font-bold uppercase tracking-tighter text-center">{c.header}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {table.rows?.map((r, i) => (
                                                                    <tr key={i}>
                                                                        {table.columns?.map((c, j) => {
                                                                            const val = r[c.key];
                                                                            const isInput = typeof val === 'string' && val.includes('{{id:');
                                                                            return (
                                                                                <td key={j} className="py-2 text-center align-middle">
                                                                                    {isInput ? <div className="w-6 h-6 border-2 border-dashed border-brand-200 rounded flex items-center justify-center mx-auto bg-white">?</div> : <span className="font-bold text-slate-700">{val}</span>}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

