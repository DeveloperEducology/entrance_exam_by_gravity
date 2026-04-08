/**
 * ADAPTIVE LEARNING ENGINE (Proprietary)
 * Manages the logic for dynamic difficulty scaling and student progress.
 */

import { MongoClient, ObjectId } from 'mongodb';

// MongoDB Connection (Mocked for now or using environment variables)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adaptive_learning';
let client;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

/**
 * Difficulty Scaling Logic:
 * Stage 1: Introductory (Baseline)
 * Stage 2: Developing (Intermediate)
 * Stage 3: Mastery (Complex)
 * Stage 4: Extension (Challenging)
 */
export async function getNextQuestion(studentId, sessionId) {
  const db = await getDb();
  
  // 1. Fetch current session state
  const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
  if (!session) throw new Error("Session not found");

  const { stage, masteryLevel, completedQuestions } = session;

  // 2. Filter questions based on Stage and Micro-Skill
  // Logic: Pick a question from the 'questions' pool that:
  // - Belongs to the targeted micro-skill
  // - Matches the current 'stage' (difficulty level)
  // - Has not been completed yet in this session
  
  const question = await db.collection('questions').findOne({
    // microSkillId: session.microSkillId,
    adaptiveConfig: { stage: stage },
    _id: { $nin: completedQuestions || [] }
  });

  return question || null;
}

export async function processSubmission(submission) {
  const db = await getDb();
  const { studentId, sessionId, questionId, answer, isCorrect } = submission;

  // 1. Log Attempt Event
  const attemptEvent = {
    studentId,
    sessionId: new ObjectId(sessionId),
    questionId: new ObjectId(questionId),
    answer,
    isCorrect,
    timestamp: new Date(),
  };
  await db.collection('attempt_events').insertOne(attemptEvent);

  // 2. Update Session State (Drip-Feed Mechanics)
  const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId) });
  let { tokens, stage } = session;

  if (isCorrect) {
    tokens += 1;
    // Every 3 correct answers, move to the next stage
    if (tokens >= (stage * 3)) {
      stage = Math.min(stage + 1, 4);
    }
  } else {
    // If incorrect, reconsider tokens (scaffolding)
    tokens = Math.max(0, tokens - 1);
    if (tokens < (stage - 1) * 3 && stage > 1) {
      stage -= 1;
    }
  }

  await db.collection('sessions').updateOne(
    { _id: new ObjectId(sessionId) },
    { 
      $set: { tokens, stage },
      $push: { completedQuestions: new ObjectId(questionId) }
    }
  );

  return { tokens, stage, isCorrect };
}

export async function initializeSession(studentId, microSkillId) {
  const db = await getDb();
  const session = {
    studentId,
    microSkillId,
    stage: 1,
    tokens: 0,
    startTime: new Date(),
    completedQuestions: [],
    masteryLevel: 1,
  };

  const result = await db.collection('sessions').insertOne(session);
  return result.insertedId;
}
