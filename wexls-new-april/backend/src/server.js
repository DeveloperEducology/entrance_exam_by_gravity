import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// CONFIGURATION
dotenv.config({ path: '../.env.local' });
const app = express();
const PORT = process.env.BACKEND_PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

// MIDDLEWARES
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// MONGODB CONNECTION
let db;
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB via Backend Service');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }
}
connectDB();

// TEST ROUTES
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', services: 'Adaptive Backend', uptime: process.uptime() });
});

// ADAPTIVE ENDPOINT EXAMPLE
app.get('/api/adaptive/stats', async (req, res) => {
  try {
     const gradeCount = await db.collection('grades').countDocuments();
     const subjectCount = await db.collection('subjects').countDocuments();
     res.json({ grades: gradeCount, subjects: subjectCount });
  } catch (err) {
     res.status(500).json({ error: err.message });
  }
});

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// START
app.listen(PORT, () => {
  console.log(`🚀 Specialized Backend listening at http://localhost:${PORT}`);
});
