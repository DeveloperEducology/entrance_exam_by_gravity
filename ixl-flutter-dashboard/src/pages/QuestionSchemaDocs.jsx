
import React, { useState } from 'react';
import { 
    FileJson, Code, HelpCircle, Layers, CheckCircle2, 
    AlertCircle, Copy, Terminal, Database, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const SCHEMA_DEFINITIONS = {
    base: {
        title: "Base Question Schema",
        description: "Standard fields required by all question types in the MongoDB/Supabase database.",
        fields: [
            { name: "id", type: "UUID/String", desc: "Unique identifier for the question (mapped to _id in MongoDB)." },
            { name: "micro_skill_id", type: "UUID/String", desc: "Foreign key linking to a specific Micro Skill node." },
            { name: "type", type: "Enum", desc: "fillInTheBlank | tokenSelection | classification | mcq" },
            { name: "difficulty", type: "String", desc: "easy | medium | hard" },
            { name: "question_text", type: "String", desc: "The primary instruction/prompt shown to the student." },
            { name: "parts", type: "Array<Part>", desc: "Array of UI components to render (Text, Images, Blanks)." },
            { name: "correct_answer_text", type: "String/JSON", desc: "String for primitive answers, JSON String for complex IDs/Arrays." },
            { name: "marks", type: "Number", desc: "Weight of the question (Default: 1)." },
            { name: "is_vertical", type: "Boolean", desc: "Layout orientation flag." }
        ]
    },
    types: [
        {
            id: 'tokenSelection',
            name: 'Token Selection',
            description: 'For sentence-based highlighting (e.g., Grammar, Parts of Speech).',
            example: {
                type: "tokenSelection",
                question_text: "Select the nouns.",
                tokens: [
                    { id: "t1", text: "The" },
                    { id: "t2", text: "cat" },
                    { id: "t3", text: "sleeps." }
                ],
                correct_answer_text: "[\"t2\"]",
                is_multi_select: true
            }
        },
        {
            id: 'classification',
            name: 'Classification (Drag & Drop)',
            description: 'Sorting items into defined buckets or categories.',
            example: {
                type: "classification",
                question_text: "Sort numbers into Even or Odd.",
                drag_groups: [
                    { id: "even", label: "EVEN" },
                    { id: "odd", label: "ODD" }
                ],
                drag_items: [
                    { id: "i1", content: "12" },
                    { id: "i2", content: "7" }
                ],
                correct_answer_text: "{\"i1\":\"even\", \"i2\":\"odd\"}"
            }
        },
        {
            id: 'template',
            name: 'Arithmetic Template',
            description: 'Dynamic math questions driven by a specific logic engine.',
            example: {
                template_id: "math_arithmetic_v1",
                logic_type: "addition",
                data_source: {
                    operands: [15, 2],
                    operator: "+",
                    missing_index: 2
                },
                solution: [
                    { type: "text", content: "Step 1: Add units" }
                ]
            }
        }
    ]
};

export function QuestionSchemaDocs() {
    const [selectedType, setSelectedType] = useState(SCHEMA_DEFINITIONS.types[0]);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(JSON.stringify(text, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Header */}
            <header className="py-12 border-b border-slate-200">
                <div className="flex items-center gap-3 text-indigo-600 font-bold mb-4">
                    <Database className="w-5 h-5" />
                    <span className="tracking-widest uppercase text-xs">Standardized Reference</span>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                    Question <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Schema System</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                    The single source of truth for engineering questions. This schema ensures compatibility across the dashboard, mobile apps, and reporting engines.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* Left: Base Schema Definition */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-6">
                            <Layers className="w-6 h-6 text-indigo-500" />
                            Core Fields
                        </h2>
                        <div className="space-y-4">
                            {SCHEMA_DEFINITIONS.base.fields.map(field => (
                                <div key={field.name} className="group p-4 hover:bg-slate-50 rounded-2xl transition-all">
                                    <div className="flex justify-between items-center mb-1">
                                        <code className="text-indigo-600 font-bold">{field.name}</code>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            {field.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed">{field.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="p-6 bg-indigo-900 rounded-[2rem] text-indigo-100 shadow-2xl">
                        <div className="flex gap-4 mb-4">
                            <AlertCircle className="w-6 h-6 shrink-0 text-indigo-300" />
                            <h3 className="font-bold text-lg">Pro-Tip: Normalization</h3>
                        </div>
                        <p className="text-sm text-indigo-200 leading-relaxed mb-4">
                            The Importer automatically maps <code className="text-white">microSkillId</code> (CamelCase) to <code className="text-white">micro_skill_id</code> (snake_case). Always prioritize the API schema when possible.
                        </p>
                        <Link to="/import" className="inline-flex items-center gap-2 text-white font-bold hover:gap-3 transition-all">
                            Go to Importer <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Right: Specialized Types & Playground */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Mode Selector */}
                    <div className="flex gap-2 bg-slate-100 p-2 rounded-3xl">
                        {SCHEMA_DEFINITIONS.types.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    "px-6 py-3 rounded-2xl text-sm font-bold transition-all",
                                    selectedType.id === type.id 
                                        ? "bg-white text-indigo-600 shadow-lg" 
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>

                    {/* Detailed Type View */}
                    <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 opacity-10 blur-[100px] group-hover:opacity-20 transition-opacity"></div>
                        
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black tracking-tight mb-2">{selectedType.name}</h3>
                                <p className="text-slate-400 font-medium">{selectedType.description}</p>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(selectedType.example)}
                                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 flex items-center gap-2"
                            >
                                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                                <span className="text-xs font-bold uppercase tracking-widest">{copied ? 'Copied' : 'Copy JSON'}</span>
                            </button>
                        </div>

                        {/* Code Block */}
                        <div className="bg-black/50 p-8 rounded-3xl border border-white/5 font-mono text-sm leading-relaxed overflow-x-auto relative z-10">
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                                <span className="flex items-center gap-2 text-slate-500"><Terminal className="w-4 h-4" /> developer_reference.json</span>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                                </div>
                            </div>
                            <pre className="text-indigo-300">
                                {JSON.stringify(selectedType.example, null, 2)}
                            </pre>
                        </div>
                    </section>

                    {/* Helper/Scaffold Mapping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <Code className="w-5 h-5 text-violet-500" />
                                Parts System
                            </h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                The <code className="bg-slate-100 px-1 rounded">parts</code> array is recursive. You can nest text, images, and inputs to create complex layouts.
                            </p>
                        </div>
                        <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <FileJson className="w-5 h-5 text-emerald-500" />
                                Static Mapping
                            </h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Avoid dynamic logic for simple MCQs. Use the <code className="bg-slate-100 px-1 rounded">options</code> array for stability.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
