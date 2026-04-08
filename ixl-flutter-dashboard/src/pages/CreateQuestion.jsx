
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon, GripVertical, AlertCircle, Upload, Loader2, Copy, Check, Search, Zap, ChevronDown } from 'lucide-react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { uploadToR2 } from '../lib/r2';
import { compressImage } from '../lib/image';
import { supabase as api } from '../lib/supabaseClient';
import { GridArithmeticBuilder } from '../components/GridArithmeticBuilder';
import { SmartTableEditor } from '../components/SmartTableEditor';
import { ShadeGridEditor } from '../components/ShadeGridEditor';
import { FractionModelRenderer } from '../components/FractionModelRenderer';


export function CreateQuestion() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const cloneId = searchParams.get('cloneId');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('edit'); // For mobile toggle
    const [showPreview, setShowPreview] = useState(true);
    const [previewMode, setPreviewMode] = useState('mobile');
    const [isCopying, setIsCopying] = useState(false);
    const { register, control, handleSubmit, watch, setValue, reset } = useForm({

        defaultValues: {
            type: 'mcq',
            difficulty: 'Medium',
            skill_id: '',
            question_text: '',
            solutionParts: [{ type: 'text', content: '', isVertical: true, hasAudio: true }],
            marks: 1,
            // Generic Parts (Question Stem)
            parts: [{ type: 'text', content: '', isVertical: false, hasAudio: true }],
            // MCQ & Image Choice
            options: [{ parts: [{ type: 'text', content: '', isVertical: false, hasAudio: true }], isCorrect: false }],
            // Fill In The Blank
            fib_parts: [{ type: 'text', content: '', hasAudio: true }],
            // Drag & Drop
            drag_groups: [{ id: 'g1', label: '', image: '' }],
            drag_items: [{ id: 'i1', text: '', group_id: 'g1' }],
            // Sorting
            sort_items: [{ text: '' }],
            // 4 Pics
            images: ['', '', '', ''],
            jumbled_letters: '',
            is_multi_select: false,
            is_vertical: true,

            // Advanced Math (Arithmetic Layout)
            advanced_math_config: {
                instruction: 'Multiply.',
                mode: 'placeValue',
                inputMode: 'digitPad',
                rows: [
                    { kind: 'text', text: '857', cellsCount: 0, prefix: '' },
                    { kind: 'text', text: '× 8', cellsCount: 0, prefix: '' },
                    { kind: 'divider', text: '', cellsCount: 0, prefix: '' },
                    { kind: 'answer', text: '', cellsCount: 4, prefix: '' }
                ]
            },
            advanced_math_steps: [
                {
                    label: 'review',
                    title: 'Multiply.',
                    instruction: 'Multiply.',
                    top: '857',
                    bottom: '8',
                    operator: '×',
                    boxCount: 4,
                    carry: '',
                    answer: '3333',
                    answerColor: ''
                },
                {
                    label: 'solve',
                    title: 'Multiply the ones. Remember to regroup.',
                    instruction: 'Multiply the ones. Remember to regroup.',
                    top: '857',
                    bottom: '8',
                    operator: '×',
                    boxCount: 0,
                    carry: '5',
                    answer: '6',
                    answerColor: '#4f57ff'
                }
            ],
            advanced_math_answer_json: '{"a4":"6","a3":"8","a2":"5","a1":"6"}',

            // New JSON Schema Elements
            complexity: 8,
            showSubmitButton: false,
            adaptiveConfig: {
                conceptTags: 'place_value, hundreds',
                misconceptionCode: '',
                targetComplexityBand: 'low',
                inputMode: 'default',
                gridMode: 'auto',
                orientation: 'vertical',
                showKeypad: true,
                autoAdvance: true,
                keypadKeys: JSON.stringify([
                    { label: "⭐", value: "⭐" },
                    { label: "🟩", value: "🟩" },
                    "⌫"
                ], null, 2)
            },
            smart_table_json: JSON.stringify({
                columns: [
                    { header: 'Label', key: 'label' },
                    { header: 'Tens', key: 'tens' },
                    { header: 'Ones', key: 'ones' }
                ],
                rows: [
                    { label: '', tens: '', ones: '' },
                    { label: '', tens: '', ones: '' }
                ],
                settings: { type: 'default' }
            }, null, 2),
            grid_arithmetic_json: JSON.stringify({
                parts: [{
                    id: "grid_1",
                    type: "gridArithmetic",
                    isVertical: true,
                    layout: { rows: 7, cols: 6, cellSize: 46, showBackgroundGrid: true, cells: [], borders: [] }
                }],
                correct_answer_text: "{}"
            }, null, 2)
        }
    });

    const questionType = watch('type');
    const watchedValues = watch();

    // Fetch Question for Edit Mode or Clone Mode
    React.useEffect(() => {
        const targetId = id || cloneId;
        if (!targetId) return;

        console.log(`Fetching question for ${id ? 'Edit' : 'Clone'} with ID:`, targetId);

        const fetchQuestion = async () => {
            const { data, error } = await supabase.from('questions').select('*').eq('id', targetId).single();
            if (error) {
                console.error("Error fetching question:", error);
                return;
            }

            console.log("Fetched Data:", data);
            if (!data) return;

            // Normalize JSON fields if they are strings
            const normalizedData = { ...data };
            ['parts', 'options', 'drag_groups', 'drag_items', 'adaptive_config'].forEach(key => {
                if (typeof normalizedData[key] === 'string') {
                    try {
                        normalizedData[key] = JSON.parse(normalizedData[key]);
                    } catch (e) {
                        normalizedData[key] = key === 'adaptive_config' ? {} : [];
                    }
                }
            });
            const partsList = Array.isArray(normalizedData.parts) ? normalizedData.parts : [];

            // Helper to determine original audio presence fallback
            const getHasAudioOrig = (type, content) => {
                if (type !== 'text') return false;
                const s = String(content || '').trim();
                if (!s) return false;
                if (!isNaN(Number(s))) return false;
                if (s.startsWith('<svg') || s.toLowerCase().endsWith('.svg')) return false;
                return true;
            };

            const parseParts = (partsRaw, isFib = false, fibAnswers = {}) => {
                let parts = typeof partsRaw === 'string' ? JSON.parse(partsRaw) : (partsRaw || []);
                const flattened = [];
                const traverse = (p) => {
                    if (Array.isArray(p)) {
                        p.forEach(traverse);
                    } else if (p.type === 'sequence') {
                        flattened.push({
                            ...p,
                            children: p.children || [],
                            isVertical: p.isVertical || false,
                            isCommaSeparated: p.isCommaSeparated || false
                        });
                    } else if (p.type === 'text' || p.type === 'image') {
                        flattened.push({
                            type: p.type,
                            content: p.type === 'image' ? (p.imageUrl || p.content) : p.content,
                            isVertical: p.isVertical,
                            hasAudio: p.hasAudio !== undefined ? p.hasAudio : getHasAudioOrig(p.type, p.content),
                            ...(p.type === 'image' && { count: p.count || 1 })
                        });
                    } else if (isFib && p.type === 'input') {
                        // Resolve FIB answer
                        let val = fibAnswers[p.id] || '';
                        flattened.push({ type: 'input', content: val, isVertical: p.isVertical, id: p.id, width: p.width });
                    } else if (p) {
                        flattened.push(p); 
                    }
                };
                traverse(parts);
                return flattened.length ? flattened : [{ type: 'text', content: '', hasAudio: true }];
            };

            const parseSolutionParts = (sol) => {
                let val = sol;
                if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        return [{ type: 'text', content: sol, isVertical: true, hasAudio: true }];
                    }
                }
                if (Array.isArray(val)) {
                    return val.map(p => {
                        if (p.type === 'table' || p.type === 'smartTable') {
                            return {
                                type: 'table',
                                headers: p.headers || p.columns || [],
                                rows: p.rows || [p.data || []],
                                isVertical: p.isVertical !== undefined ? p.isVertical : true
                            };
                        }
                        return {
                            type: p.type || 'text',
                            content: p.content || p.imageUrl || '',
                            isVertical: p.isVertical !== undefined ? p.isVertical : true,
                            hasAudio: p.hasAudio !== undefined ? p.hasAudio : getHasAudioOrig(p.type || 'text', p.content || p.imageUrl || ''),
                            ...(p.type === 'image' && { count: p.count || 1 })
                        };
                    });
                }
                return [{ type: 'text', content: typeof sol === 'string' ? sol : String(sol || ''), isVertical: true, hasAudio: true }];
            };

            // Prepare FIB Answers
            let fibAnswers = {};
            if (data.type === 'fillInTheBlank' && data.correct_answer_text) {
                try {
                    fibAnswers = typeof data.correct_answer_text === 'string' ? JSON.parse(data.correct_answer_text) : data.correct_answer_text;
                } catch (e) { }
            }

            const hasMathLayout = partsList.some(p => p.type === 'arithmeticLayout');
            let forcedType = normalizedData.type;
            if (hasMathLayout) forcedType = 'advanced_math';

            // Prepare Grid Arithmetic JSON preview if applicable
            let gridJson = '{}';
            if (forcedType === 'gridArithmetic') {
                gridJson = JSON.stringify({
                    parts: partsList,
                    correct_answer_text: typeof normalizedData.correct_answer_text === 'string' ? (normalizedData.correct_answer_text ? JSON.parse(normalizedData.correct_answer_text) : {}) : normalizedData.correct_answer_text,
                    solution: normalizedData.solution,
                    marks: normalizedData.marks,
                    complexity: normalizedData.complexity,
                    adaptive_config: normalizedData.adaptive_config
                }, null, 2);
            }



            // Prepare Smart Table JSON preview
            let smartTableJson = '';
            try {
                smartTableJson = JSON.stringify({
                    columns: [{ header: 'Label', key: 'label' }, { header: 'Tens', key: 'tens' }, { header: 'Ones', key: 'ones' }],
                    rows: [{ label: '', tens: '', ones: '' }, { label: '', tens: '', ones: '' }],
                    settings: { type: 'default' }
                });
            } catch (e) { }

            if (forcedType === 'smartTable') {
                const part = partsList.find(p => p.type === 'smartTable');
                if (part) {
                    smartTableJson = JSON.stringify({
                        columns: part.columns,
                        rows: part.rows,
                        settings: part.settings
                    }, null, 2);
                }
            }


            // Transform JSONB back to Form State
            const formData = {
                type: forcedType,
                skill_id: normalizedData.micro_skill_id || normalizedData.skill_id,

                // Load parts directly using helper
                parts: normalizedData.type !== 'fillInTheBlank' ? parseParts(partsList) : [{ type: 'text', content: '' }],

                is_multi_select: normalizedData.is_multi_select || false,
                is_vertical: normalizedData.is_vertical !== undefined ? normalizedData.is_vertical : true,

                solutionParts: parseSolutionParts(normalizedData.solution),
                options: (normalizedData.options || []).map((o, idx) => {
                    const isCorrect = Array.isArray(normalizedData.correct_answer_indices)
                        ? normalizedData.correct_answer_indices.includes(idx)
                        : (normalizedData.correct_answer_index === idx);

                    // If option is a string, wrap it in a text part
                    if (typeof o === 'string') {
                        return {
                            parts: [{ type: 'text', content: o, isVertical: false, hasAudio: true }],
                            isCorrect
                        };
                    }
                    // If it's already an object with parts
                    if (o.parts) {
                        return { ...o, isCorrect };
                    }
                    // If it's an object but maybe old format { text, ... }
                    return {
                        parts: [{ type: 'text', content: o.text || '', isVertical: false, hasAudio: true }],
                        isCorrect
                    };
                }),

                drag_groups: normalizedData.drag_groups || [],
                drag_items: normalizedData.drag_items ? normalizedData.drag_items.map(i => ({ id: i.id, text: i.content || i.text, group_id: i.target_group_id || i.group_id })) : [],
                sort_items: (forcedType === 'sorting' && Array.isArray(normalizedData.options)) ? normalizedData.options.map(t => ({ text: typeof t === 'string' ? t : (t.text || '') })) : [{ text: '' }],
                images: (forcedType === 'fourPicsOneWord' && partsList) ? partsList.filter(p => p.type === 'image').map(p => p.imageUrl || p.content) : ['', '', '', ''],
                jumbled_letters: normalizedData.correct_answer_text || '',
                marks: normalizedData.marks || 1,
                // FIB - Use flattened parser
                fib_parts: normalizedData.type === 'fillInTheBlank' ? parseParts(partsList, true, fibAnswers) : [{ type: 'text', content: '', hasAudio: true }],

                question_text: normalizedData.question_text || '',

                // Recovery for Advanced Math
                advanced_math_config: forcedType === 'advanced_math' ? {
                    instruction: partsList.find(p => p.type === 'text')?.content || 'Solve the problem:',
                    rows: partsList.find(p => p.type === 'arithmeticLayout')?.layout?.rows || []
                } : { instruction: '', rows: [] },
                advanced_math_steps: forcedType === 'advanced_math' ? (parseSolutionParts(normalizedData.solution) || []).filter(s => s.type === 'section').map(s => ({
                    title: s.title,
                    label: s.label,
                    instruction: s.contentParts?.find(cp => cp.type === 'text')?.content || '',
                    ...(s.contentParts?.find(cp => cp.type === 'longMultiply' || cp.type === 'arithmeticLayout')?.layout || {})
                })) : [],
                advanced_math_answer_json: normalizedData.correct_answer_text || '',

                // Restore adaptive/new schema configs directly
                complexity: normalizedData.complexity || 8,
                showSubmitButton: normalizedData.show_submit_button || false,
                adaptiveConfig: normalizedData.adaptive_config ? {
                    ...normalizedData.adaptive_config,
                    conceptTags: Array.isArray(normalizedData.adaptive_config.conceptTags)
                        ? normalizedData.adaptive_config.conceptTags.join(', ')
                        : (normalizedData.adaptive_config.conceptTags || ''),
                    keypadKeys: Array.isArray(normalizedData.adaptive_config.keypadKeys)
                        ? JSON.stringify(normalizedData.adaptive_config.keypadKeys, null, 2)
                        : (normalizedData.adaptive_config.keypadKeys || '')
                } : {
                    conceptTags: '',
                    misconceptionCode: '',
                    targetComplexityBand: 'low',
                    inputMode: 'default',
                    gridMode: 'auto',
                    orientation: 'vertical',
                    showKeypad: true,
                    autoAdvance: true,
                    keypadKeys: '[]'
                },
                grid_arithmetic_json: gridJson,
                smart_table_json: smartTableJson
            };

            console.log("Resetting form with:", formData);
            reset(formData);

            // Pre-fill Dropdowns (Reverse Lookup)
            const skillId = data.micro_skill_id || data.skill_id;
            if (skillId) {
                try {
                    // Get Skill -> Unit
                    const { data: skill } = await supabase.from('micro_skills').select('unit_id').eq('id', skillId).single();
                    if (skill?.unit_id) {
                        const unitId = skill.unit_id;

                        // Get Unit -> Grade
                        const { data: unit } = await supabase.from('units').select('grade_id').eq('id', unitId).single();
                        if (unit?.grade_id) {
                            const gradeId = unit.grade_id;

                            // We have GradeID and UnitID. Now populate the dropdown lists.
                            const unitsData = await fetchUnits(gradeId);
                            const skillsData = await fetchMicroSkills(unitId);

                            setUnits(unitsData);
                            setMicroSkills(skillsData);

                            // Set Selected Values
                            setSelectedGrade(gradeId);
                            setSelectedUnit(unitId);

                            // Re-apply to React Hook Form after options mount
                            setTimeout(() => {
                                setValue('skill_id', skillId);
                            }, 50);
                        }
                    }
                } catch (err) {
                    console.error("Error pre-filling cascading dropdowns:", err);
                }
            }
        };
        fetchQuestion();
    }, [id, cloneId, reset]);



    const generatePayload = (data) => {
        const getHasAudio = (type, content) => {
            if (type !== 'text') return false;
            const s = String(content || '').trim();
            if (!s) return false;
            if (!isNaN(Number(s))) return false;
            if (s.startsWith('<svg') || s.toLowerCase().endsWith('.svg')) return false;
            return true;
        };

        const processPart = (p, answerMap, inputCountRef) => {
            if (p.type === 'input') {
                inputCountRef.count++;
                const pid = p.id || `answer_${inputCountRef.count}`;
                answerMap[pid] = p.content;
                return { id: pid, type: 'input', width: p.width };
            } else if (p.type === 'sequence') {
                const children = p.children || [];
                return {
                    type: 'sequence',
                    isCommaSeparated: p.isCommaSeparated || false,
                    isVertical: p.isVertical || false,
                    children: children.map(child => processPart(child, answerMap, inputCountRef))
                };
            } else if (p.type === 'table' || p.type === 'smartTable') {
                return {
                    type: 'table',
                    headers: p.headers || [],
                    rows: p.rows || [p.data || []],
                    isVertical: p.isVertical !== undefined ? p.isVertical : true
                };
            } else if (p.type === 'image') {
                return { 
                    type: 'image', 
                    imageUrl: p.imageUrl || p.content || '', 
                    isVertical: p.isVertical !== undefined ? p.isVertical : true, 
                    count: parseInt(p.count) || 1 
                };
            } else if (p.type === 'svg') {
                return {
                    type: 'svg',
                    content: p.content || '',
                    isVertical: p.isVertical !== undefined ? p.isVertical : true
                };
            } else if (p.type === 'fractionModel') {
                return { type: 'fractionModel', modelConfig: p.modelConfig || {}, isVertical: p.isVertical, hasAudio: false };
            } else {
                return { 
                    type: p.type || 'text', 
                    content: p.content || '', 
                    isVertical: p.isVertical !== undefined ? p.isVertical : true, 
                    hasAudio: p.hasAudio !== undefined ? p.hasAudio : getHasAudio(p.type || 'text', p.content || '') 
                };
            }
        };

        const payload = {
            type: data.type,
            difficulty: (data.difficulty || 'Medium').toLowerCase(),
            micro_skill_id: data.skill_id,
            solution: JSON.stringify((data.solutionParts || []).map(p => {
                const processed = processPart(p, {}, { count: 0 });
                // Ensure solution parts always have isVertical: true if not specified
                if (processed.isVertical === undefined) processed.isVertical = true;
                return processed;
            })),
            marks: parseInt(data.marks) || 1,
            is_multi_select: data.is_multi_select,
            is_vertical: data.is_vertical,
            question_text: data.question_text || null,

            complexity: parseInt(data.complexity) || 8,
            show_submit_button: data.showSubmitButton,
            adaptive_config: {
                ...data.adaptiveConfig,
                conceptTags: Array.isArray(data.adaptiveConfig?.conceptTags)
                    ? data.adaptiveConfig.conceptTags
                    : (data.adaptiveConfig?.conceptTags || '').split(',').map(s => s.trim()).filter(Boolean),
                keypadKeys: (() => {
                    try {
                        return typeof data.adaptiveConfig?.keypadKeys === 'string' 
                            ? JSON.parse(data.adaptiveConfig.keypadKeys) 
                            : (data.adaptiveConfig?.keypadKeys || []);
                    } catch (e) {
                        return [];
                    }
                })()
            },

            parts: [],
            options: [],
            correct_answer_index: -1,
            correct_answer_text: null,
            drag_groups: [],
            drag_items: []
        };

        if (data.type === 'mcq' || data.type === 'imageChoice') {
            payload.parts = (data.parts || []).map(p => processPart(p, {}, { count: 0 }));
            if (payload.parts.length === 0 && data.question_text) {
                payload.parts = [{
                    type: 'text',
                    content: data.question_text,
                    hasAudio: getHasAudio('text', data.question_text)
                }];
            }
            payload.options = (data.options || []).map(o => (o.parts || []).map(p => processPart(p, {}, { count: 0 })));
            // Fallback for simple display/export if needed
            const correctIndices = (data.options || []).map((o, i) => o.isCorrect ? i : -1).filter(i => i !== -1);
            payload.correct_answer_indices = correctIndices;
            payload.correct_answer_index = correctIndices.length > 0 ? correctIndices[0] : -1;

        } else if (data.type === 'fillInTheBlank') {
            let answerMap = {};
            let inputCountRef = { count: 0 };
            payload.parts = (data.fib_parts || []).map(p => processPart(p, answerMap, inputCountRef));
            payload.correct_answer_text = JSON.stringify(answerMap);

        } else if (data.type === 'advanced_math') {
            // ... (keep advanced_math logic but use processPart if needed or keep existing)
            const conf = data.advanced_math_config;
            payload.parts = [
                { type: 'text', content: conf.instruction, isVertical: true, hasAudio: true },
                {
                    type: 'arithmeticLayout',
                    isVertical: true,
                    layout: {
                        mode: conf.mode,
                        inputMode: conf.inputMode,
                        rows: (conf.rows || []).map(r => {
                            if (r.kind === 'text') return { kind: 'text', text: r.text };
                            if (r.kind === 'divider') return { kind: 'divider' };
                            if (r.kind === 'answer' || r.kind === 'carry') {
                                const cells = Array.from({ length: parseInt(r.cellsCount) || 1 }).map((_, i) => ({
                                    id: `a${parseInt(r.cellsCount) - i}`,
                                    type: 'digit'
                                }));
                                return { kind: r.kind, prefix: r.prefix || '', cells };
                            }
                        }).filter(Boolean)
                    }
                }
            ];
            const solutionSections = (data.advanced_math_steps || []).map((step, idx) => ({
                type: 'section',
                label: step.label || (idx === 0 ? 'review' : 'solve'),
                title: step.title,
                contentParts: [
                    { type: 'text', content: step.instruction, isVertical: true },
                    {
                        type: 'longMultiply',
                        isVertical: true,
                        layout: {
                            top: step.top,
                            bottom: step.bottom,
                            operator: step.operator,
                            ...(step.boxCount ? { boxCount: parseInt(step.boxCount) } : {}),
                            ...(step.carry ? { carry: step.carry } : {}),
                            ...(step.answer ? { answer: step.answer } : {}),
                            ...(step.answerColor ? { answerColor: step.answerColor } : {}),
                        }
                    }
                ]
            }));
            payload.correct_answer_text = data.advanced_math_answer_json;
            payload.solution = JSON.stringify(solutionSections);
            payload.type = 'advanced_math';

        } else if (data.type === 'gridArithmetic') {
            if (!data.grid_arithmetic_json) throw new Error("Missing Grid Arithmetic JSON");
            const parsed = JSON.parse(data.grid_arithmetic_json);
            payload.parts = parsed.parts || [];
            payload.type = 'gridArithmetic';

        } else if (data.type === 'smartTable') {
            if (!data.smart_table_json) throw new Error("Missing Smart Table JSON");
            const parsed = JSON.parse(data.smart_table_json);
            payload.type = 'smartTable';
            payload.parts = [{
                type: 'smartTable',
                columns: parsed.columns,
                rows: parsed.rows,
                settings: parsed.settings
            }];
            const answers = {};
            (parsed.rows || []).forEach(row => {
                Object.keys(row).forEach(key => {
                    const cell = row[key];
                    if (cell && typeof cell === 'object' && cell.id) {
                        answers[cell.id] = cell.value || "";
                    }
                });
            });
            payload.correct_answer_text = JSON.stringify(answers);

        } else if (data.type === 'dragAndDrop') {
            payload.parts = (data.parts || []).map(p => processPart(p, {}, { count: 0 }));
            payload.drag_groups = data.drag_groups;
            payload.drag_items = (data.drag_items || []).map(i => ({
                id: i.id,
                type: 'text',
                content: i.text,
                target_group_id: i.group_id
            }));

        } else if (data.type === 'sorting') {
            payload.parts = (data.parts || []).map(p => processPart(p, {}, { count: 0 }));
            payload.options = (data.sort_items || []).map(i => i.text);

        } else if (data.type === 'fourPicsOneWord') {
            const qText = data.question_text || "Guess the word!";
            payload.parts = [
                { type: 'text', content: qText, hasAudio: getHasAudio('text', qText) },
                ...(data.images || []).map(url => ({ type: 'image', content: url, imageUrl: url, hasAudio: false }))
            ];
            payload.correct_answer_text = data.jumbled_letters;
        }

        return payload;
    };

    const handleCopyJSON = () => {
        try {
            const data = watchedValues;
            const payload = generatePayload(data);
            navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error("Error copying JSON:", err);
            alert('Failed to copy JSON: ' + err.message);
        }
    };

    const onSubmit = async (data) => {
        try {
            const payload = generatePayload(data);
            console.log("Saving payload:", payload);

            let result;
            if (id) {
                result = await supabase.from('questions').update(payload).eq('id', id);
            } else {
                result = await supabase.from('questions').insert([payload]);
            }

            if (result.error) throw result.error;
            alert(`Question ${id ? 'updated' : 'saved'} successfully!`);
            if (!id) navigate('/');

        } catch (err) {
            console.error("Error saving question:", err);
            alert('Failed to save question: ' + err.message);
        }
    };

    // State for Cascading Dropdowns
    const [grades, setGrades] = useState([]);
    const [units, setUnits] = useState([]);
    const [microSkills, setMicroSkills] = useState([]);

    // Selection state for controlled inputs
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');

    // Fetch Helpers
    const fetchUnits = async (gradeId) => {
        // First get subjects for this grade
        const { data: subjects } = await supabase.from('subjects').select('id').eq('grade_id', gradeId);
        let units = [];

        if (subjects && subjects.length > 0) {
            const subjectIds = subjects.map(s => s.id || s._id).filter(Boolean);
            const { data } = await supabase.from('units').select('*').in('subject_id', subjectIds);
            units = data || [];
        }

        // Convert to Set to merge if we also want check grade_id fallback, 
        // but for now let's just use the fallback if no units found via subject?
        if (units.length === 0) {
            const { data } = await supabase.from('units').select('*').eq('grade_id', gradeId);
            if (data) units = data;
        }
        return units;
    };
    const fetchMicroSkills = async (unitId) => {
        const { data } = await supabase.from('micro_skills').select('*').eq('unit_id', unitId);
        return data || [];
    };

    // Fetch Grades on load
    React.useEffect(() => {
        const fetchGrades = async () => {
            const { data } = await supabase.from('grades').select('*');
            if (data) setGrades(data);
        };
        fetchGrades();
    }, []);

    // Fetch Units when Grade changes
    const handleGradeChange = async (e) => {
        const gradeId = e.target.value;
        setSelectedGrade(gradeId);

        // Reset Dependents
        setSelectedUnit('');
        setValue('skill_id', '');
        setUnits([]);
        setMicroSkills([]);

        if (gradeId) {
            const data = await fetchUnits(gradeId);
            setUnits(data);
        }
    };

    // Fetch Micro Skills when Unit changes
    const handleUnitChange = async (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);

        // Reset Dependents
        setValue('skill_id', '');
        setMicroSkills([]);

        if (unitId) {
            const data = await fetchMicroSkills(unitId);
            setMicroSkills(data);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">Create New Question</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border",
                            showPreview
                                ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100"
                        )}
                    >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopyJSON}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border",
                            isCopying
                                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {isCopying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {isCopying ? "Copied!" : "Copy JSON"}
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Question
                    </button>
                </div>
            </header>


            <div className="flex-1 flex overflow-hidden">
                {/* Left: Form */}
                <div className={cn(
                    "flex-1 overflow-y-auto p-6 bg-slate-50 border-r border-slate-200 transition-all duration-300",
                    !showPreview ? "max-w-none" : (['gridArithmetic', 'smartTable', 'shadeGrid'].includes(questionType) ? "max-w-7xl" : "max-w-3xl")
                )}>

                    <div className="space-y-8">

                        {/* Common Fields */}
                        <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Info</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                                    <select {...register('type')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                        <option value="fillInTheBlank">Fill In The Blank</option>
                                        <option value="smartTable">Smart Table Editor (Excel)</option>
                                        <option value="shadeGrid">Shade Grid (Visual Math)</option>
                                        <option value="advanced_math">Math Operation (Advanced)</option>

                                        <option value="gridArithmetic">Grid Arithmetic (Raw JSON)</option>
                                        <option value="dragAndDrop">Drag & Drop</option>
                                        <option value="sorting">Sorting</option>
                                        <option value="fourPicsOneWord">4 Pics 1 Word</option>
                                        <option value="imageChoice">Image Choice</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                                    <select {...register('difficulty')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            {/* ... Grade/Unit/Skill Selects (unchanged) ... */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                    <select value={selectedGrade} onChange={handleGradeChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm">
                                        <option value="">Select Grade</option>
                                        {grades.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.name || g.level}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                                    <select value={selectedUnit} onChange={handleUnitChange} disabled={!units.length} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm disabled:bg-slate-100 disabled:text-slate-400">
                                        <option value="">Select Unit</option>
                                        {units.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name || u.description}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Micro Skill</label>
                                    <select {...register('skill_id')} disabled={!microSkills.length} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm disabled:bg-slate-100 disabled:text-slate-400">
                                        <option value="">Select Micro Skill</option>
                                        {microSkills.map(ms => <option key={ms.id || ms._id} value={ms.id || ms._id}>{ms.name || ms.code}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Question Content</label>
                                {/* Only show specialized QuestionStemBuilder for types that use payload.parts directly.
                                    FIB uses fib_parts. 4Pics uses specific grid.
                                */}
                                {['mcq', 'imageChoice', 'dragAndDrop', 'sorting'].includes(questionType) ? (
                                    <QuestionStemBuilder control={control} register={register} setValue={setValue} />
                                ) : (
                                    <textarea {...register('question_text')} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Enter the main question text here..." />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
                                <input {...register('marks')} type="number" className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-slate-700" defaultValue={1} />
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register('is_multi_select')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-sm font-medium text-slate-700">Multi-Select</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register('is_vertical')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-sm font-medium text-slate-700">Vertical Layout</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register('showSubmitButton')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-sm font-medium text-slate-700">Show Submit Button</span>
                                </label>
                            </div>

                            <div className="pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Complexity (1-10)</label>
                                    <input type="number" {...register('complexity')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20" min={1} max={10} />
                                </div>
                            </div>
                        </div>

                        {/* Adaptive Settings */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Adaptive Config</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Concept Tags (comma separated)</label>
                                    <input {...register('adaptiveConfig.conceptTags')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20" placeholder="place_value, hundreds" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Misconception Code</label>
                                    <input {...register('adaptiveConfig.misconceptionCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20" placeholder="place_value_position_confusion" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Complexity Band</label>
                                    <select {...register('adaptiveConfig.targetComplexityBand')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grid Mode</label>
                                    <select {...register('adaptiveConfig.gridMode')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700">
                                        <option value="auto">Auto</option>
                                        <option value="grid">Grid</option>
                                        <option value="list">List</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-6 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('adaptiveConfig.showKeypad')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                        <span className="text-sm font-medium text-slate-700">Show Keypad</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('adaptiveConfig.autoAdvance')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                        <span className="text-sm font-medium text-slate-700">Auto Advance</span>
                                    </label>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Keypad Keys (JSON Array)</label>
                                    <textarea 
                                        {...register('adaptiveConfig.keypadKeys')} 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-mono text-xs focus:ring-2 focus:ring-brand-500/20" 
                                        rows={4}
                                        placeholder='[{"label": "⭐", "value": "⭐"}, "⌫"]'
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Fields */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-semibold text-slate-800">Question Content</h3>
                            </div>

                            <div className="mb-6 space-y-2 border-b border-slate-100 pb-6">
                                <label className="block text-sm font-semibold text-slate-700">Top-Level Question Text (Optional)</label>
                                <textarea
                                    {...register('question_text')}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-500/20 resize-y"
                                    placeholder="e.g. Solve this math problem."
                                    rows={2}
                                />
                                <p className="text-xs text-slate-500">This text appears above the main question parts.</p>
                            </div>

                            {questionType === 'mcq' && <MCQForm control={control} register={register} setValue={setValue} type="text" />}
                            {questionType === 'imageChoice' && <MCQForm control={control} register={register} setValue={setValue} type="image" />}
                            {questionType === 'fillInTheBlank' && <FillBlankForm control={control} register={register} setValue={setValue} />}
                            {questionType === 'advanced_math' && <AdvancedMathForm control={control} register={register} />}
                            {questionType === 'gridArithmetic' && <GridArithmeticBuilder control={control} register={register} setValue={setValue} watch={watch} />}
                            {questionType === 'smartTable' && <SmartTableEditor control={control} register={register} setValue={setValue} watch={watch} />}
                            {questionType === 'shadeGrid' && <ShadeGridEditor control={control} register={register} setValue={setValue} watch={watch} />}
                            {questionType === 'dragAndDrop' && <DragDropForm control={control} register={register} setValue={setValue} />}
                            {questionType === 'sorting' && <SortingForm control={control} register={register} setValue={setValue} />}
                            {questionType === 'fourPicsOneWord' && <FourPicsForm register={register} setValue={setValue} />}
                        </div>

                        {/* Solution */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Solution Explanation</h3>
                            <QuestionStemBuilder control={control} register={register} setValue={setValue} name="solutionParts" />
                        </div>

                    </div>
                </div>

                {/* Right: Preview Sidebar */}
                {showPreview && (
                    <div className={cn(
                        "bg-white overflow-y-auto flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 transition-all",
                        previewMode === 'mobile' ? "w-[450px]" : "w-[800px]"
                    )}>
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Preview Mode:</span>
                                <div className="flex bg-slate-800 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setPreviewMode('mobile')}
                                        className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                            previewMode === 'mobile' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        MOBILE
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode('web')}
                                        className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                            previewMode === 'web' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        WEB
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            </div>
                        </div>

                        <div className="p-8 flex-1 bg-slate-100 flex items-center justify-center min-h-[800px]">
                            {previewMode === 'mobile' ? (
                                /* Device Frame (Mobile) */
                                <div className="w-[375px] min-h-[667px] bg-white rounded-[3rem] shadow-2xl border-[8px] border-slate-900 overflow-hidden relative flex flex-col">
                                    {/* Phone Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>

                                    {/* Phone Status Bar */}
                                    <div className="bg-slate-100 h-8 w-full flex items-center justify-between px-6 pt-2">
                                        <div className="text-[10px] font-bold text-slate-900">9:41</div>
                                        <div className="text-[10px] font-bold text-slate-900">100%</div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 leading-relaxed">
                                        <PreviewContent data={watchedValues} previewMode={previewMode} />
                                    </div>
                                </div>
                            ) : (
                                /* Web Container (Desktop) */
                                <div className="w-full h-full max-w-[700px] min-h-[600px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                                    {/* Browser Header */}
                                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] text-slate-400 flex-1 truncate">
                                            example.com/practice/question-preview
                                        </div>
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto bg-slate-50 p-10 leading-relaxed">
                                        <div className="max-w-2xl mx-auto">
                                            <PreviewContent data={watchedValues} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-forms

function MediaLibraryModal({ onClose, onSelect }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            try {
                // Fetch from the new Node.js/MongoDB media registry
                const { data, error } = await api.from('media').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setImages(data || []);
            } catch (err) {
                console.error("Error fetching media registry:", err);
                // Fallback: Show empty instead of crashing
                setImages([]);
            } finally {
                setLoading(false);
            }
        };
        fetchImages();
    }, []);

    const filtered = images.filter(img => 
        (img.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        img.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Media Library</h3>
                        <p className="text-xs text-slate-500">Select an image from previously used media.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search images..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filtered.length} images</div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            <span className="text-sm text-slate-500">Loading library...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">No images found.</div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {filtered.map((img, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => onSelect(img.url)}
                                    className="group relative aspect-square bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20 transition-all flex flex-col"
                                >
                                    <div className="flex-1 relative overflow-hidden">
                                        <img src={img.url} className="w-full h-full object-contain p-2" alt="" />
                                        <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/10 transition-colors flex items-center justify-center">
                                            <div className="w-6 h-6 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform flex items-center justify-center text-brand-600">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 bg-white border-t border-slate-100/50">
                                        <p className="text-[9px] font-medium text-slate-500 truncate text-center" title={img.name}>{img.name || 'Unnamed'}</p>
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

function MediaSelect({ onSelect }) {
    const [showGallery, setShowGallery] = useState(false);

    return (
        <div className="flex gap-1 h-full min-h-[38px]">
            <R2UploadButton onUploadComplete={onSelect} />
            <button
                type="button"
                onClick={() => setShowGallery(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors flex items-center justify-center min-w-[38px]"
                title="Select from Gallery"
            >
                <ImageIcon className="w-4 h-4" />
            </button>

            {showGallery && (
                <MediaLibraryModal 
                    onClose={() => setShowGallery(false)} 
                    onSelect={(url) => {
                        onSelect(url);
                        setShowGallery(false);
                    }} 
                />
            )}
        </div>
    );
}

function R2UploadButton({ onUploadComplete }) {
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Compress Image
            console.log("Original size:", file.size);
            const compressedFile = await compressImage(file, 300, 20); // Target 20KB
            console.log("Compressed size:", compressedFile.size);

            // Standardize filename
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, " ").trim() || "Untitled Image";
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
            const url = await uploadToR2(compressedFile, fileName);
            
            // Save to MongoDB Media Registry
            await api.from('media').insert({
                name: cleanName,
                url: url,
                type: file.type
            });

            onUploadComplete(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    return (
        <label className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors flex items-center justify-center h-full min-h-[38px] min-w-[38px]" title="Upload to R2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <input type="file" className="hidden" accept="image/*" onChange={handleFile} disabled={uploading} />
        </label>
    );
}

function QuestionStemBuilder({ control, register, setValue, name = 'parts' }) {
    const { fields, append, remove } = useFieldArray({ control, name });
    const watchedParts = useWatch({ control, name });

    // Ensure there's at least one text block
    React.useEffect(() => {
        if (fields.length === 0) {
            append({ type: 'text', content: '', isVertical: false, hasAudio: true });
        }
    }, [fields.length, append]);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {fields.map((field, index) => {
                    const currentType = watchedParts?.[index]?.type || field.type;
                    return (
                        <div key={field.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                            <div className="flex items-start gap-2">
                                <div className="w-24">
                                    <select {...register(`${name}.${index}.type`)} className="w-full text-xs border border-slate-300 rounded px-2 py-1">
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                        <option value="sequence">Sequence</option>
                                    </select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {currentType === 'sequence' ? (
                                        <div className="border border-brand-100 rounded-lg p-3 bg-brand-50/20">
                                            <SequenceBuilder 
                                                control={control} 
                                                register={register} 
                                                setValue={setValue} 
                                                name={`${name}.${index}.children`} 
                                                allowInput={name === 'fib_parts'}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <textarea
                                                {...register(`${name}.${index}.content`)}
                                                placeholder={currentType === 'image' ? "Image URL" : "Question text..."}
                                                rows={2}
                                                className="flex-1 text-sm border border-slate-300 rounded px-2 py-1"
                                            />
                                            {currentType === 'image' && (
                                                <MediaSelect onSelect={(url) => setValue(`${name}.${index}.content`, url)} />
                                            )}
                                        </div>
                                    )}
                                    {currentType === 'image' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">Repeat Count:</label>
                                            <input
                                                type="number"
                                                {...register(`${name}.${index}.count`)}
                                                defaultValue={1}
                                                min={1}
                                                className="w-20 text-xs border border-slate-300 rounded px-2 py-1"
                                            />
                                            <span className="text-[10px] text-slate-400">(Renders side-by-side)</span>
                                        </div>
                                    )}
                                </div>
                                <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-400 hover:text-red-500 disabled:opacity-30"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center gap-2 pl-[6.5rem]">
                                {currentType === 'sequence' && (
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-2 py-1 rounded">
                                        <input type="checkbox" {...register(`${name}.${index}.isCommaSeparated`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                        <span className="text-[10px] uppercase font-bold text-slate-500">Comma Separated Sequence</span>
                                    </label>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register(`${name}.${index}.isVertical`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-xs text-slate-500">Render on new line (Vertical)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer ml-4">
                                    <input type="checkbox" {...register(`${name}.${index}.hasAudio`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-xs text-slate-500">Has Audio</span>
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={() => append({ type: 'text', content: '', isVertical: false, hasAudio: true })} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Text/Image Block
            </button>
        </div>
    );
}

function SequenceBuilder({ control, register, setValue, name, allowInput = false }) {
    const { fields, append, remove } = useFieldArray({ control, name, keyName: 'seqId' });
    const watchedChildren = useWatch({ control, name });

    React.useEffect(() => {
        if (fields.length === 0) {
            append({ type: 'text', content: '' });
        }
    }, [fields.length, append]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Sequence Items</span>
            </div>
            <div className="space-y-2">
                {fields.map((field, index) => {
                    const type = watchedChildren?.[index]?.type || field.type;
                    return (
                        <div key={field.seqId} className="flex items-center gap-2 group">
                            <GripVertical className="w-3 h-3 text-slate-300" />
                            <select {...register(`${name}.${index}.type`)} className="text-[10px] border border-slate-200 rounded px-1 py-1 bg-white">
                                <option value="text">Text</option>
                                <option value="image">Image</option>
                                {allowInput && <option value="input">Blank</option>}
                            </select>
                            <div className="flex-1 flex gap-1">
                                <input
                                    {...register(`${name}.${index}.content`)}
                                    placeholder={type === 'image' ? "URL" : type === 'input' ? "Answer" : "Text"}
                                    className="flex-1 text-xs border border-slate-200 rounded px-2 py-1"
                                />
                                {type === 'image' && (
                                    <div className="flex gap-1">
                                        <MediaSelect onSelect={(url) => setValue(`${name}.${index}.content`, url)} />
                                        <input
                                            type="number"
                                            {...register(`${name}.${index}.width`, { valueAsNumber: true })}
                                            placeholder="W"
                                            title="Width"
                                            className="w-10 text-[10px] border border-slate-200 rounded px-1"
                                        />
                                        <input
                                            type="number"
                                            {...register(`${name}.${index}.height`, { valueAsNumber: true })}
                                            placeholder="H"
                                            title="Height"
                                            className="w-10 text-[10px] border border-slate-200 rounded px-1"
                                        />
                                    </div>
                                )}
                                {type === 'input' && (
                                    <input
                                        {...register(`${name}.${index}.width`)}
                                        placeholder="Width"
                                        className="w-16 text-[10px] border border-slate-200 rounded px-1"
                                    />
                                )}
                            </div>
                            <button type="button" onClick={() => remove(index)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={() => append({ type: 'text', content: '' })} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">+ Text</button>
                <button type="button" onClick={() => append({ type: 'image', content: '' })} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">+ Image</button>
                {allowInput && <button type="button" onClick={() => append({ type: 'input', content: '' })} className="text-[10px] bg-brand-50 border border-brand-100 text-brand-600 px-2 py-1 rounded hover:bg-brand-100">+ Blank</button>}
            </div>
        </div>
    );
}

function MCQForm({ control, register, setValue }) {
    const { fields, append, remove } = useFieldArray({ control, name: 'options' });

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-2">Build each option by adding text, images, or sequences. Select the radio button for the correct answer.</p>
            {fields.map((field, index) => {
                return (
                    <div key={field.id} className="flex gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative group overflow-hidden">
                        <div className="flex flex-col items-center pt-2">
                             <MCQCheckbox control={control} index={index} register={register} />
                             <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">#{index + 1}</span>
                        </div>
                        
                        <div className="flex-1">
                            <QuestionStemBuilder 
                                control={control} 
                                register={register} 
                                setValue={setValue} 
                                name={`options.${index}.parts`} 
                            />
                        </div>

                        <button 
                            type="button"
                            onClick={() => remove(index)} 
                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
            <button 
                type="button" 
                onClick={() => append({ 
                    parts: [{ type: 'text', content: '', isVertical: false, hasAudio: true }], 
                    isCorrect: false 
                })} 
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 font-medium hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/20 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Add Option
            </button>
        </div>
    );
}

function FillBlankForm({ control, register, setValue }) {
    const { fields, append, remove } = useFieldArray({ control, name: 'fib_parts' });
    const watchedParts = useWatch({ control, name: 'fib_parts' });

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">Build the sentence/equation. Use 'Input' for the blank space.</p>
            <div className="space-y-2">
                {fields.map((field, index) => {
                    const currentType = watchedParts?.[index]?.type || field.type;
                    return (
                        <div key={field.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                            <div className="flex items-start gap-2">
                                <div className="w-24">
                                    <select {...register(`fib_parts.${index}.type`)} className="w-full text-xs border border-slate-300 rounded px-2 py-1">
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                        <option value="input">Input (Blank)</option>
                                        <option value="fractionModel">Fraction Model</option>
                                        <option value="sequence">Sequence</option>
                                    </select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {currentType === 'fractionModel' ? (
                                        <div className="grid grid-cols-3 gap-2 bg-white p-2 border border-slate-200 rounded">
                                            {/* ... (fraction model fields) */}
                                            <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                Model Type
                                                <select {...register(`fib_parts.${index}.modelConfig.modelType`)} className="border border-slate-300 rounded px-1.5 py-1">
                                                    <option value="pie">Pie</option>
                                                    <option value="bar">Bar</option>
                                                    <option value="square">Square</option>
                                                    <option value="coordinate">Coordinate Grid</option>
                                                </select>
                                            </label>
                                            {watchedParts?.[index]?.modelConfig?.modelType === 'coordinate' ? (
                                                <>
                                                    <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                        Cols (X Axis)
                                                        <input type="number" {...register(`fib_parts.${index}.modelConfig.cols`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" />
                                                    </label>
                                                    <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                        Rows (Y Axis)
                                                        <input type="number" {...register(`fib_parts.${index}.modelConfig.rows`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" />
                                                    </label>
                                                </>
                                            ) : (
                                                <>
                                                    <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                        Segments
                                                        <input type="number" {...register(`fib_parts.${index}.modelConfig.segments`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" />
                                                    </label>
                                                    {watchedParts?.[index]?.modelConfig?.modelType === 'square' && (
                                                        <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                            Cols (Optional Override)
                                                            <input type="number" {...register(`fib_parts.${index}.modelConfig.cols`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" placeholder="Auto" />
                                                        </label>
                                                    )}
                                                </>
                                            )}
                                            <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                Target Shaded
                                                <input type="number" {...register(`fib_parts.${index}.modelConfig.targetShaded`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" />
                                            </label>
                                            <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                Denominator
                                                <input type="number" {...register(`fib_parts.${index}.modelConfig.denominator`, { valueAsNumber: true })} className="border border-slate-300 rounded px-1.5 py-1" />
                                            </label>
                                            <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                Fill Color
                                                <input type="color" {...register(`fib_parts.${index}.modelConfig.fillColor`)} className="border border-slate-300 rounded cursor-pointer w-full h-6" />
                                            </label>
                                            <label className="text-[10px] text-slate-500 font-medium flex flex-col gap-1">
                                                Line/Base Color
                                                <div className="flex gap-1">
                                                    <input type="color" {...register(`fib_parts.${index}.modelConfig.lineColor`)} className="border border-slate-300 rounded cursor-pointer w-full h-6" />
                                                    <input type="color" {...register(`fib_parts.${index}.modelConfig.baseColor`)} className="border border-slate-300 rounded cursor-pointer w-full h-6" />
                                                </div>
                                            </label>
                                        </div>
                                    ) : currentType === 'sequence' ? (
                                        <div className="border border-brand-100 rounded-lg p-3 bg-brand-50/20">
                                            <SequenceBuilder 
                                                control={control} 
                                                register={register} 
                                                setValue={setValue} 
                                                name={`fib_parts.${index}.children`} 
                                                allowInput={true}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <textarea
                                                {...register(`fib_parts.${index}.content`)}
                                                placeholder={currentType === 'input' ? "Answer Key" : "Content (Text, URL)"}
                                                rows={1}
                                                className="flex-1 text-sm border border-slate-300 rounded px-2 py-1"
                                            />
                                            {currentType === 'image' && (
                                                <MediaSelect onSelect={(url) => setValue(`fib_parts.${index}.content`, url)} />
                                            )}
                                        </div>
                                    )}
                                    {currentType === 'image' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">Repeat Count:</label>
                                            <input
                                                type="number"
                                                {...register(`fib_parts.${index}.count`)}
                                                defaultValue={1}
                                                min={1}
                                                className="w-20 text-xs border border-slate-300 rounded px-2 py-1"
                                            />
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => remove(index)}><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                             <div className="flex items-center gap-2 pl-[6.5rem]">
                                {currentType === 'sequence' && (
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-2 py-1 rounded">
                                        <input type="checkbox" {...register(`fib_parts.${index}.isCommaSeparated`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                        <span className="text-[10px] uppercase font-bold text-slate-500">Comma Separated Sequence</span>
                                    </label>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register(`fib_parts.${index}.isVertical`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-xs text-slate-500">Render on new line (Vertical)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer ml-4">
                                    <input type="checkbox" {...register(`fib_parts.${index}.hasAudio`)} className="w-3 h-3 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                                    <span className="text-xs text-slate-500">Has Audio</span>
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={() => append({ type: 'text', content: '', isVertical: false, hasAudio: true })} className="px-3 py-1 bg-slate-100 rounded text-xs text-slate-700">+ Add Block</button>
            </div>
        </div>
    );
}

function DragDropForm({ control, register, setValue }) {
    const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({ control, name: 'drag_groups', keyName: 'customId' });
    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control, name: 'drag_items', keyName: 'customId' });

    return (
        <div className="space-y-8">
            <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                    <span>Groups (Buckets)</span>
                    <button type="button" onClick={() => appendGroup({ id: Date.now(), label: '' })} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700">+ Add Group</button>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    {groupFields.map((field, index) => (
                        <div key={field.customId} className="p-3 border border-slate-200 rounded-lg bg-slate-50 relative group">
                            <button onClick={() => removeGroup(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            {/* Register the ID so it persists in form data */}
                            <input type="hidden" {...register(`drag_groups.${index}.id`)} />

                            <input {...register(`drag_groups.${index}.label`)} placeholder="Group Label" className="w-full text-sm font-medium bg-transparent border-0 border-b border-transparent focus:border-brand-500 px-0 focus:ring-0 mb-2" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <input {...register(`drag_groups.${index}.image`)} placeholder="Image URL (optional)" className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
                                    <MediaSelect onSelect={(url) => setValue(`drag_groups.${index}.image`, url)} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                    <span>Draggable Items</span>
                    <button type="button" onClick={() => appendItem({ id: Date.now(), text: '' })} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700">+ Add Item</button>
                </h4>
                <div className="space-y-2">
                    {itemFields.map((field, index) => (
                        <div key={field.customId} className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-100">
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            {/* Register Item ID */}
                            <input type="hidden" {...register(`drag_items.${index}.id`)} />

                            <input {...register(`drag_items.${index}.text`)} placeholder="Item Text" className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-sm" />
                            {/* Use a separate component to access watched groups without re-rendering the whole list constantly? 
                                Actually, just inline is fine for now, but we need to pass the watched values. 
                                Let's Pass control to a sub-component or just use generic indices if ID is tricky?
                                No, use a sub-component for the select so it can useWatch isolate.
                            */}
                            <GroupSelector control={control} register={register} index={index} />

                            <button onClick={() => removeItem(index)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GroupSelector({ control, register, index }) {
    const groups = useWatch({ control, name: 'drag_groups' });
    return (
        <select {...register(`drag_items.${index}.group_id`)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white max-w-[120px]">
            <option value="">Select Group</option>
            {groups && groups.map((g, i) => (
                <option key={g.id || i} value={g.id}>
                    {g.label || `Group ${i + 1}`}
                </option>
            ))}
        </select>
    )
}

function SortingForm({ control, register, setValue }) {
    const { fields, append, remove } = useFieldArray({ control, name: 'sort_items' });
    return (
        <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">Add items in the CORRECT order. They will be shuffled for the user.</p>
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-4">{index + 1}</span>
                    <input {...register(`sort_items.${index}.text`)} className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm" placeholder="Item content" />
                    <button onClick={() => remove(index)}><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                </div>
            ))}
            <button onClick={() => append({ text: '' })} className="text-sm text-brand-600 font-medium mt-2 flex items-center gap-1"><Plus className="w-4 h-4" /> Add Item</button>
        </div>
    )
}

function FourPicsForm({ register, setValue }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                            <input {...register(`images.${i}`)} placeholder="URL" className="w-3/4 text-xs p-1 rounded mb-2" />
                            <div className="bg-white rounded-full p-1 shadow-sm">
                                <MediaSelect onSelect={(url) => setValue(`images.${i}`, url)} />
                            </div>
                        </div>
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                ))}
            </div>
            <div>
                <label className="text-sm font-medium block mb-1">Jumbled Letters (Answer)</label>
                <input {...register('jumbled_letters')} className="w-full border border-slate-300 rounded px-3 py-2 uppercase tracking-widest font-bold text-center" placeholder="ANSWER" />
            </div>
        </div>
    )
}

// Preview Component

function ArithmeticGridRenderer({ layout }) {
    if (!layout) return null;
    return (
        <div className="flex flex-col items-center space-y-2 font-mono my-4">
            {layout.rows?.map((row, idx) => {
                if (row.kind === 'text') return <div key={idx} className="text-2xl tracking-[0.2em]">{row.text}</div>;
                if (row.kind === 'divider') return <div key={idx} className="w-full border-b-2 border-slate-800 my-1"></div>;
                if (row.kind === 'answer' || row.kind === 'carry') {
                    return (
                        <div key={idx} className="flex gap-1 justify-center items-center">
                            {row.prefix && <span className="text-xl mr-2">{row.prefix}</span>}
                            <div className="flex gap-1">
                                {Array.from({ length: parseInt(row.cellsCount) || 1 }).map((_, i) => (
                                    <div key={i} className={cn(
                                        "w-10 h-10 border-2 border-slate-300 rounded flex items-center justify-center",
                                        row.kind === 'carry' ? "h-6 border-dashed bg-slate-50 opacity-60" : "bg-white"
                                    )}>
                                        <span className="text-slate-200 text-xs">?</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}

function PartPreview({ part }) {
    if (!part) return null;
    const isVertical = part.isVertical === true;

    const renderContent = () => {
        if (part.type === 'sequence') {
            let children = [];
            try {
                children = typeof part.content === 'string' ? JSON.parse(part.content) : (part.children || []);
            } catch (e) {
                return <div className="text-red-500 text-[10px]">Invalid Sequence JSON</div>;
            }
            return (
                <div className={cn("flex flex-wrap items-center gap-2", part.isVertical ? "flex-col w-full" : "flex-row")}>
                    {children.map((child, idx) => (
                        <div key={idx} className="flex items-center">
                            <PartPreview part={{ ...child, isVertical: false }} />
                            {part.isCommaSeparated && idx < children.length - 1 && (
                                <span className="ml-1 mr-2 text-slate-400">,</span>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (part.type === 'image') {
            return (
                <div className="flex flex-wrap gap-2 justify-center">
                    {Array.from({ length: parseInt(part.count) || 1 }).map((_, idx) => (
                        <img key={idx} src={part.content || part.imageUrl} className="max-w-full rounded-lg max-h-40 inline-block" alt="" />
                    ))}
                </div>
            );
        }

        if (part.type === 'input') {
            return (
                <span 
                    className="inline-block border-b-2 border-slate-800 mx-1 min-h-[1.5em] align-baseline bg-brand-50 shadow-inner rounded-sm text-center px-1"
                    style={{ width: part.width || '4rem' }}
                >
                    <span className="text-[10px] text-brand-300 font-mono">?</span>
                </span>
            );
        }

        if (['table', 'smartTable', 'grid', 'matrix'].includes(part.type)) {
            return <TableRenderer table={part} />;
        }

        if (['arithmeticLayout', 'longMultiply'].includes(part.type)) {
            return <ArithmeticGridRenderer layout={part.layout} />;
        }

        if (part.type === 'svg') {
            return (
                <div 
                    className="flex justify-center my-2"
                    dangerouslySetInnerHTML={{ __html: part.content }} 
                />
            );
        }

        if (part.type === 'fractionModel') {
            return <FractionModelRenderer config={part.modelConfig} />;
        }

        return <div dangerouslySetInnerHTML={{ __html: part.content }} />;
    };

    return (
        <div className={isVertical ? "w-full my-2" : "inline-block mr-1 align-middle"}>
            {renderContent()}
        </div>
    );
}

function PreviewContent({ data, previewMode = 'mobile' }) {
    if (!data) return null;

    const isFIB = data.type === 'fillInTheBlank';
    const isSmartTable = data.type === 'smartTable';
    const isAdvancedMath = data.type === 'advanced_math';

    return (
        <div className="space-y-6">
            {/* Question Header */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase",
                        data.difficulty === 'Easy' ? 'bg-green-500' : data.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                    )}>
                        {data.difficulty}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">10 Points</span>
                </div>

                <div className="text-slate-900 font-bold text-lg leading-tight space-y-4">
                    {/* Top Level Question Text */}
                    {data.question_text && (
                        <div className="text-xl mb-2">{data.question_text}</div>
                    )}

                    {/* Render Parts */}
                    <div className="flex flex-wrap items-center">
                        {(isFIB ? data.fib_parts : data.parts)?.map((p, i) => (
                            <PartPreview key={i} part={p} />
                        ))}
                    </div>

                    {/* Integrated Generator Previews (Show only if not already rendered via parts) */}
                    {isSmartTable && !data.parts?.some(p => p.type === 'smartTable') && data.smart_table_json && (
                        <div className="mt-4">
                            <TableRenderer table={(() => {
                                try {
                                    const parsed = JSON.parse(data.smart_table_json);
                                    return {
                                        columns: parsed.columns,
                                        rows: parsed.rows?.map(row => {
                                            const newRow = { ...row };
                                            Object.keys(newRow).forEach(k => {
                                                const val = newRow[k];
                                                if (typeof val === 'string' && val.startsWith('{{')) {
                                                    const match = val.match(/{{id:(.+?)[,}]/);
                                                    if (match) newRow[k] = { id: match[1] };
                                                }
                                            });
                                            return newRow;
                                        }) || []
                                    };
                                } catch (e) { return null; }
                            })()} />
                        </div>
                    )}

                    {isAdvancedMath && !data.parts?.some(p => p.type === 'arithmeticLayout') && data.advanced_math_config && (
                        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
                            <div className="space-y-4 w-full max-w-sm">
                                <div className="text-center font-bold text-base mb-4 text-slate-600">{data.advanced_math_config.instruction}</div>
                                <ArithmeticGridRenderer layout={{ rows: data.advanced_math_config.rows }} />
                            </div>
                        </div>
                    )}

                    {!data.parts?.length && !data.fib_parts?.length && !data.question_text && !isSmartTable && !isAdvancedMath && (
                        <div className="text-slate-300 italic font-medium">Question content...</div>
                    )}
                </div>
            </div>

            {/* Type Specific Preview */}
            <div className="mt-6">
                {(data.type === 'mcq' || data.type === 'imageChoice') && (
                    <div className={cn(
                        "grid gap-3",
                        previewMode === 'web' && !data.is_vertical ? "grid-cols-2" : "grid-cols-1"
                    )}>
                        {data.options?.map((opt, i) => (
                            <div key={i} className={cn(
                                "relative p-4 rounded-xl border-2 transition-all",
                                opt.isCorrect ? "border-green-500 bg-green-50/50 shadow-sm" : "border-slate-200 bg-white"
                            )}>
                                <div className="flex flex-wrap items-center">
                                    {(opt.parts || []).map((p, idx) => (
                                        <PartPreview key={idx} part={p} />
                                    ))}
                                </div>

                                {opt.isCorrect && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {(data.type === 'fillInTheBlank' || data.type === 'smartTable' || data.type === 'advanced_math' || data.type === 'shadeGrid') && (
                    <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 text-center text-xs text-brand-600 font-medium">
                        Interactive inputs are shown in the preview area above.
                    </div>
                )}

                {data.type === 'dragAndDrop' && (
                    <div className="space-y-6">
                        <div className="flex gap-2 flex-wrap justify-center bg-slate-100/50 p-4 rounded-xl border border-dashed border-slate-300">
                            {data.drag_items?.map((item, i) => (
                                <div key={i} className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-medium text-slate-700">
                                    {item.text || "Item"}
                                </div>
                            ))}
                        </div>
                        <div className={cn(
                            "grid gap-4",
                            previewMode === 'web' ? "grid-cols-3" : "grid-cols-2"
                        )}>
                            {data.drag_groups?.map((group, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-white border-2 border-slate-200 flex flex-col items-center justify-center p-3 text-center shadow-sm">
                                    {group.image ? <img src={group.image} className="w-12 h-12 mb-2 object-cover rounded-lg shadow-sm" /> : <div className="w-12 h-12 bg-slate-100 rounded-lg mb-2 flex items-center justify-center text-slate-300"><ImageIcon className="w-5 h-5" /></div>}
                                    <span className="text-xs font-bold text-slate-600 line-clamp-2">{group.label || "Group"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.type === 'sorting' && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-2">Order items correctly:</div>
                        {data.sort_items?.map((item, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-move hover:border-brand-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600">{i + 1}</span>
                                    <span className="font-medium text-slate-700">{item.text || "Item"}</span>
                                </div>
                                <GripVertical className="w-4 h-4 text-slate-300" />
                            </div>
                        ))}
                    </div>
                )}

                {data.type === 'fourPicsOneWord' && (
                    <div>
                        <div className={cn(
                            "grid gap-2 mb-8",
                            previewMode === 'web' ? "grid-cols-4" : "grid-cols-2"
                        )}>
                            {data.images?.map((img, i) => (
                                <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                    {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-6 h-6" /></div>}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {(data.jumbled_letters || 'ANSWER').split('').map((char, i) => (
                                <div key={i} className="w-10 h-10 bg-slate-900 rounded-lg text-white font-bold text-lg flex items-center justify-center shadow-lg border-b-4 border-slate-700">
                                    {char}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.type === 'gridArithmetic' && data.grid_arithmetic_json && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
                                <span className="bg-slate-100 p-1 rounded group-open:rotate-180 transition-transform">
                                    <ChevronDown className="w-3 h-3 text-slate-500" />
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 border-b border-dashed border-slate-300 uppercase tracking-widest">
                                    Raw JSON Definition
                                </span>
                            </summary>
                            <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-x-auto">
                                <div className="text-[10px] font-mono whitespace-pre text-green-400">
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(data.grid_arithmetic_json);
                                            return JSON.stringify(parsed, null, 2);
                                        } catch (e) { return "Invalid JSON"; }
                                    })()}
                                </div>
                            </div>
                        </details>
                    </div>
                )}

                {/* Solution Preview */}
                {(data.solutionParts && data.solutionParts.length > 0) && (
                    <div className="mt-12 p-6 bg-orange-50/30 rounded-2xl border border-orange-100/50 space-y-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-2">
                             <Zap className="w-4 h-4 fill-current" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Solution Explanation</span>
                        </div>
                        <div className="text-slate-700 leading-relaxed font-medium">
                            {data.solutionParts.map((p, i) => (
                                <PartPreview key={i} part={p} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TableRenderer({ table }) {
    if (!table) return null;
    const rows = table.rows || [];
    const settings = table.settings || {};
    const columns = table.columns || table.headers || []; // Handle both formats
    const title = settings.title || table.title;
    const headerBgColor = settings.headerBgColor || '#f8fafc';

    return (
        <div className="w-full my-6 overflow-hidden border-2 border-slate-200 rounded-xl bg-white shadow-xl">
            {title && (
                <div className="bg-slate-100/80 px-6 py-4 border-b-2 border-slate-200">
                    <h5 className="text-sm font-black text-slate-800 tracking-tight uppercase">{title}</h5>
                </div>
            )}
            <div className="overflow-x-auto p-1 bg-slate-50/30">
                <table className="w-full text-xs border-collapse">
                    {columns && columns.length > 0 && (
                        <thead>
                            <tr style={{ backgroundColor: headerBgColor }}>
                                {columns.map((col, idx) => (
                                    <th 
                                        key={idx} 
                                        style={{ width: col.width || 'auto' }}
                                        className="px-4 py-3 text-center font-black text-slate-900 border border-slate-300 uppercase tracking-tight text-[11px] min-w-[100px]"
                                    >
                                        {typeof col === 'string' ? col : (col.header || col.key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {rows.map((row, rIdx) => {
                            const isArray = Array.isArray(row);
                            const rowBg = row._style?.bgColor || 'transparent';
                            
                            return (
                                <tr key={rIdx} style={{ backgroundColor: rowBg }}>
                                    {columns.map((col, cIdx) => {
                                        const key = typeof col === 'string' ? col : col.key;
                                        const val = isArray ? row[cIdx] : row[key];
                                        return (
                                            <td key={cIdx} className="px-3 py-2 text-center align-middle border border-slate-200">
                                                {renderTableCell(val)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function renderTableCell(val) {
    if (val && typeof val === 'object' && val.id) {
        return (
            <div className="flex flex-col items-center justify-center py-1">
                <div className="w-10 h-10 border-2 border-dashed border-brand-300 rounded-lg bg-white/80 flex items-center justify-center relative shadow-sm">
                    <span className="absolute -top-1.5 -left-1.5 text-[7px] bg-brand-600 text-white px-1.5 rounded-sm font-mono leading-none py-1 scale-75 origin-top-left shadow-md z-10 font-bold">{val.id}</span>
                </div>
            </div>
        );
    }

    // Check if it's a math operator
    const isOperator = ['+', '-', '×', '÷', '='].includes(String(val).trim());

    return (
        <div className="flex items-center justify-center py-2 px-1">
            <span className={cn(
                "font-black text-[13px] tracking-tight",
                isOperator ? "text-slate-400 scale-125" : "text-slate-800"
            )}>
                {val || ''}
            </span>
        </div>
    );
}

// Math Builder Component
function AdvancedMathForm({ control, register }) {
    const { fields: rowFields, append: appendRow, remove: removeRow } = useFieldArray({ control, name: 'advanced_math_config.rows' });
    const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'advanced_math_steps' });
    const watchedRows = useWatch({ control, name: 'advanced_math_config.rows' });

    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <h4 className="font-semibold text-slate-800">Layout Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Instruction Text</label>
                        <input {...register('advanced_math_config.instruction')} className="w-full text-sm border border-slate-300 rounded px-2 py-1" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Answer JSON Key Map</label>
                        <input {...register('advanced_math_answer_json')} className="w-full text-sm font-mono border border-slate-300 rounded px-2 py-1" placeholder='{"a4":"6","a3":"8"}' />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Math Layout Mode</label>
                        <select {...register('advanced_math_config.mode')} className="w-full text-sm border border-slate-300 rounded px-2 py-1">
                            <option value="placeValue">Place Value (Vertical structure)</option>
                            <option value="longDivision">Long Division</option>
                            <option value="inline">Inline</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">User Input Mode</label>
                        <select {...register('advanced_math_config.inputMode')} className="w-full text-sm border border-slate-300 rounded px-2 py-1">
                            <option value="digitPad">Digit Pad (Individual numbers)</option>
                            <option value="keyboard">Keyboard</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <h5 className="text-sm font-semibold mb-2 flex justify-between items-center text-slate-700">
                        Arithmetic Rows
                        <button type="button" onClick={() => appendRow({ kind: 'text', text: '', cellsCount: 0, prefix: '' })} className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100">+ Add Row</button>
                    </h5>
                    <div className="space-y-2">
                        {rowFields.map((field, index) => {
                            const kind = watchedRows?.[index]?.kind || field.kind;
                            return (
                                <div key={field.id} className="flex gap-2 items-center bg-white p-2 rounded border border-slate-200">
                                    <select {...register(`advanced_math_config.rows.${index}.kind`)} className="w-24 text-xs border border-slate-300 rounded px-1 py-1">
                                        <option value="text">Label Text</option>
                                        <option value="divider">Line / Divider</option>
                                        <option value="answer">Answer Block</option>
                                        <option value="carry">Carry Header</option>
                                    </select>

                                    {kind === 'text' && (
                                        <input {...register(`advanced_math_config.rows.${index}.text`)} placeholder="e.g. 857 or × 8" className="flex-1 text-xs border border-slate-300 rounded px-2 py-1" />
                                    )}
                                    {kind === 'divider' && <div className="flex-1 border-b-2 border-slate-800 mx-2"></div>}
                                    {(kind === 'answer' || kind === 'carry') && (
                                        <>
                                            <input {...register(`advanced_math_config.rows.${index}.prefix`)} placeholder="Prefix (Opt)" className="w-24 text-xs border border-slate-300 rounded px-2 py-1" />
                                            <label className="text-xs text-slate-500">Box count:</label>
                                            <input {...register(`advanced_math_config.rows.${index}.cellsCount`)} type="number" className="w-20 text-xs border border-slate-300 rounded px-2 py-1" min={1} defaultValue={4} />
                                        </>
                                    )}
                                    <button type="button" onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 mt-6">
                <h4 className="font-semibold text-slate-800 flex justify-between items-center">
                    Multi-Step Solutions & Visuals
                    <button type="button" onClick={() => appendStep({ label: 'solve', title: '', instruction: '', boxCount: 0 })} className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100">+ Add Section</button>
                </h4>
                <div className="space-y-4">
                    {stepFields.map((field, index) => (
                        <div key={field.id} className="bg-white p-3 rounded border border-slate-200 relative">
                            <button type="button" onClick={() => removeStep(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>

                            <div className="grid grid-cols-2 gap-3 pr-8 mb-3">
                                <div><label className="text-[10px] text-slate-500 uppercase">Section ID</label><input {...register(`advanced_math_steps.${index}.label`)} placeholder="review, solve" className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 mt-1" /></div>
                                <div><label className="text-[10px] text-slate-500 uppercase">Section Title</label><input {...register(`advanced_math_steps.${index}.title`)} placeholder="Multiply the ones." className="w-full text-xs border border-slate-200 rounded px-2 py-1 mt-1" /></div>
                                <div className="col-span-2"><label className="text-[10px] text-slate-500 uppercase">Step Instruction (Text Box)</label><input {...register(`advanced_math_steps.${index}.instruction`)} className="w-full text-sm border border-slate-300 rounded px-2 py-1 mt-1" /></div>
                            </div>

                            <div className="border border-brand-100 bg-brand-50/20 rounded p-2 text-xs">
                                <label className="text-[10px] text-brand-600 font-bold uppercase mb-2 block">Visual Math Setup</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <input {...register(`advanced_math_steps.${index}.top`)} placeholder="Top #" className="border border-slate-300 rounded px-2 py-1" />
                                    <input {...register(`advanced_math_steps.${index}.operator`)} placeholder="Op (×)" className="border border-slate-300 rounded px-2 py-1 text-center" />
                                    <input {...register(`advanced_math_steps.${index}.bottom`)} placeholder="Bottom #" className="border border-slate-300 rounded px-2 py-1" />
                                    <input {...register(`advanced_math_steps.${index}.carry`)} placeholder="Carry #" className="border border-slate-300 rounded px-2 py-1 text-red-600 font-mono" />
                                    <input {...register(`advanced_math_steps.${index}.answer`)} placeholder="Answer / Bottom string" className="border border-slate-300 rounded px-2 py-1 text-green-700 font-mono" />
                                    <input {...register(`advanced_math_steps.${index}.answerColor`)} placeholder="Color (#4f57ff)" className="border border-slate-300 rounded px-2 py-1" />
                                    <input {...register(`advanced_math_steps.${index}.boxCount`)} placeholder="Empty Box Count" type="number" className="border border-slate-300 rounded px-2 py-1 col-span-3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MCQCheckbox({ control, index, register }) {
    const isMultiSelect = useWatch({ control, name: 'is_multi_select' });
    return (
        <input
            type={isMultiSelect ? "checkbox" : "radio"}
            {...register(`options.${index}.isCorrect`)}
            className="w-4 h-4 text-brand-600 focus:ring-brand-500"
        />
    );
}
