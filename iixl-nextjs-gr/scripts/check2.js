const mongoose = require('mongoose');

async function main() {
    console.log("Connecting...");
    await mongoose.connect("mongodb+srv://vjymrk:Admin_84529@cluster0.ivjiolu.mongodb.net/wexls?retryWrites=true&w=majority");
    const db = mongoose.connection.db;

    const assignments = await db.collection('assignments').find({}).toArray();
    console.log("Assignments:");
    assignments.forEach(a => console.log(JSON.stringify(a, null, 2)));

    const skillIds = [...new Set(assignments.map(a => String(a.micro_skill_id)))];
    const studentIds = [...new Set(assignments.flatMap(a => a.student_ids))];

    const skillStates = await db.collection('skill_states').find({
        student_id: { $in: studentIds },
        $or: [{ micro_skill_id: { $in: skillIds } }, { microskill_id: { $in: skillIds } }]
    }).toArray();

    console.log("\nSkill States:");
    skillStates.forEach(s => console.log(JSON.stringify(s, null, 2)));

    const masterySet = new Set();
    for (const st of skillStates) {
        if (st.status === 'mastered' || st.status === 'proficient' || st.mastery_score >= 80) {
            masterySet.add(`${st.student_id}_${st.micro_skill_id || st.microskill_id}`);
        }
    }

    console.log("\nMastery Set:", Array.from(masterySet));

    assignments.forEach(a => {
        let completedCount = 0;
        a.student_ids.forEach(sid => {
            if (masterySet.has(`${sid}_${a.micro_skill_id}`)) {
                completedCount++;
            }
        });
        console.log(`Assignment ${a._id}: ${completedCount}/${a.student_ids.length} using skill ${a.micro_skill_id}`);
    });

    await mongoose.disconnect();
}
main().catch(console.error);
