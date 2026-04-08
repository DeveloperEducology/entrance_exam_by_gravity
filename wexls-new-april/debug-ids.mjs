import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function debugData() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("--- GRADES ---");
    const grades = await db.collection('grades').find().limit(1).toArray();
    console.log(JSON.stringify(grades[0], null, 2));

    if (grades[0]) {
      console.log("\n--- SUBJECTS for Grade ID: " + grades[0]._id + " ---");
      // Try both ObjectId and String
      const subjectsStr = await db.collection('subjects').find({ gradeId: grades[0]._id.toString() }).toArray();
      const subjectsObj = await db.collection('subjects').find({ gradeId: grades[0]._id }).toArray();
      
      console.log("Found with String ID:", subjectsStr.length);
      console.log("Found with ObjectId:", subjectsObj.length);
      
      if (subjectsObj[0]) {
        console.log("\n--- MICROSKILLS for Subject ID: " + subjectsObj[0]._id + " ---");
        const skillsStr = await db.collection('microskills').countDocuments({ subjectId: subjectsObj[0]._id.toString() });
        const skillsObj = await db.collection('microskills').countDocuments({ subjectId: subjectsObj[0]._id });
        console.log("Count with String ID:", skillsStr);
        console.log("Count with ObjectId:", skillsObj);
      }
    }

  } catch (err) {
    console.error("Debug Error:", err);
  } finally {
    await client.close();
  }
}

debugData();
