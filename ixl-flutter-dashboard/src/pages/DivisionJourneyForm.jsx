import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Sparkles, RefreshCw, Eye, Code, Zap, Trash2, CheckCircle, HelpCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase as api } from '../lib/supabaseClient';

const THEMES = [
    {
        name: "Pet Shop",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/1261/1261145.png",
        items_name: "tiny fish",
        groups_name: "glass aquariums",
        item_name: "tiny fish",
        group_name: "glass aquarium",
        action_verb: "place them",
        place_verb: "drop it"
    },
    {
        name: "Bakery",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/3014/3014502.png",
        items_name: "hot muffins",
        groups_name: "pink boxes",
        item_name: "hot muffin",
        group_name: "pink box",
        action_verb: "pack them",
        place_verb: "place it"
    },
    {
        name: "Space Lab",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/3504/3504442.png",
        items_name: "green crystals",
        groups_name: "research tubes",
        item_name: "green crystal",
        group_name: "research tube",
        action_verb: "store them",
        place_verb: "insert it"
    }
];

export function DivisionJourneyForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    
    // Form State
    const [config, setConfig] = useState({
        id: id || `div_journey_${Date.now()}`,
        micro_skill_id: "01aa9954-5b43-4850-a1e9-5a5d50d0de7f",
        total: 12,
        groups: 4,
        showExample: false,
        variables: { ...THEMES[0] }
    });

    // Derived Answer
    const ans = Math.floor(config.total / config.groups);
    const isExact = config.total % config.groups === 0;

    useEffect(() => {
        if (id) fetchExisting();
    }, [id]);

    const fetchExisting = async () => {
        setFetching(true);
        try {
            const { data, error } = await api.from('questions').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                const variables = data.adaptive_config?.variables || {};
                setConfig({
                    id: data.id,
                    micro_skill_id: data.micro_skill_id,
                    total: parseInt(variables.total || 12),
                    groups: parseInt(variables.groups || 4),
                    showExample: data.show_example || false,
                    variables: { ...variables }
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    const handleThemeSelect = (theme) => {
        setConfig(prev => ({
            ...prev,
            variables: { ...prev.variables, ...theme }
        }));
    };

    const updateVar = (key, val) => {
        setConfig(prev => ({
            ...prev,
            variables: { ...prev.variables, [key]: val }
        }));
    };

    const generateJSON = () => {
        const { variables, total, groups } = config;
        const currentAns = Math.floor(total / groups);
        
        // Full JSON Template based on user request
        return {
            id: config.id,
            type: "fillInTheBlank",
            logic_type: "division_journey_v1",
            micro_skill_id: config.micro_skill_id,
            show_example: config.showExample,
            questionText: `Division Discovery: ${variables.name} Journey`,
            data_source: {
                parts: [
                    {
                        type: "text",
                        content: `### Step 1: The Discovery\nYou found **{{total}} {{items_name}}**! You need to {{action_verb}} among **{{groups}} {{groups_name}}**.`,
                        isVertical: true
                    },
                    {
                        type: "image",
                        content: "{{imageUrl}}",
                        width: 42,
                        count: "{{total}}",
                        label: "{{total}} {{items_name}} to share",
                        isVertical: true
                    },
                    {
                        type: "markdown",
                        content: "How many **{{groups_name}}** are we dividing these into?\n[[vault_mcq]]",
                        isVertical: true
                    },
                    {
                        type: "markdown",
                        content: "---\n### Step 2: Sharing Lab\n**Tap a {{item_name}}** to pick it up, then **tap a {{group_name}}** to {{place_verb}}. Share all {{total}} equally!",
                        isVertical: true
                    },
                    {
                        type: "sharing_drag_drop",
                        id: "sharing_lab",
                        count: "{{total}}",
                        groupCount: "{{groups}}",
                        imageUrl: "{{imageUrl}}",
                        isVertical: true
                    },
                    {
                        type: "markdown",
                        content: "---\n### Step 3: Mission Report\nOnce shared equally, how many **{{items_name}}** are in each **{{group_name}}**?\n\n\\( {{total}} \\div {{groups}} = [[ans]] \\)",
                        isVertical: true
                    }
                ],
                answers: {
                    vault_mcq: {
                        type: "mcq",
                        options: [
                            { label: "{{groups}} {{groups_name}}", value: "{{groups}}" },
                            { label: "{{total}} {{groups_name}}", value: "{{total}}" }
                        ],
                        value: "{{groups}}"
                    },
                    ans: { value: "{{ans}}", size: "one-digit" }
                }
            },
            adaptiveConfig: {
                logic_type: "division_journey_v1",
                variables: {
                    ...variables,
                    total: total.toString(),
                    groups: groups.toString(),
                    ans: currentAns.toString()
                },
                guidedMode: true,
                instantFeedback: true,
                showKeypad: false
            },
            solution: [
                {
                    type: "text",
                    content: "### Division Breakdown",
                    isVertical: true
                },
                {
                    type: "text",
                    content: `1. **Total Items**: {{total}} {{items_name}}\n2. **Groups**: {{groups}} {{groups_name}}\n3. **Logic**: Sharing {{total}} into {{groups}} equal groups means calculating \${{total}} \\div {{groups}} = {{ans}}\$. Each {{group_name}} gets exactly **{{ans}} {{items_name}}**.`,
                    isVertical: true
                }
            ]
        };
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = generateJSON();
            const { error } = await api.from('questions').upsert(payload);
            if (error) throw error;
            alert("Division Journey saved successfully!");
            navigate('/');
        } catch (err) {
            console.error(err);
            alert("Failed to save: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-20 text-center animate-pulse">Loading mission data...</div>;

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <header className="flex items-center justify-between py-8 px-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-indigo-600" />
                            Division Journey Builder
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">logic_type: division_journey_v1</p>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading || !isExact}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "PUBLISH MISSION"}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
                {/* Left Column: Configuration */}
                <div className="space-y-6">
                    {/* Theme Selection */}
                    <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" /> Choose Universe
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {THEMES.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => handleThemeSelect(t)}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                                        config.variables.name === t.name ? "border-indigo-600 bg-indigo-50 shadow-lg" : "border-slate-50 hover:border-slate-100 bg-slate-50/50"
                                    )}
                                >
                                    <img src={t.imageUrl} className="w-12 h-12 object-contain" alt={t.name} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Math Core */}
                    <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-indigo-500" /> Numerical Setup
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total {config.variables.items_name}</label>
                                <input 
                                    type="number"
                                    value={config.total}
                                    onChange={(e) => setConfig(prev => ({ ...prev, total: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 font-black text-slate-700 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Groups ({config.variables.groups_name})</label>
                                <input 
                                    type="number"
                                    value={config.groups}
                                    onChange={(e) => setConfig(prev => ({ ...prev, groups: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 font-black text-slate-700 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl border border-slate-100 transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={config.showExample}
                                    onChange={(e) => setConfig(prev => ({ ...prev, showExample: e.target.checked }))}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                                />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Show Example Walkthrough</span>
                            </label>
                        </div>

                        <div className={cn(
                            "p-6 rounded-3xl flex items-center justify-between",
                            isExact ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                        )}>
                            <div className="flex items-center gap-3">
                                {isExact ? <CheckCircle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                                <div>
                                    <p className="font-black text-sm uppercase tracking-tight">Calculation Result</p>
                                    <p className="text-xs opacity-80">{isExact ? `Equation is valid: ${config.total} ÷ ${config.groups} = ${ans}` : "Total must be exactly divisible by groups!"}</p>
                                </div>
                            </div>
                            <span className="text-3xl font-black">{ans}</span>
                        </div>
                    </section>

                    {/* Language Customization */}
                    <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Code className="w-5 h-5 text-slate-400" /> Language Customization
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: "Items Name (Plural)", key: "items_name" },
                                { label: "Groups Name (Plural)", key: "groups_name" },
                                { label: "Item Name (Singular)", key: "item_name" },
                                { label: "Group Name (Singular)", key: "group_name" },
                                { label: "Action Verb", key: "action_verb" },
                                { label: "Place Verb", key: "place_verb" }
                            ].map(field => (
                                <div key={field.key} className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{field.label}</label>
                                    <input 
                                        type="text"
                                        value={config.variables[field.key]}
                                        onChange={(e) => updateVar(field.key, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: JSON Preview */}
                <div className="space-y-6 sticky top-8">
                    <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-black flex items-center gap-2 uppercase tracking-widest text-xs">
                                <Code className="w-5 h-5 text-brand-400" /> Live Manifest
                            </h3>
                            <button 
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, 2))}
                                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black transition-all"
                            >
                                COPY RAW
                            </button>
                        </div>
                        <pre className="text-[10px] text-indigo-200 font-mono overflow-x-auto h-[600px] custom-scrollbar">
                            {JSON.stringify(generateJSON(), null, 2)}
                        </pre>
                        
                        {/* Preview Watermark */}
                        <div className="absolute bottom-10 right-10 opacity-10 pointer-events-none">
                            <Eye className="w-40 h-40 text-white" />
                        </div>
                    </div>

                    <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 flex items-start gap-4">
                        <Zap className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-black text-indigo-900 text-sm">Dynamic Variables Active</p>
                            <p className="text-indigo-700 text-xs mt-1 leading-relaxed">
                                This template uses Handlebars syntax. Values like <code className="bg-white px-1 rounded">{"{{total}}"}</code> will be hydrated by the mobile app's Discovery Engine.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
