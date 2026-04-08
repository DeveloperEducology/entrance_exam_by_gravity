
const axios = require('axios');

async function testUpsert() {
    try {
        const question = {
            id: 'test-id-' + Date.now(),
            type: 'mcq',
            question_text: 'Test Question',
            micro_skill_id: 'some-skill-id',
            marks: 1
        };
        
        const response = await axios.post('http://localhost:4000/api/questions/upsert', [question]);
        console.log('Success:', response.status);
    } catch (error) {
        console.log('Error Status:', error.response?.status);
        console.log('Error Message:', error.response?.data);
    }
}

testUpsert();
