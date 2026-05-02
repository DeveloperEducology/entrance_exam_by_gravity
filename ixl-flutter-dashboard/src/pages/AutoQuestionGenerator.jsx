import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wand2, Loader2, Save, FileText, CheckCircle, Key, Copy, Check, Code, Type } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper for conditional class names (assuming it's available or defined elsewhere)
const cn = (...classes) => classes.filter(Boolean).join(' ');

const BASE_SCHEMA = {
    "difficulty": "Medium",
    "marks": 1,
    "complexity": 5,
    "sub_topic": "General",
    "schemaVersion": "ixl-like-v1",
    "showSubmitButton": false,
    "adaptiveConfig": {
        "conceptTags": [],
        "misconceptionCode": "",
        "targetComplexityBand": "medium",
        "inputMode": "default",
        "gridMode": "auto",
        "orientation": "vertical",
        "showKeypad": true,
        "autoAdvance": true,
        "keypadKeys": [
            { "label": "⭐", "value": "⭐" },
            { "label": "🟩", "value": "🟩" },
            "⌫"
        ]
    }
};

const QUESTION_TEMPLATES = {
    mcq: {
        label: "Multiple Choice",
        formats: [
            {
                name: "Standard MCQ",
                instructions: "Generate standard multiple-choice questions with 4 options.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "mcq",
                    "is_multi_select": false,
                    "is_vertical": true,
                    "question_text": "Question text here",
                    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                    "correct_answer_index": 0,
                    "solution": "Brief explanation of the correct answer"
                }
            },
            {
                name: "Image Based MCQ",
                instructions: "Generate multiple-choice questions that include an image prompt.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "mcq",
                    "is_multi_select": false,
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["visual"],
                    },
                    "parts": [
                        { "type": "text", "content": "Identify the image:", "isVertical": false },
                        { "type": "image", "imageUrl": "https://placehold.co/200", "height": 150, "isVertical": true }
                    ],
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer_index": 0,
                    "solutionParts": [
                        { "type": "text", "content": "Explanation goes here", "isVertical": true }
                    ]
                }
            }
        ]
    },
    place_value: {
        label: "Place Value",
        formats: [
            {
                name: "Visual Blocks (Tens/Ones)",
                instructions: "For each question, randomize a number between 10 and 99. Break it down into Tens and Ones visual blocks.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "fillInTheBlank",
                    "difficulty": "Easy",
                    "complexity": 10,
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["place_value", "counting"],
                        "misconceptionCode": "place_value_confusion",
                        "targetComplexityBand": "low",
                    },
                    "sub_topic": "Counting Tens and Ones",
                    "parts": [
                        { "type": "text", "content": "Look at the blocks. How many Tens and Ones are there?", "isVertical": true },
                        {
                            "type": "sequence",
                            "isVertical": true,
                            "children": [
                                { "type": "image", "height": 60, "imageUrl": "https://placehold.co/10x60/orange/white?text=10" },
                                { "type": "image", "height": 20, "imageUrl": "https://placehold.co/10x10/blue/white?text=1" }
                            ]
                        },
                        { "type": "text", "content": "Tens: ", "isVertical": false },
                        { "id": "t", "type": "input", "isVertical": false },
                        { "type": "text", "content": " Ones: ", "isVertical": false },
                        { "id": "o", "type": "input", "isVertical": false }
                    ],
                    "correct_answer_text": { "t": "2", "o": "3" },
                    "solutionParts": [
                        { "type": "text", "content": "Step-by-step explanation counting the strips and blocks.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    true_false: {
        label: "True / False",
        formats: [
            {
                name: "Standard True/False",
                instructions: "Generate True/False questions based on the topic.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "mcq",
                    "difficulty": "Easy",
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["true_false", "concept"],
                    },
                    "sub_topic": "Concept Check",
                    "parts": [
                        { "type": "text", "content": "The statement is true.", "isVertical": false }
                    ],
                    "options": ["True", "False"],
                    "correct_answer_index": 0,
                    "solutionParts": [
                        { "type": "text", "content": "Explanation goes here", "isVertical": true }
                    ]
                }
            }
        ]
    },
    fill_blank: {
        label: "Fill in the Blank",
        formats: [
            {
                name: "Multi-Input Sentence",
                instructions: "Generate sentences with multiple missing values using {{id:..., val:...}} syntax if needed, or separate inputs in parts.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "fillInTheBlank",
                    "parts": [
                        { "type": "text", "content": "The capital of France is ", "isVertical": false },
                        { "type": "input", "id": "ans1", "isVertical": false },
                        { "type": "text", "content": " and the capital of UK is ", "isVertical": false },
                        { "type": "input", "id": "ans2", "isVertical": false }
                    ],
                    "correct_answer_text": { "ans1": "Paris", "ans2": "London" },
                    "solutionParts": [
                        { "type": "text", "content": "Paris and London are the capitals.", "isVertical": true }
                    ]
                }
            },
            {
                name: "Fraction Model Box",
                instructions: "Generates a fractional shading model and expects a fractional response format in solution.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "fillInTheBlank",
                    "question_text": "What fraction of the shape is shaded?",
                    "parts": [
                        {
                            "type": "fractionModel",
                            "modelConfig": {
                                "modelType": "pie",
                                "denominator": 4,
                                "segments": 4,
                                "targetShaded": 3,
                                "fillColor": "#F59E0B",
                                "lineColor": "#1F2937",
                                "baseColor": "#FFFFFF"
                            }
                        }
                    ],
                    "solution": "[{\"num_ans\":\"3\",\"den_ans\":\"4\"}]",
                    "correct_answer_text": {},
                    "solutionParts": [
                        { "type": "text", "content": "3 out of 4 segments are shaded. The fraction is 3/4.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    match: {
        label: "Match the Following",
        formats: [
            {
                name: "Pairs",
                instructions: "Generate matching questions with 2-4 pairs.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "match",
                    "marks": 2,
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["matching"],
                    },
                    "parts": [
                        { "type": "text", "content": "Match the following items:", "isVertical": false }
                    ],
                    "pairs": [
                        { "left": "Item A", "right": "Match A" },
                        { "left": "Item B", "right": "Match B" }
                    ],
                    "solutionParts": [
                        { "type": "text", "content": "A-A, B-B", "isVertical": true }
                    ]
                }
            }
        ]
    },
    calendar: {
        label: "Calendar Reading",
        formats: [
            {
                name: "Date Finding",
                instructions: "Generate questions that require reading a calendar month.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "mcq",
                    "template": "calendar",
                    "difficulty": "Easy",
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["calendar", "time"],
                        "targetComplexityBand": "low",
                    },
                    "month": "October",
                    "year": 2023,
                    "highlight_date": 15,
                    "parts": [
                        { "type": "text", "content": "What day of the week is the 15th?", "isVertical": true },
                        { "type": "calendar_view", "month": 10, "year": 2023, "highlight": [15], "isVertical": true }
                    ],
                    "options": ["Monday", "Tuesday", "Wednesday", "Thursday"],
                    "correct_answer_index": 0,
                    "solutionParts": [
                        { "type": "text", "content": "Look at the calendar.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    image_choice: {
        label: "Image Choice",
        formats: [
            {
                name: "Select Image",
                instructions: "Generate multiple-choice questions where the options are images.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "imageChoice",
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["visual_identification"],
                    },
                    "sub_topic": "Visual Identification",
                    "parts": [
                        { "type": "text", "content": "Which object is a solid?", "isVertical": false }
                    ],
                    "options": [
                        "https://example.com/image1.png",
                        "https://example.com/image2.png",
                        "https://example.com/image3.png",
                        "https://example.com/image4.png"
                    ],
                    "correct_answer_index": 0,
                    "solutionParts": [
                        { "type": "text", "content": "The first image shows a solid object.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    drag_drop: {
        label: "Drag and Drop",
        formats: [
            {
                name: "Categorization",
                instructions: "Generate drag-and-drop questions with groups and items.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "dragAndDrop",
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["categorization"],
                    },
                    "sub_topic": "Categorization",
                    "parts": [
                        { "type": "text", "content": "Drag the items to the correct category.", "isVertical": false }
                    ],
                    "drag_groups": [
                        { "id": "g1", "image": "https://placehold.co/100?text=Group A", "label": "Group A" },
                        { "id": "g2", "image": "https://placehold.co/100?text=Group B", "label": "Group B" }
                    ],
                    "drag_items": [
                        { "id": "i1", "type": "text", "content": "Item 1", "target_group_id": "g1" },
                        { "id": "i2", "type": "text", "content": "Item 2", "target_group_id": "g2" }
                    ],
                    "solutionParts": [
                        { "type": "text", "content": "Item 1 goes to Group A, Item 2 goes to Group B.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    sorting: {
        label: "Sorting / Ordering",
        formats: [
            {
                name: "Standard Sort",
                instructions: "Generate questions where items need to be sorted in a specific order (e.g., ascending, chronological).",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "sorting",
                    "adaptiveConfig": {
                        ...BASE_SCHEMA.adaptiveConfig,
                        "conceptTags": ["ordering", "sorting"],
                    },
                    "sub_topic": "Ordering",
                    "parts": [
                        { "type": "text", "content": "Sort the numbers from lowest to highest.", "isVertical": false }
                    ],
                    "options": ["4", "8", "12", "16"],
                    "solutionParts": [
                        { "type": "text", "content": "4, 8, 12, 16 is the correct order.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    smart_table: {
        label: "Smart Table",
        formats: [
            {
                name: "Place Value Table",
                instructions: "Vertical table with labels and inputs. Use {{id:..., max:..., val:...}} for answer cells.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "smartTable",
                    "question_text": "Complete the place value table for the number 34.",
                    "smart_table_json": {
                        "columns": [
                            { "header": "Number", "key": "num" },
                            { "header": "Tens", "key": "tens" },
                            { "header": "Ones", "key": "ones" }
                        ],
                        "rows": [
                            { "num": "34", "tens": "{{id:t1, max:1, val:3}}", "ones": "{{id:o1, max:1, val:4}}" }
                        ],
                        "settings": { "type": "default" }
                    },
                    "parts": [
                        {
                            "type": "smartTable",
                            "columns": [
                                { "header": "Number", "key": "num" },
                                { "header": "Tens", "key": "tens" },
                                { "header": "Ones", "key": "ones" }
                            ],
                            "rows": [
                                { "num": "34", "tens": "{{id:t1, max:1, val:3}}", "ones": "{{id:o1, max:1, val:4}}" }
                            ],
                            "settings": { "type": "default" }
                        }
                    ],
                    "solutionParts": [
                        { "type": "text", "content": "34 is 3 tens and 4 ones.", "isVertical": true }
                    ]
                }
            }
        ]
    },
    shadeGrid: {
        label: "Shade Grid",
        formats: [
            {
                name: "Fraction Grid",
                instructions: "Generate fraction grids like 3/4 shaded in a pie, bar, or square. Return this exact structure.",
                schema: {
                    "type": "shadeGrid",
                    "difficulty": "medium",
                    "micro_skill_id": "37ffed64-172a-4222-9e2f-59ef03b5d929",
                    "solution": "[{\"type\":\"text\",\"content\":\"Shade 3 of the 4 equal sectors.\",\"isVertical\":true,\"hasAudio\":true}]",
                    "marks": 1,
                    "is_multi_select": false,
                    "is_vertical": true,
                    "question_text": null,
                    "complexity": 8,
                    "show_submit_button": false,
                    "adaptive_config": {
                        "modelType": "pie",
                        "denominator": 4,
                        "segments": 4,
                        "fillColor": "#F59E0B",
                        "lineColor": "#1F2937",
                        "baseColor": "#FFFFFF",
                        "targetShaded": 3,
                        "conceptTags": [],
                        "misconceptionCode": "",
                        "targetComplexityBand": "low",
                        "gridMode": "auto",
                        "showKeypad": true,
                        "autoAdvance": true,
                        "keypadKeys": [
                            { "label": "⭐", "value": "⭐" },
                            { "label": "🟩", "value": "🟩" },
                            "⌫"
                        ]
                    },
                    "parts": [],
                    "options": [],
                    "correct_answer_index": -1,
                    "correct_answer_text": null,
                    "drag_groups": [],
                    "drag_items": []
                }
            }
        ]
    },
    arithmetic: {
        label: "Arithmetic Layout",
        formats: [
            {
                name: "Vertical Addition",
                instructions: "Standard vertical layout with carry and answer rows.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "advanced_math",
                    "complexity": 8,
                    "sub_topic": "Addition",
                    "parts": [
                        { "type": "text", "content": "Solve the following addition problem:", "isVertical": true },
                        {
                            "type": "arithmeticLayout",
                            "isVertical": true,
                            "layout": {
                                "rows": [
                                    { "kind": "carry", "cellsCount": 2 },
                                    { "kind": "text", "text": "25" },
                                    { "kind": "text", "text": "+ 17" },
                                    { "kind": "divider" },
                                    { "kind": "answer", "cellsCount": 2 }
                                ]
                            }
                        }
                    ],
                    "correct_answer_text": "42",
                    "solutionParts": [
                        { "type": "text", "content": "5+7=12. Write 2, carry 1. 2+1+1=4. Result 42.", "isVertical": true }
                    ]
                }
            },
            {
                name: "Matrix Computation",
                instructions: "Generate 2x2 or 3x3 matrices using the matrix part type.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "advanced_math",
                    "parts": [
                        { "type": "text", "content": "Calculate A + B:", "isVertical": true },
                        { "type": "matrix", "rows": 2, "cols": 2, "values": [[1, 2], [3, 4]] },
                        { "type": "text", "content": "+", "isVertical": false },
                        { "type": "matrix", "rows": 2, "cols": 2, "values": [[5, 6], [7, 8]] }
                    ],
                    "solutionParts": [{ "type": "text", "content": "Add element-wise." }]
                }
            },
            {
                name: "Grid Selection",
                instructions: "A grid of items for selection or counting.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "advanced_math",
                    "parts": [
                        { "type": "text", "content": "How many stars are in the grid?", "isVertical": true },
                        { "type": "grid", "rows": 3, "cols": 4, "items": Array(12).fill("⭐") }
                    ],
                    "correct_answer_text": "12"
                }
            },
            {
                name: "Long Multiplication",
                instructions: "Standard long multiplication layout.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "advanced_math",
                    "parts": [
                        { "type": "text", "content": "Solve 45 x 23:", "isVertical": true },
                        {
                            "type": "longMultiply",
                            "top": "45",
                            "bottom": "23",
                            "steps": ["135", "900"],
                            "result": "1035"
                        }
                    ]
                }
            }
        ]
    },
    four_pics: {
        label: "4 Pics 1 Word",
        formats: [
            {
                name: "Classic puzzle",
                instructions: "4 related images and a hidden word.",
                schema: {
                    ...BASE_SCHEMA,
                    "type": "fourPicsOneWord",
                    "parts": [
                        { "type": "image", "imageUrl": "https://placehold.co/100?text=Pic1" },
                        { "type": "image", "imageUrl": "https://placehold.co/100?text=Pic2" },
                        { "type": "image", "imageUrl": "https://placehold.co/100?text=Pic3" },
                        { "type": "image", "imageUrl": "https://placehold.co/100?text=Pic4" }
                    ],
                    "jumbled_letters": "APPLE",
                    "solutionParts": [{ "type": "text", "content": "The word is APPLE." }]
                }
            }
        ]
    }
};

export function AutoQuestionGenerator() {
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [microSkills, setMicroSkills] = useState([]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedMicroSkill, setSelectedMicroSkill] = useState('');

    const [numQuestions, setNumQuestions] = useState(5);
    const [promptText, setPromptText] = useState('');
    const [apiKey, setApiKey] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchGrades();
        // Check local storage for API key for convenience
        const storedKey = localStorage.getItem('gemini_api_key'); // Corrected key name
        if (storedKey) setApiKey(storedKey);
    }, []);

    const fetchGrades = async () => {
        const { data, error } = await supabase.from('grades').select('id, name').order('sort_order');
        if (error) console.error('Error fetching grades:', error);
        else setGrades(data || []);
    };

    const handleGradeChange = async (e) => {
        const gradeId = e.target.value;
        setSelectedGrade(gradeId);
        setSelectedSubject('');
        setSelectedUnit('');
        setSelectedMicroSkill('');
        setSubjects([]);
        setUnits([]);
        setMicroSkills([]);

        if (gradeId) {
            const { data } = await supabase.from('subjects').select('id, name').eq('grade_id', gradeId).order('name');
            setSubjects(data || []);
        }
    };

    const handleSubjectChange = async (e) => {
        const subjectId = e.target.value;
        setSelectedSubject(subjectId);
        setSelectedUnit('');
        setSelectedMicroSkill('');
        setUnits([]);
        setMicroSkills([]);

        if (subjectId) {
            const { data } = await supabase.from('units').select('id, name').eq('subject_id', subjectId).order('sort_order');
            setUnits(data || []);
        }
    };

    const handleUnitChange = async (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);
        setSelectedMicroSkill('');
        setMicroSkills([]);

        if (unitId) {
            const { data } = await supabase.from('micro_skills').select('id, name, code, prompt').eq('unit_id', unitId).order('sort_order');
            setMicroSkills(data || []);
        }
    };

    const handleMicroSkillChange = (e) => {
        const skillId = e.target.value;
        setSelectedMicroSkill(skillId);

        const skill = microSkills.find(m => m.id === skillId);
        if (skill?.prompt) {
            setPromptText(skill.prompt);
        }
    };

    const handleApiKeyChange = (e) => {
        const key = e.target.value;
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
    };

    const [generationType, setGenerationType] = useState('mcq');
    const [selectedFormatIndex, setSelectedFormatIndex] = useState(0);
    const [jsonSchema, setJsonSchema] = useState(JSON.stringify(QUESTION_TEMPLATES['mcq'].formats[0].schema, null, 2));
    const [viewMode, setViewMode] = useState('mobile'); // 'mobile' | 'web'

    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

    const handleSaveToDb = async (q) => {
        if (!selectedMicroSkill) {
            setError('Please select a Micro Skill first.');
            return;
        }

        try {
            // Extract answers for Smart Table if needed
            let correctAnswerText = q.correct_answer_text || q.correctAnswerText;
            const type = q.type || 'mcq';
            
            if (type === 'smartTable' && (q.smart_table_json || q.smartTableJson)) {
                try {
                    const stJson = q.smart_table_json || q.smartTableJson;
                    const parsed = typeof stJson === 'string' ? JSON.parse(stJson) : stJson;
                    const answers = {};
                    (parsed.rows || []).forEach(row => {
                        Object.keys(row).forEach(key => {
                            const val = row[key];
                            // Detect {{id:..., val:...}} pattern
                            if (typeof val === 'string' && val.includes('{{id:')) {
                                const idMatch = val.match(/id:\s*([^,}]+)/);
                                const valMatch = val.match(/val:\s*([^,}]+)/);
                                if (idMatch && valMatch) {
                                    answers[idMatch[1].trim()] = valMatch[1].trim();
                                }
                            }
                        });
                    });
                    if (Object.keys(answers).length > 0) {
                        correctAnswerText = JSON.stringify(answers);
                    }
                } catch (e) { console.error("Error parsing smart table for answers:", e); }
            }

            // Normalize drag_items to ensure standard schema fields
            const dragItems = (q.drag_items || q.dragItems || []).map(di => ({
                id: di.id || Math.random().toString(36).substr(2, 9),
                type: di.type || 'text',
                content: di.content || di.text || '',
                target_group_id: di.target_group_id || di.targetGroupId || di.group_id || ''
            }));

            // Handle options normalization (Simple strings vs Rich objects)
            let finalOptions = q.options || [];
            const isAllSimpleText = Array.isArray(finalOptions) && finalOptions.every(o => typeof o === 'string');
            
            // If the incoming options are objects with parts (like from CreateQuestion), normalize them
            if (!isAllSimpleText && Array.isArray(finalOptions)) {
                const areObjectsWithParts = finalOptions.every(o => o.parts);
                if (areObjectsWithParts) {
                    finalOptions = finalOptions.map(o => o.parts[0]?.content || '');
                }
            }

            const payload = {
                micro_skill_id: selectedMicroSkill,
                type: type,
                difficulty: (q.difficulty || 'medium').toLowerCase(),
                question_text: q.question_text || q.questionText || '',
                parts: q.parts || [],
                options: finalOptions,
                correct_answer_index: q.correct_answer_index ?? q.correctAnswerIndex ?? -1,
                correct_answer_indices: (q.is_multi_select || q.isMultiSelect) ? (Array.isArray(q.correct_answer_index) ? q.correct_answer_index : [q.correct_answer_index]) : null,
                correct_answer_text: typeof correctAnswerText === 'object' ? JSON.stringify(correctAnswerText) : correctAnswerText,
                solution: q.solution || q.solution_text || q.solutionText || (Array.isArray(q.solutionParts) ? JSON.stringify(q.solutionParts) : q.solution),
                marks: parseInt(q.marks) || 1,
                complexity: parseInt(q.complexity) || 5,
                is_vertical: q.is_vertical ?? q.isVertical ?? true,
                is_multi_select: q.is_multi_select ?? q.isMultiSelect ?? false,
                smart_table_json: q.smart_table_json || q.smartTableJson || null,
                drag_groups: q.drag_groups || q.dropGroups || q.dragGroups || [],
                drag_items: dragItems,
                adaptive_config: q.adaptiveConfig || q.adaptive_config || null,
                pairs: q.pairs || [],
                jumbled_letters: q.jumbled_letters || q.jumbledLetters || null
            };

            // Specialized fourPicsOneWord logic
            if (type === 'fourPicsOneWord') {
                payload.correct_answer_text = q.solution_word || q.jumbled_letters || q.jumbledLetters;
            }

            const { error } = await supabase.from('questions').insert([payload]);
            if (error) throw error;
            alert('Question saved successfully!');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save question: ' + err.message);
        }
    };


    // Update schema when type or format changes
    useEffect(() => {
        if (QUESTION_TEMPLATES[generationType]) {
            const formats = QUESTION_TEMPLATES[generationType].formats;
            const format = formats[selectedFormatIndex] || formats[0];
            setJsonSchema(JSON.stringify(format.schema, null, 2));
        }
    }, [generationType, selectedFormatIndex]);

    const handleGenerate = async () => {
        if (!selectedMicroSkill && generationType !== 'place_value' && generationType !== 'arithmetic' && generationType !== 'smart_table' && generationType !== 'four_pics') { // Micro Skill not strictly needed for some types
            setError('Please select a Micro Skill');
            return;
        }
        if (!apiKey) {
            setError('Please enter a Gemini API Key');
            return;
        }

        setError('');
        setIsGenerating(true);
        setGeneratedQuestions([]); // Clear previous questions
        setCurrentQuestionIdx(0); // Reset index

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const microSkillName = microSkills.find(m => m.id === selectedMicroSkill)?.name || 'the selected topic';
            const gradeName = grades.find(g => g.id === selectedGrade)?.name || '';
            const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
            const unitName = units.find(u => u.id === selectedUnit)?.name || '';

            const template = QUESTION_TEMPLATES[generationType];
            const format = template.formats[selectedFormatIndex];

            // Build the prompt
            const baseInstructions = format.instructions || `Generate ${numQuestions} questions based on the context provided.`;

            let prompt = `
Role: Educational Content Generator
Task: Generate ${numQuestions} questions for the following context.

Context:
Grade: ${gradeName}
Subject: ${subjectName}
Unit: ${unitName}
Micro-Skill: ${microSkillName}
User Constraints: ${promptText}

Specific Instructions:
${baseInstructions}

Output Format:
Format the output as a JSON array strictly following this schema for each question:
${jsonSchema}

Constraints:
- Do not include markdown formatting (like \`\`\`json).
- Return STRICTLY the raw JSON array.
- Ensure valid JSON syntax.
`;

            console.log('Sending prompt to Gemini:', prompt);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('Gemini response:', text);

            // Clean up code blocks if present (sometimes models add markdown despite instructions)
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const questions = JSON.parse(cleanText);

            // Validate structure
            if (!Array.isArray(questions)) throw new Error('Response is not an array');

            setGeneratedQuestions(questions);
            setCurrentQuestionIdx(0);
        } catch (err) {
            console.error('Generation Error:', err);
            setError('Failed to generate questions. ' + (err.message || 'Check API key.'));
        } finally {
            setIsGenerating(false);
        }
    };

    const [isCopied, setIsCopied] = useState(false);

    const handleCopyJson = () => {
        navigator.clipboard.writeText(JSON.stringify(generatedQuestions, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Recursive helper to render parts
    const renderPart = (p, idx, context = {}) => {
        const isVertical = p.isVertical === true;
        let innerContent = null;

        if (p.type === 'text') {
            // Check if content contains HTML/SVG tags
            const contentStr = p.content != null ? String(p.content) : '';
            if (contentStr.includes('<svg') || contentStr.includes('<div') || contentStr.includes('<img')) {
                innerContent = <div dangerouslySetInnerHTML={{ __html: contentStr }} className={isVertical ? "w-full" : "inline-block align-middle mx-1"} />;
            } else {
                innerContent = <span className="mr-1">{contentStr}</span>;
            }
        }
        else if (p.type === 'svg' || p.type === 'html') {
            innerContent = <div dangerouslySetInnerHTML={{ __html: p.content }} className={isVertical ? "w-full" : "inline-block align-middle mx-1"} />;
        }
        else if (p.type === 'image') {
            innerContent = <img src={p.imageUrl || p.content} height={p.height} className="inline-block mx-1 rounded border border-slate-200 align-middle" alt="" />;
        }
        else if (p.type === 'sequence' && p.children) {
            innerContent = (
                <div className={`gap-1 flex-wrap items-end p-2 bg-slate-100 rounded-lg justify-center align-middle ${isVertical ? 'flex w-full' : 'inline-flex'}`}>
                    {p.children.map((child, cIdx) => renderPart(child, `${idx}-${cIdx}`))}
                </div>
            );
        }
        else if (p.type === 'input') {
            const correctVal = context.correct_answer_text?.[p.id];
            innerContent = (
                <span className="inline-flex items-center gap-1 mx-1 align-middle">
                    <input disabled className="w-12 text-center border border-slate-300 rounded p-1 bg-white text-slate-900 font-bold" placeholder="?" />
                    {correctVal && <span className="text-[10px] text-green-600 font-mono bg-green-50 px-1 rounded border border-green-200">{correctVal}</span>}
                </span>
            );
        }
        else if (p.type === 'calendar_view') {
            innerContent = (
                <div className={`p-4 bg-white border rounded shadow-sm max-w-[200px] ${isVertical ? 'mx-auto' : 'inline-block align-top mx-1'}`}>
                    <div className="font-bold text-center mb-2 text-sm">{p.month} {p.year}</div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="font-bold text-slate-400">{d}</div>)}
                        {/* Placeholder for days - standard 30 day visualization for preview */}
                        {Array.from({ length: 30 }).map((_, i) => {
                            const date = i + 1;
                            const highlightArr = Array.isArray(p.highlight) ? p.highlight : (p.highlight != null ? [p.highlight] : []);
                            const isHighlight = highlightArr.includes(date);
                            return <div key={i} className={`p-1 ${isHighlight ? 'bg-brand-100 text-brand-700 rounded-full font-bold' : ''}`}>{date}</div>
                        })}
                    </div>
                </div>
            );
        }
        else if (p.type === 'smartTable' || (idx === 'smart-table-integrated')) {
            const table = p.type === 'smartTable' ? p : p.table;
            if (!table) return null;
            innerContent = (
                <div className="w-full my-4 border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-[10px]">
                        <thead className="bg-slate-50">
                            <tr>
                                {table.columns?.map((col, i) => (
                                    <th key={i} className="px-2 py-2 border-b border-slate-200 text-slate-500 uppercase font-bold text-center">{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {table.rows?.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {table.columns?.map((col, cIdx) => {
                                        const val = row[col.key];
                                        const isInput = typeof val === 'string' && val.includes('{{id:');
                                        return (
                                            <td key={cIdx} className="px-2 py-2 text-center align-middle">
                                                {isInput ? (
                                                    <div className="w-8 h-8 border-2 border-dashed border-brand-200 rounded mx-auto flex items-center justify-center bg-brand-50/30">
                                                        <span className="text-[8px] text-brand-400">?</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-slate-700">{val}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        else if (p.type === 'arithmeticLayout') {
            const layout = p.layout;
            if (!layout) return null;
            innerContent = (
                <div className="flex flex-col items-center space-y-1 font-mono my-2 scale-90">
                    {layout.rows?.map((row, rIdx) => {
                        if (row.kind === 'text') return <div key={rIdx} className="text-xl tracking-[0.2em] font-bold">{row.text}</div>;
                        if (row.kind === 'divider') return <div key={rIdx} className="w-full border-b border-slate-800 my-1"></div>;
                        if (row.kind === 'answer' || row.kind === 'carry') {
                            return (
                                <div key={rIdx} className="flex gap-1">
                                    {Array.from({ length: row.cellsCount || 1 }).map((_, cIdx) => (
                                        <div key={cIdx} className={`w-8 h-8 border border-slate-300 rounded flex items-center justify-center ${row.kind === 'carry' ? 'h-5 opacity-50 bg-slate-50 border-dashed' : 'bg-white shadow-inner'}`}>
                                            <span className="text-[10px] text-slate-300">?</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            );
        }
        else if (p.type === 'matrix') {
            innerContent = (
                <div className="inline-flex items-center gap-1 my-2">
                    <div className="text-2xl font-light text-slate-300">(</div>
                    <div className={`grid gap-2 text-center`} style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }}>
                        {p.values?.flat().map((v, i) => (
                            <div key={i} className="w-8 h-8 flex items-center justify-center font-bold text-slate-700 bg-white border border-slate-100 rounded shadow-sm">{v}</div>
                        ))}
                    </div>
                    <div className="text-2xl font-light text-slate-300">)</div>
                </div>
            );
        }
        else if (p.type === 'grid') {
            innerContent = (
                <div className="inline-grid gap-2 border border-slate-200 p-2 rounded-xl bg-white shadow-inner my-2" style={{ gridTemplateColumns: `repeat(${p.cols || 4}, 1fr)` }}>
                    {p.items?.map((it, i) => (
                        <div key={i} className="w-10 h-10 flex items-center justify-center text-lg bg-slate-50 rounded-lg">{it}</div>
                    ))}
                </div>
            );
        }
        else if (p.type === 'longMultiply') {
            innerContent = (
                <div className="inline-flex flex-col items-end font-mono text-xl space-y-1 my-2 pr-4 border-r-4 border-slate-100 italic">
                    <div>{p.top}</div>
                    <div className="border-b-2 border-slate-800 pb-1">× {p.bottom}</div>
                    {p.steps?.map((s, i) => <div key={i} className="text-slate-400">{s}</div>)}
                    <div className="border-t-2 border-slate-800 font-bold text-brand-600">{p.result}</div>
                </div>
            );
        }

        if (innerContent) {
            if (isVertical) {
                return <div key={idx} className="w-full my-2">{innerContent}</div>;
            }
            return <React.Fragment key={idx}>{innerContent}</React.Fragment>;
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Wand2 className="w-8 h-8 text-brand-500" />
                    Auto Question Generator
                </h1>
                <p className="text-slate-500 mt-1">Generate questions automatically using AI based on micro-skills</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-400" />
                            Configuration
                        </h2>

                        <div className="space-y-4">
                            {/* API Key Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Key className="w-3 h-3" /> Gemini API Key
                                </label>
                                <input
                                    type="password"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    placeholder="Enter your Gemini API key"
                                    value={apiKey}
                                    onChange={handleApiKeyChange}
                                />
                                <p className="text-xs text-slate-400 mt-1">Key is saved locally in your browser.</p>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        value={generationType}
                                        onChange={(e) => {
                                            setGenerationType(e.target.value);
                                            setSelectedFormatIndex(0);
                                        }}
                                    >
                                        {Object.entries(QUESTION_TEMPLATES).map(([key, tmpl]) => (
                                            <option key={key} value={key}>{tmpl.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        value={selectedFormatIndex}
                                        onChange={(e) => setSelectedFormatIndex(parseInt(e.target.value))}
                                    >
                                        {QUESTION_TEMPLATES[generationType].formats.map((fmt, idx) => (
                                            <option key={idx} value={idx}>{fmt.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200" data-tour="schema-editor">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1"><Code className="w-3 h-3" /> JSON Schema (Editable)</span>
                                    <button
                                        onClick={() => {
                                            const fmt = QUESTION_TEMPLATES[generationType].formats[selectedFormatIndex];
                                            setJsonSchema(JSON.stringify(fmt.schema, null, 2));
                                        }}
                                        className="text-brand-600 hover:text-brand-700 text-[10px] font-medium"
                                    >
                                        Reset
                                    </button>
                                </label>
                                <textarea
                                    className="w-full bg-white text-slate-600 font-mono text-xs p-2 rounded border border-slate-200 h-32 focus:ring-1 focus:ring-brand-500 outline-none resize-y"
                                    value={jsonSchema}
                                    onChange={(e) => setJsonSchema(e.target.value)}
                                    spellCheck={false}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">This schema defines the exact output format for the AI.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    value={selectedGrade}
                                    onChange={handleGradeChange}
                                >
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id || g._id} value={g.id || g._id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                                    value={selectedSubject}
                                    onChange={handleSubjectChange}
                                    disabled={!selectedGrade}
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                                    value={selectedUnit}
                                    onChange={handleUnitChange}
                                    disabled={!selectedSubject}
                                >
                                    <option value="">Select Unit</option>
                                    {units.map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Micro Skill</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                                    value={selectedMicroSkill}
                                    onChange={handleMicroSkillChange}
                                    disabled={!selectedUnit || ['place_value', 'arithmetic', 'smart_table', 'four_pics'].includes(generationType)} // Disable if type doesn't strictly need micro-skill
                                >
                                    <option value="">Select Micro Skill</option>
                                    {microSkills.map(m => <option key={m.id || m._id} value={m.id || m._id}>{m.name} ({m.code})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Questions</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    value={numQuestions}
                                    onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prompt / Context</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    placeholder="Enter additional context or instructions for generation..."
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || (!apiKey) || (!selectedMicroSkill && !['place_value', 'arithmetic', 'smart_table', 'four_pics'].includes(generationType))}
                                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        Generate Questions
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl min-h-[600px] flex flex-col">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-6">
                                <div>
                                    <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                                        <CheckCircle className="w-6 h-6 text-brand-600" />
                                        Review & Verification
                                    </h2>
                                    {generatedQuestions.length > 0 && (
                                        <p className="text-sm text-slate-400 mt-1 font-medium">Question {currentQuestionIdx + 1} of {generatedQuestions.length}</p>
                                    )}
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setViewMode('mobile')}
                                        className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}
                                    >
                                        Mobile
                                    </button>
                                    <button
                                        onClick={() => setViewMode('web')}
                                        className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'web' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500")}
                                    >
                                        Web
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {generatedQuestions.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleCopyJson}
                                            className="px-4 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
                                        >
                                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {isCopied ? 'Copied' : 'JSON'}
                                        </button>
                                        <button
                                            onClick={() => handleSaveToDb(generatedQuestions[currentQuestionIdx])}
                                            className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all flex items-center gap-2"
                                        >
                                            <Save className="w-4 h-4" /> Save to DB
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {generatedQuestions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-50 rounded-3xl bg-slate-50/50">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <Wand2 className="w-10 h-10 opacity-20" />
                                </div>
                                <p className="font-bold text-lg text-slate-600">No output generated</p>
                                <p className="text-sm max-w-xs text-center mt-2">Adjust your config and micro-skill, then click "Generate" to start the process.</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-8">
                                {/* Single Question Detailed Preview */}
                                {(() => {
                                    const q = generatedQuestions[currentQuestionIdx];
                                    const isVerticalLayout = q.is_vertical ?? true;

                                    return (
                                        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className={cn("flex gap-8", viewMode === 'web' ? 'flex-col lg:flex-row' : 'flex-row')}>
                                                <div className={cn(
                                                    "flex-1 mx-auto transition-all duration-500",
                                                    viewMode === 'mobile'
                                                        ? "bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-[12px] border-slate-800 max-w-[380px] ring-4 ring-slate-100"
                                                        : "w-full max-w-4xl"
                                                )}>
                                                    <div className={cn(
                                                        "bg-slate-50 overflow-hidden text-left relative flex flex-col shadow-inner",
                                                        viewMode === 'mobile' ? "rounded-[2rem] min-h-[500px]" : "rounded-3xl min-h-[400px] border border-slate-200"
                                                    )}>
                                                        {/* Status Bar (Mobile Only) */}
                                                        {viewMode === 'mobile' && (
                                                            <div className="bg-white px-6 py-3 flex justify-between items-center text-[10px] text-slate-900 font-bold border-b border-slate-100">
                                                                <span>9:41</span>
                                                                <div className="flex gap-1.5">
                                                                    <div className="w-3 h-3 border border-slate-300 rounded-sm"></div>
                                                                    <div className="w-4 h-3 bg-slate-300 rounded-sm"></div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                                                            {/* Header */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={cn(
                                                                        "text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase shadow-sm",
                                                                        q.difficulty === 'Easy' ? 'bg-green-500' : q.difficulty === 'Hard' ? 'bg-red-500' : 'bg-yellow-500'
                                                                    )}>
                                                                        {q.difficulty || 'Medium'}
                                                                    </span>
                                                                    <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">{q.type}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                    <span>{q.marks || 1} Points</span>
                                                                </div>
                                                            </div>

                                                            {/* Question Content */}
                                                            <div className="space-y-6">
                                                                {q.question_text && <h3 className="text-2xl font-bold text-slate-900 leading-tight">{q.question_text}</h3>}
                                                                <div className={cn(
                                                                    "text-slate-900 font-medium text-lg leading-relaxed",
                                                                    isVerticalLayout ? "space-y-4" : "flex flex-wrap items-center gap-2"
                                                                )}>
                                                                    {q.parts && Array.isArray(q.parts) && q.parts.map((p, i) => renderPart(p, i, q))}

                                                                    {/* Integrated Smart Table Preview */}
                                                                    {q.type === 'smartTable' && q.smart_table_json && !q.parts?.some(p => p.type === 'smartTable') && (() => {
                                                                        try {
                                                                            const table = typeof q.smart_table_json === 'string' ? JSON.parse(q.smart_table_json) : q.smart_table_json;
                                                                            return renderPart({ table }, 'smart-table-integrated');
                                                                        } catch (e) { return null; }
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            {/* Interactive Area */}
                                                            <div className="pt-4 mt-auto">
                                                                {(q.type === 'mcq' || q.type === 'imageChoice' || q.type === 'sorting' || (q.options && !q.type?.includes('drag'))) && (
                                                                    <div className="space-y-3">
                                                                        {Array.isArray(q.options) && q.options.map((opt, i) => {
                                                                            const isCorrect = i === q.correct_answer_index;
                                                                            const isUrl = typeof opt === 'string' && (opt.startsWith('http') || opt.startsWith('/'));
                                                                            return (
                                                                                <div key={i} className={cn(
                                                                                    "p-4 rounded-2xl border-2 transition-all shadow-sm",
                                                                                    isCorrect && q.type !== 'sorting' ? "border-green-500 bg-green-50/50" : "border-slate-200 bg-white"
                                                                                )}>
                                                                                    <div className="flex justify-between items-center gap-3">
                                                                                        {q.type === 'imageChoice' || (isUrl && q.type !== 'sorting') ? (
                                                                                            <img src={opt} className="h-24 w-full object-contain rounded-xl bg-slate-50" />
                                                                                        ) : (
                                                                                            <span className="text-sm font-bold text-slate-700">{typeof opt === 'object' ? JSON.stringify(opt) : String(opt)}</span>
                                                                                        )}
                                                                                        {isCorrect && q.type !== 'sorting' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {q.type === 'dragAndDrop' && (
                                                                    <div className="space-y-6">
                                                                        <div className="flex flex-wrap gap-4 justify-center">
                                                                            {q.drag_groups?.map((group, idx) => (
                                                                                <div key={idx} className="w-28 min-h-[100px] border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-white/50 flex flex-col items-center shadow-inner">
                                                                                    {group.image && <img src={group.image} className="w-12 h-12 object-contain mb-2" />}
                                                                                    <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">{group.label}</span>
                                                                                    <div className="mt-3 w-full space-y-1.5">
                                                                                        {Array.isArray(q.drag_items) && q.drag_items.filter(i => i.target_group_id === group.id).map((item, itemIdx) => (
                                                                                            <div key={itemIdx} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[8px] font-bold shadow-sm text-center flex justify-center items-center">
                                                                                                {String(item.content || '')}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {q.type === 'fourPicsOneWord' && (
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {q.parts?.filter(p => p.type === 'image').map((img, i) => (
                                                                                <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                                                                    <img src={img.imageUrl || img.content} className="w-full h-full object-cover" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                                                                            {(q.jumbled_letters || '').split('').map((char, i) => (
                                                                                <div key={i} className="w-9 h-9 bg-slate-900 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-lg border-b-4 border-slate-700">
                                                                                    {char}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Solution Reveal */}
                                                            <details className="mt-6 group">
                                                                <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 p-3 rounded-xl border border-brand-100">
                                                                    <div className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[8px]">?</div>
                                                                    View Step-by-Step Solution
                                                                </summary>
                                                                <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs text-slate-600 leading-relaxed font-medium">
                                                                    {q.solutionParts && Array.isArray(q.solutionParts)
                                                                        ? q.solutionParts.map((p, pIdx) => (
                                                                            <div key={pIdx} className={p.isVertical ? 'block mb-3 last:mb-0' : 'inline mr-1'}>
                                                                                {p.type === 'image' ? <img src={p.imageUrl || p.content} className="h-20 rounded-xl shadow-sm my-2 block" alt="sol" /> : String(p.content || '')}
                                                                            </div>
                                                                        ))
                                                                        : typeof q.solution === 'object' ? JSON.stringify(q.solution) : String(q.solution || 'No solution provided.')
                                                                    }
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Meta Sidebar */}
                                                <div className="w-64 space-y-4">
                                                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4 h-fit sticky top-0">
                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata</h4>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-slate-500 font-medium">Complexity</span>
                                                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{q.complexity || 5}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-slate-500 font-medium">Marks</span>
                                                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{q.marks || 1}</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-tighter">Adaptive Config</span>
                                                                <div className="bg-white p-2 rounded-xl border border-slate-100 overflow-hidden">
                                                                    <div className="text-[8px] font-mono text-slate-400 space-y-1">
                                                                        <p>Mode: {q.adaptiveConfig?.inputMode || 'default'}</p>
                                                                        <p>Grid: {q.adaptiveConfig?.gridMode || 'auto'}</p>
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {q.adaptiveConfig?.conceptTags?.map((t, i) => <span key={i} className="bg-slate-100 px-1 rounded truncate">#{t}</span>)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Navigation Controls */}
                                            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                                                <button
                                                    onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                                                    disabled={currentQuestionIdx === 0}
                                                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-all rounded-2xl hover:bg-slate-50"
                                                >
                                                    ← Previous
                                                </button>

                                                <div className="flex gap-2">
                                                    {generatedQuestions.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentQuestionIdx(i)}
                                                            className={cn(
                                                                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                                                i === currentQuestionIdx ? "bg-brand-600 w-8" : "bg-slate-200 hover:bg-slate-300"
                                                            )}
                                                        />
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => setCurrentQuestionIdx(prev => Math.min(generatedQuestions.length - 1, prev + 1))}
                                                    disabled={currentQuestionIdx === generatedQuestions.length - 1}
                                                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-brand-600 hover:text-brand-700 disabled:opacity-30 transition-all rounded-2xl hover:bg-brand-50"
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
