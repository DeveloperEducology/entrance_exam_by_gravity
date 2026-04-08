import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function debugMicroskills() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("--- MICROSKILLS ---");
    const skills = await db.collection('microskills').find().limit(3).toArray();
    console.log(JSON.stringify(skills, null, 2));

  } catch (err) {
    console.error("Debug Error:", err);
  } finally {
    await client.close();
  }
}

debugMicroskills();
