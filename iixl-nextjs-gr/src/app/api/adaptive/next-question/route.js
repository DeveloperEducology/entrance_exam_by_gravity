import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  appendCycleRecentQuestionIds,
  chooseNextQuestion,
  fetchQuestionsByMicroskill,
  getAdaptivePolicyVersion,
  getRecoveryContextFromAttempts,
  getSessionState,
  getStudentSkillState,
  toPublicQuestion,
  upsertSessionState,
} from '@/lib/adaptive/server';

async function selectAndInstantiateNextQuestion({
  db,
  microskillId,
  sessionState,
  studentId,
  sessionId,
}) {
  const [skillState, questions, recoveryContext] = await Promise.all([
    getStudentSkillState(db, studentId, microskillId),
    fetchQuestionsByMicroskill(db, microskillId),
    getRecoveryContextFromAttempts(db, { sessionId }),
  ]);

  const targetDifficulty = sessionState?.active_difficulty || skillState?.difficulty_band || 'easy';

  let result = chooseNextQuestion({
    questions,
    targetDifficulty,
    recentQuestionIds: sessionState?.recent_question_ids || [],
    remediationRecentQuestionIds: sessionState?.remediation_recent_question_ids || [],
    excludeQuestionId: sessionState?.last_question_id || null,
    currentQuestion: questions.find((q) => String(q.id) === String(sessionState?.last_question_id || '')) || null,
    remediation: recoveryContext.inRecovery
      ? {
        misconceptionCode: recoveryContext.misconceptionCode,
        remaining: recoveryContext.remediationRemaining,
      }
      : null,
  });

  const microskillKeyUsed = sessionState?.microSkillId || microskillId;
  const isLcmStep = microskillKeyUsed === 'lcm-step-by-step' || microskillId === 'lcm-step-by-step';
  const isHcfStep = microskillKeyUsed === 'finding-hcf-step-by-step' || microskillId === 'finding-hcf-step-by-step';
  const isAdditionStep = microskillKeyUsed === 'addition-step-by-step' || microskillId === 'addition-step-by-step';
  const isSubtractionStep = microskillKeyUsed === 'subtraction-step-by-step' || microskillId === 'subtraction-step-by-step';
  const isMultiplicationStep = microskillKeyUsed === 'multiplication-step-by-step' || microskillId === 'multiplication-step-by-step';

  if (!result.question || microskillId === 'place-value-auto-intro' || isLcmStep || isHcfStep || isAdditionStep || isSubtractionStep || isMultiplicationStep) {
    if (microskillId === 'place-value-auto-intro') {
      const { generatePlaceValueQuestion } = require('@/lib/practice/generators/placeValueGenerator');
      result = {
        question: generatePlaceValueQuestion(),
        reason: 'auto_generated'
      };
    } else if (isLcmStep) {
      result = {
        question: {
          id: 'lcm_journey_' + Date.now(),
          type: 'stepwise',
          logic_type: 'lcm_journey_v1',
          adaptiveConfig: { variables: {} }
        },
        reason: 'auto_generated'
      };
    } else if (isHcfStep) {
      result = {
        question: {
          id: 'hcf_journey_' + Date.now(),
          type: 'stepwise',
          logic_type: 'hcf_listing_factors_v1',
          adaptiveConfig: { variables: {} }
        },
        reason: 'auto_generated'
      };
    } else if (isAdditionStep || isSubtractionStep || isMultiplicationStep) {
      const typeMap = {
        'addition-step-by-step': 'addition',
        'subtraction-step-by-step': 'subtraction',
        'multiplication-step-by-step': 'multiplication'
      };
      result = {
        question: {
          id: 'arith_journey_' + Date.now(),
          type: 'arithmetic_journey',
          logic_type: 'arithmetic_journey_v1',
          data_source: { 
            type: typeMap[microskillKeyUsed] || typeMap[microskillId] || 'addition',
            range: [1000, 9999],
            carry: true 
          },
          adaptiveConfig: { variables: {} }
        },
        reason: 'auto_generated'
      };
    } else if (microskillId === 'long-division-journey' || sessionState?.microSkillId === 'long-division-journey') {
      result = {
        question: {
          id: 'div_journey_' + Date.now(),
          type: 'stepwise',
          logic_type: 'long_division_journey_v1',
          adaptiveConfig: { variables: {} }
        },
        reason: 'auto_generated'
      };
    }
  }

  if (result.question) {
    const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
    result.question = instantiateTemplate(result.question);
  }

  if (result.question && sessionState?.id) {
    const updatedRecent = appendCycleRecentQuestionIds({
      prevRecentQuestionIds: sessionState?.recent_question_ids || [],
      newQuestionId: result.question.id,
      availableQuestionIds: questions.map((q) => q.id),
    });

    await upsertSessionState(db, {
      ...sessionState,
      id: sessionState.id,
      last_question_id: result.question.id,
      recent_question_ids: updatedRecent,
      remediation_recent_question_ids: result.reason === 'misconception_remediation'
        ? [...((sessionState?.remediation_recent_question_ids || []).map(String)), String(result.question.id)]
        : (sessionState?.remediation_recent_question_ids || []),
      updated_at: new Date().toISOString(),
    });
  }

  return {
    question: toPublicQuestion(result.question),
    selectionMeta: {
      policy: getAdaptivePolicyVersion(),
      reason: result.reason,
      debug: result.debug ?? null,
      difficulty: targetDifficulty,
      phase: recoveryContext.inRecovery ? 'recovery' : (sessionState?.phase ?? 'core'),
      remediationRemaining: recoveryContext.remediationRemaining,
      remediationCode: recoveryContext.misconceptionCode,
      conceptTags: result.question?.adaptiveConfig?.conceptTags || [],
    },
  };
}

export { selectAndInstantiateNextQuestion };

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

  if (!sessionId || !studentId || !microskillKey) {
    return NextResponse.json({ error: 'sessionId, studentId and microSkillId are required.' }, { status: 400 });
  }

  let microskillId = await resolveMicroskillIdByKey(microskillKey);
  if (!microskillId && (microskillKey === 'place-value-auto-intro' || microskillKey === 'lcm-step-by-step' || microskillKey === 'finding-hcf-step-by-step')) {
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

    const sessionState = await getSessionState(db, sessionId);

    const result = await selectAndInstantiateNextQuestion({
      db,
      microskillId,
      sessionState,
      studentId,
      sessionId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to select next question.' }, { status: 500 });
  }
}
