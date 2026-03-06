#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REMEDIATION_SEQUENCE_LENGTH = 2;

function normalizeDifficulty(value) {
  const v = String(value || '').trim().toLowerCase();
  return DIFFICULTIES.includes(v) ? v : 'easy';
}

function shiftDifficulty(current, direction) {
  const idx = DIFFICULTIES.indexOf(normalizeDifficulty(current));
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, idx + direction))];
}

function getQuestionRemediationCodes(question) {
  const config = question?.adaptive_config || question?.adaptiveConfig || {};
  const fromSingle = String(config.misconceptionCode || '').trim();
  const fromFor = Array.isArray(config.remediationFor)
    ? config.remediationFor.map((x) => String(x || '').trim())
    : [];
  return [fromSingle, ...fromFor].filter(Boolean);
}

function chooseNextQuestion({ questions, targetDifficulty, recentQuestionIds = [], remediationRecentQuestionIds = [], excludeQuestionId = null, remediation = null }) {
  const recentSet = new Set((recentQuestionIds || []).map(String));
  const remediationRecentSet = new Set((remediationRecentQuestionIds || []).map(String));
  if (excludeQuestionId) recentSet.add(String(excludeQuestionId));

  const candidates = questions.filter((q) => !recentSet.has(String(q.id)));
  const pool = candidates.length > 0
    ? candidates
    : questions.filter((q) => String(q.id) !== String(excludeQuestionId || ''));

  if (pool.length === 0) return { question: null, reason: 'no_questions' };

  const remediationCode = String(remediation?.misconceptionCode || '').trim();
  const remediationEnabled = Boolean(remediationCode) && Number(remediation?.remaining || 0) > 0;
  if (remediationEnabled) {
    const remediationPool = pool.filter((q) => {
      const codes = getQuestionRemediationCodes(q);
      const hasMatchingCode = codes.some((c) => c.toLowerCase() === remediationCode.toLowerCase());
      const notRecent = !remediationRecentSet.has(String(q.id));
      return hasMatchingCode && notRecent;
    });

    if (remediationPool.length > 0) {
      const byDifficulty = remediationPool.filter((q) => normalizeDifficulty(q.difficulty) === normalizeDifficulty(targetDifficulty));
      const preferred = byDifficulty.length > 0 ? byDifficulty : remediationPool;
      return { question: preferred[Math.floor(Math.random() * preferred.length)], reason: 'misconception_remediation' };
    }
  }

  const normalizedTarget = normalizeDifficulty(targetDifficulty);
  const same = pool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
  if (same.length > 0) return { question: same[Math.floor(Math.random() * same.length)], reason: 'target_band_reinforcement' };

  const targetIdx = DIFFICULTIES.indexOf(normalizedTarget);
  const nearbyPool = pool.filter((q) => {
    const qIdx = DIFFICULTIES.indexOf(normalizeDifficulty(q.difficulty));
    return Math.abs(qIdx - targetIdx) === 1;
  });
  if (nearbyPool.length > 0) return { question: nearbyPool[Math.floor(Math.random() * nearbyPool.length)], reason: 'adjacent_band_fallback' };

  return { question: pool[Math.floor(Math.random() * pool.length)], reason: 'any_available' };
}

function appendCycleRecentQuestionIds({ prevRecentQuestionIds = [], newQuestionId = null, availableQuestionIds = [] }) {
  const available = Array.from(new Set((availableQuestionIds || []).map(String)));
  const availableSet = new Set(available);
  if (available.length === 0) return [];

  const seen = [];
  const seenSet = new Set();
  for (const id of (prevRecentQuestionIds || []).map(String)) {
    if (!availableSet.has(id)) continue;
    if (seenSet.has(id)) continue;
    seenSet.add(id);
    seen.push(id);
  }

  if (newQuestionId && availableSet.has(String(newQuestionId)) && !seenSet.has(String(newQuestionId))) {
    seenSet.add(String(newQuestionId));
    seen.push(String(newQuestionId));
  }

  if (seenSet.size >= availableSet.size) return [];
  return seen;
}

function computeMasteryUpdate({ prevState, isCorrect, responseMs, hintUsed = false, attemptsOnQuestion = 1 }) {
  const prevScore = Number(prevState.mastery_score ?? 0.2);
  const prevConfidence = Number(prevState.confidence ?? 0.1);
  const prevStreak = Number(prevState.streak ?? 0);
  const prevAttemptsTotal = Number(prevState.attempts_total ?? 0);
  const prevCorrectTotal = Number(prevState.correct_total ?? 0);
  const prevAvgLatency = Number(prevState.avg_latency_ms ?? 0);
  const prevDifficulty = normalizeDifficulty(prevState.difficulty_band ?? 'easy');

  let delta = isCorrect ? 0.05 : -0.06;
  if (Number(responseMs) > 0 && Number(responseMs) <= 6000) delta += 0.01;
  if (Number(responseMs) > 12000) delta -= 0.01;
  if (hintUsed) delta -= 0.02;
  if (Number(attemptsOnQuestion) > 1) delta -= 0.01;

  const masteryScore = Math.max(0.01, Math.min(0.99, prevScore + delta));
  const confidence = Math.max(0.05, Math.min(0.99, prevConfidence + 0.03));
  const streak = isCorrect ? prevStreak + 1 : 0;
  const attemptsTotal = prevAttemptsTotal + 1;
  const correctTotal = prevCorrectTotal + (isCorrect ? 1 : 0);
  const avgLatencyMs = prevAttemptsTotal > 0
    ? Math.round(((prevAvgLatency * prevAttemptsTotal) + Number(responseMs || 0)) / attemptsTotal)
    : Math.round(Number(responseMs || 0));

  let difficultyBand = prevDifficulty;
  if (streak >= 5 && masteryScore > 0.75) difficultyBand = shiftDifficulty(prevDifficulty, 1);
  if (!isCorrect && masteryScore < 0.35) difficultyBand = shiftDifficulty(prevDifficulty, -1);

  return {
    masteryScore,
    confidence,
    streak,
    attemptsTotal,
    correctTotal,
    avgLatencyMs,
    difficultyBand,
  };
}

function computeSessionUpdate({ prevSession, isCorrect, currentQuestionId, activeDifficulty, misconceptionCode = null, masteryScore = null, confidence = null, avgLatencyMs = null }) {
  const askedCount = Number(prevSession.asked_count ?? 0) + 1;
  const correctCount = Number(prevSession.correct_count ?? 0) + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? Number(prevSession.current_streak ?? 0) + 1 : 0;
  const targetCorrectStreak = Number(prevSession.target_correct_streak ?? 5);
  const priorPhase = String(prevSession.phase ?? 'warmup');
  const accuracy = askedCount > 0 ? correctCount / askedCount : 0;

  let phase = priorPhase;
  if (priorPhase === 'warmup' && askedCount >= 3) phase = 'core';
  if (priorPhase === 'core' && currentStreak >= 3 && accuracy >= 0.6) phase = 'challenge';
  if (priorPhase === 'challenge' && !isCorrect) phase = 'recovery';
  if (!isCorrect && misconceptionCode) phase = 'recovery';
  if (priorPhase === 'recovery' && currentStreak >= 2) phase = 'core';

  const stableForDone =
    currentStreak >= targetCorrectStreak &&
    accuracy >= 0.8 &&
    Number(masteryScore ?? 0) >= 0.85 &&
    Number(confidence ?? 0) >= 0.65 &&
    (Number(avgLatencyMs ?? 0) <= 9000 || Number(avgLatencyMs ?? 0) === 0);

  if (stableForDone && activeDifficulty === 'hard') phase = 'done';

  return {
    phase,
    askedCount,
    correctCount,
    currentStreak,
    targetCorrectStreak,
    activeDifficulty,
    recentQuestionIds: [...((prevSession.recent_question_ids || []).map(String)), String(currentQuestionId)],
    accuracy,
  };
}

function computeServerSmartScoreDelta({ isCorrect, masteryScore, confidence, difficulty, phase, responseMs, streak, missStreak }) {
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
    return { delta: Math.round(Math.max(1, raw)) };
  }

  const baseLoss = 3.8 + (Math.max(0, missStreak) * 0.8);
  const phaseLossWeight = String(phase || 'core').toLowerCase() === 'recovery' ? 0.8 : 1.0;
  const difficultyLossWeight = 0.85 + ((difficultyWeight - 1) * 0.5);
  const raw = (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty;
  return { delta: -Math.round(Math.max(2, raw)) };
}

function simulatedAttemptOutcome({ questionDifficulty, phase, ability }) {
  const baseByDifficulty = {
    easy: 0.94,
    medium: 0.82,
    hard: 0.68,
  };
  const phaseAdj = {
    warmup: -0.02,
    core: 0,
    challenge: -0.05,
    recovery: 0.06,
    done: 0,
  };
  const p = Math.max(0.05, Math.min(0.99, (baseByDifficulty[questionDifficulty] || 0.8) + (phaseAdj[phase] || 0) + ability));
  const isCorrect = Math.random() < p;
  const responseMs = isCorrect
    ? Math.round(1700 + Math.random() * 3300)
    : Math.round(2200 + Math.random() * 5200);
  return { isCorrect, responseMs };
}

function runDiagnostic({ bank, maxAttempts = 36, profile = 'improving' }) {
  const ability = profile === 'strong' ? 0.05 : (profile === 'struggling' ? -0.08 : 0);

  let skill = {
    mastery_score: 0.2,
    confidence: 0.1,
    streak: 0,
    attempts_total: 0,
    correct_total: 0,
    avg_latency_ms: 0,
    difficulty_band: 'easy',
  };
  let session = {
    phase: 'warmup',
    asked_count: 0,
    correct_count: 0,
    current_streak: 0,
    target_correct_streak: 5,
    active_difficulty: 'easy',
    recent_question_ids: [],
  };

  let remediation = {
    misconceptionCode: null,
    remaining: 0,
    recentQuestionIds: [],
  };

  let smartScore = 0;
  let missStreak = 0;
  const seen = new Set();
  const logs = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const selected = chooseNextQuestion({
      questions: bank,
      targetDifficulty: skill.difficulty_band,
      recentQuestionIds: session.recent_question_ids,
      remediationRecentQuestionIds: remediation.recentQuestionIds,
      remediation,
    });

    if (!selected.question) break;

    const q = selected.question;
    const difficulty = normalizeDifficulty(q.difficulty);
    const { isCorrect, responseMs } = simulatedAttemptOutcome({
      questionDifficulty: difficulty,
      phase: session.phase,
      ability,
    });

    const misconceptionCode = isCorrect ? null : (q.adaptive_config?.misconceptionCode || `incorrect_${q.type}`);

    const mastery = computeMasteryUpdate({
      prevState: skill,
      isCorrect,
      responseMs,
      hintUsed: false,
      attemptsOnQuestion: 1,
    });

    const sessionUpdate = computeSessionUpdate({
      prevSession: session,
      isCorrect,
      currentQuestionId: q.id,
      activeDifficulty: mastery.difficultyBand,
      misconceptionCode,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      avgLatencyMs: mastery.avgLatencyMs,
    });

    if (!isCorrect && misconceptionCode) {
      remediation = {
        misconceptionCode,
        remaining: REMEDIATION_SEQUENCE_LENGTH,
        recentQuestionIds: [],
      };
    } else if (remediation.remaining > 0) {
      remediation = {
        ...remediation,
        remaining: Math.max(0, remediation.remaining - 1),
        recentQuestionIds: [...remediation.recentQuestionIds, q.id].slice(-10),
      };
      if (remediation.remaining === 0) {
        remediation = { misconceptionCode: null, remaining: 0, recentQuestionIds: [] };
      }
    }

    const scoreBreakdown = computeServerSmartScoreDelta({
      isCorrect,
      masteryScore: mastery.masteryScore,
      confidence: mastery.confidence,
      difficulty,
      phase: sessionUpdate.phase,
      responseMs,
      streak: mastery.streak,
      missStreak,
    });
    smartScore = Math.max(0, Math.min(100, smartScore + scoreBreakdown.delta));
    missStreak = isCorrect ? 0 : missStreak + 1;

    const cycleBefore = session.recent_question_ids.length;
    const nextRecent = appendCycleRecentQuestionIds({
      prevRecentQuestionIds: session.recent_question_ids,
      newQuestionId: q.id,
      availableQuestionIds: bank.map((x) => x.id),
    });

    const wasRepeat = seen.has(String(q.id));
    seen.add(String(q.id));

    logs.push({
      attempt,
      questionId: q.id,
      difficulty,
      complexity: q.complexity,
      phase: sessionUpdate.phase,
      selectReason: selected.reason,
      correct: isCorrect,
      responseMs,
      mastery: Number(mastery.masteryScore.toFixed(3)),
      confidence: Number(mastery.confidence.toFixed(3)),
      streak: mastery.streak,
      smartScoreDelta: scoreBreakdown.delta,
      smartScore,
      misconceptionCode,
      repeatedBeforeCycleReset: wasRepeat && cycleBefore !== 0,
      cycleResetHappened: cycleBefore > 0 && nextRecent.length === 0,
      recentCount: nextRecent.length,
    });

    skill = {
      mastery_score: mastery.masteryScore,
      confidence: mastery.confidence,
      streak: mastery.streak,
      attempts_total: mastery.attemptsTotal,
      correct_total: mastery.correctTotal,
      avg_latency_ms: mastery.avgLatencyMs,
      difficulty_band: mastery.difficultyBand,
    };

    session = {
      phase: sessionUpdate.phase,
      asked_count: sessionUpdate.askedCount,
      correct_count: sessionUpdate.correctCount,
      current_streak: sessionUpdate.currentStreak,
      target_correct_streak: sessionUpdate.targetCorrectStreak,
      active_difficulty: mastery.difficultyBand,
      recent_question_ids: nextRecent,
    };

    if (session.phase === 'done' || smartScore >= 100) break;
  }

  const total = logs.length;
  const correct = logs.filter((x) => x.correct).length;
  const repeatsBeforeReset = logs.filter((x) => x.repeatedBeforeCycleReset).length;
  const reached100 = logs.some((x) => x.smartScore >= 100);

  return {
    summary: {
      profile,
      totalAttempts: total,
      correctAttempts: correct,
      accuracy: total ? Number((correct / total).toFixed(3)) : 0,
      finalSmartScore: logs[logs.length - 1]?.smartScore || 0,
      reachedSmartScore100: reached100,
      finalPhase: logs[logs.length - 1]?.phase || session.phase,
      finalDifficulty: logs[logs.length - 1]?.difficulty || skill.difficulty_band,
      finalMastery: Number(skill.mastery_score.toFixed(3)),
      finalConfidence: Number(skill.confidence.toFixed(3)),
      repeatsBeforeCycleReset: repeatsBeforeReset,
    },
    attempts: logs,
  };
}

function main() {
  const bankPath = path.resolve(process.cwd(), 'supabase/seeds/adaptive_smartscore_scale_test_30_questions.json');
  const outDir = path.resolve(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  if (!Array.isArray(bank) || bank.length === 0) {
    throw new Error(`Question bank is empty: ${bankPath}`);
  }

  const normalizedBank = bank.map((q, idx) => ({
    ...q,
    id: String(q.id || `q_${idx + 1}`),
    difficulty: normalizeDifficulty(q.difficulty),
    complexity: Number(q.complexity || 0),
  }));

  const run = runDiagnostic({ bank: normalizedBank, maxAttempts: 42, profile: 'improving' });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `adaptive_diagnostic_${timestamp}.json`);
  const mdPath = path.join(outDir, `adaptive_diagnostic_${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(run, null, 2));

  const mdLines = [
    '# Adaptive Diagnostic Report',
    '',
    `- Source bank: \`${bankPath}\``,
    `- Attempts: **${run.summary.totalAttempts}**`,
    `- Accuracy: **${(run.summary.accuracy * 100).toFixed(1)}%**`,
    `- Final SmartScore: **${run.summary.finalSmartScore}**`,
    `- Reached 100: **${run.summary.reachedSmartScore100 ? 'Yes' : 'No'}**`,
    `- Final phase: **${run.summary.finalPhase}**`,
    `- Final difficulty: **${run.summary.finalDifficulty}**`,
    `- Final mastery/confidence: **${run.summary.finalMastery} / ${run.summary.finalConfidence}**`,
    `- Repeat-before-cycle-reset events: **${run.summary.repeatsBeforeCycleReset}**`,
    '',
    '## Attempt Trace',
    '',
    '| # | QID | Diff | Phase | Correct | Delta | Score | Reason | Repeat |',
    '|---|---|---|---|---|---:|---:|---|---|',
    ...run.attempts.map((a) => `| ${a.attempt} | ${a.questionId} | ${a.difficulty} | ${a.phase} | ${a.correct ? 'Y' : 'N'} | ${a.smartScoreDelta} | ${a.smartScore} | ${a.selectReason} | ${a.repeatedBeforeCycleReset ? 'Y' : 'N'} |`),
    '',
  ];

  fs.writeFileSync(mdPath, mdLines.join('\n'));

  const latestJsonPath = path.join(outDir, 'adaptive_diagnostic_latest.json');
  const latestMdPath = path.join(outDir, 'adaptive_diagnostic_latest.md');
  fs.copyFileSync(jsonPath, latestJsonPath);
  fs.copyFileSync(mdPath, latestMdPath);

  console.log(JSON.stringify({
    ok: true,
    bankCount: normalizedBank.length,
    summary: run.summary,
    jsonPath,
    mdPath,
    latestJsonPath,
    latestMdPath,
  }, null, 2));
}

main();
