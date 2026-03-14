import { mapDbQuestion } from '@/lib/practice/questionMapper';

const SKILL_COLUMNS = ['microSkillId', 'micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REMEDIATION_SEQUENCE_LENGTH = 2;
const DEFAULT_POLICY_VERSION = process.env.ADAPTIVE_POLICY_VERSION || 'misconception_v2';

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value ?? '').trim();
  if (!str) return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFraction(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return { numerator, denominator };
}

function extractFractionFromParts(parts) {
  const list = Array.isArray(parts) ? parts : [];
  for (const part of list) {
    const content = String(part?.content ?? '');
    const direct = parseFraction(content);
    if (direct) return direct;
    const embedded = content.match(/(-?\d+)\s*\/\s*(\d+)/);
    if (embedded) {
      return {
        numerator: Number(embedded[1]),
        denominator: Number(embedded[2]),
      };
    }
  }
  return null;
}

function resolveShadeGridGeometry(question) {
  const config = question?.adaptiveConfig ?? {};
  const explicitRows = parseNumber(config.gridRows);
  const explicitCols = parseNumber(config.gridCols);
  const orientation = String(
    config.orientation || config.gridOrientation || config.barOrientation || 'vertical'
  ).toLowerCase() === 'horizontal'
    ? 'horizontal'
    : 'vertical';
  const gridMode = String(config.gridMode || 'auto').toLowerCase();
  const fraction = (
    parseFraction(question?.correctAnswerText) ||
    extractFractionFromParts(question?.parts) ||
    (parseNumber(config.numerator) != null && parseNumber(config.denominator) != null
      ? { numerator: parseNumber(config.numerator), denominator: parseNumber(config.denominator) }
      : null)
  );
  const denominator = parseNumber(config.denominator) ?? fraction?.denominator ?? null;
  const shouldUseFractionBar = (
    gridMode === 'fractionbar' ||
    (gridMode === 'auto' && denominator && denominator > 1 && denominator <= 20)
  );

  let rows = explicitRows;
  let cols = explicitCols;
  if (shouldUseFractionBar && denominator) {
    if (orientation === 'horizontal') {
      rows = denominator;
      cols = 1;
    } else {
      rows = 1;
      cols = denominator;
    }
  } else if (!(rows && cols)) {
    if (denominator === 100) {
      rows = 10;
      cols = 10;
    } else {
      rows = 10;
      cols = 10;
    }
  }

  rows = Math.max(1, Math.min(20, Math.floor(rows || 10)));
  cols = Math.max(1, Math.min(20, Math.floor(cols || 10)));

  const modelType = String(config.modelType || config.visualModel || config.shapeModel || '').toLowerCase();
  const isPieModel = modelType === 'pie' || modelType === 'fractioncircle' || modelType === 'circlefraction';
  const pieSegments = Math.max(2, Math.min(36, Math.floor(parseNumber(config.segments) ?? denominator ?? 10)));
  const totalCells = isPieModel ? pieSegments : (rows * cols);

  return { rows, cols, totalCells, fraction };
}

function parseShadeGridTarget(question) {
  const config = question?.adaptiveConfig ?? {};
  const geometry = resolveShadeGridGeometry(question);
  const explicit = parseNumber(config.targetShaded);
  if (explicit != null) return explicit;

  const numerator = parseNumber(config.numerator);
  const denominator = parseNumber(config.denominator);
  if (numerator != null && denominator != null && denominator > 0) {
    return Math.round((numerator / denominator) * geometry.totalCells);
  }

  const fraction = geometry.fraction;
  if (fraction) return Math.round((fraction.numerator / fraction.denominator) * geometry.totalCells);

  return parseNumber(question?.correctAnswerText);
}

function parseMaybeJson(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isMissingTableError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
}

function normalizeDifficulty(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return DIFFICULTIES.includes(normalized) ? normalized : 'easy';
}

function shiftDifficulty(current, direction) {
  const idx = DIFFICULTIES.indexOf(normalizeDifficulty(current));
  const next = Math.max(0, Math.min(DIFFICULTIES.length - 1, idx + direction));
  return DIFFICULTIES[next];
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
  const answer = String(question.correctAnswerText ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!answer) return { wordLength: null, letterBank: null };
  return {
    wordLength: answer.length,
    letterBank: shuffleLetters(answer.split('')),
  };
}

function normalizeAnswerArray(answer) {
  if (Array.isArray(answer)) return answer.map((v) => String(v));
  if (answer == null) return [];
  return [String(answer)];
}

function getQuestionMisconceptionCodes(question) {
  const config = question?.adaptiveConfig ?? {};
  const fromSingle = String(config.misconceptionCode ?? '').trim();
  const fromArray = Array.isArray(config.misconceptionCodes)
    ? config.misconceptionCodes.map((v) => String(v || '').trim())
    : [];
  const fromTags = Array.isArray(config.misconceptionTags)
    ? config.misconceptionTags.map((v) => String(v || '').trim())
    : [];

  return [fromSingle, ...fromArray, ...fromTags].filter(Boolean);
}

function getQuestionRemediationCodes(question) {
  const config = question?.adaptiveConfig ?? {};
  const misconceptionCodes = getQuestionMisconceptionCodes(question);
  const fromFor = Array.isArray(config.remediationFor)
    ? config.remediationFor.map((v) => String(v || '').trim())
    : [];
  return [...misconceptionCodes, ...fromFor].filter(Boolean);
}

export function getAdaptivePolicyVersion() {
  return DEFAULT_POLICY_VERSION;
}

export function toPublicQuestion(question) {
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
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isVertical: Boolean(question.isVertical),
    showSubmitButton: Boolean(question.showSubmitButton),
  };
}

export async function fetchQuestionsByMicroskill(db, microskillId) {
  let rows = [];
  for (const skillColumn of SKILL_COLUMNS) {
    rows = await db.collection('questions')
      .find({ [skillColumn]: microskillId })
      .sort({ sort_order: 1, sortOrder: 1, idx: 1, created_at: 1, id: 1 })
      .toArray();

    if (rows && rows.length > 0) break;
  }

  return rows.map(mapDbQuestion);
}

export function validateAnswer(question, answer) {
  if (!question) return false;
  const type = String(question.type || '').trim().toLowerCase();

  switch (type) {
    case 'mcq':
    case 'imagechoice':
      if (question.isMultiSelect) {
        const selected = Array.isArray(answer) ? [...answer].map(Number).sort() : [];
        const correct = Array.isArray(question.correctAnswerIndices)
          ? [...question.correctAnswerIndices].map(Number).sort()
          : [];
        return JSON.stringify(selected) === JSON.stringify(correct);
      }
      return Number(answer) === Number(question.correctAnswerIndex);

    case 'textinput':
      return String(answer ?? '').trim().toLowerCase() === String(question.correctAnswerText ?? '').trim().toLowerCase();

    case 'fillintheblank':
    case 'gridarithmetic':
    case 'table':
    case 'smarttable': {
      const rawText = question.correctAnswerText;
      const parsed = (typeof rawText === 'object' && rawText !== null)
        ? rawText
        : parseMaybeJson(rawText, null);

      if (!parsed || typeof parsed !== 'object') return false;
      return Object.keys(parsed).every((key) => (
        String(answer?.[key] ?? '').trim().toLowerCase() === String(parsed[key] ?? '').trim().toLowerCase()
      ));
    }

    case 'draganddrop':
      return (question.dragItems || [])
        .filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '')
        .every((item) => String(answer?.[item.id] ?? '') === String(item.targetGroupId));

    case 'sorting': {
      const expectedOrder = parseMaybeJson(question.correctAnswerText, null);
      if (Array.isArray(expectedOrder) && expectedOrder.length > 0) {
        return JSON.stringify((answer || []).map(String)) === JSON.stringify(expectedOrder.map(String));
      }
      return false;
    }

    case 'fourpicsoneword':
      return (Array.isArray(answer) ? answer.join('') : String(answer ?? '')).toUpperCase() === String(question.correctAnswerText ?? '').toUpperCase();

    case 'measure': {
      const expected = parseNumber(question.correctAnswerText);
      const actual = parseNumber(answer);
      if (expected == null || actual == null) return false;
      return Math.abs(actual - expected) < 0.0001;
    }

    case 'shadegrid': {
      const expected = parseShadeGridTarget(question);
      if (expected == null) return false;
      const actual = (
        typeof answer === 'number' ? answer :
          typeof answer === 'string' ? parseNumber(answer) :
            Array.isArray(answer) ? answer.length :
              Array.isArray(answer?.selected) ? answer.selected.length :
                parseNumber(answer?.count)
      );
      if (actual == null) return false;
      return Number(actual) === Number(expected);
    }

    default:
      return false;
  }
}

export async function getStudentSkillState(db, studentId, microskillId) {
  const data = await db.collection('student_skill_state').findOne({
    student_id: studentId,
    micro_skill_id: microskillId,
  });
  return data;
}

export async function upsertStudentSkillState(db, payload) {
  const query = {
    student_id: payload.student_id,
    micro_skill_id: payload.micro_skill_id,
  };

  await db.collection('student_skill_state').updateOne(
    query,
    { $set: { ...payload, updated_at: new Date().toISOString() } },
    { upsert: true }
  );

  return db.collection('student_skill_state').findOne(query);
}

export async function getSessionState(db, sessionId) {
  const data = await db.collection('session_state').findOne({ id: sessionId });
  return data;
}

export async function upsertSessionState(db, payload) {
  const query = { id: payload.id };

  await db.collection('session_state').updateOne(
    query,
    { $set: { ...payload, updated_at: new Date().toISOString() } },
    { upsert: true }
  );

  return db.collection('session_state').findOne(query);
}

export async function insertAttemptEvent(db, payload) {
  await db.collection('attempt_events').insertOne(payload);
}

export async function insertMisconceptionEvent(db, payload) {
  await db.collection('misconception_events').insertOne(payload);
}

export async function getRecoveryContextFromAttempts(db, { sessionId }) {
  const data = await db.collection('attempt_events')
    .find({ session_id: sessionId })
    .sort({ created_at: -1 })
    .limit(30)
    .toArray();

  if (!Array.isArray(data) || data.length === 0) {
    return {
      inRecovery: false,
      misconceptionCode: null,
      remediationRemaining: 0,
      anchorQuestionId: null,
    };
  }

  const anchorIndex = data.findIndex((row) => (
    row?.is_correct === false && String(row?.misconception_code ?? '').trim()
  ));

  if (anchorIndex < 0) {
    return {
      inRecovery: false,
      misconceptionCode: null,
      remediationRemaining: 0,
      anchorQuestionId: null,
    };
  }

  const attemptsSinceAnchor = anchorIndex;
  const remediationRemaining = Math.max(0, REMEDIATION_SEQUENCE_LENGTH - attemptsSinceAnchor);
  const anchor = data[anchorIndex];
  return {
    inRecovery: remediationRemaining > 0,
    misconceptionCode: String(anchor?.misconception_code ?? '').trim() || null,
    remediationRemaining,
    anchorQuestionId: anchor?.question_id ? String(anchor.question_id) : null,
  };
}

export function detectMisconceptionCode({ question, answer, isCorrect }) {
  if (!question || isCorrect) return null;
  const config = question.adaptiveConfig ?? {};
  const type = String(question.type || '').trim().toLowerCase();

  if (type === 'mcq' || type === 'imagechoice') {
    const optionMap = config.misconceptionByOption || config.misconception_map || {};
    if (question.isMultiSelect) {
      const selected = normalizeAnswerArray(answer).map(Number).filter(Number.isFinite);
      for (const idx of selected) {
        const mapped = optionMap?.[idx] ?? optionMap?.[String(idx)];
        if (mapped) return String(mapped);
        const option = question.options?.[idx];
        const optionCode = option && typeof option === 'object'
          ? option.misconceptionCode || option.misconception_code
          : null;
        if (optionCode) return String(optionCode);
      }
      return config.misconceptionCode ? String(config.misconceptionCode) : 'mcq_multi_select_error';
    }

    const selectedIdx = Number(answer);
    if (Number.isFinite(selectedIdx)) {
      const mapped = optionMap?.[selectedIdx] ?? optionMap?.[String(selectedIdx)];
      if (mapped) return String(mapped);
      const option = question.options?.[selectedIdx];
      const optionCode = option && typeof option === 'object'
        ? option.misconceptionCode || option.misconception_code
        : null;
      if (optionCode) return String(optionCode);
      return `option_${selectedIdx}_misconception`;
    }
    return config.misconceptionCode ? String(config.misconceptionCode) : 'mcq_unanswered';
  }

  if (type === 'fillintheblank' || type === 'textinput' || type === 'measure' || type === 'table' || type === 'smarttable') {
    const expectedRaw = question.correctAnswerText;
    const expectedNumeric = parseNumber(expectedRaw);
    const actualNumeric = parseNumber(
      typeof answer === 'object' && answer !== null
        ? Object.values(answer).join('')
        : answer
    );

    if (expectedNumeric != null && actualNumeric != null) {
      const diff = actualNumeric - expectedNumeric;
      if (Math.abs(diff) === 1) return 'off_by_one';
      if (Math.abs(diff) === 10) return 'place_value_shift';
      if (diff > 0) return 'overestimate';
      if (diff < 0) return 'underestimate';
    }
  }

  if (config.misconceptionCode) return String(config.misconceptionCode);
  return `incorrect_${String(question?.type || 'unknown').toLowerCase()}`;
}

export function chooseNextQuestion({
  questions,
  targetDifficulty,
  recentQuestionIds = [],
  remediationRecentQuestionIds = [],
  excludeQuestionId = null,
  remediation = null,
}) {
  const recentSet = new Set((recentQuestionIds || []).map(String));
  const remediationRecentSet = new Set((remediationRecentQuestionIds || []).map(String));
  if (excludeQuestionId) recentSet.add(String(excludeQuestionId));

  const candidates = questions.filter((q) => !recentSet.has(String(q.id)));
  // Full-cycle behavior: only repeat after all questions are used.
  // If cycle is exhausted, start a new cycle but still avoid immediate same-question replay.
  const pool = candidates.length > 0
    ? candidates
    : questions.filter((q) => String(q.id) !== String(excludeQuestionId || ''));
  const normalizedTarget = normalizeDifficulty(targetDifficulty);
  const debug = {
    totalQuestions: questions.length,
    unseenQuestions: candidates.length,
    poolQuestions: pool.length,
    targetDifficulty: normalizedTarget,
    recentCount: recentSet.size,
  };

  if (pool.length === 0) return { question: null, reason: 'no_questions', debug };

  // 0. Remediation Logic (High Priority)
  const remediationCode = String(remediation?.misconceptionCode ?? '').trim();
  const remediationEnabled = Boolean(remediationCode) && Number(remediation?.remaining ?? 0) > 0;
  if (remediationEnabled) {
    const remediationPool = pool.filter((q) => {
      const codes = getQuestionRemediationCodes(q);
      const hasMatchingCode = codes.some((code) => String(code).toLowerCase() === remediationCode.toLowerCase());
      const notRecentlyUsedForRemediation = !remediationRecentSet.has(String(q.id));
      return hasMatchingCode && notRecentlyUsedForRemediation;
    });

    if (remediationPool.length > 0) {
      const byDifficulty = remediationPool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
      const preferred = byDifficulty.length > 0 ? byDifficulty : remediationPool;
      const randomIndex = Math.floor(Math.random() * preferred.length);
      return {
        question: preferred[randomIndex],
        reason: 'misconception_remediation',
        debug,
      };
    }
  }

  // 1. Try for target difficulty in candidates (unseen questions)
  const sameDifficultyCandidates = candidates.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
  if (sameDifficultyCandidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * sameDifficultyCandidates.length);
    return {
      question: sameDifficultyCandidates[randomIndex],
      reason: 'target_band_reinforcement',
      debug: { ...debug, searchStage: 'unseen_target' }
    };
  }

  // 2. If target band is exhausted in candidates, check if we can repeat a question of the SAME difficulty
  const sameDifficultyRepeats = questions.filter((q) => 
    normalizeDifficulty(q.difficulty) === normalizedTarget && 
    String(q.id) !== String(excludeQuestionId || '')
  );
  if (sameDifficultyRepeats.length > 0) {
    const randomIndex = Math.floor(Math.random() * sameDifficultyRepeats.length);
    return {
      question: sameDifficultyRepeats[randomIndex],
      reason: 'target_band_cycle_repeat',
      debug: { ...debug, searchStage: 'seen_target_repeat' }
    };
  }

  // 3. Fallback to pool (adjacent or any available)
  const same = pool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
  if (same.length > 0) {
    const randomIndex = Math.floor(Math.random() * same.length);
    return { question: same[randomIndex], reason: 'pool_target_fallback', debug };
  }

  const currentIdx = DIFFICULTIES.indexOf(normalizedTarget);
  const nearbyPool = pool.filter((q) => {
    const qIdx = DIFFICULTIES.indexOf(normalizeDifficulty(q.difficulty));
    return Math.abs(qIdx - currentIdx) === 1;
  });
  if (nearbyPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * nearbyPool.length);
    return { question: nearbyPool[randomIndex], reason: 'adjacent_band_fallback', debug };
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return { question: pool[randomIndex], reason: 'any_available', debug };
}

export function appendCycleRecentQuestionIds({
  prevRecentQuestionIds = [],
  newQuestionId = null,
  availableQuestionIds = [],
}) {
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
    seen.push(String(newQuestionId));
    seenSet.add(String(newQuestionId));
  }

  // If cycle is complete, reset to start a fresh cycle on next selection.
  if (seenSet.size >= availableSet.size) {
    return [];
  }

  return seen;
}

export function computeMasteryUpdate({
  prevState,
  isCorrect,
  responseMs,
  hintUsed,
  attemptsOnQuestion,
}) {
  const prevScore = Number(prevState?.mastery_score ?? 0.2);
  const prevConfidence = Number(prevState?.confidence ?? 0.1);
  const prevStreak = Number(prevState?.streak ?? 0);
  const prevAttemptsTotal = Number(prevState?.attempts_total ?? 0);
  const prevCorrectTotal = Number(prevState?.correct_total ?? 0);
  const prevAvgLatency = Number(prevState?.avg_latency_ms ?? 0);
  const prevDifficulty = normalizeDifficulty(prevState?.difficulty_band ?? 'easy');

  // Slower mastery progression
  let delta = isCorrect ? 0.025 : -0.04; 
  if (Number(responseMs) > 0 && Number(responseMs) <= 6000) delta += 0.005;
  if (Number(responseMs) > 15000) delta -= 0.01;
  if (hintUsed) delta -= 0.02;
  if (Number(attemptsOnQuestion ?? 1) > 1) delta -= 0.01;

  const masteryScore = Math.max(0.01, Math.min(0.99, prevScore + delta));
  const confidence = Math.max(0.05, Math.min(0.99, prevConfidence + 0.02));
  const streak = isCorrect ? prevStreak + 1 : 0;
  const attemptsTotal = prevAttemptsTotal + 1;
  const correctTotal = prevCorrectTotal + (isCorrect ? 1 : 0);
  const avgLatencyMs = prevAttemptsTotal > 0
    ? Math.round(((prevAvgLatency * prevAttemptsTotal) + Number(responseMs || 0)) / attemptsTotal)
    : Math.round(Number(responseMs || 0));

  // Difficulty will now be primarily driven by SmartScore in the session update logic,
  // but we keep a mastery fallback here.
  let difficultyBand = prevDifficulty;
  if (streak >= 8 && masteryScore > 0.8) difficultyBand = shiftDifficulty(prevDifficulty, 1);
  if (!isCorrect && masteryScore < 0.3) difficultyBand = shiftDifficulty(prevDifficulty, -1);

  const nextReviewHours = masteryScore >= 0.85 ? 72 : (masteryScore >= 0.6 ? 24 : 8);
  const nextReviewAt = new Date(Date.now() + nextReviewHours * 60 * 60 * 1000).toISOString();
  const status = masteryScore >= 0.85 && confidence >= 0.6 ? 'proficient' : 'learning';

  return {
    prevScore,
    masteryScore,
    confidence,
    streak,
    attemptsTotal,
    correctTotal,
    avgLatencyMs,
    difficultyBand,
    nextReviewAt,
    status,
  };
}

export function computeSessionUpdate({
  prevSession,
  isCorrect,
  currentQuestionId,
  activeDifficulty,
  misconceptionCode = null,
  masteryScore = null,
  confidence = null,
  avgLatencyMs = null,
}) {
  const askedCount = Number(prevSession?.asked_count ?? 0) + 1;
  const correctCount = Number(prevSession?.correct_count ?? 0) + (isCorrect ? 1 : 0);
  const currentStreak = isCorrect ? Number(prevSession?.current_streak ?? 0) + 1 : 0;
  const targetCorrectStreak = Number(prevSession?.target_correct_streak ?? 5);
  const priorPhase = String(prevSession?.phase ?? 'warmup');
  const currentSmartScore = Number(prevSession?.smart_score ?? 0);
  
  // Enforce strict difficulty bands requested by user:
  // 40: Easy, 70: Medium, 100: Hard
  let phase = priorPhase;
  let difficulty = 'easy';
  
  if (currentSmartScore >= 70) {
    difficulty = 'hard';
    phase = priorPhase === 'recovery' ? 'recovery' : 'challenge';
  } else if (currentSmartScore >= 40) {
    difficulty = 'medium';
    phase = priorPhase === 'warmup' ? 'core' : priorPhase;
  } else {
    difficulty = 'easy';
    phase = askedCount < 3 ? 'warmup' : 'core';
  }

  // Recovery override
  if (!isCorrect && (priorPhase === 'challenge' || priorPhase === 'core')) {
    phase = 'recovery';
  }
  if (priorPhase === 'recovery' && currentStreak >= 2) {
    phase = currentSmartScore >= 70 ? 'challenge' : 'core';
  }

  const accuracy = askedCount > 0 ? correctCount / askedCount : 0;
  const stableForDone =
    currentSmartScore >= 98 &&
    currentStreak >= targetCorrectStreak &&
    accuracy >= 0.8;
  if (stableForDone && difficulty === 'hard') phase = 'done';

  const recentQuestionIds = [
    ...((prevSession?.recent_question_ids || []).map(String)),
    String(currentQuestionId),
  ];

  return {
    phase,
    askedCount,
    correctCount,
    currentStreak,
    targetCorrectStreak,
    activeDifficulty: difficulty, // Override with strict band
    recentQuestionIds,
    accuracy,
  };
}

export function computeServerSmartScoreDelta({
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
  const difficultyWeight = ({
    easy: 1.0,
    medium: 1.2,
    hard: 1.45,
  })[String(difficulty || 'easy').toLowerCase()] || 1.0;
  const phaseWeight = ({
    warmup: 0.95,
    core: 1.0,
    challenge: 1.2,
    recovery: 0.85,
    done: 1.0,
  })[String(phase || 'core').toLowerCase()] || 1.0;

  const fastGuessPenalty = safeResponseMs < 1200 ? 2.2 : (safeResponseMs < 2200 ? 1.2 : 0);
  const lowConfidencePenalty = safeConfidence < 0.35 ? 0.6 : 0;
  const details = {
    masteryScore: safeMastery,
    confidence: safeConfidence,
    difficultyWeight,
    phaseWeight,
    fastGuessPenalty,
    lowConfidencePenalty,
    responseMs: safeResponseMs,
    phase: String(phase || 'core').toLowerCase(),
    difficulty: String(difficulty || 'easy').toLowerCase(),
  };

  if (isCorrect) {
    // Heavily reduced base gain to target ~4 points per question average
    const baseGain = 1.2 + (safeMastery * 1.5) + (safeConfidence * 0.8);
    const streakBoost = Math.min(1.2, 1 + (Math.max(0, streak) * 0.04));
    
    // Scale weights significantly down
    const adjDiffWeight = 1.0 + (difficultyWeight - 1) * 0.5; // easy=1.0, med=1.1, hard=1.22
    const adjPhaseWeight = 1.0 + (phaseWeight - 1) * 0.5;

    const raw = (baseGain * adjDiffWeight * adjPhaseWeight * streakBoost) - (fastGuessPenalty * 0.5);
    const delta = Math.round(Math.max(1, Math.min(8, raw))); // Cap gain at 8 to prevent jumps
    return {
      delta,
      details: { ...details, mode: 'gain', base: baseGain, streakBoost },
    };
  }

  const baseLoss = 4.0 + (Math.max(0, missStreak) * 1.0);
  const phaseLossWeight = String(phase || 'core').toLowerCase() === 'recovery' ? 0.7 : 1.0;
  const difficultyLossWeight = 0.8; // Lose less on harder questions
  const raw = (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty;
  const delta = -Math.round(Math.max(3, raw));
  return {
    delta,
    details: { ...details, mode: 'loss', base: baseLoss, missStreak: Math.max(0, missStreak) },
  };
}
