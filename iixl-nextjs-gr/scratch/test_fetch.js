const { connectMongo } = require('../src/lib/db/mongo');
const mongoose = require('mongoose');
const { fetchQuestionsByMicroskill } = require('../src/lib/adaptive/server');

async function test() {
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    console.log("Connected to Mongo");
    
    const microskillId = "templete-money";
    const questions = await fetchQuestionsByMicroskill(db, microskillId);
    console.log("Questions found:", questions.length);
    if (questions.length > 0) {
      console.log("First question ID:", questions[0].id);
      console.log("First question type:", questions[0].type);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
