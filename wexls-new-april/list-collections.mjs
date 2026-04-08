import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

listCollections();
