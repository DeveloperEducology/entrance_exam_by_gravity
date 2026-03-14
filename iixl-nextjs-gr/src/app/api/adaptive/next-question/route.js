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

  const microskillId = await resolveMicroskillIdByKey(microskillKey);
  if (!microskillId) {
    return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });
  }

  try {
    const { connectMongo } = require('@/lib/db/mongo');
    const mongoose = require('mongoose');
    await connectMongo();
    const db = mongoose.connection.db;

    const [sessionState, skillState, questions] = await Promise.all([
      getSessionState(db, sessionId),
      getStudentSkillState(db, studentId, microskillId),
      fetchQuestionsByMicroskill(db, microskillId),
    ]);

    const currentSmartScore = Number(sessionState?.smart_score ?? 0);
    let targetDifficulty = 'easy';
    
    if (currentSmartScore >= 70) {
      targetDifficulty = 'hard';
    } else if (currentSmartScore >= 40) {
      targetDifficulty = 'medium';
    } else {
      targetDifficulty = 'easy';
    }

    const recoveryContext = await getRecoveryContextFromAttempts(db, { sessionId });

    const result = chooseNextQuestion({
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

    return NextResponse.json({
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
    });
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Failed to select next question.' }, { status: 500 });
  }
}
