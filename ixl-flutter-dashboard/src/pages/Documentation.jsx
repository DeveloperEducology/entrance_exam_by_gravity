
import React from 'react';
import { 
    BookOpen, 
    Layers, 
    MousePointer2, 
    Zap, 
    Code, 
    CheckCircle2, 
    FileText, 
    Terminal, 
    Box, 
    Type, 
    Image as ImageIcon, 
    Table,
    Edit3,
    Eye
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Documentation() {
    const sections = [
        {
            title: "1. Overview",
            icon: BookOpen,
            color: "text-blue-500",
            bg: "bg-blue-50",
            content: "The Math Question Editor is a React-based web application designed for content creators to build and edit educational questions using a direct-edit (WYSIWYG) interface. It supports multiple question types and follows a structured JSON schema compatible with advanced learning platforms."
        },
        {
            title: "2. Supported Question Types",
            icon: Layers,
            color: "text-purple-500",
            bg: "bg-purple-50",
            items: [
                {
                    name: "Multiple Choice (MCQ)",
                    icon: Type,
                    details: [
                        "Visual Editing: Click to edit the question text and any of the options.",
                        "Answer Selection: Click the radio icon next to an option to set it as the correct index.",
                        "Dynamic Options: Add new options dynamically via the 'Add Option' button."
                    ]
                },
                {
                    name: "Fill-in-the-Blank",
                    icon: Edit3,
                    details: [
                        "Sentence Construction: Edit text parts that surround input fields.",
                        "Answer Mapping: Dedicated panel allows editing expected values for input IDs (e.g., ans1).",
                        "Input Placeholders: Visual indicators show where input boxes will appear to the student."
                    ]
                },
                {
                    name: "Smart Table",
                    icon: Table,
                    details: [
                        "Place Value Charts: designed for thousands, hundreds, tens, and ones.",
                        "Grid Editing: Edit both headers and cell values directly.",
                        "Column Management: Add new columns which automatically updates the data structure."
                    ]
                }
            ]
        },
        {
            title: "3. Core Features",
            icon: Zap,
            color: "text-amber-500",
            bg: "bg-amber-50",
            items: [
                {
                    name: "Direct Visual Editing",
                    icon: MousePointer2,
                    content: "Every text element on the page is an EditableText component. Clicking any text transforms it into an input field."
                },
                {
                    name: "Dual View Modes",
                    icon: Eye,
                    content: "Visual Mode for design and JSON Mode for raw data structure verification."
                },
                {
                    name: "Solution & Explanation",
                    icon: FileText,
                    content: "Step-by-step explanations can be added and edited in the orange 'solve' tab section."
                }
            ]
        },
        {
            title: "4. Technical Schema (v1.0)",
            icon: Code,
            color: "text-indigo-500",
            bg: "bg-indigo-50",
            content: (
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <Terminal className="w-4 h-4 text-brand-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question Schema Example</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-brand-300 overflow-x-auto leading-relaxed">
{`{
  "type": "mcq | fillInTheBlank | smartTable",
  "difficulty": "Easy | Medium | Hard",
  "marks": number,
  "complexity": number,
  "parts": [
    { "type": "text", "content": "..." },
    { "type": "input", "id": "..." }
  ],
  "adaptiveConfig": {
    "conceptTags": [],
    "targetComplexityBand": "...",
    "orientation": "vertical | horizontal"
  },
  "solutionParts": [...]
}`}
                    </pre>
                </div>
            )
        },
        {
            title: "5. Technology Stack",
            icon: Box,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            grid: [
                { name: "React 19", desc: "Hooks & Functional Components" },
                { name: "Tailwind CSS", desc: "Utility-first modern UI" },
                { name: "Lucide React", desc: "Premium SVG icons" },
                { name: "Motion", desc: "Smooth UI transitions" },
                { name: "TypeScript", desc: "Full type safety" }
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto p-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-12 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-brand-50 rounded-2xl mb-4 border border-brand-100 shadow-sm">
                    <BookOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                    Math Question Editor <span className="text-brand-600">Documentation</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                    Comprehensive guide to features, architecture, and schema for the Gravity Question System.
                </p>
                <div className="flex items-center justify-center gap-4 mt-6">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                        <Zap className="w-3 h-3" /> VERSION 1.0
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full border border-brand-100">
                        <CheckCircle2 className="w-3 h-3 text-brand-500" /> LAST UPDATED: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sections.map((section, idx) => (
                    <div 
                        key={idx} 
                        className={cn(
                            "group p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 flex flex-col",
                            section.title.includes("Overview") && "md:col-span-2",
                            section.title.includes("Schema") && "md:col-span-2"
                        )}
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className={cn("p-3 rounded-xl shrink-0 transition-all group-hover:scale-110", section.bg, section.color)}>
                                <section.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">{section.title}</h2>
                                {section.content && typeof section.content === 'string' && (
                                    <p className="text-slate-600 leading-relaxed font-medium">
                                        {section.content}
                                    </p>
                                )}
                            </div>
                        </div>

                        {section.items && (
                            <div className="space-y-6">
                                {section.items.map((item, iidx) => (
                                    <div key={iidx} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 group/item hover:bg-white hover:border-brand-200 transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm group-hover/item:text-brand-600 transition-colors">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-bold text-slate-800 tracking-tight">{item.name}</h3>
                                        </div>
                                        {item.details ? (
                                            <ul className="space-y-1.5 ml-8">
                                                {item.details.map((d, di) => (
                                                    <li key={di} className="text-sm text-slate-500 flex items-start gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-slate-300 mt-2 shrink-0" />
                                                        {d}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-500 ml-8 leading-relaxed">
                                                {item.content}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {section.grid && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {section.grid.map((chip, ci) => (
                                    <div key={ci} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                                        <div className="text-[10px] font-bold text-brand-600 uppercase mb-0.5">{chip.name}</div>
                                        <div className="text-[11px] text-slate-500 font-medium">{chip.desc}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {typeof section.content !== 'string' && section.content}
                    </div>
                ))}
            </div>

            {/* Footer Tip */}
            <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/10 rounded-2xl">
                        <Zap className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Ready to create?</h4>
                        <p className="text-slate-400 text-sm">Jump into the editor and start building interactive math content.</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.location.href = '/create'}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-600/20 relative z-10"
                >
                    Open Question Editor
                </button>
            </div>
        </div>
    );
}

