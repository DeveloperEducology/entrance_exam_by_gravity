import { api } from './src/lib/apiClient.js';

const userData = {
    "arithmetic_patterns": {
        "addition_with_carry": {
            "type": "table",
            "title": "Addition: 479 + 923",
            "columns": [
                { "header": "", "key": "label" },
                { "header": "H", "key": "h" },
                { "header": "T", "key": "t" },
                { "header": "O", "key": "o" }
            ],
            "rows": [
                { "label": "carry", "h": { "id": "c_h" }, "t": { "id": "c_t" }, "o": "" },
                { "label": "", "h": "4", "t": "7", "o": "9" },
                { "label": "+", "h": "9", "t": "2", "o": "3" },
                { "label": "Total", "h": { "id": "ans_h" }, "t": { "id": "ans_t", "maxLength": 1 }, "o": { "id": "ans_o", "maxLength": 1 } }
            ]
        }
    }
};

async function testSave() {
    console.log("Testing save of user data...");

    // Attempt to save as a question part
    const payload = {
        id: 'test_save_data',
        type: 'table_question', // New type
        difficulty: 'medium',
        micro_skill_id: 'skill_add_2digits',
        parts: [
            {
                type: 'table',
                ...userData.arithmetic_patterns.addition_with_carry
            }
        ],
        solution: JSON.stringify(userData),
        marks: 1
    };

    const { data, error } = await api.from('questions').upsert([payload]);

    if (error) {
        console.error("❌ Save failed:", error.message);
    } else {
        console.log("✅ Save successful!");
    }
}

testSave();
