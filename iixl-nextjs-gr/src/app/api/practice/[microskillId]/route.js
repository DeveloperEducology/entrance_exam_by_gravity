import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { mapDbQuestion } from '@/lib/practice/questionMapper';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
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
    adaptiveConfig: question.adaptiveConfig ?? null,
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isVertical: Boolean(question.isVertical),
    showSubmitButton: Boolean(question.showSubmitButton),
  };
}

export async function GET(_req, { params }) {
  const startedAt = Date.now();
  const { microskillId: microskillKey } = await params;
  serverLog('api.practice.get', 'request start', { microskillKey });
  const microskillId = await resolveMicroskillIdByKey(microskillKey);

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
    for (const skillColumn of SKILL_COLUMNS) {
      data = await db.collection('questions')
        .find({ [skillColumn]: microskillId })
        .sort({ sort_order: 1, sortOrder: 1, idx: 1, created_at: 1, id: 1 })
        .toArray();
      if (data && data.length > 0) break;
    }

    const firstQuestion = Array.isArray(data) && data.length > 0 ? toPublicQuestion(mapDbQuestion(data[0])) : null;

    serverLog('api.practice.get', 'request success', {
      microskillId,
      hasQuestion: Boolean(firstQuestion),
      questionCount: Array.isArray(data) ? data.length : 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      source: 'mongodb',
      question: firstQuestion,
    });
  } catch (error) {
    serverError('api.practice.get', 'question fetch failed', error, { microskillId });
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch questions from MongoDB.' },
      { status: 500 }
    );
  }
}
