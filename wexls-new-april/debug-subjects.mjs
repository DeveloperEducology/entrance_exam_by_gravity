import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function debugSubjects() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("--- SUBJECTS ---");
    const subjects = await db.collection('subjects').find().limit(3).toArray();
    console.log(JSON.stringify(subjects, null, 2));

    if (subjects[0]) {
      const gradeId = subjects[0].gradeId;
      console.log("\nFound Grade ID in subject: " + gradeId);
      
      const grade = await db.collection('grades').findOne({ id: gradeId });
      console.log("\n--- GRADE with id: " + gradeId + " ---");
      console.log(JSON.stringify(grade, null, 2));
    }

  } catch (err) {
    console.error("Debug Error:", err);
  } finally {
    await client.close();
  }
}

debugSubjects();
