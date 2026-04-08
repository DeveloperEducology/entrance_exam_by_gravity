import { api } from './src/lib/apiClient.js';

async function seedData() {
    console.log("🌱 Seeding initial data into MongoDB...");

    // 1. Grades
    await api.from('grades').upsert([
        { id: 'grade_1', name: 'Grade 1', sort_order: 1, color_hex: '#FF5733' },
        { id: 'grade_2', name: 'Grade 2', sort_order: 2, color_hex: '#33FF57' },
        { id: 'grade_3', name: 'Grade 3', sort_order: 3, color_hex: '#3357FF' }
    ]);
    console.log("✅ Grades seeded");

    // 2. Subjects
    await api.from('subjects').upsert([
        { id: 'subj_math_1', name: 'Mathematics', slug: 'math', grade_id: 'grade_1' },
        { id: 'subj_eng_1', name: 'English', slug: 'eng', grade_id: 'grade_1' },
        { id: 'subj_math_2', name: 'Mathematics', slug: 'math', grade_id: 'grade_2' }
    ]);
    console.log("✅ Subjects seeded");

    // 3. Units
    await api.from('units').upsert([
        { id: 'unit_add_1', name: 'Addition Basics', code: 'M1.1', sort_order: 1, subject_id: 'subj_math_1' },
        { id: 'unit_sub_1', name: 'Subtraction Basics', code: 'M1.2', sort_order: 2, subject_id: 'subj_math_1' },
        { id: 'unit_mult_2', name: 'Multiplication Intro', code: 'M2.1', sort_order: 1, subject_id: 'subj_math_2' }
    ]);
    console.log("✅ Units seeded");

    // 4. Micro Skills
    await api.from('micro_skills').upsert([
        { id: 'skill_add_1digits', name: 'Add single digit numbers', code: 'M1.1.1', sort_order: 1, unit_id: 'unit_add_1' },
        { id: 'skill_add_2digits', name: 'Add double digit numbers', code: 'M1.1.2', sort_order: 2, unit_id: 'unit_add_1' },
        { id: 'skill_sub_1digits', name: 'Subtract single digit numbers', code: 'M1.2.1', sort_order: 1, unit_id: 'unit_sub_1' },
        { id: 'skill_mult_2times', name: 'Multiply by 2', code: 'M2.1.1', sort_order: 1, unit_id: 'unit_mult_2' }
    ]);
    console.log("✅ Micro Skills seeded");

    // 5. Questions
    await api.from('questions').upsert([
        {
            id: 'q_add_1',
            type: 'mcq',
            difficulty: 'easy',
            micro_skill_id: 'skill_add_1digits',
            skill_id: 'skill_add_1digits',
            question_text: "What is 2 + 3?",
            parts: [{ type: 'text', content: 'What is 2 + 3?', hasAudio: false }],
            options: ['3', '4', '5', '6'],
            correct_answer_index: 2,
            correct_answer_indices: [2],
            marks: 1
        },
        {
            id: 'q_add_2',
            type: 'mcq',
            difficulty: 'medium',
            micro_skill_id: 'skill_add_2digits',
            skill_id: 'skill_add_2digits',
            question_text: "What is 15 + 23?",
            parts: [{ type: 'text', content: 'What is 15 + 23?', hasAudio: false }],
            options: ['35', '38', '40', '48'],
            correct_answer_index: 1,
            correct_answer_indices: [1],
            marks: 2
        }
    ]);
    console.log("✅ Questions seeded");

    console.log("🎉 Seed complete! Check the dashboard.");
}

seedData();
