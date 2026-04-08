import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyLinks() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    const grades = await db.collection('grades').find().toArray();
    const subjects = await db.collection('subjects').find().toArray();
    
    console.log(`Summary: ${grades.length} grades, ${subjects.length} subjects found.`);
    
    // Check first grade
    if (grades.length > 0) {
      const g = grades[0];
      console.log(`\nExample Grade: _id=${g._id}, id=${g.id}, name=${g.name}`);
      
      // Look for subjects with ANY of these IDs
      const matchId = subjects.filter(s => s.grade_id === g.id);
      const matchMongoId = subjects.filter(s => s.grade_id === g._id);
      const matchAny = subjects.filter(s => s.grade_id === g.id || s.grade_id === g._id);
      
      console.log(`Matches for UUID 'id': ${matchId.length}`);
      console.log(`Matches for Mongo '_id': ${matchMongoId.length}`);
      
      if (matchAny.length === 0 && subjects.length > 0) {
         console.log("\nSample subject grade_id values found in DB:");
         console.log(subjects.slice(0, 5).map(s => s.grade_id));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

verifyLinks();
