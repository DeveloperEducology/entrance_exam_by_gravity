const { MongoClient } = require('mongodb');

async function listAllSkills() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    // List all microskills
    const microskills = await db.collection('micro_skills').find({}).toArray();
    const microskills2 = await db.collection('microskills').find({}).toArray();
    
    const all = [...microskills, ...microskills2];
    
    console.log('--- All Microskills found ---');
    console.log(all.map(s => ({ 
      id: s.id, 
      code: s.code, 
      name: s.name, 
      slug: s.slug,
      unit_id: s.unit_id 
    })));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

listAllSkills();
