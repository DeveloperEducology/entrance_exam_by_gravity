import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Manual env load to solve the Next.js/Turbopack root detection issue
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI) {
  console.warn('⚠️ Environment Warning: MONGODB_URI not found.');
}

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If MONGODB_URI contains a database name (like /wexls), client.db() will use it by default if no argument is passed.
  const client = await MongoClient.connect(MONGODB_URI);
  const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
