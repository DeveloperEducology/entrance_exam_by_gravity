const mongoose = require('mongoose');
const { Schema } = mongoose;

const MONGO_URI = "mongodb+srv://vjymrk:Admin_84529@cluster0.ivjiolu.mongodb.net/wexls?retryWrites=true&w=majority";

async function check() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const microskillId = "12f88297-e9fb-459d-bcbd-ba3e73736557";
    const questions = await db.collection('questions').find({
        $or: [
            { microSkillId: microskillId },
            { micro_skill_id: microskillId },
            { microskill_id: microskillId }
        ]
    }).toArray();
    
    console.log(`\n--- POOL ANALYSIS FOR MS: ${microskillId} ---`);
    console.log(`Total questions found: ${questions.length}`);
    
    const types = {};
    const ids = [];
    questions.forEach((q, i) => {
        const type = q.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        ids.push({
            id: q.id || q._id,
            type: type,
            difficulty: q.difficulty || 'easy',
            title: q.title || q.questionText || q.instruction || 'No Title'
        });
    });
    
    console.log("\nCounts by Type:");
    console.log(JSON.stringify(types, null, 2));
    
    console.log("\nDetailed List:");
    ids.forEach((item, i) => {
        console.log(`${i+1}. [${item.id}] - ${item.type} (${item.difficulty}) - ${item.title}`);
    });
    
    process.exit(0);
}

check();
