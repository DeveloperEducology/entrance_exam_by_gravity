import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugFinal() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("--- MICRO_SKILLS ---");
    const skills = await db.collection('micro_skills').find().limit(1).toArray();
    console.log(JSON.stringify(skills[0], null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

debugFinal();
