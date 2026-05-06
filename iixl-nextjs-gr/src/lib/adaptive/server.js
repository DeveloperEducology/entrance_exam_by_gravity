import mongoose from 'mongoose';
import { mapDbQuestion } from '@/lib/practice/questionMapper';

const SKILL_COLUMNS = ['microSkillId', 'micro_skill_id', 'microskill_id'];
const ORDER_COLUMNS = ['sort_order', 'idx', 'created_at', 'id'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const REMEDIATION_SEQUENCE_LENGTH = 2;
const DEFAULT_POLICY_VERSION = process.env.ADAPTIVE_POLICY_VERSION || 'misconception_v2';
const QUESTION_POOL_CACHE_TTL_MS = 60 * 1000;
const questionPoolCache = new Map();

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

/**
 * Normalizes an instantiated ID (e.g. inst_baseid_timestamp_rand) back to its base ID.
 * This is critical for preventing repeats in the adaptive engine.
 */
function getBaseId(id) {
  const sId = String(id || '');
  if (!sId.startsWith('inst_')) return sId;
  const parts = sId.split('_');
  if (parts.length >= 3) {
    // Format: inst_<baseId>_<timestamp>_<random>
    return parts.slice(1, -2).join('_');
  }
  return sId;
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
    .replace(/,/g, '') // Remove commas for consistent comparison
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .trim();
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>?/gm, '')
    .trim();
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

function getQuestionPromptSignature(question) {
  if (!question || typeof question !== 'object') return '';
  const prompt = String(
    question.questionText ||
    (Array.isArray(question.parts)
      ? question.parts.find((part) => part?.type === 'text' && String(part?.content || '').trim())?.content || ''
      : '')
  )
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const optionSignature = (Array.isArray(question.options) ? question.options : [])
    .map((option) => {
      if (typeof option === 'string') return option;
      if (Array.isArray(option)) return JSON.stringify(option);
      return option?.text || option?.label || option?.content || option?.id || '';
    })
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(Boolean)
    .join('|');
  return `${prompt}::${optionSignature}`;
}

function getMcqCorrectIndex(question) {
  const direct = Number(question?.correctAnswerIndex);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  if (Array.isArray(question?.correctAnswerIndices) && question.correctAnswerIndices.length > 0) {
    const first = Number(question.correctAnswerIndices[0]);
    if (Number.isFinite(first) && first >= 0) return first;
  }

  const options = Array.isArray(question?.options) ? question.options : [];
  const inferred = options.findIndex((option) => {
    if (option && typeof option === 'object') {
      return Boolean(option.isCorrect ?? option.is_correct);
    }
    return false;
  });
  return inferred >= 0 ? inferred : null;
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
  
  const rawFor = config.remediationFor;
  let fromFor = [];
  if (Array.isArray(rawFor)) {
    fromFor = rawFor.map((v) => String(v || '').trim());
  } else if (typeof rawFor === 'string' && rawFor.trim()) {
    fromFor = [rawFor.trim()];
  }

  return [...misconceptionCodes, ...fromFor].filter(Boolean);
}

export function getAdaptivePolicyVersion() {
  return DEFAULT_POLICY_VERSION;
}

export function toPublicQuestion(question) {
  if (!question) return null;
  const fourPics = getFourPicsPuzzle(question);
  
  // SANITIZATION: Strip answers before sending to client
  const publicOptions = (question.options ?? []).map(opt => {
    if (opt && typeof opt === 'object' && !Array.isArray(opt) && !opt.type) {
      const { isCorrect, is_correct, feedback, feedbackText, ...rest } = opt;
      return rest;
    }
    return opt;
  });

  const publicItems = (question.items ?? []).map(it => {
    if (it && typeof it === 'object' && !Array.isArray(it)) {
      const { correctPosition, correct_position, ...rest } = it;
      return rest;
    }
    return it;
  });

  return {
    id: question.id,
    microSkillId: question.microSkillId ?? null,
    questionText: question.questionText ?? '',
    type: question.type,
    difficulty: question.difficulty ?? 'easy',
    complexity: Number(question.complexity ?? 0),
    parts: question.parts ?? [],
    options: publicOptions,
    items: publicItems,
    dragItems: question.dragItems ?? [],
    dropGroups: question.dropGroups ?? [],
    mapUrl: question.mapUrl ?? null,
    map_url: question.map_url ?? null,
    problem: question.problem ?? null,
    adaptiveConfig: question.adaptiveConfig ?? null,
    tokenSelectionV2Config: question.tokenSelectionV2Config ?? question.tokenSelectionConfig ?? null,
    ui_config: question.ui_config ?? null,
    measureTarget: getMeasureTarget(question),
    wordLength: fourPics.wordLength,
    letterBank: fourPics.letterBank,
    isMultiSelect: Boolean(question.isMultiSelect),
    isGrid: Boolean(question.isGrid),
    isVertical: Boolean(question.isVertical),
    showSubmitButton: Boolean(question.showSubmitButton),
    tokens: question.tokens ?? [],
    concepts: question.concepts ?? [],
    correctAnswerText: question.correctAnswerText,
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerIndices: Array.isArray(question.correctAnswerIndices) ? question.correctAnswerIndices : [],
    solution: question.solution ?? '',
    show_example: Boolean(question.show_example ?? question.showExample ?? false),
    showExample: Boolean(question.show_example ?? question.showExample ?? false),
    validation: question.validation,
    operands: question.operands ?? [],
    title: question.title ?? '',
    footer: question.footer ?? '',
    steps: (question.steps ?? []).map(step => {
        return step;
    }),
  };
}

export async function fetchQuestionsByMicroskill(db, microskillId) {
  if (!microskillId) return [];
  const cacheKey = String(microskillId);
  
  // 1. Check cache
  const cached = questionPoolCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < QUESTION_POOL_CACHE_TTL_MS) {
    return cached.rows;
  }

  // 2. Resolve mIdQuery (handle ObjectId)
  let mIdQuery = microskillId;
  try {
    if (typeof microskillId === 'string' && microskillId.length === 24 && mongoose?.Types?.ObjectId?.isValid(microskillId)) {
      mIdQuery = new mongoose.Types.ObjectId(microskillId);
    }
  } catch (e) {
    // Silently continue if ObjectId resolution fails
  }

  const query = {
    $or: [
      ...SKILL_COLUMNS.map(col => ({ [col]: microskillId })),
      ...SKILL_COLUMNS.map(col => ({ [col]: mIdQuery }))
    ]
  };

  let rows = [];
  try {
    // 3. Search in 'questions' collection
    const qRows = await db.collection('questions')
      .find(query)
      .sort({ sort_order: 1, sortOrder: 1, idx: 1, created_at: 1, id: 1 })
      .toArray();
    rows = [...qRows];

    // 4. Search in 'templates' collection
    const tRows = await db.collection('templates')
      .find(query)
      .sort({ sort_order: 1, sortOrder: 1, idx: 1, created_at: 1, id: 1 })
      .toArray();
    
    if (tRows.length > 0) {
      rows = [...rows, ...tRows];
    }

    // 5. Fallback: Search by template_id
    if (rows.length === 0) {
      const fallbackQuery = { template_id: microskillId };
      const fallbackQuestions = await db.collection('questions').find(fallbackQuery).toArray();
      const fallbackTemplates = await db.collection('templates').find(fallbackQuery).toArray();
      if (fallbackQuestions.length > 0) rows = [...rows, ...fallbackQuestions];
      if (fallbackTemplates.length > 0) rows = [...rows, ...fallbackTemplates];
    }
  } catch (dbErr) {
    console.error("[fetchQuestionsByMicroskill] Error fetching from MongoDB:", dbErr);
    // Re-throw to be caught by the API route handler
    throw dbErr;
  }

  const mapped = (rows || []).map(mapDbQuestion);
  questionPoolCache.set(cacheKey, { ts: Date.now(), rows: mapped });
  return mapped;
}

export function validateAnswer(question, answer) {
  if (!question) return false;
  const type = String(question.type || '').trim().toLowerCase();

  switch (type) {
    case 'mcq':
    case 'imagechoice':
    case 'tokenselection':
    case 'tokenselectionv2':
    case 'tokenSelectionV2': {
      if (question.isMultiSelect) {
        const selectedIds = (typeof answer === 'string') 
          ? (parseMaybeJson(answer, []) || [answer])
          : (Array.isArray(answer) ? answer : [answer]);
        
        const indices = (Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0)
          ? question.correctAnswerIndices
          : (Array.isArray(question.correct_answer_indices) ? question.correct_answer_indices : []);

        if (indices.length === 0) return false;
        
        const selectedSet = new Set(selectedIds.map(String));
        const correctSet = new Set(indices.map(String));
        
        if (selectedSet.size !== correctSet.size) return false;
        for (let item of correctSet) {
          if (!selectedSet.has(item)) return false;
        }
        return true;
      } else {
        const selectedId = String(answer);
        const correctIdx = (() => {
          const direct = (question.correctAnswerIndex !== undefined && question.correctAnswerIndex !== null)
             ? Number(question.correctAnswerIndex)
             : null;
          if (Number.isFinite(direct) && direct >= 0) return direct;
          
          if (Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0) {
            return Number(question.correctAnswerIndices[0]);
          }
          if (Array.isArray(question.correct_answer_indices) && question.correct_answer_indices.length > 0) {
            return Number(question.correct_answer_indices[0]);
          }
          return null;
        })();
        
        if (correctIdx === null) return false;

        // Try numeric match first (best for indices)
        if (selectedId === String(correctIdx)) return true;

        // Fallback to text matching if ID mismatch
        const options = Array.isArray(question.options) ? question.options : [];
        const normalizedAnswer = stripHtml(String(answer ?? '')).toLowerCase();
        if (!normalizedAnswer) return false;

        const selectedIdx = options.findIndex((option) => {
          const label = typeof option === 'object'
            ? (option.label || option.text || option.content || '')
            : option;
          return stripHtml(String(label)).toLowerCase() === normalizedAnswer;
        });

        return selectedIdx >= 0 && selectedIdx === Number(correctIdx);
      }
    }

    case 'textinput':
    case 'arithmetic_journey':
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
          ? (parsed.ans || parsed.value || parsed.correctAnswer || parsed.correct_answer || Object.values(parsed)[0])
          : (question.correctAnswerText ?? question.correct_answer_text ?? rawText);

        if (String(answer).trim().toLowerCase() === String(expectedVal ?? '').trim().toLowerCase()) {
          return true;
        }
      }

      // 2. Structured Object Match (Standard for multi-box/arithmetic layouts)
      if (!parsed || typeof parsed !== 'object') {
        if (!answer) return false;
        const answerVal = (typeof answer === 'object') ? Object.values(answer)[0] : answer;
        return String(answerVal ?? '').trim().toLowerCase() === String(rawText ?? '').trim().toLowerCase();
      }
      
      // Check that all expected answers are correct
      const allCorrect = Object.keys(parsed).every((key) => {
        const actual = String(answer?.[key] ?? '').trim().toLowerCase();
        
        let expectedRaw = parsed[key];
        // PRO FIX: Deeply unwrap config objects (value, ans, correctAnswer, etc)
        if (expectedRaw && typeof expectedRaw === 'object' && !Array.isArray(expectedRaw)) {
          expectedRaw = expectedRaw.value ?? expectedRaw.ans ?? expectedRaw.correctAnswer ?? expectedRaw;
        }
        
        const expected = String(expectedRaw ?? '').trim().toLowerCase();
        
        // Mathematical leniency: Treat empty string same as "0" for numeric inputs
        if (actual === "" && (expected === "0" || expected === "")) return true;
        if (actual === "0" && expected === "") return true;

        if (Array.isArray(parsed[key])) {
          return parsed[key].map((value) => {
            const v = (value && typeof value === 'object' && !Array.isArray(value)) ? (value.value ?? value.ans ?? value) : value;
            return String(v ?? '').trim().toLowerCase();
          }).includes(actual);
        }
        return normalizeMathSentence(actual) === normalizeMathSentence(expected);
      });

      if (!allCorrect) return false;

      const ignoredExtraPrefixes = [
        ...(Array.isArray(question.validation?.ignoreExtraAnswerPrefixes)
          ? question.validation.ignoreExtraAnswerPrefixes
          : []),
        ...(Array.isArray(question.adaptiveConfig?.validation?.ignoreExtraAnswerPrefixes)
          ? question.adaptiveConfig.validation.ignoreExtraAnswerPrefixes
          : []),
        'scaffold_' // Always ignore scaffold fields
      ]
        .map((prefix) => String(prefix || '').trim())
        .filter(Boolean);

      // Anti-guessing check: Ensure NO extra incorrect values were entered in non-mapped inputs
      return Object.keys(answer || {}).every((key) => {
          if (parsed[key] !== undefined) return true;
          if (ignoredExtraPrefixes.some((prefix) => String(key).startsWith(prefix))) return true;
          
          // PRO FIX: Ignore complex state objects from interactive parts (like sharing_lab)
          if (typeof answer[key] === 'object' && answer[key] !== null) return true;
          
          const actual = String(answer[key] ?? '').trim().toLowerCase();
          return actual === "" || actual === "0";
      });
    }

    case 'draganddrop':
    case 'draganddropv2':
    case 'draganddropv3': {
      const parsed = parseMaybeJson(
        question.correctAnswerText ?? question.validation?.answer ?? question.validation?.correctAnswerText,
        null
      );
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const expectedMap = parsed;
        const expectedKeys = Object.keys(expectedMap);
        if (expectedKeys.length === 0) return false;
        return expectedKeys.every((key) => String(answer?.[key] ?? '') === String(expectedMap[key]));
      }

      const items = (question.dragItems || [])
        .filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '');
      if (items.length === 0) return false;
      return items.every((item) => String(answer?.[item.id] ?? '') === String(item.targetGroupId));
    }

    case 'sorting': {
      const expectedOrder = parseMaybeJson(question.correctAnswerText, null);
      if (Array.isArray(expectedOrder) && expectedOrder.length > 0) {
        return JSON.stringify((answer || []).map(String)) === JSON.stringify(expectedOrder.map(String));
      }
      return false;
    }

    case 'fourpicsoneword':
      return (Array.isArray(answer) ? answer.join('') : String(answer ?? '')).toUpperCase() === String(question.correctAnswerText ?? '').toUpperCase();

    case 'fingermultiplication':
    case 'fingercounting': {
      const studentTotal = answer?.total ?? answer?.inputValue ?? '';
      // Try parsing as JSON first for backward compatibility, then fallback to plain string
      const expected = parseMaybeJson(question.correctAnswerText, null);
      const expectedTotal = (expected && typeof expected === 'object') ? expected.total : question.correctAnswerText;
      return String(studentTotal) === String(expectedTotal);
    }

    case 'tokenselection':
    case 'tokenselectionv2': {
      const getTokens = (q) => {
        const parts = Array.isArray(q.parts) ? q.parts : [];
        const sentencePart = parts.find((p) => p.type === 'token_sentence');
        if (sentencePart && Array.isArray(sentencePart.tokens)) return sentencePart.tokens;
        if (parts.some((p) => p.type === 'token')) return parts.filter((p) => p.type === 'token');
        return Array.isArray(q.tokens) ? q.tokens : [];
      };

      const normalizeSelection = (val) => {
        if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
        if (val == null || val === '') return [];
        let parsed = val;
        if (typeof val === 'string') {
          try {
            parsed = JSON.parse(val);
          } catch {
            parsed = val.split(',').map((s) => s.trim()).filter(Boolean);
          }
        }
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
        return [String(parsed).trim()].filter(Boolean);
      };

      const tokens = getTokens(question);
      const idToText = Object.fromEntries(tokens.map((t) => [String(t.id), String(t.text || t)]));
      const textToIds = {};
      tokens.forEach((t) => {
        const txt = String(t.text || t).trim().toLowerCase();
        if (!textToIds[txt]) textToIds[txt] = [];
        textToIds[txt].push(String(t.id));
      });

      const resolveToIds = (vals) => {
        const items = normalizeSelection(vals);
        const resolved = new Set();
        items.forEach((item) => {
          const itemLower = item.toLowerCase();
          if (idToText[item]) {
            resolved.add(item);
          } else if (textToIds[itemLower]) {
            textToIds[itemLower].forEach((id) => resolved.add(id));
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
                : (question.correctAnswerText ?? question.correct_answer_text)
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
                    : (question.correctAnswerText ?? question.correct_answer_text)
                )
            )
        );
      const expectedIds = resolveToIds(expectedSource);

      if (question.isMultiSelect) {
        return JSON.stringify(selectedIds) === JSON.stringify(expectedIds);
      }
      return selectedIds.length > 0 && expectedIds.includes(selectedIds[0]);
    }

    case 'measure': {
      const expected = parseNumber(question.correctAnswerText);
      const actual = parseNumber(answer);
      if (expected == null || actual == null) return false;
      return Math.abs(actual - expected) < 0.0001;
    }

    case 'shadegrid': {
      const config = question.adaptiveConfig || {};
      const expectedCount = parseShadeGridTarget(question);
      if (expectedCount == null) return false;
      
      const selected = (Array.isArray(answer?.selected) ? answer.selected : []).map(Number).sort((a, b) => a - b);
      const actualCount = selected.length;
      
      if (Number(actualCount) !== Number(expectedCount)) return false;
      
      // Optional Shape Validation
      if (config.enforceShape === 'rectangle') {
        const targetRows = Number(config.variables?.rows);
        const targetCols = Number(config.variables?.cols);
        const gridCols = Number(config.gridCols || 10);
        
        if (targetRows && targetCols && selected.length > 0) {
          const minCell = selected[0];
          const startR = Math.floor(minCell / gridCols);
          const startC = minCell % gridCols;
          
          const expectedIndices = [];
          for (let r = 0; r < targetRows; r++) {
            for (let c = 0; c < targetCols; c++) {
              expectedIndices.push((startR + r) * gridCols + (startC + c));
            }
          }
          expectedIndices.sort((a, b) => a - b);
          return JSON.stringify(selected) === JSON.stringify(expectedIndices);
        }
      }
      
      return true;
    }

    case 'dotgrid': {
      const config = question.adaptiveConfig || {};
      const task = config.taskType || 'right_angle';
      const lines = Array.isArray(answer?.lines) ? answer.lines : [];
      
      if (lines.length === 0) return false;

      const getPos = (id) => {
        const [r, c] = String(id).split('-').map(Number);
        return { r, c };
      };

      const getDistanceSq = (id1, id2) => {
        const p1 = getPos(id1);
        const p2 = getPos(id2);
        return Math.pow(p1.r - p2.r, 2) + Math.pow(p1.c - p2.c, 2);
      };

      const isPerpendicular = (idA, idB, idC) => {
        const pA = getPos(idA);
        const pB = getPos(idB); // vertex
        const pC = getPos(idC);
        const v1 = { r: pA.r - pB.r, c: pA.c - pB.c };
        const v2 = { r: pC.r - pB.r, c: pC.c - pB.c };
        return (v1.r * v2.r + v1.c * v2.c) === 0;
      };

      if (task === 'right_angle') {
        // Check if any two lines share a vertex and are perpendicular
        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            const l1 = lines[i];
            const l2 = lines[j];
            const common = l1.find(p => l2.includes(p));
            if (common) {
              const pA = l1.find(p => p !== common);
              const pC = l2.find(p => p !== common);
              if (isPerpendicular(pA, common, pC)) return true;
            }
          }
        }
        return false;
      }

      if (task === 'triangle') {
        if (lines.length !== 3) return false;
        // Check if they form a closed loop
        const points = new Set(lines.flat());
        if (points.size !== 3) return false;
        // Each point must appear in exactly 2 lines
        const counts = {};
        lines.flat().forEach(p => counts[p] = (counts[p] || 0) + 1);
        return Object.values(counts).every(c => c === 2);
      }

      if (task === 'square' || task === 'rectangle') {
        if (lines.length !== 4) return false;
        const points = Array.from(new Set(lines.flat()));
        if (points.size !== 4) return false;
        
        const counts = {};
        lines.flat().forEach(p => counts[p] = (counts[p] || 0) + 1);
        if (!Object.values(counts).every(c => c === 2)) return false;

        // Check for 4 right angles
        let rightAngles = 0;
        for (let i = 0; i < points.length; i++) {
          const pB = points[i];
          const connected = lines.filter(l => l.includes(pB)).map(l => l.find(p => p !== pB));
          if (connected.length === 2 && isPerpendicular(connected[0], pB, connected[1])) {
            rightAngles++;
          }
        }
        if (rightAngles !== 4) return false;

        // Square: all sides equal
        const lengths = lines.map(l => getDistanceSq(l[0], l[1]));
        const allEqual = lengths.every(l => l === lengths[0]);
        
        if (task === 'square') return allEqual;
        if (task === 'rectangle') return !allEqual;
      }

      return false;
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
    
    // Check for explicit misconceptions defined in the template config
    if (Array.isArray(config.misconceptions)) {
      const normalizedInput = typeof answer === 'object' && answer !== null
        ? String(Object.values(answer)[0] || '').trim().toLowerCase()
        : String(answer || '').trim().toLowerCase();

      const matched = config.misconceptions.find(m => 
        String(m.answer || m.value || '').trim().toLowerCase() === normalizedInput
      );
      if (matched) return String(matched.code || matched.misconceptionCode);
    }

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
      
      // Check for adding digits instead of place values (e.g. 23 -> 5)
      if (expectedNumeric >= 10 && expectedNumeric <= 99) {
        const tens = Math.floor(expectedNumeric / 10);
        const ones = expectedNumeric % 10;
        if (actualNumeric === (tens + ones)) return 'sum_of_digits_error';
      }

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
  currentQuestion = null,
}) {
  const recentSet = new Set((recentQuestionIds || []).map(id => getBaseId(id)));
  const remediationRecentSet = new Set((remediationRecentQuestionIds || []).map(id => getBaseId(id)));
  if (excludeQuestionId) recentSet.add(getBaseId(excludeQuestionId));
  const currentSignature = getQuestionPromptSignature(
    currentQuestion || questions.find((q) => String(q.id) === String(excludeQuestionId || ''))
  );

  const candidates = questions.filter((q) => !recentSet.has(getBaseId(q.id)));
  // Full-cycle behavior: only repeat after all questions are used.
  // If cycle is exhausted, start a new cycle but still avoid immediate same-question replay.
  const poolCandidates = questions.filter((q) => getBaseId(q.id) !== getBaseId(excludeQuestionId));
  const pool = candidates.length > 0
    ? candidates
    : (poolCandidates.length > 0 ? poolCandidates : questions);

  const normalizedTarget = normalizeDifficulty(targetDifficulty);
  const debug = {
    totalQuestions: questions.length,
    unseenQuestions: candidates.length,
    poolQuestions: pool.length,
    targetDifficulty: normalizedTarget,
    recentCount: recentSet.size,
    currentSignature,
  };

  const preferDistinctPrompt = (items) => {
    if (!currentSignature || !Array.isArray(items) || items.length <= 1) return items;
    const distinct = items.filter((question) => getQuestionPromptSignature(question) !== currentSignature);
    return distinct.length > 0 ? distinct : items;
  };

  if (pool.length === 0) return { question: null, reason: 'no_questions', debug };

  // 0. Remediation Logic (High Priority)
  const remediationCode = String(remediation?.misconceptionCode ?? '').trim();
  const remediationEnabled = Boolean(remediationCode) && Number(remediation?.remaining ?? 0) > 0;
  if (remediationEnabled) {
    const remediationPool = pool.filter((q) => {
      const codes = getQuestionRemediationCodes(q);
      const hasMatchingCode = codes.some((code) => String(code).toLowerCase() === remediationCode.toLowerCase());
      
      const isDynamic = Boolean(q.logic_type || q.adaptiveConfig?.logic_type);
      const notRecentlyUsedForRemediation = isDynamic || !remediationRecentSet.has(String(q.id));
      
      return hasMatchingCode && notRecentlyUsedForRemediation;
    });

    if (remediationPool.length > 0) {
      const byDifficulty = remediationPool.filter((q) => normalizeDifficulty(q.difficulty) === normalizedTarget);
      const preferred = preferDistinctPrompt(byDifficulty.length > 0 ? byDifficulty : remediationPool);
      const randomIndex = Math.floor(Math.random() * preferred.length);
      return {
        question: preferred[randomIndex],
        reason: 'misconception_remediation',
        debug,
      };
    }
    // If we are in remediation mode but no specific remediation questions are found, 
    // fall through to normal selection so the user doesn't get a blank screen.
  }

  // 1. Try for target difficulty in candidates (unseen questions)
  const sameDifficultyCandidates = preferDistinctPrompt(
    candidates.filter((q) => 
      normalizeDifficulty(q.difficulty) === normalizedTarget && 
      !q.adaptiveConfig?.isRemediation
    )
  );
  if (sameDifficultyCandidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * sameDifficultyCandidates.length);
    return {
      question: sameDifficultyCandidates[randomIndex],
      reason: 'target_band_reinforcement',
      debug: { ...debug, searchStage: 'unseen_target' }
    };
  }

  // 2. If target band is exhausted in candidates, check if we can repeat a question of the SAME difficulty
  const sameDifficultyRepeats = preferDistinctPrompt(questions.filter((q) => {
    if (normalizeDifficulty(q.difficulty) !== normalizedTarget) return false;
    if (q.adaptiveConfig?.isRemediation) return false; // Exclude remediation from normal repeats
    
    // Allow immediate repeats if it's a dynamic template generator
    const isDynamicGenerator = Boolean(q.logic_type || q.logicType || q.adaptiveConfig?.logic_type);
    if (isDynamicGenerator) return true;

    return getBaseId(q.id) !== getBaseId(excludeQuestionId);
  }));
  if (sameDifficultyRepeats.length > 0) {
    const randomIndex = Math.floor(Math.random() * sameDifficultyRepeats.length);
    return {
      question: sameDifficultyRepeats[randomIndex],
      reason: 'target_band_cycle_repeat',
      debug: { ...debug, searchStage: 'seen_target_repeat' }
    };
  }

  // 3. Fallback to pool (adjacent or any available)
  const same = preferDistinctPrompt(pool.filter((q) => 
    normalizeDifficulty(q.difficulty) === normalizedTarget && 
    !q.adaptiveConfig?.isRemediation
  ));
  if (same.length > 0) {
    const randomIndex = Math.floor(Math.random() * same.length);
    return { question: same[randomIndex], reason: 'pool_target_fallback', debug };
  }

  const currentIdx = DIFFICULTIES.indexOf(normalizedTarget);
  const nearbyPool = preferDistinctPrompt(pool.filter((q) => {
    if (q.adaptiveConfig?.isRemediation) return false;
    const qIdx = DIFFICULTIES.indexOf(normalizeDifficulty(q.difficulty));
    return Math.abs(qIdx - currentIdx) === 1;
  }));
  if (nearbyPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * nearbyPool.length);
    return { question: nearbyPool[randomIndex], reason: 'adjacent_band_fallback', debug };
  }

  const finalPool = preferDistinctPrompt(pool.filter(q => !q.adaptiveConfig?.isRemediation));
  if (finalPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * finalPool.length);
    return { question: finalPool[randomIndex], reason: 'any_available_unseen', debug };
  }

  // LAST RESORT: Repeat a normal question from the entire list
  const allNormal = questions.filter(q => !q.adaptiveConfig?.isRemediation);
  if (allNormal.length > 0) {
    const randomIndex = Math.floor(Math.random() * allNormal.length);
    return { question: allNormal[randomIndex], reason: 'repeat_fallback', debug };
  }

  return { question: null, reason: 'exhausted', debug };
}

export function appendCycleRecentQuestionIds({
  prevRecentQuestionIds = [],
  newQuestionId = null,
  availableQuestionIds = [],
}) {
  const available = Array.from(new Set((availableQuestionIds || []).map(id => getBaseId(id))));
  const availableSet = new Set(available);
  if (available.length === 0) return [];

  const seen = [];
  const seenSet = new Set();
  for (const id of (prevRecentQuestionIds || []).map(id => getBaseId(id))) {
    if (!availableSet.has(id)) continue;
    if (seenSet.has(id)) continue;
    seenSet.add(id);
    seen.push(id);
  }

  const nid = getBaseId(newQuestionId);
  if (newQuestionId && availableSet.has(nid) && !seenSet.has(nid)) {
    seen.push(nid);
    seenSet.add(nid);
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

  // Difficulty is now strictly driven by streaks in computeSessionUpdate
  let difficultyBand = prevDifficulty;

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
  
  let phase = priorPhase;
  let difficulty = String(prevSession?.active_difficulty || prevSession?.difficulty || 'easy').toLowerCase();
  
  // --- STRICT ADAPTIVE FLOW (User Requested) ---
  
  // 1. Difficulty Progression
  if (isCorrect) {
    if (difficulty === 'easy' && currentStreak >= 5) {
      difficulty = 'medium';
    } else if (difficulty === 'medium' && currentStreak >= 15) {
      // 5 for Easy + 10 for Medium = 15 total streak
      difficulty = 'hard';
    }
  } else {
    // 2. Difficulty Regression (Immediate Drop)
    if (difficulty === 'hard') {
      difficulty = 'medium';
    } else if (difficulty === 'medium') {
      difficulty = 'easy';
    }
  }

  // 3. Phase Management
  if (difficulty === 'hard') {
    phase = priorPhase === 'recovery' ? 'recovery' : 'challenge';
  } else if (difficulty === 'medium') {
    phase = priorPhase === 'warmup' ? 'core' : (priorPhase === 'recovery' ? 'recovery' : 'core');
  } else {
    // Warmup is only for the first 3 questions ever
    phase = askedCount <= 3 ? 'warmup' : (priorPhase === 'recovery' ? 'recovery' : 'core');
  }

  // 4. Recovery Logic Override
  if (!isCorrect && (priorPhase === 'challenge' || priorPhase === 'core')) {
    phase = 'recovery';
  }
  if (priorPhase === 'recovery' && currentStreak >= 2) {
    // Exit recovery after 2 correct in a row
    phase = currentSmartScore >= 80 ? 'challenge' : 'core';
  }

  const accuracy = askedCount > 0 ? correctCount / askedCount : 0;
  
  // 5. Completion Logic (Smart Score 100)
  const isDone = currentSmartScore >= 99 && isCorrect; 
  if (isDone) phase = 'done';

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
    // Increased base gain to target ~6-10 points per question
    const baseGain = 2.5 + (safeMastery * 2.0) + (safeConfidence * 1.5);
    const streakBoost = Math.min(1.4, 1 + (Math.max(0, streak) * 0.05));
    
    // Higher difficulty impact
    const adjDiffWeight = 1.0 + (difficultyWeight - 1) * 0.8; 
    const adjPhaseWeight = 1.0 + (phaseWeight - 1) * 0.8;

    const raw = (baseGain * adjDiffWeight * adjPhaseWeight * streakBoost) - (fastGuessPenalty * 0.5);
    const delta = Math.round(Math.max(2, Math.min(12, raw))); // Cap gain at 12
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
