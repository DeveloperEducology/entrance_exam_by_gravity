const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testUpsert() {
    try {
        let questions = [];
        const filePath = process.argv[2];

        if (filePath) {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                console.error(`File not found: ${absolutePath}`);
                return;
            }
            const fileContent = fs.readFileSync(absolutePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            
            // Handle both single question object and array of questions
            questions = Array.isArray(jsonData) ? jsonData : [jsonData];
            console.log(`Loaded ${questions.length} questions from ${filePath}`);
        } else {
            console.log('No file provided, using default hardcoded questions...');
            questions = [
                {
                    id: "deep_sea_journey_001",
                    micro_skill_id: "logic-visual-selection",
                    type: "journey_v1",
                    difficulty: "easy",
                    title: "Deep Sea Treasure Hunt 🌊",
                    adaptive_config: {
                        theme: "ocean",
                        character_name: "Captain Blue",
                        accent_color: "#0284c7"
                    },
                    steps: [
                        {
                            id: "sea_step_1",
                            label: "Vehicle Choice",
                            icon: "🚢",
                            question: {
                                type: "image_choice",
                                parts: [
                                    { 
                                        "type": "text", 
                                        "content": "Captain Blue needs a submarine that can carry **3 divers**. Which vehicle has exactly 3 seats?" 
                                    }
                                ],
                                options: [
                                    { 
                                        "label": "Option A", 
                                        "imageUrl": "https://cdn-icons-png.flaticon.com/512/2951/2951151.png",
                                        "value": "sub_1"
                                    },
                                    { 
                                        "label": "Option B", 
                                        "imageUrl": "https://cdn-icons-png.flaticon.com/512/913/913419.png",
                                        "value": "sub_2"
                                    },
                                    { 
                                        "label": "Option C", 
                                        "imageUrl": "https://cdn-icons-png.flaticon.com/512/3066/3066534.png",
                                        "value": "sub_3"
                                    }
                                ],
                                correct_answer_index: 0,
                                solution: [{ "type": "text", "content": "The Yellow Submarine has 3 portholes for 3 divers!" }]
                            }
                        }
                    ]
                }
            ];
        }
        
        const response = await axios.post('http://127.0.0.1:5000/api/questions/upsert', questions);
        console.log('Success - Questions Upserted!', response.status);
    } catch (error) {
        if (error.response) {
            console.error('Error Response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testUpsert();