
import React, { useState, useEffect, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
    Copy, Check, RefreshCw, Database, Layers, Search, Code, 
    FileJson, X, ChevronRight, Filter, BookOpen, Layout, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function JsonView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter States
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedMicroSkill, setSelectedMicroSkill] = useState('');

    // Questions State
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/structure');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error (${response.status}): ${errorText || response.statusText}`);
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error.message);
            setData(result.data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch questions when Micro Skill changes
    useEffect(() => {
        if (selectedMicroSkill) {
            fetchQuestions(selectedMicroSkill);
        } else {
            setQuestions([]);
        }
    }, [selectedMicroSkill]);

    const fetchQuestions = async (skillId) => {
        setLoadingQuestions(true);
        try {
            const res = await fetch(`/api/questions?micro_skill_id=${skillId}`);
            const result = await res.json();
            setQuestions(result.data || []);
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleCopy = (content) => {
        const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Derived Options for Dropdowns
    const grades = useMemo(() => data || [], [data]);
    
    const units = useMemo(() => {
        if (!selectedGrade || !data) return [];
        const grade = data.find(g => String(g._id) === String(selectedGrade) || String(g.id) === String(selectedGrade));
        if (!grade) return [];
        // Flatten all units from all subjects of this grade
        return (grade.subjects || []).flatMap(s => s.units || []);
    }, [data, selectedGrade]);

    const microSkills = useMemo(() => {
        if (!selectedUnit || !units.length) return [];
        const unit = units.find(u => String(u._id) === String(selectedUnit) || String(u.id) === String(selectedUnit));
        return unit?.micro_skills || [];
    }, [units, selectedUnit]);

    // Compute the Focused JSON based on filters
    const focusedData = useMemo(() => {
        if (!data) return null;
        
        // If searching, search takes precedence over structural filters (or we could combine them)
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            return data.filter(grade => 
                grade.name?.toLowerCase().includes(lowerSearch) ||
                grade.subjects?.some(sub => 
                    sub.name?.toLowerCase().includes(lowerSearch) ||
                    sub.units?.some(unit => 
                        unit.name?.toLowerCase().includes(lowerSearch) ||
                        unit.micro_skills?.some(ms => ms.name?.toLowerCase().includes(lowerSearch))
                    )
                )
            );
        }

        if (selectedMicroSkill) {
            const ms = microSkills.find(ms => String(ms._id) === String(selectedMicroSkill) || String(ms.id) === String(selectedMicroSkill));
            if (ms) {
                // If questions are loaded, include them in the JSON
                return { ...ms, questions };
            }
            return null;
        }
        if (selectedUnit) {
            return units.find(u => String(u._id) === String(selectedUnit) || String(u.id) === String(selectedUnit));
        }
        if (selectedGrade) {
            return grades.find(g => String(g._id) === String(selectedGrade) || String(g.id) === String(selectedGrade));
        }
        
        return data;
    }, [data, searchTerm, selectedGrade, selectedUnit, selectedMicroSkill, grades, units, microSkills, questions]);

    return (
        <div className="space-y-6 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Database className="w-8 h-8 text-indigo-500" />
                        Smart JSON Explorer
                    </h1>
                    <p className="text-slate-500 mt-1">Filter by Grades, Units, and Micro Skills with Question View</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors border border-slate-200 bg-white shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => handleCopy(focusedData)}
                        disabled={!focusedData || loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy View JSON'}
                    </button>
                    {(selectedGrade || searchTerm) && (
                        <button
                            onClick={() => {
                                setSelectedGrade('');
                                setSelectedUnit('');
                                setSelectedMicroSkill('');
                                setSearchTerm('');
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        >
                            <X className="w-4 h-4" />
                            Clear Filters
                        </button>
                    )}
                </div>
            </header>

            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-3 h-3" /> Grade
                    </label>
                    <select
                        value={selectedGrade}
                        onChange={(e) => {
                            setSelectedGrade(e.target.value);
                            setSelectedUnit('');
                            setSelectedMicroSkill('');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                    >
                        <option value="">Full Database</option>
                        {grades.map(g => (
                            <option key={g._id || g.id} value={g._id || g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Layout className="w-3 h-3" /> Unit
                    </label>
                    <select
                        value={selectedUnit}
                        onChange={(e) => {
                            setSelectedUnit(e.target.value);
                            setSelectedMicroSkill('');
                        }}
                        disabled={!selectedGrade}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                        <option value="">All Units</option>
                        {units.map(u => (
                            <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Code className="w-3 h-3" /> Micro Skill
                    </label>
                    <select
                        value={selectedMicroSkill}
                        onChange={(e) => setSelectedMicroSkill(e.target.value)}
                        disabled={!selectedUnit}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                        <option value="">All Skills</option>
                        {microSkills.map(ms => (
                            <option key={ms._id || ms.id} value={ms._id || ms.id}>{ms.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Search className="w-3 h-3" /> Global Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find anything..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
                {/* JSON View Sidebar/Main */}
                <main className={`bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${selectedMicroSkill ? 'lg:w-2/3' : 'w-full'}`}>
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 mr-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-slate-400 font-mono text-sm">
                                {selectedMicroSkill ? 'skill.json' : selectedUnit ? 'unit.json' : selectedGrade ? 'grade.json' : 'full_db.json'}
                            </span>
                        </div>
                        {focusedData && (
                            <div className="text-slate-500 text-xs font-mono uppercase tracking-widest">
                                {JSON.stringify(focusedData).length.toLocaleString()} bytes
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto relative">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                    <RefreshCw className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
                                    <p className="font-medium">Fetching hierarchical data...</p>
                                </motion.div>
                            ) : error ? (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center h-full flex flex-col justify-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 text-red-400 mb-4 mx-auto">
                                        <X className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Failed to load structure</h3>
                                    <p className="text-slate-400 mb-6">{error}</p>
                                    <button onClick={fetchData} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 mx-auto">Try Again</button>
                                </motion.div>
                            ) : (
                                <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group/code">
                                    <SyntaxHighlighter
                                        language="json"
                                        style={atomDark}
                                        customStyle={{
                                            margin: 0,
                                            padding: '2rem',
                                            fontSize: '0.85rem',
                                            lineHeight: '1.6',
                                            backgroundColor: 'transparent',
                                        }}
                                        showLineNumbers={true}
                                    >
                                        {JSON.stringify(focusedData, null, 2)}
                                    </SyntaxHighlighter>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Questions Section - Only visible when Micro Skill is selected */}
                <AnimatePresence>
                    {selectedMicroSkill && (
                        <motion.aside
                            initial={{ opacity: 0, x: 20, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: '33.333%' }}
                            exit={{ opacity: 0, x: 20, width: 0 }}
                            className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                                    Questions ({questions.length})
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">In this Micro Skill</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingQuestions ? (
                                    <div className="h-full flex items-center justify-center py-20 text-slate-400">
                                        <RefreshCw className="w-8 h-8 animate-spin mr-3" />
                                        <span>Loading questions...</span>
                                    </div>
                                ) : questions.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                            <Search className="w-6 h-6" />
                                        </div>
                                        <p className="font-medium">No questions found</p>
                                        <p className="text-xs mt-1">Try generating some for this skill</p>
                                    </div>
                                ) : (
                                    questions.map((q, idx) => {
                                        const snippet = q.question_text || (Array.isArray(q.parts) && q.parts.find(p => p.type === 'text' && p.content)?.content) || "Complex question type (see JSON)";
                                        return (
                                            <div key={q._id || q.id} className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                                        {q.type || 'MCQ'}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400 mb-1">
                                                        #{idx + 1}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-800 line-clamp-4 mb-3">
                                                    {snippet}
                                                </p>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-3">
                                                    <span className="capitalize">{q.difficulty || 'Medium'}</span>
                                                    <button
                                                        onClick={() => handleCopy(q)}
                                                        className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors font-bold"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                        COPY JSON
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
            
            {!selectedMicroSkill && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Filter className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900 text-sm">Deep Drill Down</h4>
                        <p className="text-amber-700 text-xs mt-0.5">Select a Micro Skill from the dropdowns above to see the associated questions and a more focused JSON view.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
