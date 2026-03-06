import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveMicroskillIdByKey } from '@/lib/curriculum/server';
import {
  getAdaptivePolicyVersion,
  getSessionState,
  getStudentSkillState,
  upsertSessionState,
  upsertStudentSkillState,
} from '@/lib/adaptive/server';
import { serverError, serverLog } from '@/lib/debug/logger';

export async function POST(req) {
  const startedAt = Date.now();
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const studentId = String(payload?.studentId ?? '').trim();
  const microskillKey = String(payload?.microSkillId ?? payload?.microskillId ?? '').trim();
  const sessionId = String(payload?.sessionId ?? '').trim() || null;
  serverLog('api.adaptive.session.start', 'request start', {
    studentId: studentId ? 'present' : 'missing',
    microskillKey,
    hasSessionId: Boolean(sessionId),
  });

  if (!studentId || !microskillKey) {
    return NextResponse.json({ error: 'studentId and microSkillId are required.' }, { status: 400 });
  }

  const microskillId = await resolveMicroskillIdByKey(microskillKey);
  if (!microskillId) {
    serverLog('api.adaptive.session.start', 'microskill resolution failed', { microskillKey });
    return NextResponse.json({ error: 'Microskill not found.' }, { status: 404 });
  }

  try {
    const { connectMongo } = require('@/lib/db/mongo');
    const mongoose = require('mongoose');
    await connectMongo();
    const db = mongoose.connection.db;

    const existingState = await getStudentSkillState(db, studentId, microskillId);
    const skillState = existingState ?? await upsertStudentSkillState(db, {
      student_id: studentId,
      micro_skill_id: microskillId,
      mastery_score: 0.2,
      confidence: 0.1,
      difficulty_band: 'easy',
      streak: 0,
      attempts_total: 0,
      correct_total: 0,
      avg_latency_ms: 0,
      status: 'learning',
      last_attempt_at: null,
      next_review_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    let sessionState = null;
    if (sessionId) {
      sessionState = await getSessionState(db, sessionId);
    }
    if (!sessionState) {
      sessionState = await upsertSessionState(db, {
        id: sessionId || crypto.randomUUID(),
        student_id: studentId,
        micro_skill_id: microskillId,
        phase: 'warmup',
        target_correct_streak: 5,
        current_streak: 0,
        asked_count: 0,
        correct_count: 0,
        active_difficulty: skillState?.difficulty_band || 'easy',
        recent_question_ids: [],
        remediation_recent_question_ids: [],
        remediation_remaining: 0,
        active_misconception_code: null,
        updated_at: new Date().toISOString(),
      });
    }

    serverLog('api.adaptive.session.start', 'request success', {
      microskillId,
      sessionId: sessionState?.id ?? sessionId ?? null,
      phase: sessionState?.phase ?? 'warmup',
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      sessionId: sessionState?.id ?? sessionId ?? null,
      phase: sessionState?.phase ?? 'warmup',
      activeDifficulty: sessionState?.active_difficulty ?? skillState?.difficulty_band ?? 'easy',
      policyVersion: getAdaptivePolicyVersion(),
      mastery: {
        score: Number(skillState?.mastery_score ?? 0.2),
        confidence: Number(skillState?.confidence ?? 0.1),
        status: skillState?.status ?? 'learning',
      },
    });
  } catch (err) {
    serverError('api.adaptive.session.start', 'request failed', err, {
      microskillKey,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: err.message ?? 'Failed to start adaptive session.' }, { status: 500 });
  }
}
