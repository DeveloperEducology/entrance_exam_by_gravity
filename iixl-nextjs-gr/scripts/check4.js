const mongoose = require('mongoose');
async function main() {
    await mongoose.connect("mongodb+srv://vjymrk:Admin_84529@cluster0.ivjiolu.mongodb.net/wexls?retryWrites=true&w=majority");
    const db = mongoose.connection.db;
    const states = await db.collection('skill_states').find({
        $or: [{ status: 'proficient' }, { status: 'mastered' }, { mastery_score: { $gte: 80 } }]
    }).toArray();
    console.log(JSON.stringify(states, null, 2));
    process.exit(0);
}
main();
