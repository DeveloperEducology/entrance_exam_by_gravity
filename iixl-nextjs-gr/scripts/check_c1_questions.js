const { MongoClient } = require('mongodb');

async function checkQuestions() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    // Find microskills related to "C.1"
    const microskills = await db.collection('microskills').find({ 
      $or: [
        { code: /C\.1/i },
        { name: /C\.1/i },
        { id: /c1/i },
        { slug: /c-1/i }
      ]
    }).toArray();
    
    console.log('--- Related Microskills ---');
    console.log(JSON.stringify(microskills, null, 2));

    if (microskills.length > 0) {
      const ids = microskills.map(m => String(m.id || m._id));
      const questions = await db.collection('questions').find({
        $or: [
          { micro_skill_id: { $in: ids } },
          { skill_id: { $in: ids } },
          { microskill_id: { $in: ids } }
        ]
      }).toArray();
      
      console.log('\n--- Found Questions ---');
      console.log(`Count: ${questions.length}`);
      if (questions.length > 0) {
        console.log(JSON.stringify(questions.map(q => ({ id: q.id, type: q.type, micro_skill_id: q.micro_skill_id })), null, 2));
      }
    } else {
      console.log('\nNo microskills found matching C.1');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkQuestions();
