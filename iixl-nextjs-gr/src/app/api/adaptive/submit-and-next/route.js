import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  appendCycleRecentQuestionIds,
  chooseNextQuestion,
  computeMasteryUpdate,
  computeServerSmartScoreDelta,
  computeSessionUpdate,
  detectMisconceptionCode,
  fetchQuestionsByMicroskill,
  getAdaptivePolicyVersion,
  getRecoveryContextFromAttempts,
  getSessionState,
  getStudentSkillState,
  insertAttemptEvent,
  insertMisconceptionEvent,
  toPublicQuestion,
  upsertSessionState,
  upsertStudentSkillState,
  validateAnswer,
} from '@/lib/adaptive/server';

const FRACTIONS_EQUAL_PARTS_KEYS = new Set([
  'fractions_equal_parts_v1',
  'fractions_image_cuts_v1',
  'fractions_shaded_fraction_v1',
  'fractions_shape_equal_parts_v1',
  'fa45bfa3-0b66-4c9c-a238-2f8bbeb49e2b',
]);

function isInstantiatedFractionsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const key = snapshot.logic_type
    || snapshot.logicType
    || snapshot.adaptiveConfig?.logic_type
    || snapshot.adaptiveConfig?.logicType
    || snapshot.adaptiveConfig?.logic
    || snapshot.microSkillId
    || snapshot.micro_skill_id
    || snapshot.microskill_id;
  if (!FRACTIONS_EQUAL_PARTS_KEYS.has(key)) return false;

  const direct = Number(snapshot.correctAnswerIndex ?? snapshot.correct_answer_index);
  const hasIndex = (Number.isFinite(direct) && direct >= 0)
    || (Array.isArray(snapshot.correctAnswerIndices) && snapshot.correctAnswerIndices.length > 0);
  if (!hasIndex) return false;

  const options = Array.isArray(snapshot.options) ? snapshot.options : [];
  return options.length > 0 && options.every((option) => {
    if (!option || typeof option !== 'object') return true;
    return !String(option.shape ?? '').includes('{') && !String(option.partitions ?? '').includes('{');
  });
}

function normalizeFractionMcqAnswer(question) {
  if (!question || typeof question !== 'object') return question;
  const key = question.logic_type
    || question.logicType
    || question.adaptiveConfig?.logic_type
    || question.adaptiveConfig?.logicType
    || question.adaptiveConfig?.logic
    || question.microSkillId
    || question.micro_skill_id
    || question.microskill_id;
  if (!FRACTIONS_EQUAL_PARTS_KEYS.has(key)) return question;

  const options = Array.isArray(question.options) ? question.options : [];
  const metaEqualIdx = options.findIndex((option) => option && typeof option === 'object' && option.meta?.isEqual === true);
  const idCorrectIdx = options.findIndex((option) => option && typeof option === 'object' && option.id === 'opt_correct');
  const isCorrectIdx = options.findIndex((option) => option && typeof option === 'object' && option.isCorrect === true);
  const resolvedIdx = metaEqualIdx >= 0 ? metaEqualIdx : (idCorrectIdx >= 0 ? idCorrectIdx : isCorrectIdx);
  if (resolvedIdx < 0) return question;

  return {
    ...question,
    correctAnswerIndex: resolvedIdx,
    correctAnswerIndices: [resolvedIdx],
    correct_answer_index: resolvedIdx,
    correct_answer_indices: [resolvedIdx],
    validation: {
      ...(question.validation || {}),
      type: question.validation?.type || 'exact',
      answer: resolvedIdx,
    },
  };
}

function buildBasicFeedback(question, selectedAnswer = null) {
  const getOptionLabel = (option, index) => {
    if (typeof option === 'object' && option !== null) {
      const label = option.label ?? option.text ?? '';
      if (label) return String(label);
    }
    if (!option) return `Option ${index + 1}`;
    
    if (typeof option === 'object' && !Array.isArray(option)) {
        const direct = option.label || option.text || option.content || '';
        if (direct) return String(direct);

        if (Array.isArray(option.parts)) {
            const textPart = option.parts.find(p => p.type === 'text');
            if (textPart && textPart.content) return String(textPart.content);
        }
    }

    if (typeof option === 'string') {
      const trimmed = option.trim();
      if (
        !trimmed.toLowerCase().startsWith('<svg') &&
        !/^https?:\/\//i.test(trimmed) &&
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('data:image/')
      ) {
        return option;
      }
    }
    return `Option ${index + 1}`;
  };

  const getMcqCorrectIndex = (q) => {
    const direct = Number(q?.correctAnswerIndex);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    if (Array.isArray(q?.correctAnswerIndices) && q.correctAnswerIndices.length > 0) {
      const first = Number(q.correctAnswerIndices[0]);
      if (Number.isFinite(first) && first >= 0) return first;
    }
    const options = Array.isArray(q?.options) ? q.options : [];
    const inferred = options.findIndex((option) => option && typeof option === 'object' && Boolean(option.isCorrect ?? option.is_correct));
    return inferred >= 0 ? inferred : null;
  };

  const parseMaybeJson = (val, fallback = null) => {
    if (val == null) return fallback;
    if (typeof val === 'object') return val;
    if (typeof val !== 'string') return fallback;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };

  const type = String(question?.type || '').trim().toLowerCase();
  
  // Extract per-option feedback for MCQ if applicable
  let optionFeedback = null;
  if ((type === 'mcq' || type === 'imagechoice') && selectedAnswer !== null) {
    const idx = Number(selectedAnswer);
    if (Number.isFinite(idx) && idx >= 0 && Array.isArray(question.options)) {
        const option = question.options[idx];
        if (typeof option === 'object' && option !== null) {
            optionFeedback = option.feedback || option.feedbackText || null;
        }
    }
  }

  return {
    solution: question?.solution || "Review the corrected answers shown in the question card above to understand the solution.",
    optionFeedback, // Added specific feedback for the wrong choice
    correctAnswerText: question?.correctAnswerText ?? '',
    correctAnswerDisplay: (() => {
      if (!question) return '';
      if (type === 'mcq' || type === 'imagechoice' || type === 'tokenselection' || type === 'tokenselectionv2' || type === 'tokenSelectionV2') {
        if (question.isMultiSelect || Array.isArray(question.correct_answer_indices) || Array.isArray(question.correctAnswerIndices)) {
          const indices = (Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0)
            ? question.correctAnswerIndices
            : (Array.isArray(question.correct_answer_indices) ? question.correct_answer_indices : []);
          const options = Array.isArray(question.options) ? question.options : [];
          if (indices.length > 0 && options.length > 0) {
            return indices.map((idx) => getOptionLabel(options[idx], idx)).join(', ');
          }
        }

        const idx = getMcqCorrectIndex(question);
        if (Number.isFinite(idx) && idx >= 0 && Array.isArray(question.options)) {
          return getOptionLabel(question.options[idx], idx);
        }
      }

      if (type === 'sorting') {
          try {
              const ids = JSON.parse(String(question.correctAnswerText || '[]'));
              if (Array.isArray(ids)) {
                 return ids.map(id => {
                    const item = (question.items || []).find(it => String(it.id) === String(id));
                    return item?.content || id;
                 }).join(', ');
              }
          } catch { }
      }

      if (type === 'draganddrop' || type === 'draganddropv2') {
          try {
              const parsed = parseMaybeJson(question.correctAnswerText ?? question.validation?.answer ?? question.validation?.correctAnswerText, null);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const dragItems = Array.isArray(question.dragItems || question.drag_items) ? (question.dragItems || question.drag_items) : [];
                  const dropGroups = Array.isArray(question.dropGroups || question.drop_groups) ? (question.dropGroups || question.drop_groups) : [];
                  const labelByGroupId = Object.fromEntries(
                    dropGroups.map((group) => [String(group.id), String(group.label || group.id)])
                  );

                  const summaries = dropGroups.map((group) => {
                    const items = Object.entries(parsed)
                      .filter(([, groupId]) => String(groupId) === String(group.id))
                      .map(([itemId]) => {
                        const item = dragItems.find((entry) => String(entry.id) === String(itemId));
                        return item?.content || itemId;
                      });
                    return items.length > 0 ? `${labelByGroupId[String(group.id)]}: ${items.join(', ')}` : null;
                  }).filter(Boolean);

                  if (summaries.length > 0) return summaries.join(' | ');
              }

              const dragItems = Array.isArray(question.dragItems || question.drag_items) ? (question.dragItems || question.drag_items) : [];
              const dropGroups = Array.isArray(question.dropGroups || question.drop_groups) ? (question.dropGroups || question.drop_groups) : [];
              const itemsByGroupId = {};
              
              dragItems.forEach(item => {
                const targetId = String(item.targetGroupId || item.target_group_id || '');
                if (targetId) {
                  if (!itemsByGroupId[targetId]) itemsByGroupId[targetId] = [];
                  itemsByGroupId[targetId].push(item.content || item.id);
                }
              });

              const summaries = dropGroups.map(group => {
                const items = itemsByGroupId[String(group.id)];
                return items && items.length > 0 ? `${group.label || group.id}: ${items.join(', ')}` : null;
              }).filter(Boolean);

              if (summaries.length > 0) return summaries.join(' | ');

              const fallbackMap = question.validation?.answer ?? question.validation?.correctAnswerText;
              const parsedFallback = parseMaybeJson(fallbackMap, null);
              if (parsedFallback && typeof parsedFallback === 'object' && !Array.isArray(parsedFallback)) {
                const groupedByGroupId = new Map();
                Object.entries(parsedFallback).forEach(([itemId, groupId]) => {
                  const bucket = String(groupId);
                  if (!groupedByGroupId.has(bucket)) groupedByGroupId.set(bucket, []);
                  const item = dragItems.find((entry) => String(entry.id) === String(itemId));
                  groupedByGroupId.get(bucket).push(item?.content || itemId);
                });
                const summariesFromValidation = Array.from(groupedByGroupId.entries()).map(([groupId, items]) => {
                  const label = labelByGroupId[groupId] || groupId;
                  return items.length > 0 ? `${label}: ${items.join(', ')}` : null;
                }).filter(Boolean);
                if (summariesFromValidation.length > 0) return summariesFromValidation.join(' | ');
              }
          } catch (err) {
              console.error("[buildFeedback] dragAndDrop failure:", err);
          }
      }
      if (
        type === 'fillintheblank' ||
        type === 'gridarithmetic' ||
        type === 'table' ||
        type === 'smarttable'
      ) {
        try {
          const rawText = question.correctAnswerText;
          if (rawText === null || rawText === undefined || rawText === '') return '';
          
          let parsed;
          if (typeof rawText === 'object') {
            parsed = rawText;
          } else {
             try {
                parsed = JSON.parse(String(rawText));
             } catch {
                parsed = null;
             }
          }

          if (parsed && typeof parsed === 'object') {
            const parts = Array.isArray(question.parts) ? question.parts : [];
            const arithmeticPart = parts.find((part) => part?.type === 'arithmeticLayout');
            const smartTablePart = parts.find((part) => part?.type === 'smartTable');
            
            // If it is an arithmetic cell Layout, join the cells properly
            if (arithmeticPart) {
              const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
              const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
              const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];
              if (cells.length > 0) {
                const prefix = String(answerRow?.prefix || '');
                const joined = cells.map((cell, idx) => {
                  const value = parsed[cell?.id ?? `cell_${idx}`];
                  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
                }).join('');
                return `${prefix}${joined}`.trim();
              }
            }

            // Enhanced SmartTable Answer Reconstruction (for column addition etc)
            if (smartTablePart && Array.isArray(smartTablePart.cells)) {
                // Find input cells that are likely answer cells (not carries)
                const answerCells = smartTablePart.cells
                    .filter(c => c.type === 'input' && !c.id?.startsWith('c_'))
                    .sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c)); // Visual order: top-to-bottom, left-to-right

                if (answerCells.length > 0) {
                    const joined = answerCells.map(c => {
                        let e = parsed[c.id];
                        if (e && typeof e === 'object' && !Array.isArray(e) && 'value' in e) {
                          e = e.value;
                        }
                        return Array.isArray(e) ? String(e[0] ?? '') : String(e ?? '');
                    }).join('');
                    if (joined) return joined;
                }
            }

            if (Object.keys(parsed).length === 0) return String(rawText);
            return Object.values(parsed)
              .map((value) => {
                if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
                  return String(value.value);
                }
                return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
              })
              .join(', ');
          }
          return String(rawText);
        } catch { }
      }
      const ultimateFallback = question?.validation?.answer ?? question?.correct_answer_text ?? question?.correctAnswerText;
      return String(ultimateFallback ?? '');
    })(),
    correctOptionIndices: (() => {
      if (!question) return [];
      if (question.isMultiSelect && Array.isArray(question.correctAnswerIndices)) {
        return question.correctAnswerIndices.map((i) => Number(i)).filter(Number.isFinite);
      }
      const idx = (() => {
        const direct = Number(question?.correctAnswerIndex);
        if (Number.isFinite(direct) && direct >= 0) return direct;
        if (Array.isArray(question?.correctAnswerIndices) && question.correctAnswerIndices.length > 0) {
          const first = Number(question.correctAnswerIndices[0]);
          if (Number.isFinite(first) && first >= 0) return first;
        }
        const options = Array.isArray(question?.options) ? question.options : [];
        const inferred = options.findIndex((option) => option && typeof option === 'object' && Boolean(option.isCorrect ?? option.is_correct));
        return inferred >= 0 ? inferred : null;
      })();
      return Number.isFinite(idx) ? [idx] : [];
    })(),
    userAnswerDisplay: (() => {
      if (selectedAnswer === null || selectedAnswer === undefined) return '';
      

      if (type === 'mcq' || type === 'imagechoice' || type === 'tokenselection' || type === 'tokenselectionv2' || type === 'tokenSelectionV2') {
        const idx = Number(selectedAnswer);
        if (Number.isFinite(idx) && idx >= 0) {
          return getOptionLabel(question.options?.[idx], idx);
        }
      }
      return String(selectedAnswer);
    })(),
    // Attach arithmetic journey details if applicable so Remediation/Feedback shows them
    ...(type === 'arithmetic_journey' || question.logic_type === 'arithmetic_journey_v1' ? {
        steps: question.steps,
        operands: question.operands,
        operation: question.operation,
        title: question.title,
        footer: question.footer,
        type: 'arithmetic_journey'
    } : {})
  };
}

function extractIdempotencyResponse(correctPayload) {
  if (!correctPayload || typeof correctPayload !== 'object') return null;
  const idempotency = correctPayload.idempotency;
  if (!idempotency || typeof idempotency !== 'object') return null;
  return idempotency.responsePayload && typeof idempotency.responsePayload === 'object'
    ? idempotency.responsePayload
    : null;
}

async function findIdempotentReplay(db, { sessionId, studentId, microskillId, questionId, attemptId }) {
  if (!attemptId) return null;
  const matched = await db.collection('attempt_events').findOne({
    session_id: sessionId,
    student_id: studentId,
    micro_skill_id: microskillId,
    question_id: questionId,
    'correct_payload.idempotency.attemptId': attemptId,
  });
  return extractIdempotencyResponse(matched?.correct_payload);
}

function getPlaceValueMisconception(question, userAnswer) {
  const vars = question.adaptiveConfig?.variables;
  if (!vars) return null;

  const answers = typeof userAnswer === 'object' && userAnswer !== null ? Object.values(userAnswer) : [String(userAnswer || '')];
  const placeName = String(vars.place_name || '').trim().toLowerCase();

  for (const val of answers) {
    if (String(val).trim().toLowerCase() === placeName && placeName !== '') {
      return 'place_name_error';
    }
  }
  return null;
}

export async function POST(req) {

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sessionId = String(payload?.sessionId ?? '').trim();
  const studentId = String(payload?.studentId ?? '').trim();
  const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();
  const questionId = String(payload?.questionId ?? '').trim();
  const answer = payload?.answer ?? null;
  const attemptId = String(payload?.attemptId ?? '').trim();
  const responseMs = Number(payload?.responseMs ?? 0);
  const hintUsed = Boolean(payload?.hintUsed ?? false);
  const attemptsOnQuestion = Number(payload?.attemptsOnQuestion ?? 1);

  const { serverLog } = require('@/lib/debug/logger');
  serverLog('api.adaptive.submit-and-next', 'request start', {
    sessionId: sessionId ? 'present' : 'missing',
    studentId: studentId ? 'present' : 'missing',
    microskillKey: microskillKey ? 'present' : 'missing',
    questionId: questionId ? 'present' : 'missing',
  });

  if (!sessionId || !studentId || !microskillKey || !questionId) {
    serverLog('api.adaptive.submit-and-next', 'validation failed', {
      sessionId: !!sessionId,
      studentId: !!studentId,
      microskillKey: !!microskillKey,
      questionId: !!questionId
    });
    return NextResponse.json(
      { error: 'sessionId, studentId, microSkillId and questionId are required.' },
      { status: 400 }
    );
  }

  let microskillId = await resolveMicroskillIdByKey(microskillKey);
  const arithmeticJourneyMicroskills = ['addition-step-by-step', 'subtraction-step-by-step', 'multiplication-step-by-step', 'lcm-step-by-step', 'long-division-journey'];
  if (!microskillId && (microskillKey === 'place-value-auto-intro' || arithmeticJourneyMicroskills.includes(microskillKey))) {
    microskillId = microskillKey;
  }

  if (!microskillId) {
    return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });
  }

  try {
    const { connectMongo } = require('@/lib/db/mongo');
    const mongoose = require('mongoose');
    await connectMongo();
    const db = mongoose.connection.db;

    const replayPayload = await findIdempotentReplay(db, {
      sessionId,
      studentId,
      microskillId,
      questionId,
      attemptId,
    });
    if (replayPayload) {
      return NextResponse.json({
        ...replayPayload,
        source: 'idempotent_replay',
      });
    }

    const [questions, prevSession, prevSkill, priorRecoveryContext] = await Promise.all([
      fetchQuestionsByMicroskill(db, microskillId),
      getSessionState(db, sessionId),
      getStudentSkillState(db, studentId, microskillId),
      getRecoveryContextFromAttempts(db, { sessionId }),
    ]);

    let currentQuestion = null;
    let alreadyHydrated = false;
    if (questionId && (String(questionId).startsWith('generated_pv_') || String(questionId).startsWith('inst_') || String(questionId).startsWith('arith_journey_'))) {
      
      // Default fake payload for validation
      currentQuestion = {
        id: questionId,
        type: 'fillInTheBlank',
        adaptiveConfig: payload.adaptiveConfig || {},
        correctAnswerText: payload.adaptiveConfig?.correctAnswerText || payload.correctAnswerText || null,
      };

      // NEW: Securely reconstruct full object (including Hidden Solutions) from DB templates!
      const instParts = String(questionId).split('_');
      if (instParts.length >= 4 && instParts[0] === 'inst') {
         if (isInstantiatedFractionsSnapshot(payload.questionSnapshot)) {
            currentQuestion = {
              ...payload.questionSnapshot,
              id: questionId
            };
            alreadyHydrated = true;
         } else {
         // The inst ID format is inst_{templateId}_{timestamp}_{random}
         const templateId = instParts.slice(1, -2).join('_');
         const dbTemplate = questions.find(q => String(q.id) === templateId || String(q.template_id) === templateId || String(q.adaptiveConfig?.template_id) === templateId);
         
         if (dbTemplate && payload.adaptiveConfig?.variables) {
            const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
            const reconstructed = instantiateTemplate(dbTemplate, payload.adaptiveConfig.variables);
            reconstructed.id = questionId; // ensure ID matches the submitted ID perfectly
            currentQuestion = reconstructed;
            alreadyHydrated = true;
         } else if (payload.questionSnapshot) {
            // Fallback: If DB template for this specific instance isn't in the current microskill's pool, 
            // use the snapshot provided by the client (which has the tokens)
            currentQuestion = {
              ...payload.questionSnapshot,
              id: questionId // force trust the ID
            };
         }
         }
      } else if (payload.questionSnapshot) {
         // Fallback for generated_pv_ or other dynamic types
         currentQuestion = {
           ...payload.questionSnapshot,
           id: questionId
         };
      }
      
    } else {
      const isMongoId = mongoose.Types.ObjectId.isValid(questionId);
      const query = isMongoId ? { _id: new mongoose.Types.ObjectId(questionId) } : { id: questionId };
      const raw = await db.collection('questions').findOne(query);
      const { mapDbQuestion } = require('@/lib/practice/questionMapper');
      currentQuestion = raw ? mapDbQuestion(raw) : null;
    }
    
    // HYDRATE currentQuestion if it's a template!
    if (!alreadyHydrated && currentQuestion && (currentQuestion.logic_type || currentQuestion.adaptiveConfig?.logic_type)) {
       const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
       currentQuestion = instantiateTemplate(currentQuestion, payload.adaptiveConfig?.variables || null);
    }
    if (!currentQuestion) {
      return NextResponse.json({ error: 'Question not found for this microskill.' }, { status: 404 });
    }
    currentQuestion = normalizeFractionMcqAnswer(currentQuestion);

    const isCorrect = validateAnswer(currentQuestion, answer);
    const detectedMisconceptionCode = detectMisconceptionCode({
      question: currentQuestion,
      answer,
      isCorrect,
    });
    const misconceptionCodeForWrongAnswer = !isCorrect
      ? (detectedMisconceptionCode || `incorrect_${String(currentQuestion?.type || 'unknown').toLowerCase()}`)
      : null;
    const feedback = buildBasicFeedback(currentQuestion, answer);
    const mastery = computeMasteryUpdate({
      prevState: prevSkill,
      isCorrect,
      responseMs,
      hintUsed,
      attemptsOnQuestion,
    });

    const smartScoreBreakdown = computeServerSmartScoreDelta({
      isCorrect,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      difficulty: currentQuestion?.difficulty || mastery.difficultyBand,
      phase: priorRecoveryContext?.inRecovery ? 'recovery' : (prevSession?.phase || 'warmup'),
      responseMs,
      streak: mastery.streak,
      missStreak: isCorrect ? 0 : Number(prevSession?.miss_streak ?? 0) + 1,
    });
    const newSessionSmartScore = Math.max(0, Math.min(100, (Number(prevSession?.smart_score ?? 0) + smartScoreBreakdown.delta)));

    const sessionUpdate = computeSessionUpdate({
      prevSession: { ...prevSession, smart_score: newSessionSmartScore },
      isCorrect,
      currentQuestionId: questionId,
      activeDifficulty: mastery.difficultyBand,
      misconceptionCode: misconceptionCodeForWrongAnswer,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      avgLatencyMs: mastery.avgLatencyMs,
    });

    const effectiveRemediationCode = !isCorrect
      ? misconceptionCodeForWrongAnswer
      : (priorRecoveryContext?.misconceptionCode ?? null);
    const effectiveRemediationRemaining = !isCorrect
      ? (effectiveRemediationCode ? 2 : 0)
      : Math.max(0, Number(priorRecoveryContext?.remediationRemaining ?? 0) - 1);
    const inRecoveryNow = effectiveRemediationRemaining > 0;
    const effectivePhase = inRecoveryNow ? 'recovery' : sessionUpdate.phase;
    const nextTargetDifficulty = sessionUpdate.activeDifficulty || mastery.difficultyBand || 'easy';

    // Determine the base ID for session tracking (e.g. map 'inst_tpl1_...' to 'tpl1')
    const baseTrackingId = (() => {
       const parts = String(questionId).split('_');
       if (parts.length >= 4 && parts[0] === 'inst') {
          return parts.slice(1, -2).join('_');
       }
       return questionId;
    })();

    const cycleRecentQuestionIds = appendCycleRecentQuestionIds({
      prevRecentQuestionIds: prevSession?.recent_question_ids || [],
      newQuestionId: baseTrackingId,
      availableQuestionIds: questions.map((q) => q.id),
    });


    const [skillRow, sessionRow, _attempt] = await Promise.all([
      upsertStudentSkillState(db, {
        student_id: studentId,
        micro_skill_id: microskillId,
        mastery_score: mastery.masteryScore,
        confidence: mastery.confidence,
        difficulty_band: mastery.difficultyBand,
        streak: mastery.streak,
        attempts_total: mastery.attemptsTotal,
        correct_total: mastery.correctTotal,
        avg_latency_ms: mastery.avgLatencyMs,
        status: mastery.status,
        last_attempt_at: new Date().toISOString(),
        next_review_at: mastery.nextReviewAt,
        updated_at: new Date().toISOString(),
      }),
      upsertSessionState(db, {
        id: sessionId,
        student_id: studentId,
        micro_skill_id: microskillId,
        phase: effectivePhase,
        target_correct_streak: sessionUpdate.targetCorrectStreak,
        current_streak: sessionUpdate.currentStreak,
        asked_count: sessionUpdate.askedCount,
        correct_count: sessionUpdate.correctCount,
        active_difficulty: sessionUpdate.activeDifficulty,
        smart_score: newSessionSmartScore,
        last_question_id: questionId,
        recent_question_ids: cycleRecentQuestionIds,
        remediation_recent_question_ids: inRecoveryNow
          ? [...((prevSession?.remediation_recent_question_ids || []).map(String)), String(questionId)]
          : (prevSession?.remediation_recent_question_ids || []),
        active_misconception_code: inRecoveryNow ? effectiveRemediationCode : null,
        remediation_remaining: effectiveRemediationRemaining,
        updated_at: new Date().toISOString(),
        completed_at: effectivePhase === 'done' ? new Date().toISOString() : null,
      }),
      insertAttemptEvent(db, {
        session_id: sessionId,
        student_id: studentId,
        micro_skill_id: microskillId,
        question_id: questionId,
        is_correct: isCorrect,
        response_ms: Math.max(0, responseMs),
        attempts_on_question: Math.max(1, attemptsOnQuestion),
        hint_used: hintUsed,
        answer_payload: answer,
        correct_payload: {
          correctAnswerText: currentQuestion.correctAnswerText,
          masteryUpdate: {
            prevScore: mastery.prevScore,
            newScore: mastery.masteryScore,
            confidence: mastery.confidence,
            difficultyBand: mastery.difficultyBand,
          },
          sessionUpdate: {
            phase: effectivePhase,
            currentStreak: sessionUpdate.currentStreak,
            askedCount: sessionUpdate.askedCount,
            correctCount: sessionUpdate.correctCount,
          },
          idempotency: {
            attemptId: attemptId || null,
          },
        },
        selected_difficulty: currentQuestion.difficulty ?? 'easy',
        concept_tags: currentQuestion.adaptiveConfig?.conceptTags || [],
        misconception_code: misconceptionCodeForWrongAnswer ?? null,
      })
    ]);

    const misconception = !isCorrect ? getPlaceValueMisconception(currentQuestion, answer) : null;
    const triggerScaffold = misconception === 'place_name_error' && currentQuestion.adaptiveConfig?.scaffold;

    let nextResult = chooseNextQuestion({
      questions,
      targetDifficulty: nextTargetDifficulty,
      recentQuestionIds: sessionRow?.recent_question_ids || sessionUpdate.recentQuestionIds,
      remediationRecentQuestionIds: sessionRow?.remediation_recent_question_ids || [],
      excludeQuestionId: questionId,
      currentQuestion,
      remediation: inRecoveryNow
        ? {
          misconceptionCode: effectiveRemediationCode,
          remaining: effectiveRemediationRemaining,
        }
        : null,
    });

    if (triggerScaffold) {
      nextResult.reason = 'intervention_scaffold';
    }

    const mIdStr = String(microskillId || '');
    const isLcmStep = mIdStr.includes('lcm-step-by-step') || microskillKey.includes('lcm-step-by-step');
    const isDivStep = mIdStr.includes('long-division-journey') || microskillKey.includes('long-division-journey');
    const isArithStep = ['addition-step-by-step', 'subtraction-step-by-step', 'multiplication-step-by-step'].some(k => mIdStr.includes(k) || microskillKey.includes(k));

    if (!nextResult.question || microskillId === 'place-value-auto-intro' || isLcmStep || isDivStep || isArithStep) {
      if (microskillId === 'place-value-auto-intro' || microskillKey === 'place-value-auto-intro') {
        const { generatePlaceValueQuestion } = require('@/lib/practice/generators/math/arithmetic/placeValueGenerator');
        nextResult = {
          question: generatePlaceValueQuestion(),
          reason: triggerScaffold ? 'intervention_scaffold' : 'auto_generated'
        };
      } else if (isLcmStep) {
        nextResult = {
          question: {
            id: 'arith_journey_lcm_' + Date.now(),
            type: 'stepwise',
            logic_type: 'lcm_journey_v1',
            adaptiveConfig: { variables: {} }
          },
          reason: 'auto_generated'
        };
      } else if (isDivStep) {
        nextResult = {
          question: {
            id: 'arith_journey_div_' + Date.now(),
            type: 'stepwise',
            logic_type: 'long_division_journey_v1',
            adaptiveConfig: { variables: {} }
          },
          reason: 'auto_generated'
        };
      } else if (isArithStep) {
        const opType = microskillKey.includes('addition') ? 'addition' : (microskillKey.includes('subtraction') ? 'subtraction' : 'multiplication');
        nextResult = {
          question: {
            id: 'arith_journey_' + opType + '_' + Date.now(),
            type: 'arithmetic_journey',
            logic_type: 'arithmetic_journey_v1',
            adaptiveConfig: { variables: { type: opType } }
          },
          reason: 'auto_generated'
        };
      }
    }

    if (nextResult.question) {
      const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
      nextResult.question = instantiateTemplate(nextResult.question, nextResult.question.adaptiveConfig?.variables);
    }

    const responsePayload = {
      result: {
        isCorrect,
        feedback: triggerScaffold ? {
          ...feedback,
          intervention: 'SCAFFOLD',
          message: 'You identified the place correctly! Now let\'s find its value.',
          scaffold: {
            ...currentQuestion.adaptiveConfig.scaffold,
            steps: (currentQuestion.adaptiveConfig.scaffold.steps || []).map(step => {
              const { hydrateTemplate } = require('@/components/practice/contentUtils');
              return hydrateTemplate(step, currentQuestion.adaptiveConfig.variables);
            })
          }
        } : feedback,
      },
      masteryUpdate: {
        prevScore: mastery.prevScore,
        newScore: mastery.masteryScore,
        confidence: mastery.confidence,
        difficultyBand: mastery.difficultyBand,
        streak: mastery.streak,
      },
      sessionUpdate: {
        phase: effectivePhase,
        currentStreak: sessionUpdate.currentStreak,
        askedCount: sessionUpdate.askedCount,
        correctCount: sessionUpdate.correctCount,
        accuracy: sessionUpdate.accuracy,
      },
      smartScore: smartScoreBreakdown,
      nextQuestion: toPublicQuestion(nextResult.question),
      selectionMeta: {
        policy: getAdaptivePolicyVersion(),
        reason: nextResult.reason,
        debug: nextResult.debug ?? null,
        phase: effectivePhase,
        difficulty: nextTargetDifficulty,
        previousDifficulty: prevSession?.active_difficulty || prevSkill?.difficulty_band || 'easy',
        selectedDifficulty: nextResult.question?.difficulty || nextTargetDifficulty,
        remediationCode: effectiveRemediationCode,
        remediationRemaining: effectiveRemediationRemaining,
      },
    };

    if (attemptId) {
      await db.collection('attempt_events').updateOne(
        {
          session_id: sessionId,
          student_id: studentId,
          micro_skill_id: microskillId,
          question_id: questionId,
          'correct_payload.idempotency.attemptId': attemptId,
        },
        {
          $set: {
            'correct_payload.idempotency.responsePayload': responsePayload,
          },
        }
      );
    }

    if (!isCorrect && misconceptionCodeForWrongAnswer) {
      try {
        await insertMisconceptionEvent(db, {
          student_id: studentId,
          micro_skill_id: microskillId,
          session_id: sessionId,
          question_id: questionId,
          misconception_code: misconceptionCodeForWrongAnswer,
          answer_payload: answer,
          created_at: new Date().toISOString(),
        });
      } catch (misconceptionError) {
        // Keep question flow alive, but surface actual persistence issue for debugging.
        console.error('Failed to insert misconception event:', misconceptionError);
      }
    }

    return NextResponse.json(responsePayload);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to submit and fetch next question.' }, { status: 500 });
  }
}
