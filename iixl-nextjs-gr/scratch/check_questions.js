
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkQuestions() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const microskillKey = 'identify-the-sen';
    
    const microskill = await db.collection('micro_skills').findOne({ 
      $or: [{ id: microskillKey }, { code: microskillKey }, { slug: microskillKey }] 
    });
    
    if (!microskill) {
      console.log('Microskill not found for key:', microskillKey);
      return;
    }

    console.log('Found Microskill:', microskill._id, microskill.id, microskill.name);

    const questions = await db.collection('questions').find({ 
      micro_skill_id: microskill.id 
    }).toArray();

    console.log(`Found ${questions.length} questions:`);
    questions.forEach(q => {
      console.log(`- [${q.id || q._id}] type: ${q.type}, logic: ${q.logic_type || 'none'}, text: ${q.questionText || q.question_text || 'no text'}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkQuestions();
