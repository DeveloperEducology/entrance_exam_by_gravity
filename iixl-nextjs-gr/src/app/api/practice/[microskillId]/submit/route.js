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
    correctAnswerText: question.correctAnswerText ?? '',
    solution: question.solution ?? '',
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isGrid: Boolean(question.isGrid),
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

function normalizeMathSentence(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .trim();
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
    const label = option.label ?? option.text ?? option.content ?? '';
    if (label) return String(label);
  } else if (typeof option === 'string') {
    return option;
  }
  return `Option ${index + 1}`;
}

function formatDragDropAnswerDisplay(question, placementMap) {
  if (!placementMap || typeof placementMap !== 'object' || Array.isArray(placementMap)) return '';
  const dragItems = Array.isArray(question?.dragItems) ? question.dragItems : [];
  const dropGroups = Array.isArray(question?.dropGroups) ? question.dropGroups : [];
  const groupLabelById = Object.fromEntries(
    dropGroups.map((group) => [String(group.id), String(group.label || group.id)])
  );

  const grouped = dropGroups.map((group) => {
    const labels = Object.entries(placementMap)
      .filter(([, groupId]) => String(groupId) === String(group.id))
      .map(([itemId]) => {
        const item = dragItems.find((entry) => String(entry.id) === String(itemId));
        return item?.content || itemId;
      });
    return labels.length > 0 ? `${groupLabelById[String(group.id)]}: ${labels.join(', ')}` : null;
  }).filter(Boolean);

  return grouped.join(' | ');
}

function validateAnswer(question, answer) {
  if (!question) return false;

  const type = String(question.type || '').trim().toLowerCase();

  switch (type) {
    case 'mcq':
    case 'imagechoice': {
      const isMulti = Boolean(question.isMultiSelect);
      if (isMulti) {
        const selected = Array.isArray(answer) ? [...answer].map(Number).sort() : [];
        const correct = Array.isArray(question.correctAnswerIndices) ? [...question.correctAnswerIndices].map(Number).sort() : [];
        return JSON.stringify(selected) === JSON.stringify(correct);
      }

      // 1. Primary: Validate by Value (Resilient to shuffle desync)
      const correctText = question.correctAnswerText;
      const parsedCorrect = parseMaybeJson(correctText, null);
      const expectedValue = (parsedCorrect && typeof parsedCorrect === 'object' && !Array.isArray(parsedCorrect))
        ? (parsedCorrect.ans || parsedCorrect.value || parsedCorrect.correctAnswer || parsedCorrect.correct_answer)
        : (parsedCorrect || correctText);

      const options = Array.isArray(question.options) ? question.options : [];
      if (expectedValue != null && options.length > 0) {
        const selectedOption = options[Number(answer)];
        if (selectedOption) {
            const selectedLabel = (typeof selectedOption === 'object')
              ? (selectedOption.label || selectedOption.text || selectedOption.content || '')
              : selectedOption;
              
            // If the text definitely matches, it's correct
            if (normalizeMathSentence(selectedLabel) === normalizeMathSentence(expectedValue)) {
                return true;
            }
            
            // If the text definitely DOES NOT match, it's wrong (even if index was coincidentally 'correct')
            // This prevents "Wrong Answer Getting Right" bugs
            return false; 
        }
      }

      // 2. Secondary: Fallback to Index if value comparison is impossible
      const hasValidIndex = Number.isFinite(Number(question.correctAnswerIndex)) && Number(question.correctAnswerIndex) >= 0;
      if (hasValidIndex && Number(answer) === Number(question.correctAnswerIndex)) {
        return true;
      }

      return false;
    }
    case 'textinput':
      return normalizeMathSentence(answer) === normalizeMathSentence(question.correctAnswerText);
    case 'fillintheblank':
    case 'gridarithmetic':
    case 'table':
    case 'smarttable': {
      const rawText = question.correctAnswerText;
      const parsed = (typeof rawText === 'object' && rawText !== null)
        ? rawText
        : parseMaybeJson(rawText, null);

      // 1. Intelligent Primitive Match: If answer is a string/number, check against logic values
      if (typeof answer === 'string' || typeof answer === 'number') {
        const expectedVal = (parsed && typeof parsed === 'object')
          ? (parsed.ans || parsed.value || parsed.correctAnswer || Object.values(parsed)[0])
          : rawText;

        if (String(answer).trim().toLowerCase() === String(expectedVal ?? '').trim().toLowerCase()) {
          return true;
        }
      }

      // 2. Structured Object Match
      if (!parsed || typeof parsed !== 'object') {
        if (!answer) return false;
        const answerVal = (typeof answer === 'object') ? Object.values(answer)[0] : answer;
        return String(answerVal ?? '').trim().toLowerCase() === String(rawText ?? '').trim().toLowerCase();
      }
      
      return Object.keys(parsed).every((key) => {
        const actual = String(answer?.[key] ?? '').trim().toLowerCase();
        const expected = parsed[key];
        if (Array.isArray(expected)) {
          return expected.map((value) => String(value).trim().toLowerCase()).includes(actual);
        }
        return actual === String(expected).trim().toLowerCase();
      });
    }
    case 'draganddrop':
      {
        const parsed = parseMaybeJson(question.correctAnswerText, null);
        const expectedMap = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed
          : Object.fromEntries(
              (question.dragItems || [])
                .filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '')
                .map((item) => [String(item.id), String(item.targetGroupId)])
            );

        const expectedKeys = Object.keys(expectedMap);
        if (expectedKeys.length === 0) return false;
        return expectedKeys.every((key) => String(answer?.[key] ?? '') === String(expectedMap[key]));
      }
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

function buildFeedback(question, isCorrect, selectedAnswer = null) {
  const type = String(question?.type || '').trim().toLowerCase();
  
  // Extract per-option feedback for MCQ if applicable
  let optionFeedback = null;
  if (!isCorrect && (type === 'mcq' || type === 'imagechoice') && selectedAnswer !== null) {
    const idx = Number(selectedAnswer);
    if (Number.isFinite(idx) && idx >= 0 && Array.isArray(question.options)) {
        const option = question.options[idx];
        if (typeof option === 'object' && option !== null) {
            optionFeedback = option.feedback || option.feedbackText || null;
        }
    }
  }

  const feedback = {
    solution: question?.solution || (isCorrect ? '' : "Review the corrected answers shown in the question card above to understand the solution."),
    optionFeedback,
    correctAnswerDisplay: String(question?.correctAnswerText ?? ''),
    correctOptionIndices: []
  };
  if (!question) return feedback;
  // type is already declared above
  if (type === 'mcq' || type === 'imagechoice') {
    if (question.isMultiSelect) {
      feedback.correctOptionIndices = (question.correctAnswerIndices || []).map(Number).filter(Number.isFinite);
      feedback.correctAnswerDisplay = feedback.correctOptionIndices.map((idx) => getOptionLabel(question.options?.[idx], idx)).join(', ');
    } else {
      feedback.correctOptionIndices = [Number(question.correctAnswerIndex)].filter(Number.isFinite);
      const resLabel = feedback.correctOptionIndices.length > 0 ? getOptionLabel(question.options?.[feedback.correctOptionIndices[0]], feedback.correctOptionIndices[0]) : '';
      // Failsafe: if we get 'Option X' but have a raw math string, prefer the math string
      if ((resLabel.startsWith('Option ') || !resLabel) && question.correctAnswerText && !question.correctAnswerText.startsWith('{')) {
          feedback.correctAnswerDisplay = question.correctAnswerText;
      } else {
          feedback.correctAnswerDisplay = resLabel;
      }
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
        const joined = cells.map((cell, idx) => {
          const value = parsed[cell?.id ?? `cell_${idx}`];
          return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
        }).join('');
        feedback.correctAnswerDisplay = `${prefix}${joined}`.trim();
      } else {
        feedback.correctAnswerDisplay = Object.values(parsed)
          .map((value) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''))
          .join(', ');
      }
    }
    const fallback = question?.validation?.answer ?? question?.correct_answer_text ?? question?.correctAnswerText;
    if (!feedback.correctAnswerDisplay) feedback.correctAnswerDisplay = String(fallback ?? '');
  } else if (type === 'draganddrop') {
    const parsed = parseMaybeJson(question.correctAnswerText, null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      feedback.correctAnswerDisplay = formatDragDropAnswerDisplay(question, parsed) || feedback.correctAnswerDisplay;
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

import { instantiateTemplate } from '@/lib/practice/generators/templateInstantiator';

export async function POST(req, { params }) {
  const { microskillId: microskillKey } = await params;
  const microskillId = await resolveMicroskillIdByKey(microskillKey);
  if (!microskillId) return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });

  const { serverLog } = require('@/lib/debug/logger');
  serverLog('api.practice.submit', 'request start', { microskillKey });

  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { studentId = null, questionId, answer = null, responseMs = 0, seenQuestionIds = [], questionSnapshot = null } = payload ?? {};
  if (!questionId) {
    serverLog('api.practice.submit', 'validation failed: questionId missing');
    return NextResponse.json({ error: 'questionId is required.' }, { status: 400 });
  }

  try {
    await connectMongo();
    const db = mongoose.connection.db;

    const rawQuestions = await fetchQuestionsByMicroskill(db, microskillId);
    
    // 1. Resolve the "Current" Question using snapshot or database lookup
    let currentQuestion = (questionSnapshot && typeof questionSnapshot === 'object' && String(questionSnapshot.id || '') === String(questionId))
      ? questionSnapshot
      : rawQuestions.map(mapDbQuestion).find((q) => String(q.id) === String(questionId));

    if (!currentQuestion) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });

    // 2. CRITICAL: Re-instantiate the question on the server to reveal the "Correct" state
    // We MUST pass the variables from the snapshot to avoid re-randomization desync
    const logic = currentQuestion.logic_type || currentQuestion.adaptiveConfig?.logic_type;
    if (logic) {
        const snapVars = currentQuestion.adaptiveConfig?.variables || null;
        currentQuestion = instantiateTemplate(currentQuestion, snapVars);
    }

    // 3. Perform Validation against the instantiated question
    const isCorrect = validateAnswer(currentQuestion, answer);
    const feedback = buildFeedback(currentQuestion, isCorrect, answer);

    await insertLog(db, { studentId, microskillId, questionId, isCorrect, answer, responseMs });

    const attemptedIds = await fetchAttemptedIds(db, studentId, microskillId);
    const clientSeenIds = new Set(Array.isArray(seenQuestionIds) ? seenQuestionIds.map((id) => String(id)) : []);
    const excludedIds = new Set([...attemptedIds, ...clientSeenIds, String(questionId)]);
    const unseen = rawQuestions.map(mapDbQuestion).filter((q) => !excludedIds.has(String(q.id)));

    const nextQuestion = chooseAdaptiveQuestion(unseen.length > 0 ? unseen : rawQuestions.map(mapDbQuestion), questionId, isCorrect);

    return NextResponse.json({ source: 'mongodb_hydrated', isCorrect, feedback, nextQuestion: toPublicQuestion(nextQuestion) });
  } catch (err) {
    console.error('SUBMIT ERROR:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to submit.' }, { status: 500 });
  }
}
