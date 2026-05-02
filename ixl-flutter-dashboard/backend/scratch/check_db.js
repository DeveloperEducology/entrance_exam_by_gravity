const mongoose = require('mongoose');

async function debugDatabase() {
    const MONGO_URI = 'mongodb://127.0.0.1:27017/ixl_dashboard';
    await mongoose.connect(MONGO_URI);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('--- COLLECTIONS FOUND ---');
    console.log(collections.map(c => c.name));

    const Question = mongoose.model('Question', new mongoose.Schema({}, { strict: false }), 'questions');
    
    const count = await Question.countDocuments();
    console.log(`\nTotal questions in DB: ${count}`);

    if (count > 0) {
        const lastQuestions = await Question.find({}).sort({ created_at: -1 }).limit(5).lean();
        console.log('\n--- LATEST 5 QUESTIONS (RAW) ---');
        lastQuestions.forEach(q => {
            console.log(`ID: ${q.id || q._id} | Type: ${q.type} | Skill: ${q.micro_skill_id || q.microSkillId}`);
            console.log(`Steps: ${Array.isArray(q.steps) ? q.steps.length : 'MISSING'}`);
            console.log('-----------------------------------');
        });
    }

    await mongoose.disconnect();
}

debugDatabase();
