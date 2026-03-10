const mongoose = require('mongoose');
async function main() {
    await mongoose.connect("mongodb+srv://vjymrk:Admin_84529@cluster0.ivjiolu.mongodb.net/wexls?retryWrites=true&w=majority");
    const db = mongoose.connection.db;
    const states = await db.collection('skill_states').find({status: 'proficient'}).toArray();
    console.log(states);
    process.exit(0);
}
main();
