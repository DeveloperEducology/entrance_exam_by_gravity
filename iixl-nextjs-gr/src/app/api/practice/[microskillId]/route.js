import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { mapDbQuestion } from '@/lib/practice/questionMapper';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import { fetchQuestionsByMicroskill } from '@/lib/adaptive/server';
import { serverError, serverLog } from '@/lib/debug/logger';

const SKILL_COLUMNS = ['microSkillId', 'micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value ?? '').trim();
  if (!str) return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMeasureTarget(question) {
  if (!question || question.type !== 'measure') return null;

  return (
    parseNumber(question.adaptiveConfig?.target_units) ??
    parseNumber(question.adaptiveConfig?.line_units) ??
    parseNumber(question.adaptiveConfig?.line_length) ??
    parseNumber(question.adaptiveConfig?.target_length) ??
    parseNumber(question.correctAnswerText)
  );
}

function shuffleLetters(letters) {
  const out = [...letters];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getFourPicsPuzzle(question) {
  if (!question || question.type !== 'fourPicsOneWord') return { wordLength: null, letterBank: null };

  const answer = String(question.correctAnswerText ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!answer) return { wordLength: null, letterBank: null };
  return {
    wordLength: answer.length,
    letterBank: shuffleLetters(answer.split('')),
  };
}

function toPublicQuestion(question) {
  if (!question) return null;
  const fourPics = getFourPicsPuzzle(question);

  return {
    id: question.id,
    microSkillId: question.microSkillId ?? null,
    questionText: question.questionText ?? '',
    type: question.type,
    difficulty: question.difficulty ?? 'easy',
    complexity: Number(question.complexity ?? 0),
    parts: question.parts ?? [],
    options: question.options ?? [],
    items: question.items ?? [],
    dragItems: question.dragItems ?? [],
    dropGroups: question.dropGroups ?? [],
    problem: question.problem ?? null,
    adaptiveConfig: question.adaptiveConfig ?? null,
    ui_config: question.ui_config ?? null,
    correctAnswerText: question.correctAnswerText ?? '',
    correctAnswerIndex: question.correctAnswerIndex ?? null,
    correctAnswerIndices: Array.isArray(question.correctAnswerIndices) ? question.correctAnswerIndices : [],
    solution: question.solution ?? '',
    show_example: Boolean(question.show_example ?? question.showExample ?? false),
    showExample: Boolean(question.show_example ?? question.showExample ?? false),
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isGrid: Boolean(question.isGrid),
    isVertical: Boolean(question.isVertical),
    showSubmitButton: Boolean(question.showSubmitButton),
    tokens: question.tokens ?? [],
    concepts: question.concepts ?? [],
    steps: question.steps ?? [],
    data_source: question.data_source ?? null,
    logic_type: question.logic_type ?? null,
  };
}

export async function GET(_req, { params }) {
  const startedAt = Date.now();
  const { microskillId: microskillKey } = await params;
  const microskillId = await resolveMicroskillIdByKey(microskillKey);

  const isLcmStep = microskillKey === 'lcm-step-by-step' || microskillId === 'lcm-step-by-step';
  if (!microskillId && (microskillKey === 'place-value-auto-intro' || isLcmStep)) {
    let generatedQuestion;
    if (microskillKey === 'place-value-auto-intro') {
      const { generatePlaceValueQuestion } = require('@/lib/practice/generators/placeValueGenerator');
      generatedQuestion = generatePlaceValueQuestion();
    } else {
      generatedQuestion = {
        id: 'lcm_journey_' + Date.now(),
        type: 'stepwise',
        logic_type: 'lcm_journey_v1',
        adaptiveConfig: { variables: {} }
      };
      // Must instantiate it before returning to public
      const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
      generatedQuestion = toPublicQuestion(instantiateTemplate(generatedQuestion));
    }
    
    serverLog('api.practice.get', 'auto-generated question returned', { microskillKey });
    return NextResponse.json({
      source: 'auto-generator',
      question: generatedQuestion,
    });
  }

  if (!microskillId) {
    serverLog('api.practice.get', 'microskill resolution failed', { microskillKey });
    return NextResponse.json(
      { error: 'Microskill not found.' },
      { status: 404 }
    );
  }

  try {
    const { connectMongo } = require('@/lib/db/mongo');
    const mongoose = require('mongoose');
    await connectMongo();
    const db = mongoose.connection.db;

    let data = null;
    const { ObjectId } = require('mongodb');
    
    // Attempt to parse as ObjectId for safer querying if possible
    let mIdQuery = microskillId;
    try {
        if (typeof microskillId === 'string' && microskillId.length === 24) {
            mIdQuery = new ObjectId(microskillId);
        }
    } catch(e) {}

    // 1. Search in 'questions' collection with cached helper first
    const cachedQuestions = await fetchQuestionsByMicroskill(db, microskillId);
    if (cachedQuestions.length > 0) {
      data = cachedQuestions;
    }

    // 2. If not found, search in 'templates' collection
    if (!data || data.length === 0) {
        const templateQueries = SKILL_COLUMNS.map((skillColumn) =>
          db.collection('templates')
            .find({
              $or: [
                { [skillColumn]: microskillId },
                { [skillColumn]: mIdQuery }
              ]
            })
            .toArray()
        );
        const templateResults = await Promise.all(templateQueries);
        data = templateResults.find((rows) => Array.isArray(rows) && rows.length > 0) || [];
    }

    // 3. Fallback: Search by template_id (useful for direct testing)
    if (!data || data.length === 0) {
        data = await db.collection('questions')
            .find({ template_id: microskillId })
            .toArray();
        
        if (!data || data.length === 0) {
            data = await db.collection('templates')
                .find({ template_id: microskillId })
                .toArray();
        }
    }

    const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
    // Pick a random question from the results to provide variety
    const randomIndex = data && data.length > 0 ? Math.floor(Math.random() * data.length) : 0;
    const selectedQuestion = Array.isArray(data) && data.length > 0
      ? toPublicQuestion(instantiateTemplate(mapDbQuestion(data[randomIndex])))
      : null;

    serverLog('api.practice.get', 'request success', {
      microskillId,
      hasQuestion: Boolean(selectedQuestion),
      questionCount: data ? data.length : 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      source: 'mongodb',
      question: selectedQuestion,
    });
  } catch (error) {
    serverError('api.practice.get', 'question fetch failed', error, { microskillId });
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch questions from MongoDB.' },
      { status: 500 }
    );
  }
}
