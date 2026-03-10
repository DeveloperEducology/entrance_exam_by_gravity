const mongoose = require('mongoose');
async function main() {
    await mongoose.connect("mongodb+srv://vjymrk:Admin_84529@cluster0.ivjiolu.mongodb.net/wexls?retryWrites=true&w=majority");
    const db = mongoose.connection.db;

    const skillId1 = '2f043d7d-d110-485c-9cfc-c5e7f0880ae7';
    const states = await db.collection('skill_states').find({
        $or: [{ micro_skill_id: skillId1 }, { microskill_id: skillId1 }]
    }).toArray();
    console.log("Skill states for assignment:", JSON.stringify(states, null, 2));

    const allStates = await db.collection('skill_states').find({}).toArray();
    console.log("Total skill states in DB:", allStates.length);
    console.log("Some states:", JSON.stringify(allStates.slice(0, 3), null, 2));

    process.exit(0);
}
main();
