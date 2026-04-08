import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function checkGrades() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const grades = await db.collection('grades').find().sort({ grade_number: 1 }).toArray();
    console.log("Successfully fetched grades from MongoDB:");
    console.table(grades.map(g => ({ ID: g._id, Name: g.name, GradeNumber: g.grade_number })));
  } catch (err) {
    console.error("Error fetching grades:", err);
  } finally {
    await client.close();
  }
}

checkGrades();
