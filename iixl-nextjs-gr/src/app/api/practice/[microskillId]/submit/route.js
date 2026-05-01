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
    tokenSelectionV2Config: question.tokenSelectionV2Config ?? question.tokenSelectionConfig ?? null,
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
  };
}

function parseMaybeJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
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

function getMcqCorrectIndex(question) {
  const direct = Number(question?.correctAnswerIndex);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  if (Array.isArray(question?.correctAnswerIndices) && question.correctAnswerIndices.length > 0) {
    const first = Number(question.correctAnswerIndices[0]);
    if (Number.isFinite(first) && first >= 0) return first;
  }

  const options = Array.isArray(question?.options) ? question.options : [];
  const inferred = options.findIndex((option) => option && typeof option === 'object' && Boolean(option.isCorrect ?? option.is_correct));
  return inferred >= 0 ? inferred : null;
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

      const expectedIdx = getMcqCorrectIndex(question);
      if (expectedIdx == null) return false;

      const numericAnswer = Number(answer);
      if (Number.isFinite(numericAnswer) && numericAnswer >= 0) {
        if (numericAnswer === Number(expectedIdx)) {
          return true;
        }
      }

      const options = Array.isArray(question.options) ? question.options : [];
      const normalizedAnswer = normalizeMathSentence(answer);
      if (!normalizedAnswer) return false;

      const selectedIdx = options.findIndex((option) => {
        const selectedLabel = (typeof option === 'object')
          ? (option.label || option.text || option.content || '')
          : option;
        return normalizeMathSentence(selectedLabel) === normalizedAnswer;
      });

      if (selectedIdx >= 0 && selectedIdx === Number(expectedIdx)) {
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

        if (normalizeMathSentence(answer) === normalizeMathSentence(expectedVal)) {
          return true;
        }
      }

      // 2. Structured Object Match
      if (!parsed || typeof parsed !== 'object') {
        if (!answer) return false;
        const answerVal = (typeof answer === 'object') ? Object.values(answer)[0] : answer;
        return normalizeMathSentence(answerVal) === normalizeMathSentence(rawText);
      }
      
      const allCorrect = Object.keys(parsed).every((key) => {
        const studentVal = String(answer?.[key] ?? '').trim().toLowerCase();
        let expected = parsed[key];
        
        // UNWRAP: If expected is a config object, find the core answer
        if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
          expected = expected.value ?? expected.ans ?? expected.correctAnswer ?? expected;
        }
        
        // DEBUG LOG (Server Side)
        console.log(`VALIDATION [${key}]: Student("${studentVal}") vs Expected("${expected}")`);

        if (Array.isArray(expected)) {
          return expected.map((v) => String(v ?? '').trim().toLowerCase()).includes(studentVal);
        }
        return normalizeMathSentence(studentVal) === normalizeMathSentence(expected);
      });

      if (!allCorrect) return false;

      // Anti-guessing check: Ignore complex state and known keys
      return Object.keys(answer || {}).every((key) => {
          if (key.startsWith('scaffold_')) return true;
          if (parsed[key] !== undefined) return true;
          if (typeof answer[key] === 'object' && answer[key] !== null) return true;
          
          const actual = String(answer[key] ?? '').trim().toLowerCase();
          return actual === "" || actual === "0";
      });
    }
    case 'draganddrop':
    case 'draganddropv2':
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
    case 'tokenselection':
    case 'tokenselectionv2': {
      const getTokens = (q) => {
        const parts = Array.isArray(q.parts) ? q.parts : [];
        const sentencePart = parts.find(p => p.type === 'token_sentence');
        if (sentencePart && Array.isArray(sentencePart.tokens)) return sentencePart.tokens;
        if (parts.some(p => p.type === 'token')) return parts.filter(p => p.type === 'token');
        return Array.isArray(q.tokens) ? q.tokens : [];
      };

      const normalizeSelection = (val) => {
        if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
        if (val == null || val === '') return [];
        let parsed = val;
        if (typeof val === 'string') {
          try {
            parsed = JSON.parse(val);
          } catch {
            parsed = val.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
        return [String(parsed).trim()].filter(Boolean);
      };

      const tokens = getTokens(question);
      const idToText = Object.fromEntries(tokens.map(t => [String(t.id), String(t.text || t)]));
      const textToIds = {};
      tokens.forEach(t => {
        const txt = String(t.text || t).trim().toLowerCase();
        if (!textToIds[txt]) textToIds[txt] = [];
        textToIds[txt].push(String(t.id));
      });

      const resolveToIds = (vals) => {
        const items = normalizeSelection(vals);
        const resolved = new Set();
        items.forEach(item => {
          const itemLower = item.toLowerCase();
          if (idToText[item]) {
            resolved.add(item);
          } else if (textToIds[itemLower]) {
            textToIds[itemLower].forEach(id => resolved.add(id));
          } else {
            resolved.add(item);
          }
        });
        return Array.from(resolved).sort();
      };

      const selectedIds = resolveToIds(answer);
      const expectedSource = question.isMultiSelect
        ? (
          Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0
            ? question.correctAnswerIndices
            : (
              Array.isArray(question.correct_answer_indices) && question.correct_answer_indices.length > 0
                ? question.correct_answer_indices
                : question.correctAnswerText
            )
        )
        : (
          Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0
            ? question.correctAnswerIndices[0]
            : (
              Array.isArray(question.correct_answer_indices) && question.correct_answer_indices.length > 0
                ? question.correct_answer_indices[0]
                : (
                  question.correctAnswerIndex !== undefined && question.correctAnswerIndex !== null
                    ? question.correctAnswerIndex
                    : question.correctAnswerText
                )
            )
        );
      const expectedIds = resolveToIds(expectedSource);
      
      if (question.isMultiSelect) {
        return JSON.stringify(selectedIds) === JSON.stringify(expectedIds);
      }
      return selectedIds.length > 0 && expectedIds.includes(selectedIds[0]);
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
      const resolvedIdx = getMcqCorrectIndex(question);
      feedback.correctOptionIndices = Number.isFinite(resolvedIdx) ? [resolvedIdx] : [];
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
      const unwrap = (val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            return val.value ?? val.ans ?? val.correctAnswer ?? val;
        }
        return val;
      };

      const arithmeticPart = (question.parts || []).find((part) => part?.type === 'arithmeticLayout');
      const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
      const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
      const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];

      if (cells.length > 0) {
        const prefix = String(answerRow?.prefix || '');
        const joined = cells.map((cell, idx) => {
          const value = unwrap(parsed[cell?.id ?? `cell_${idx}`]);
          return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
        }).join('');
        feedback.correctAnswerDisplay = `${prefix}${joined}`.trim();
      } else {
        feedback.correctAnswerDisplay = Object.values(parsed)
          .map((value) => {
            const unwrapped = unwrap(value);
            return Array.isArray(unwrapped) ? String(unwrapped[0] ?? '') : String(unwrapped ?? '');
          })
          .join(', ');
      }
    }
    const fallback = question?.validation?.answer ?? question?.correct_answer_text ?? question?.correctAnswerText;
    if (!feedback.correctAnswerDisplay) feedback.correctAnswerDisplay = String(fallback ?? '');
  } else if (type === 'draganddrop') {
    const parsed = parseMaybeJson(question.correctAnswerText ?? question.validation?.answer ?? question.validation?.correctAnswerText, null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      feedback.correctAnswerDisplay = formatDragDropAnswerDisplay(question, parsed) || feedback.correctAnswerDisplay;
    }
  } else if (type === 'draganddropv2') {
    const parsed = parseMaybeJson(question.correctAnswerText ?? question.validation?.answer ?? question.validation?.correctAnswerText, null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      feedback.correctAnswerDisplay = formatDragDropAnswerDisplay(question, parsed) || feedback.correctAnswerDisplay;
    }
  } else if (type === 'tokenselection' || type === 'tokenselectionv2') {
    const parseTokenIds = (val) => {
      if (val == null || val === '') return [];
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === 'number') return [String(val)];
      if (typeof val !== 'string') return [String(val).trim()].filter(Boolean);
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.map((v) => String(v).trim()).filter(Boolean) : [String(parsed).trim()].filter(Boolean);
      } catch {
        return val.split(',').map((s) => String(s).trim()).filter(Boolean);
      }
    };
    const ids = (
      Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0
        ? question.correctAnswerIndices
        : (Array.isArray(question.correct_answer_indices) && question.correct_answer_indices.length > 0
          ? question.correct_answer_indices
          : parseTokenIds(question.correctAnswerIndex ?? question.correctAnswerText ?? question.correct_answer_text))
    );
    const parts = Array.isArray(question.parts) ? question.parts : [];
    const sentencePart = parts.find(p => p.type === 'token_sentence');
    const tokenArr = (sentencePart && Array.isArray(sentencePart.tokens))
      ? sentencePart.tokens
      : (parts.filter(p => p.type === 'token').length > 0 ? parts.filter(p => p.type === 'token') : (Array.isArray(question.tokens) ? question.tokens : []));
    
    const labels = ids.map(id => {
      const tk = tokenArr.find(t => String(t.id || t) === String(id));
      return tk ? (tk.text || tk) : id;
    });
    if (labels.length > 0) feedback.correctAnswerDisplay = labels.join(', ');
  }
  return feedback;
}

function chooseAdaptiveQuestion(candidates, currentQuestionId, isCorrect, allQuestions = []) {
  if (!Array.isArray(candidates)) return null;
  const current = allQuestions.find((q) => String(q.id) === String(currentQuestionId));
  
  // 1. Priority: Remediation
  if (!isCorrect && current) {
     const targetCode = String(current?.adaptiveConfig?.misconceptionCode || '').toLowerCase();
     if (targetCode) {
        const remediationPool = allQuestions.filter(q => {
           const config = q.adaptiveConfig || {};
           const codes = [
              config.misconceptionCode,
              ...(Array.isArray(config.remediationFor) ? config.remediationFor : [config.remediationFor])
           ].filter(Boolean).map(c => String(c).toLowerCase());
           
           return codes.includes(targetCode);
        });
        if (remediationPool.length > 0) {
           return remediationPool[Math.floor(Math.random() * remediationPool.length)];
        }
     }
  }

  // 2. Normal Selection (Unseen first)
  const currentDifficulty = normalizeDifficulty(current?.difficulty);
  const currentIdx = DIFFICULTIES.indexOf(currentDifficulty);
  const targetIdx = Math.min(DIFFICULTIES.length - 1, Math.max(0, currentIdx + (isCorrect ? 1 : -1)));
  const targetDifficulty = DIFFICULTIES[targetIdx];

  const unseenPool = candidates.filter((q) => 
    normalizeDifficulty(q.difficulty) === targetDifficulty && 
    !q.adaptiveConfig?.isRemediation
  );
  if (unseenPool.length > 0) return unseenPool[Math.floor(Math.random() * unseenPool.length)];

  // 3. Fallback: Repeat any normal question (especially if dynamic)
  const repeatPool = allQuestions.filter(q => {
    if (q.adaptiveConfig?.isRemediation) return false;
    if (normalizeDifficulty(q.difficulty) !== targetDifficulty) return false;
    
    const isDynamic = Boolean(q.logic_type || q.adaptiveConfig?.logic_type);
    if (isDynamic) return true; // Always allow repeating dynamic generators
    return String(q.id) !== String(currentQuestionId); // Avoid immediate repeat of static
  });

  if (repeatPool.length > 0) return repeatPool[Math.floor(Math.random() * repeatPool.length)];
  
  // Final fallback: any normal question
  const finalPool = allQuestions.filter(q => !q.adaptiveConfig?.isRemediation);
  return finalPool.length > 0 ? finalPool[Math.floor(Math.random() * finalPool.length)] : null;
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

  const { studentId = null, questionId, answer: rawAnswer = null, responseMs = 0, seenQuestionIds = [], questionSnapshot = null } = payload ?? {};
  
  // Scaffolding Filter: Remove "practice-only" inputs from the official submission payload
  let answer = rawAnswer;
  if (rawAnswer && typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) {
      answer = Object.fromEntries(
          Object.entries(rawAnswer).filter(([key]) => !key.startsWith('scaffold_'))
      );
  }

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

    const nextQuestion = unseen.length > 0
      ? chooseAdaptiveQuestion(unseen, questionId, isCorrect, rawQuestions.map(mapDbQuestion))
      : chooseAdaptiveQuestion([], questionId, isCorrect, rawQuestions.map(mapDbQuestion));

    return NextResponse.json({ source: 'mongodb_hydrated', isCorrect, feedback, nextQuestion: toPublicQuestion(nextQuestion) });
  } catch (err) {
    console.error('SUBMIT ERROR:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to submit.' }, { status: 500 });
  }
}
