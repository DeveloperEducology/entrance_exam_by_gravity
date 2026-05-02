
const axios = require('axios');

const journeyQuestion = {
  "_id": "e93fc3e3-5465-4a11-8f91-f9fab29ecb0c",
  "id": "e93fc3e3-5465-4a11-8f91-f9fab29ecb0c",
  "micro_skill_id": "12f88297-e9fb-459d-bcbd-ba3e73736557",
  "type": "journey_v1",
  "difficulty": "medium",
  "title": "Rohit's Shopping Adventure",
  "adaptive_config": {
    "theme": "shopping",
    "character_name": "Rohit",
    "accent_color": "#4ba8ff"
  },
  "steps": [
    {
      "id": "step_1",
      "label": "The Toy Store",
      "icon": "🏎️",
      "question": {
        "type": "mcq",
        "parts": [
          {
            "type": "text",
            "content": "Rohit has **₹200**. First, he buys **2 toy cars**. If one toy car costs **₹50**, how much does he spend on cars?",
            "hasAudio": true
          }
        ],
        "options": [
          { "label": "₹50", "content": "₹50" },
          { "label": "₹100", "content": "₹100" },
          { "label": "₹150", "content": "₹150" }
        ],
        "correct_answer_index": 1,
        "solution": [
          {
            "type": "text",
            "content": "### Step 1: Toy Cars\nCost = $2 \\times ₹50 = ₹100$. Rohit spent **₹100**."
          }
        ]
      }
    },
    {
      "id": "step_2",
      "label": "Stationery Shop",
      "icon": "✏️",
      "question": {
        "type": "mcq",
        "parts": [
          {
            "type": "text",
            "content": "Next, he buys **3 pencil boxes**. One pencil box costs **₹25**. How much do 3 pencil boxes cost?",
            "hasAudio": true
          }
        ],
        "options": [
          { "label": "₹50", "content": "₹50" },
          { "label": "₹75", "content": "₹75" },
          { "label": "₹100", "content": "₹100" }
        ],
        "correct_answer_index": 1,
        "solution": [
          {
            "type": "text",
            "content": "### Step 2: Pencil Boxes\nCost = $3 \\times ₹25 = ₹75$. Rohit spent **₹75**."
          }
        ]
      }
    },
    {
      "id": "step_3",
      "label": "Final Count",
      "icon": "👛",
      "question": {
        "type": "mcq",
        "parts": [
          {
            "type": "text",
            "content": "Rohit started with **₹200**. He spent **₹100** on cars and **₹75** on pencil boxes. How much money is left with him?",
            "hasAudio": true
          }
        ],
        "options": [
          { "label": "₹15", "content": "₹15" },
          { "label": "₹25", "content": "₹25" },
          { "label": "₹50", "content": "₹50" }
        ],
        "correct_answer_index": 1,
        "solution": [
          {
            "type": "text",
            "content": "### Step 3: Change Left\nTotal Spent: $₹100 + ₹75 = ₹175$.\nMoney Left: $₹200 - ₹175 = ₹25$."
          }
        ]
      }
    }
  ]
};

async function importJourney() {
  try {
    const response = await axios.post('http://localhost:4000/api/questions/upsert', [journeyQuestion]);
    console.log('✅ Journey imported successfully!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error importing journey:', error.response?.data || error.message);
  }
}

importJourney();
