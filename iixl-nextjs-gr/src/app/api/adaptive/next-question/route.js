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
    remediation: recoveryContext.inRecovery
      ? {
        misconceptionCode: recoveryContext.misconceptionCode,
        remaining: recoveryContext.remediationRemaining,
      }
      : null,
  });

  if (!result.question || microskillId === 'place-value-auto-intro') {
    if (microskillId === 'place-value-auto-intro') {
      const { generatePlaceValueQuestion } = require('@/lib/practice/generators/placeValueGenerator');
      result = {
        question: generatePlaceValueQuestion(),
        reason: 'auto_generated'
      };
    }
  }

  if (result.question && sessionState?.id) {
    const { instantiateTemplate } = require('@/lib/practice/generators/templateInstantiator');
    result.question = instantiateTemplate(result.question);

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
  if (!microskillId && microskillKey === 'place-value-auto-intro') {
    microskillId = 'place-value-auto-intro';
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
