import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { mapDbQuestion } from '@/lib/practice/questionMapper';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import mongoose from 'mongoose';

const SKILL_COLUMNS = ['microSkillId', 'micro_skill_id', 'microskill_id'];

export async function GET(_req, { params }) {
  const { microskillId: microskillKey } = await params;
  const microskillId = await resolveMicroskillIdByKey(microskillKey);

  if (!microskillId) {
    return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });
  }

  try {
    await connectMongo();
    const db = mongoose.connection.db;

    let questionData = null;
    
    // 1. Try to find a question explicitly marked as a sample/example
    for (const skillColumn of SKILL_COLUMNS) {
      questionData = await db.collection('questions').findOne({
        [skillColumn]: microskillId,
        $or: [
          { is_sample: true },
          { isSample: true },
          { category: 'example' },
          { category: 'sample' }
        ]
      });
      if (questionData) break;
    }

    // 2. If no explicit sample, find any question that has a structured solution
    if (!questionData) {
      for (const skillColumn of SKILL_COLUMNS) {
        questionData = await db.collection('questions').findOne({
          [skillColumn]: microskillId,
          solution: { $exists: true, $ne: '' }
        });
        if (questionData) break;
      }
    }

    // 3. Last fallback: any question
    if (!questionData) {
       for (const skillColumn of SKILL_COLUMNS) {
        questionData = await db.collection('questions').findOne({
          [skillColumn]: microskillId
        });
        if (questionData) break;
      }
    }

    if (!questionData) {
      return NextResponse.json({ error: 'No example available for this skill.' }, { status: 404 });
    }

    const mapped = mapDbQuestion(questionData);
    
    // We explicitly include the solution here for the "Learn from Example" feature
    return NextResponse.json({
      question: {
        ...mapped,
        solution: mapped.solution || 'No explanation available yet.'
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
