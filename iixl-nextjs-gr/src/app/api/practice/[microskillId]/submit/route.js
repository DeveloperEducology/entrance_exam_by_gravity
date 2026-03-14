import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import { mapDbQuestion } from '@/lib/practice/questionMapper';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';

const SKILL_COLUMNS = ['microSkillId', 'micro_skill_id', 'microskill_id'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function toPublicQuestion(question) {
  if (!question) return null;
  const fourPics = getFourPicsPuzzle(question);

  return {
    id: question.id,
    microSkillId: question.microSkillId ?? null,
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

function parseMaybeJson(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

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
  const answer = String(question.correctAnswerText ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!answer) return { wordLength: null, letterBank: null };
  return {
    wordLength: answer.length,
    letterBank: shuffleLetters(answer.split('')),
  };
}

function normalizeDifficulty(value) {
  const str = String(value ?? '').trim().toLowerCase();
  if (DIFFICULTIES.includes(str)) return str;
  return 'medium';
}

function getOptionLabel(option, index) {
  if (typeof option === 'object' && option !== null) {
    const label = option.label ?? option.text ?? '';
    if (label) return String(label);
  }
  return `Option ${index + 1}`;
}

function validateAnswer(question, answer) {
  if (!question) return false;

  const type = String(question.type || '').trim().toLowerCase();

  switch (type) {
    case 'mcq':
    case 'imagechoice':
      if (question.isMultiSelect) {
        const selected = Array.isArray(answer) ? [...answer].map(Number).sort() : [];
        const correct = Array.isArray(question.correctAnswerIndices) ? [...question.correctAnswerIndices].map(Number).sort() : [];
        return JSON.stringify(selected) === JSON.stringify(correct);
      }
      return Number(answer) === Number(question.correctAnswerIndex);
    case 'textinput':
      return String(answer ?? '').trim().toLowerCase() === String(question.correctAnswerText ?? '').trim().toLowerCase();
    case 'fillintheblank':
    case 'gridarithmetic':
    case 'table':
    case 'smarttable': {
      const correctAnswers = parseMaybeJson(question.correctAnswerText, {});
      if (!correctAnswers || typeof correctAnswers !== 'object') return false;
      return Object.keys(correctAnswers).every((key) => String(answer?.[key] ?? '').trim().toLowerCase() === String(correctAnswers[key]).trim().toLowerCase());
    }
    case 'draganddrop':
      return (question.dragItems || []).filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '').every((item) => String(answer?.[item.id] ?? '') === String(item.targetGroupId));
    case 'sorting':
      const expectedOrder = parseMaybeJson(question.correctAnswerText, null);
      if (Array.isArray(expectedOrder) && expectedOrder.length > 0) return JSON.stringify((answer || []).map(String)) === JSON.stringify(expectedOrder.map(String));
      return false;
    case 'fourpicsoneword':
      return (Array.isArray(answer) ? answer.join('') : String(answer ?? '')).toUpperCase() === String(question.correctAnswerText ?? '').toUpperCase();
    case 'measure': {
      const expected = parseNumber(question.correctAnswerText);
      const actual = parseNumber(answer);
      if (expected == null || actual == null) return false;
      return Math.abs(actual - expected) < 0.0001;
    }
    default:
      return false;
  }
}

function buildFeedback(question, isCorrect) {
  const feedback = {
    solution: question?.solution || (isCorrect ? '' : "Review the corrected answers shown in the question card above to understand the solution."),
    correctAnswerDisplay: String(question?.correctAnswerText ?? ''),
    correctOptionIndices: []
  };
  if (!question) return feedback;
  const type = String(question.type || '').trim().toLowerCase();
  if (type === 'mcq' || type === 'imagechoice') {
    if (question.isMultiSelect) {
      feedback.correctOptionIndices = (question.correctAnswerIndices || []).map(Number).filter(Number.isFinite);
      feedback.correctAnswerDisplay = feedback.correctOptionIndices.map((idx) => getOptionLabel(question.options?.[idx], idx)).join(', ');
    } else {
      feedback.correctOptionIndices = [Number(question.correctAnswerIndex)].filter(Number.isFinite);
      feedback.correctAnswerDisplay = feedback.correctOptionIndices.length > 0 ? getOptionLabel(question.options?.[feedback.correctOptionIndices[0]], feedback.correctOptionIndices[0]) : '';
    }
  } else if (type === 'fillintheblank' || type === 'gridarithmetic' || type === 'table' || type === 'smarttable') {
    const parsed = parseMaybeJson(question.correctAnswerText, {});
    if (parsed && typeof parsed === 'object') {
      const arithmeticPart = (question.parts || []).find((part) => part?.type === 'arithmeticLayout');
      const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
      const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
      const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];

      if (cells.length > 0) {
        const prefix = String(answerRow?.prefix || '');
        const joined = cells.map((cell, idx) => String(parsed[cell?.id ?? `cell_${idx}`] ?? '')).join('');
        feedback.correctAnswerDisplay = `${prefix}${joined}`.trim();
      } else {
        feedback.correctAnswerDisplay = Object.values(parsed).join(', ');
      }
    }
  }
  return feedback;
}

function chooseAdaptiveQuestion(candidates, currentQuestionId, isCorrect) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const current = candidates.find((q) => String(q.id) === String(currentQuestionId));
  const remaining = candidates.filter((q) => String(q.id) !== String(currentQuestionId));
  if (remaining.length === 0) return null;

  const currentDifficulty = normalizeDifficulty(current?.difficulty);
  const currentIdx = DIFFICULTIES.indexOf(currentDifficulty);
  const targetIdx = Math.min(DIFFICULTIES.length - 1, Math.max(0, currentIdx + (isCorrect ? 1 : -1)));
  const targetDifficulty = DIFFICULTIES[targetIdx];

  const pool = remaining.filter((q) => normalizeDifficulty(q.difficulty) === targetDifficulty);
  const finalPool = pool.length > 0 ? pool : remaining;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

async function fetchQuestionsByMicroskill(db, microskillId) {
  let data = null;
  for (const skillColumn of SKILL_COLUMNS) {
    data = await db.collection('questions').find({ [skillColumn]: microskillId }).toArray();
    if (data && data.length > 0) break;
  }
  return data || [];
}

async function fetchAttemptedIds(db, studentId, microskillId) {
  if (!studentId) return new Set();
  const data = await db.collection('student_question_log').find({ student_id: studentId, multi_skill_id: microskillId }).toArray();
  return new Set((data || []).map((r) => String(r.question_id)));
}

async function insertLog(db, payload) {
  await db.collection('student_question_log').insertOne({
    student_id: payload.studentId,
    question_id: payload.questionId,
    is_correct: payload.isCorrect,
    response_ms: Number(payload.responseMs || 0),
    answer_payload: payload.answer,
    micro_skill_id: payload.microskillId,
    created_at: new Date().toISOString(),
  });
}

export async function POST(req, { params }) {
  const { microskillId: microskillKey } = await params;
  const microskillId = await resolveMicroskillIdByKey(microskillKey);
  if (!microskillId) return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });

  const { serverLog } = require('@/lib/debug/logger');
  serverLog('api.practice.submit', 'request start', { microskillKey });

  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { studentId = null, questionId, answer = null, responseMs = 0, seenQuestionIds = [] } = payload ?? {};
  if (!questionId) {
    serverLog('api.practice.submit', 'validation failed: questionId missing');
    return NextResponse.json({ error: 'questionId is required.' }, { status: 400 });
  }

  try {
    await connectMongo();
    const db = mongoose.connection.db;

    const rawQuestions = await fetchQuestionsByMicroskill(db, microskillId);
    const mappedQuestions = rawQuestions.map(mapDbQuestion);
    const currentQuestion = mappedQuestions.find((q) => String(q.id) === String(questionId));
    if (!currentQuestion) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });

    const isCorrect = validateAnswer(currentQuestion, answer);
    const feedback = buildFeedback(currentQuestion, isCorrect);

    await insertLog(db, { studentId, microskillId, questionId, isCorrect, answer, responseMs });

    const attemptedIds = await fetchAttemptedIds(db, studentId, microskillId);
    const clientSeenIds = new Set(Array.isArray(seenQuestionIds) ? seenQuestionIds.map((id) => String(id)) : []);
    const excludedIds = new Set([...attemptedIds, ...clientSeenIds, String(questionId)]);
    const unseen = mappedQuestions.filter((q) => !excludedIds.has(String(q.id)));

    const nextQuestion = chooseAdaptiveQuestion(unseen.length > 0 ? unseen : mappedQuestions, questionId, isCorrect);

    return NextResponse.json({ source: 'mongodb_fallback', isCorrect, feedback, nextQuestion: toPublicQuestion(nextQuestion) });
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to submit.' }, { status: 500 });
  }
}
