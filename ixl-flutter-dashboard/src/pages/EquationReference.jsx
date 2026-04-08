
import React, { useState, useEffect, useRef } from 'react';
import { 
    Calculator, 
    Sigma, 
    Variable, 
    BarChart, 
    Zap, 
    ChevronRight, 
    Layout, 
    Edit3, 
    Eye, 
    Copy, 
    Check, 
    Plus,
    Trash2,
    FileText,
    Settings2,
    Share2,
    Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import 'mathlive';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Minimalistic Math Field wrapper for editing
const MathField = ({ value, onChange, className }) => {
    const mfRef = useRef(null);

    useEffect(() => {
        if (mfRef.current) {
            mfRef.current.value = value;
        }
    }, [value]);

    return (
        <math-field
            ref={mfRef}
            onInput={(e) => onChange(e.target.value)}
            className={cn("w-full bg-transparent border-none outline-none", className)}
        />
    );
};

const EquationReference = () => {
    const [activeSection, setActiveSection] = useState(0);
    const [viewMode, setViewMode] = useState('document'); // 'document' (KaTeX) or 'editor' (MathLive)
    const [copiedId, setCopiedId] = useState(null);

    const [sections, setSections] = useState([
        {
            id: 1,
            title: "Calculus and Analysis",
            icon: Calculator,
            color: "from-blue-600 to-emerald-500", 
            accent: "emerald",
            description: "Advanced calculus formulas with primary focus on derivatives and limits.",
            equations: [
                {
                    id: 'e1',
                    label: "Fundamental Theorem of Calculus",
                    latex: "\\int_{a}^{b} f'(x) \\, dx = f(b) - f(a)",
                    note: "The bridge between derivatives and integrals."
                },
                {
                    id: 'e2',
                    label: "Definition of Derivative",
                    latex: "f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}",
                    note: "Instantaneous rate of change as a limit."
                },
                {
                    id: 'e3',
                    label: "Taylor Series Expansion",
                    latex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n",
                    note: "Approximating complex functions with polynomials."
                }
            ]
        },
        {
            id: 2,
            title: "Algebra and Number Theory",
            icon: Variable,
            color: "from-lime-500 to-green-600",
            accent: "lime",
            description: "Classical algebraic solutions and Euler's foundational identities.",
            equations: [
                {
                    id: 'e4',
                    label: "Quadratic Formula",
                    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
                    note: "Solutions to second-degree polynomials."
                },
                {
                    id: 'e5',
                    label: "Euler's Identity",
                    latex: "e^{i\\pi} + 1 = 0",
                    note: "The 'most beautiful' equation in mathematics."
                },
                {
                    id: 'e6',
                    label: "Binomial Theorem",
                    latex: "(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k",
                    note: "Polynomial expansion of binomial powers."
                }
            ]
        },
        {
            id: 3,
            title: "Linear Algebra",
            icon: Layout,
            color: "from-indigo-500 to-blue-600",
            accent: "indigo",
            description: "Matrix operations, eigenvalues, and vector transformations.",
            equations: [
                {
                    id: 'e7',
                    label: "System of Linear Equations",
                    latex: "A\\mathbf{x} = \\mathbf{b}",
                    note: "Matrix representation of multiple linear constraints."
                },
                {
                    id: 'e8',
                    label: "Characteristic Equation",
                    latex: "\\det(A - \\lambda I) = 0",
                    note: "Finding eigenvalues $\\lambda$ by solving for the determinant."
                }
            ]
        },
        {
            id: 4,
            title: "Physics & Field Theory",
            icon: Zap,
            color: "from-orange-500 to-red-600",
            accent: "orange",
            description: "Maxwell's Equations and the foundations of modern physics.",
            equations: [
                {
                    id: 'e11',
                    label: "Mass-Energy Equivalence",
                    latex: "E = mc^2",
                    note: "Matter and energy interchangeability."
                },
                {
                    id: 'e13',
                    label: "Maxwell's Equation: Gauss' Law",
                    latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}",
                    note: "Electric field flux through closed surfaces."
                },
                {
                    id: 'e15',
                    label: "Faraday's Law of Induction",
                    latex: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
                    note: "Electromotive force from changing magnetic fields."
                }
            ]
        }
    ]);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const updateEquation = (sectionIdx, eqIdx, updates) => {
        const newSections = [...sections];
        newSections[sectionIdx].equations[eqIdx] = { ...newSections[sectionIdx].equations[eqIdx], ...updates };
        setSections(newSections);
    };

    const addEquation = (sectionIdx) => {
        const newSections = [...sections];
        newSections[sectionIdx].equations.push({
            id: `e-${Date.now()}`,
            label: "New Formula",
            latex: "x = y",
            note: "Description here..."
        });
        setSections(newSections);
    };

    const removeEquation = (sectionIdx, eqIdx) => {
        const newSections = [...sections];
        newSections[sectionIdx].equations.splice(eqIdx, 1);
        setSections(newSections);
    };

    return (
        <div className="flex flex-col gap-10 min-h-screen pb-20 animate-in fade-in duration-1000">
            {/* Premium Header Container */}
            <div className="relative group">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-r blur-3xl opacity-20 transition-all duration-1000",
                    sections[activeSection].color
                )} />
                
                <div className="relative bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[32px] p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "w-16 h-16 rounded-[24px] bg-gradient-to-br shadow-xl flex items-center justify-center text-white ring-4 ring-white/50",
                            sections[activeSection].color
                        )}>
                            {React.createElement(sections[activeSection].icon, { className: "w-8 h-8" })}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white shadow-sm border border-slate-100",
                                    `text-${sections[activeSection].accent}-500`
                                )}>
                                    Math Library
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                {sections[activeSection].title}
                            </h1>
                            <p className="text-slate-500 font-medium text-sm mt-1 max-w-lg">
                                {sections[activeSection].description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-900/5 p-1.5 rounded-[24px] border border-slate-200/50">
                        <button 
                            onClick={() => setViewMode('document')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-[18px] font-black text-[10px] transition-all tracking-wider",
                                viewMode === 'document' 
                                    ? "bg-white text-slate-900 shadow-lg shadow-slate-200/50 border border-slate-100" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" /> DOCUMENT
                        </button>
                        <button 
                            onClick={() => setViewMode('editor')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-[18px] font-black text-[10px] transition-all tracking-wider",
                                viewMode === 'editor' 
                                    ? "bg-slate-900 text-white shadow-xl" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Edit3 className="w-3.5 h-3.5" /> EDITOR
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Lateral Sidebar */}
                <div className="w-full lg:w-72 shrink-0 space-y-4">
                    <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-[32px] p-5 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Disciplines</h2>
                            <Settings2 className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                        <div className="space-y-1.5">
                            {sections.map((section, idx) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(idx)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-[20px] transition-all duration-300 group relative overflow-hidden",
                                        activeSection === idx 
                                            ? "bg-slate-900 text-white shadow-xl z-10" 
                                            : "hover:bg-white text-slate-500 hover:shadow-md hover:shadow-slate-200/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                                        activeSection === idx ? "bg-white/10" : "bg-slate-100/50 group-hover:bg-slate-50"
                                    )}>
                                        {React.createElement(section.icon, { 
                                            className: cn("w-4 h-4", activeSection === idx ? "text-white" : "text-slate-400") 
                                        })}
                                    </div>
                                    <span className="font-bold text-xs tracking-tight flex-1 text-left">{section.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-[32px] p-6 shadow-xl shadow-slate-200/20 text-center">
                        <h3 className="text-xs font-black text-slate-900 mb-1">Export</h3>
                        <p className="text-[10px] text-slate-400 font-medium mb-4">Export library as PDF or LaTeX.</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all flex flex-col items-center gap-1.5 group">
                                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                                <span className="text-[8px] font-black text-slate-500">PDF</span>
                            </button>
                            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all flex flex-col items-center gap-1.5 group">
                                <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500" />
                                <span className="text-[8px] font-black text-slate-500">SHARE</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 space-y-6">
                    {viewMode === 'editor' && (
                        <div className="bg-brand-50/50 border border-brand-100 rounded-[28px] p-6 flex items-center justify-between animate-in slide-in-from-top-3 duration-500">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                    <Edit3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Editor Mode</p>
                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">Interactive Sandbox</h4>
                                </div>
                            </div>
                            <button 
                                onClick={() => addEquation(activeSection)}
                                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] hover:bg-brand-600 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> ADD FORMULA
                            </button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {sections[activeSection].equations.map((eq, eqIdx) => (
                            <div 
                                key={eq.id}
                                className={cn(
                                    "group/card relative bg-white/80 backdrop-blur-xl border border-white rounded-[32px] transition-all duration-300 overflow-hidden",
                                    viewMode === 'editor' ? "p-8 border-slate-200" : "p-8 lg:p-10 hover:shadow-xl hover:shadow-slate-200/40 hover:scale-[1.005]"
                                )}
                            >
                                {viewMode === 'editor' ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="w-full max-w-sm">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">LABEL</p>
                                                <input 
                                                    value={eq.label}
                                                    onChange={(e) => updateEquation(activeSection, eqIdx, { label: e.target.value })}
                                                    className="bg-transparent text-xl font-black text-slate-900 outline-none border-b border-slate-100 focus:border-brand-500 w-full transition-all"
                                                    placeholder="Equation Name"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => removeEquation(activeSection, eqIdx)}
                                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 border border-slate-100 rounded-[24px] p-8 transition-all min-h-[100px] flex items-center justify-center">
                                            <MathField 
                                                value={eq.latex}
                                                onChange={(val) => updateEquation(activeSection, eqIdx, { latex: val })}
                                                className="text-3xl font-light text-slate-800"
                                            />
                                        </div>

                                        <div className="relative">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">NOTE/DESCRIPTION</p>
                                            <textarea 
                                                value={eq.note}
                                                onChange={(e) => updateEquation(activeSection, eqIdx, { note: e.target.value })}
                                                className="w-full bg-slate-50/50 rounded-xl p-4 text-xs text-slate-500 font-medium outline-none resize-none border border-slate-100 focus:border-brand-500/20 transition-all"
                                                placeholder="..."
                                                rows={1}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-300">#0{eqIdx + 1}</span>
                                                <button 
                                                    onClick={() => copyToClipboard(eq.latex, eq.id)}
                                                    className="px-4 py-1.5 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 rounded-full font-black text-[9px] transition-all flex items-center gap-1.5 border border-slate-100"
                                                >
                                                    {copiedId === eq.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    {copiedId === eq.id ? "COPIED" : "COPY"}
                                                </button>
                                            </div>
                                            
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">{eq.label}</h3>
                                            <p className="text-slate-400 text-xs font-medium leading-relaxed italic">
                                                {eq.note}
                                            </p>
                                        </div>

                                        <div className="relative py-8 px-6 bg-slate-50/50 rounded-[24px] border border-slate-100/50 flex items-center justify-center overflow-x-auto min-h-[120px]">
                                            <div className="text-2xl lg:text-3xl text-slate-800 transition-all transform hover:scale-[1.02] duration-500">
                                                <BlockMath math={eq.latex} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {sections[activeSection].equations.length === 0 && (
                            <div className="text-center py-40 bg-white/50 rounded-[48px] border-4 border-dashed border-slate-100 shadow-xl shadow-slate-200/20">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Plus className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Blank Section</h3>
                                <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8">This section of the library is currently empty. Start by adding your first mathematical formula.</p>
                                <button 
                                    onClick={() => addEquation(activeSection)}
                                    className="px-10 py-5 bg-slate-900 text-white rounded-[24px] font-black text-sm hover:scale-105 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                >
                                    CREATE FORMULA
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquationReference;
