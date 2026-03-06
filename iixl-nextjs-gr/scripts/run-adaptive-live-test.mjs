#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const out = {
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
    studentId: `diag-student-${Date.now()}`,
    microskillId: '',
    attempts: 30,
    accuracyTarget: 0.85,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!v) continue;
    if (k === '--backendUrl') out.backendUrl = v;
    if (k === '--studentId') out.studentId = v;
    if (k === '--microskillId') out.microskillId = v;
    if (k === '--attempts') out.attempts = Math.max(5, Number(v));
    if (k === '--accuracy') out.accuracyTarget = Math.max(0.4, Math.min(0.98, Number(v)));
  }

  return out;
}

function parseJsonMaybe(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function pickCorrectAnswer(question) {
  if (!question) return null;
  const type = String(question.type || '').trim();

  if (type === 'mcq' || type === 'imageChoice') {
    if (question.isMultiSelect && Array.isArray(question.correctAnswerIndices)) {
      return question.correctAnswerIndices.map(Number).filter(Number.isFinite);
    }
    return Number(question.correctAnswerIndex);
  }

  if (type === 'fillInTheBlank' || type === 'gridArithmetic') {
    const parsed = parseJsonMaybe(question.correctAnswerText, {});
    if (parsed && typeof parsed === 'object') return parsed;
    return { answer_1: String(question.correctAnswerText || '') };
  }

  if (type === 'sorting') {
    const expected = parseJsonMaybe(question.correctAnswerText, null);
    if (Array.isArray(expected)) return expected;
  }

  if (type === 'shadeGrid') {
    const n = Number(question.adaptiveConfig?.numerator || question.adaptive_config?.numerator || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }

  if (type === 'measure') {
    return String(question.correctAnswerText || '');
  }

  if (type === 'fourPicsOneWord') {
    return String(question.correctAnswerText || '').toUpperCase();
  }

  if (type === 'textInput') {
    return String(question.correctAnswerText || '');
  }

  return String(question.correctAnswerText || '');
}

function mutateToWrongAnswer(question, correct) {
  const type = String(question?.type || '').trim();

  if (type === 'mcq' || type === 'imageChoice') {
    const optionsLen = Array.isArray(question.options) ? question.options.length : 4;
    if (question.isMultiSelect) {
      return [0];
    }
    if (!Number.isFinite(Number(correct))) return 0;
    const c = Number(correct);
    return (c + 1) % Math.max(2, optionsLen);
  }

  if (type === 'fillInTheBlank' || type === 'gridArithmetic') {
    const obj = typeof correct === 'object' && correct ? { ...correct } : { answer_1: String(correct ?? '') };
    const keys = Object.keys(obj);
    if (keys.length === 0) return { answer_1: '0' };
    const k = keys[0];
    const raw = String(obj[k] ?? '0');
    const num = Number(raw);
    obj[k] = Number.isFinite(num) ? String(num + 1) : `${raw}x`;
    return obj;
  }

  if (type === 'textInput' || type === 'measure' || type === 'fourPicsOneWord') {
    const raw = String(correct ?? '');
    const num = Number(raw);
    return Number.isFinite(num) ? String(num + 1) : `${raw}x`;
  }

  return 'wrong';
}

function shouldBeCorrect(attempt, accuracyTarget) {
  if (attempt <= 3) return true;
  return Math.random() < accuracyTarget;
}

function computeSmartScoreDeltaFallback({
  isCorrect,
  masteryScore,
  confidence,
  difficulty,
  phase,
  responseMs,
  streak,
  missStreak,
}) {
  const safeMastery = Number.isFinite(Number(masteryScore)) ? Math.max(0, Math.min(1, Number(masteryScore))) : 0.5;
  const safeConfidence = Number.isFinite(Number(confidence)) ? Math.max(0, Math.min(1, Number(confidence))) : 0.4;
  const safeResponseMs = Math.max(1, Number(responseMs || 0));
  const difficultyWeight = ({ easy: 1.0, medium: 1.2, hard: 1.45 })[String(difficulty || 'easy').toLowerCase()] || 1.0;
  const phaseWeight = ({ warmup: 0.95, core: 1.0, challenge: 1.2, recovery: 0.85, done: 1.0 })[String(phase || 'core').toLowerCase()] || 1.0;
  const fastGuessPenalty = safeResponseMs < 1200 ? 2.2 : (safeResponseMs < 2200 ? 1.2 : 0);
  const lowConfidencePenalty = safeConfidence < 0.35 ? 0.6 : 0;

  if (isCorrect) {
    const baseGain = 2.6 + (safeMastery * 2.8) + (safeConfidence * 1.6);
    const streakBoost = Math.min(1.35, 1 + (Math.max(0, streak) * 0.06));
    const raw = (baseGain * difficultyWeight * phaseWeight * streakBoost) - fastGuessPenalty - lowConfidencePenalty;
    return Math.round(Math.max(1, raw));
  }

  const baseLoss = 3.8 + (Math.max(0, missStreak) * 0.8);
  const phaseLossWeight = String(phase || 'core').toLowerCase() === 'recovery' ? 0.8 : 1.0;
  const difficultyLossWeight = 0.85 + ((difficultyWeight - 1) * 0.5);
  const raw = (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty;
  return -Math.round(Math.max(2, raw));
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`${message} [${url}]`);
  }

  return data;
}

async function main() {
  const cfg = parseArgs(process.argv);
  if (!cfg.microskillId) {
    throw new Error('Missing --microskillId. Example: --microskillId adaptive-smartscore-test');
  }

  const base = cfg.backendUrl.replace(/\/$/, '');
  const healthUrl = `${base}/api/health`;

  const healthRes = await fetch(healthUrl).catch(() => null);
  if (!healthRes || !healthRes.ok) {
    throw new Error(`Backend unreachable at ${healthUrl}. Start backend first (node backend/server.js).`);
  }

  const start = await postJson(`${base}/api/adaptive/session/start`, {
    studentId: cfg.studentId,
    microSkillId: cfg.microskillId,
  });

  const sessionId = String(start.sessionId || '').trim();
  if (!sessionId) throw new Error('session/start did not return sessionId');

  const logs = [];
  const seen = new Set();
  let smartScore = 0;
  let missStreak = 0;
  let pseudoMastery = 0.2;
  let pseudoConfidence = 0.1;
  let pseudoStreak = 0;

  let next = await postJson(`${base}/api/adaptive/next-question`, {
    sessionId,
    studentId: cfg.studentId,
    microSkillId: cfg.microskillId,
  });

  for (let i = 1; i <= cfg.attempts; i += 1) {
    const q = next?.question;
    if (!q || !q.id) break;

    const correctAnswer = pickCorrectAnswer(q);
    const targetCorrect = shouldBeCorrect(i, cfg.accuracyTarget);
    const answer = targetCorrect ? correctAnswer : mutateToWrongAnswer(q, correctAnswer);
    const responseMs = targetCorrect
      ? Math.round(1700 + Math.random() * 2500)
      : Math.round(2200 + Math.random() * 3800);

    const submit = await postJson(`${base}/api/adaptive/submit-and-next`, {
      sessionId,
      studentId: cfg.studentId,
      microSkillId: cfg.microskillId,
      questionId: String(q.id),
      answer,
      responseMs,
      hintUsed: false,
      attemptsOnQuestion: 1,
    });

    const phase = submit?.sessionUpdate?.phase || submit?.selectionMeta?.phase || 'core';
    const difficulty = q.difficulty || 'easy';

    let delta = Number(submit?.smartScore?.delta);
    if (!Number.isFinite(delta)) {
      pseudoMastery = Math.max(0.01, Math.min(0.99, pseudoMastery + (submit?.isCorrect ? 0.04 : -0.05)));
      pseudoConfidence = Math.max(0.05, Math.min(0.99, pseudoConfidence + 0.02));
      pseudoStreak = submit?.isCorrect ? pseudoStreak + 1 : 0;
      delta = computeSmartScoreDeltaFallback({
        isCorrect: Boolean(submit?.isCorrect),
        masteryScore: pseudoMastery,
        confidence: pseudoConfidence,
        difficulty,
        phase,
        responseMs,
        streak: pseudoStreak,
        missStreak,
      });
    }
    smartScore = Math.max(0, Math.min(100, smartScore + delta));
    missStreak = submit?.isCorrect ? 0 : missStreak + 1;

    const row = {
      attempt: i,
      time: new Date().toISOString(),
      questionId: String(q.id),
      difficulty: q.difficulty || 'unknown',
      complexity: q.complexity ?? null,
      phase,
      reason: submit?.selectionMeta?.reason || next?.selectionMeta?.reason || 'unknown',
      isCorrect: Boolean(submit?.isCorrect),
      responseMs,
      smartScoreDelta: delta,
      smartScore,
      repeated: seen.has(String(q.id)),
      misconceptionCode: submit?.adaptive?.misconceptionCode || null,
      feedbackAnswer: submit?.feedback?.correctAnswerDisplay || null,
    };

    logs.push(row);
    seen.add(String(q.id));

    if (smartScore >= 100) break;
    next = { question: submit?.nextQuestion, selectionMeta: submit?.selectionMeta };
    if (!next.question) break;
  }

  const total = logs.length;
  const correct = logs.filter((x) => x.isCorrect).length;
  const repeats = logs.filter((x) => x.repeated).length;

  const summary = {
    backendUrl: base,
    sessionId,
    studentId: cfg.studentId,
    microskillId: cfg.microskillId,
    attempts: total,
    correct,
    accuracy: total ? Number((correct / total).toFixed(3)) : 0,
    finalSmartScore: smartScore,
    reached100: smartScore >= 100,
    repeatedQuestions: repeats,
    startedAt: logs[0]?.time || null,
    endedAt: logs[logs.length - 1]?.time || null,
  };

  const report = { summary, attempts: logs };

  const outDir = path.resolve(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `adaptive_live_test_${stamp}.json`);
  const mdPath = path.join(outDir, `adaptive_live_test_${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Adaptive Live Test Report',
    '',
    `- Backend: \`${summary.backendUrl}\``,
    `- Session: \`${summary.sessionId}\``,
    `- Student: \`${summary.studentId}\``,
    `- Microskill: \`${summary.microskillId}\``,
    `- Attempts: **${summary.attempts}**`,
    `- Accuracy: **${(summary.accuracy * 100).toFixed(1)}%**`,
    `- Final SmartScore: **${summary.finalSmartScore}**`,
    `- Reached 100: **${summary.reached100 ? 'Yes' : 'No'}**`,
    `- Repeats: **${summary.repeatedQuestions}**`,
    '',
    '## Trace',
    '',
    '| # | QID | Diff | Phase | Correct | Delta | Score | Repeat | Reason |',
    '|---|---|---|---|---|---:|---:|---|---|',
    ...logs.map((r) => `| ${r.attempt} | ${r.questionId} | ${r.difficulty} | ${r.phase} | ${r.isCorrect ? 'Y' : 'N'} | ${r.smartScoreDelta} | ${r.smartScore} | ${r.repeated ? 'Y' : 'N'} | ${r.reason} |`),
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, md);

  fs.copyFileSync(jsonPath, path.join(outDir, 'adaptive_live_test_latest.json'));
  fs.copyFileSync(mdPath, path.join(outDir, 'adaptive_live_test_latest.md'));

  console.log(JSON.stringify({ ok: true, summary, jsonPath, mdPath }, null, 2));
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
