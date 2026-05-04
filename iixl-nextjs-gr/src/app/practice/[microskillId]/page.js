'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { backendUrl } from '@/lib/backend/url';
import QuestionRenderer from '@/components/practice/QuestionRenderer';
import QuestionParts from '@/components/practice/QuestionParts';
import WorkPad from '@/components/practice/WorkPad';
import SafeImage from '@/components/practice/SafeImage';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from '@/components/practice/contentUtils';
import styles from './practice.module.css';

const CHALLENGE_STAGES = [
  { stage: 1, tokensNeeded: 5, label: 'Stage 1 of 3' },
  { stage: 2, tokensNeeded: 10, label: 'Stage 2 of 3' },
  { stage: 3, tokensNeeded: 15, label: 'Stage 3 of 3' },
];
const SUBMIT_TIMEOUT_MS = 8000;
const SUBMIT_RETRY_DELAYS_MS = [300, 700];
const ENABLE_ADAPTIVE = true;

function parseSolutionParts(solution) {
  if (Array.isArray(solution)) return solution;

  if (solution && typeof solution === 'object') {
    if (solution.type && solution.content !== undefined) return [solution];
    return null;
  }

  if (typeof solution !== 'string') return null;
  const trimmed = solution.trim();
  if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && parsed.type && parsed.content !== undefined) {
      return [parsed];
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeSolutionSections(solutionParts) {
  if (!Array.isArray(solutionParts)) return [];

  return solutionParts
    .filter((item) => item && typeof item === 'object' && String(item.type || '').toLowerCase() === 'section')
    .map((section) => {
      const label = String(section.label || section.tag || 'solve').toLowerCase();
      const title = String(section.title || '');
      const parts = Array.isArray(section.contentParts)
        ? section.contentParts
        : Array.isArray(section.parts)
          ? section.parts
          : Array.isArray(section.contents)
            ? section.contents
            : [];
      return { label, title, parts };
    })
    .filter((section) => section.parts.length > 0 || section.title);
}

const parseMaybeJson = (text, fallback = null) => {
  if (text == null) return fallback;
  if (typeof text === 'object') return text;
  if (typeof text !== 'string') return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

function parseFinite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFraction(text) {
  const source = String(text ?? '').trim();
  const direct = source.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (direct) {
    return { numerator: Number(direct[1]), denominator: Number(direct[2]) };
  }
  const embedded = source.match(/(-?\d+)\s*\/\s*(\d+)/);
  if (embedded) {
    return { numerator: Number(embedded[1]), denominator: Number(embedded[2]) };
  }
  return null;
}

function getShadeGridShape(question) {
  const config = question?.adaptiveConfig || {};
  const orientation = String(
    config.orientation || config.gridOrientation || config.barOrientation || 'vertical'
  ).toLowerCase() === 'horizontal' ? 'horizontal' : 'vertical';
  const gridMode = String(config.gridMode || 'auto').toLowerCase();
  const fraction = (
    parseFraction(question?.correctAnswerText) ||
    (Array.isArray(question?.parts)
      ? question.parts.map((p) => parseFraction(p?.content)).find(Boolean)
      : null) ||
    (parseFinite(config.numerator) != null && parseFinite(config.denominator) != null
      ? { numerator: parseFinite(config.numerator), denominator: parseFinite(config.denominator) }
      : null)
  );
  const denominator = parseFinite(config.denominator) ?? fraction?.denominator ?? null;
  const useFractionBar = (
    gridMode === 'fractionbar' ||
    (gridMode === 'auto' && denominator && denominator > 1 && denominator <= 20)
  );

  let rows = parseFinite(config.gridRows);
  let cols = parseFinite(config.gridCols);
  if (useFractionBar && denominator) {
    if (orientation === 'horizontal') {
      rows = denominator;
      cols = 1;
    } else {
      rows = 1;
      cols = denominator;
    }
  } else if (!(rows && cols)) {
    rows = 10;
    cols = 10;
  }

  rows = Math.max(1, Math.min(20, Math.floor(rows || 10)));
  cols = Math.max(1, Math.min(20, Math.floor(cols || 10)));
  return { rows, cols, totalCells: rows * cols, fraction };
}

function getShadeGridCorrectAnswer(question, correctAnswerHint = null) {
  if (!question || question.type !== 'shadeGrid') return null;
  const config = question?.adaptiveConfig || {};
  const shape = getShadeGridShape(question);

  const explicitTarget = parseFinite(config.targetShaded);
  const explicitNumber = parseFinite(question.correctAnswerText);
  const hintNumber = parseFinite(correctAnswerHint);
  const fractionTarget = shape.fraction
    ? Math.round((shape.fraction.numerator / shape.fraction.denominator) * shape.totalCells)
    : null;
  const targetRaw = explicitTarget ?? fractionTarget ?? explicitNumber ?? hintNumber ?? 0;
  const target = Math.max(0, Math.min(shape.totalCells, Math.round(targetRaw)));

  return {
    selected: Array.from({ length: target }, (_, i) => String(i)),
    count: target,
  };
}

function getCorrectAnswerDisplay(question) {
  if (!question) return '';

  const type = String(question.type || '').toLowerCase();
  switch (type) {
    case 'mcq':
    case 'imagechoice': {
      if (question.isMultiSelect) {
        const indices = Array.isArray(question.correctAnswerIndices) ? question.correctAnswerIndices : [];
        const labels = indices.map((idx) => getOptionLabel(question.options?.[idx], Number(idx)));
        return labels.join(', ');
      }

      const idx = Number(question.correctAnswerIndex);
      if (!Number.isFinite(idx) || idx < 0) return '';
      return getOptionLabel(question.options?.[idx], idx);
    }

    case 'textinput':
    case 'measure':
    case 'fourpicsoneword':
    case 'shadegrid':
      return String(question.correctAnswerText || '');

    case 'fillintheblank':
    case 'gridarithmetic':
    case 'table':
    case 'smarttable': {
      const parsed = parseMaybeJson(question.correctAnswerText, {});
      if (!parsed || typeof parsed !== 'object') return String(question.correctAnswerText || '');
      const keys = Object.keys(parsed);
      const digitKeys = keys.filter(k => k.startsWith('digit_'));
      if (digitKeys.length > 0) {
        return digitKeys.sort((a,b) => {
           const valA = parseInt(a.split('_')[1]) || 0;
           const valB = parseInt(b.split('_')[1]) || 0;
           return valA - valB;
        }).map(k => parsed[k]).join('');
      }
      const entries = Object.entries(parsed);
      if (entries.length === 0) return String(question.correctAnswerText || '');
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    }

    case 'sorting': {
      const orderedIds = parseMaybeJson(question.correctAnswerText, []);
      if (Array.isArray(orderedIds) && orderedIds.length > 0 && Array.isArray(question.items)) {
        const labelById = new Map(question.items.map((item) => [String(item.id), String(item.content ?? item.id)]));
        return orderedIds.map((id) => labelById.get(String(id)) || String(id)).join(', ');
      }
      return String(question.correctAnswerText || '');
    }

    case 'draganddrop':
    case 'draganddropv2': {
      const dragItems = Array.isArray(question.dragItems) ? question.dragItems : [];
      const dropGroups = Array.isArray(question.dropGroups) ? question.dropGroups : [];
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

      return summaries.length > 0 ? summaries.join(' | ') : 'No targets defined';
    }

    case 'tokenselection':
    case 'tokenselectionv2': {
      let ids = [];
      if (Array.isArray(question.correctAnswerIndices) && question.correctAnswerIndices.length > 0) {
        ids = question.correctAnswerIndices;
      } else {
        const rawText = question.correctAnswerText;
        if (Array.isArray(rawText)) {
          ids = rawText;
        } else {
          try {
            const parsed = JSON.parse(String(rawText || '[]'));
            ids = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            ids = rawText ? [rawText] : [];
          }
        }
      }

      const parts = Array.isArray(question.parts) ? question.parts : [];
      const sentencePart = parts.find(p => p.type === 'token_sentence');
      let tokenArr = [];
      
      if (sentencePart && Array.isArray(sentencePart.tokens)) {
        tokenArr = sentencePart.tokens;
      } else if (Array.isArray(question.options) && question.options.length > 0) {
        tokenArr = question.options.map((opt, idx) => ({
          id: String(idx),
          text: typeof opt === 'object' && opt !== null ? (opt.text || opt.label || opt.content || '') : String(opt ?? ''),
          content: typeof opt === 'object' && opt !== null ? (opt.content || opt.text || opt.label || '') : String(opt ?? ''),
        }));
      } else if (parts.some(p => p.type === 'token')) {
        tokenArr = parts.filter(p => p.type === 'token');
      } else {
        tokenArr = Array.isArray(question.tokens) ? question.tokens : [];
      }
      
      const labels = ids.map(id => {
        const token = tokenArr.find(t => String(t.id) === String(id));
        return token ? (token.text || token.content || token) : id;
      });

      return labels.length > 0 ? labels.join(', ') : 'No answer';
    }

    default:
      return String(question.correctAnswerText || '');
  }
}

function isVisualOption(option) {
  if (typeof option !== 'string') return false;
  const value = option.trim().toLowerCase();
  return (
    value.startsWith('<svg') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:image/')
  );
}

function getOptionLabel(option, index) {
  if (typeof option === 'object' && option !== null) {
    const label = option.label ?? option.text ?? option.content ?? '';
    if (label) return String(label);
  }
  if (typeof option === 'string' && !isVisualOption(option)) return option;
  return `Option ${index + 1}`;
}

function renderMaybeInlineHtml(value, className = '') {
  const normalized = String(value ?? '');
  if (!normalized) return null;

  if (hasInlineHtml(normalized)) {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(normalized) }}
      />
    );
  }

  // Markdown parsing for the plain text case
  // Check for markdown table
  if (normalized.includes('|') && normalized.includes('---')) {
    const lines = normalized.trim().split('\n');
    const tableLines = lines.filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));

    if (tableLines.length >= 3) {
      const parseRow = (line) =>
        line
          .trim()
          .split('|')
          .filter((_, i, arr) => i > 0 && i < arr.length - 1)
          .map((c) => c.trim());
      const headers = parseRow(tableLines[0]);
      const separator = parseRow(tableLines[1]);

      if (separator.every((s) => s.includes('-'))) {
        const rows = tableLines.slice(2).map(parseRow);
        return (
          <div className={styles.markdownTableWrap}>
            <table className={styles.smartTable}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={styles.smartTableHeaderCell}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={styles.smartTableCell}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
  }

  const tokens = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
          return <strong key={`md-b-${idx}`}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
          return <em key={`md-i-${idx}`}>{token.slice(1, -1)}</em>;
        }
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
          return <code key={`md-c-${idx}`}>{token.slice(1, -1)}</code>;
        }
        return <span key={`md-t-${idx}`}>{token}</span>;
      })}
    </span>
  );
}

function getSelectedAnswerDisplay(question, answer) {
  if (!question || answer === null || answer === undefined) return '';
  const type = String(question.type || '').trim().toLowerCase();

  const getOptionLabel = (option, index) => {
    if (typeof option === 'object' && option !== null) {
      const label = option.label ?? option.text ?? option.content ?? '';
      if (label) return String(label);
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

  if (type === 'mcq' || type === 'imagechoice') {
    if (question.isMultiSelect) {
      const indices = Array.isArray(answer) ? answer.map(Number).filter(Number.isFinite) : [];
      return indices.map((idx) => getOptionLabel(question.options?.[idx], idx)).join(', ');
    }
    const idx = Number(answer);
    if (Number.isFinite(idx) && idx >= 0) {
      return getOptionLabel(question.options?.[idx], idx);
    }
    return 'No option selected';
  }

  if (type === 'tokenselection' || type === 'tokenselectionv2') {
    let ids = [];
    if (Array.isArray(answer)) {
      ids = answer;
    } else {
      try {
        const parsed = JSON.parse(String(answer || '[]'));
        ids = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        ids = answer ? [answer] : [];
      }
    }

    const parts = Array.isArray(question.parts) ? question.parts : [];
    const sentencePart = parts.find(p => p.type === 'token_sentence');
    let tokenArr = [];
    
    if (sentencePart && Array.isArray(sentencePart.tokens)) {
      tokenArr = sentencePart.tokens;
    } else if (Array.isArray(question.options) && question.options.length > 0) {
      tokenArr = question.options.map((opt, idx) => ({
        id: String(idx),
        text: typeof opt === 'object' && opt !== null ? (opt.text || opt.label || opt.content || '') : String(opt ?? ''),
        content: typeof opt === 'object' && opt !== null ? (opt.content || opt.text || opt.label || '') : String(opt ?? ''),
      }));
    } else if (parts.some(p => p.type === 'token')) {
      tokenArr = parts.filter(p => p.type === 'token');
    } else {
      tokenArr = Array.isArray(question.tokens) ? question.tokens : [];
    }
    
    const labels = ids.map(id => {
      const token = tokenArr.find(t => String(t.id) === String(id));
      return token ? (token.text || token.content || token) : id;
    });

    return labels.length > 0 ? labels.join(', ') : 'No selection';
  }

  if (type === 'sorting') {
    if (Array.isArray(answer)) {
       return answer.map(id => {
          const item = (question.items || []).find(it => String(it.id) === String(id));
          return item?.content || id;
       }).join(', ');
    }
    return 'No order set';
  }

  if (type === 'draganddrop' || type === 'draganddropv2' || type === 'draganddropv3') {
    if (!answer || typeof answer !== 'object') return 'No answer';
    const dragItems = Array.isArray(question.dragItems) ? question.dragItems : [];
    const dropGroups = Array.isArray(question.dropGroups) ? question.dropGroups : [];
    const groupLabelById = Object.fromEntries(
      dropGroups.map((group) => [String(group.id), String(group.label || group.id)])
    );

    const grouped = dropGroups.map((group) => {
      const labels = Object.entries(answer)
        .filter(([, groupId]) => String(groupId) === String(group.id))
        .map(([itemId]) => {
          const item = dragItems.find((entry) => String(entry.id) === String(itemId));
          return item?.content || itemId;
        });
      return labels.length > 0 ? `${groupLabelById[String(group.id)]}: ${labels.join(', ')}` : null;
    }).filter(Boolean);

    return grouped.length > 0 ? grouped.join(' | ') : 'No answer';
  }

  if (
    type === 'fillintheblank' ||
    type === 'gridarithmetic' ||
    type === 'table' ||
    type === 'smarttable'
  ) {
    if (!answer || typeof answer !== 'object') return 'No answer';
    
    // Find arithmetic IDs (prefixed with a_ for addition, d_ for subtraction, or digit_ for new templates)
    // Filter out scaffolding work keys (prefixed with scaffold_)
    const keys = Object.keys(answer);
    const answerKeys = keys.filter(k => !k.startsWith('scaffold_') && (k.startsWith('a_') || k.startsWith('d_') || k.startsWith('digit_')));
    
    if (answerKeys.length > 0) {
      // Sort by suffix number
      const sorted = answerKeys.sort((a, b) => {
        const partsA = a.split('_');
        const partsB = b.split('_');
        const valA = parseInt(partsA[partsA.length - 1]) || 0;
        const valB = parseInt(partsB[partsB.length - 1]) || 0;
        
        // Reverse sort for place-value (a_100, a_10, a_1)
        if (a.startsWith('a_') || a.startsWith('d_')) return valB - valA;
        // Forward sort for visual order (digit_0, digit_1, digit_2)
        return valA - valB;
      });
      const joined = sorted.map(k => String(answer[k] ?? '')).join('');
      return joined || 'No answer';
    }

    const entries = Object.entries(answer).filter(([k, v]) => {
      // Filter out scaffolding and complex state objects (like drag-drop positions)
      if (k.startsWith('scaffold_')) return false;
      if (typeof v === 'object' && v !== null) return false;
      return true;
    });
    if (entries.length === 0) return 'Interactive Task';
    return entries.map(([k, v]) => String(v)).join(', ');
  }

  if (type === 'shadegrid') {
    if (Array.isArray(answer)) return String(answer.length);
    if (answer && typeof answer === 'object') {
      if (Array.isArray(answer.selected)) return String(answer.selected.length);
      if (answer.count != null) return String(answer.count);
    }
    return String(answer ?? '');
  }

  if (Array.isArray(answer)) {
    return answer.join(', ');
  }

  if (answer && typeof answer === 'object') {
    try {
      return JSON.stringify(answer);
    } catch {
      return '';
    }
  }

  return String(answer ?? '');
}

function getOptionObject(question, answer) {
  if (!question) return null;
  const type = String(question.type || '').trim().toLowerCase();
  if (type !== 'mcq' && type !== 'imagechoice') return null;

  const options = Array.isArray(question.options) ? question.options : [];
  if (question.isMultiSelect) {
    const indices = Array.isArray(answer) ? answer.map(Number).filter(Number.isFinite) : [];
    return indices.map((idx) => options[idx]).filter(Boolean);
  }

  const idx = Number(answer);
  if (Number.isFinite(idx) && idx >= 0) {
    return options[idx] ?? null;
  }
  return null;
}

function renderOptionPreview(option, fallbackIndex = 0) {
  if (option == null) return null;

  const actual = Array.isArray(option) && option.length > 0 ? option[0] : option;
  if (actual && typeof actual === 'object' && Array.isArray(actual.parts)) {
    return <QuestionParts parts={actual.parts} />;
  }

  const imageSrc = getImageSrc(actual);
  if (typeof actual === 'object' && actual !== null) {
    const inlineSvgMarkup = isInlineSvg(actual.imageUrl || actual.content || actual.src || '') || isInlineSvg(imageSrc)
      ? (actual.imageUrl || actual.content || actual.src || imageSrc)
      : null;
    const label = actual.label || actual.text || actual.content || '';

    if (inlineSvgMarkup) {
      return <div dangerouslySetInnerHTML={{ __html: inlineSvgMarkup }} />;
    }

    if (isImageUrl(imageSrc)) {
      return (
        <SafeImage
          src={imageSrc}
          alt={label || `Option ${fallbackIndex + 1}`}
          width={160}
          height={120}
          sizes="160px"
        />
      );
    }

    if (label) {
      return renderMaybeInlineHtml(String(label));
    }
  }

  if (typeof actual === 'string') {
    const trimmed = actual.trim();
    if (isInlineSvg(trimmed)) {
      return <div dangerouslySetInnerHTML={{ __html: trimmed }} />;
    }
    if (isImageUrl(trimmed)) {
      return <SafeImage src={trimmed} alt={`Option ${fallbackIndex + 1}`} width={160} height={120} sizes="160px" />;
    }
    if (hasInlineHtml(trimmed)) {
      return <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(trimmed) }} />;
    }
    return <span>{trimmed || `Option ${fallbackIndex + 1}`}</span>;
  }

  return <span>{`Option ${fallbackIndex + 1}`}</span>;
}

function getCurrentGuestId() {
  if (typeof window === 'undefined') return null;
  const key = 'wexls_guest_id';
  const legacyKey = 'practice_student_id';
  return window.localStorage.getItem(key) || window.localStorage.getItem(legacyKey);
}

function getOrCreateGuestId() {
  if (typeof window === 'undefined') return null;
  const existing = getCurrentGuestId();
  if (existing) return existing;

  const key = 'wexls_guest_id';
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

function getAdaptiveSessionStorageKey(skillId) {
  return `adaptive_session_${String(skillId)}`;
}

function getStoredAdaptiveSessionId(skillId) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getAdaptiveSessionStorageKey(skillId));
}

function setStoredAdaptiveSessionId(skillId, sessionId) {
  if (typeof window === 'undefined' || !sessionId) return;
  window.localStorage.setItem(getAdaptiveSessionStorageKey(skillId), String(sessionId));
}

async function resolveStudentId() {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const authUserId = data?.user?.id ? String(data.user.id) : '';

    // If not logged in, return current or new guest ID
    if (!authUserId) return getOrCreateGuestId();

    // If logged in, check if there's a PENDING guest session to merge
    const guestId = getCurrentGuestId();
    if (typeof window !== 'undefined' && guestId && guestId !== authUserId) {
      try {
        await fetch('/api/adaptive/merge-guest-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestStudentId: guestId,
            userStudentId: authUserId,
          }),
        });
        // Remove guest evidence so we don't try to merge again
        window.localStorage.removeItem('wexls_guest_id');
        window.localStorage.removeItem('practice_student_id');
      } catch (err) {
        console.error('Merge error:', err);
      }
    }
    return authUserId;
  } catch {
    return getOrCreateGuestId();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitWithRetry(url, body) {
  let lastErrorMessage = 'Could not fetch next adaptive question.';

  for (let attempt = 0; attempt <= SUBMIT_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await res.json();
      clearTimeout(timeoutId);

      if (!res.ok) {
        lastErrorMessage = payload.error || lastErrorMessage;
        throw new Error(lastErrorMessage);
      }

      return payload;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        lastErrorMessage = 'Request timed out. Please try again.';
      } else if (error?.message) {
        lastErrorMessage = error.message;
      }

      if (attempt < SUBMIT_RETRY_DELAYS_MS.length) {
        await delay(SUBMIT_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(lastErrorMessage);
    }
  }

  throw new Error(lastErrorMessage);
}

function computeSmartScoreDelta({
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
    const baseGain = 2.6 + (safeMastery * 2.8) + (safeConfidence * 1.6);
    const streakBoost = Math.min(1.35, 1 + (Math.max(0, streak) * 0.06));
    const raw = (baseGain * difficultyWeight * phaseWeight * streakBoost) - fastGuessPenalty - lowConfidencePenalty;
    const delta = Math.round(Math.max(1, raw));
    return {
      delta,
      details: {
        ...details,
        mode: 'gain',
        base: baseGain,
        streakBoost,
      },
    };
  }

  const baseLoss = 3.8 + (Math.max(0, missStreak) * 0.8);
  const phaseLossWeight = String(phase || 'core').toLowerCase() === 'recovery' ? 0.8 : 1.0;
  const difficultyLossWeight = 0.85 + ((difficultyWeight - 1) * 0.5);
  const raw = (baseLoss * phaseLossWeight * difficultyLossWeight) + fastGuessPenalty;
  const delta = -Math.round(Math.max(2, raw));
  return {
    delta,
    details: {
      ...details,
      mode: 'loss',
      base: baseLoss,
      phaseLossWeight,
      difficultyLossWeight,
      missStreak: Math.max(0, missStreak),
    },
  };
}

export default function PracticePage() {
  const params = useParams();
  const { microskillId } = params;
  const getSeenStorageKey = (skillId) => `practice-seen:${skillId}`;

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [nextQuestion, setNextQuestion] = useState(null);
  const [seenQuestionIds, setSeenQuestionIds] = useState([]);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitionStage, setTransitionStage] = useState('idle');
  const [curriculumContext, setCurriculumContext] = useState({
    grade: null,
    subject: null,
    microskill: null,
  });
  const [feedbackData, setFeedbackData] = useState(null);
  const [adaptiveSessionId, setAdaptiveSessionId] = useState(null);
  const [usingAdaptiveApi, setUsingAdaptiveApi] = useState(true);
  const [adaptiveMeta, setAdaptiveMeta] = useState(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [currentStudentId, setCurrentStudentId] = useState('');

  const [userAnswer, setUserAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const [smartScore, setSmartScore] = useState(0);
  const [smartScoreBreakdown, setSmartScoreBreakdown] = useState(null);
  const [streak, setStreak] = useState(0);
  const [missStreak, setMissStreak] = useState(0);
  const [adaptivePhase, setAdaptivePhase] = useState('warmup');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [tokensCollected, setTokensCollected] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWorkPadOpen, setIsWorkPadOpen] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [exampleQuestion, setExampleQuestion] = useState(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showDebugTable, setShowDebugTable] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const currentChallengeStage = CHALLENGE_STAGES[currentStage];
  const teacherToolsHref = currentStudentId
    ? `/teacher/analytics?studentId=${encodeURIComponent(currentStudentId)}&microSkillId=${encodeURIComponent(String(microskillId || ''))}`
    : '/teacher/analytics';
  const withSubmitBehavior = (question) => {
    if (!question) return question;
    if (question.isMultiSelect) {
      return { ...question, showSubmitButton: true };
    }
    if (question.type !== 'mcq') {
      return { ...question, showSubmitButton: true };
    }
    return question;
  };

  const { microskill, subject, grade } = curriculumContext;
  const skillTitle = microskill ? `${microskill.code} ${microskill.name}` : `Skill ${microskillId}`;
  const showExampleButton = Boolean(currentQuestion?.show_example ?? currentQuestion?.showExample ?? false);
  const solutionParts = parseSolutionParts(feedbackData?.solution);
  const solutionSections = normalizeSolutionSections(solutionParts);
  const hasStructuredSolution = solutionSections.length > 0;
  const correctAnswerDisplay = (() => {
    const fromFeedback = feedbackData?.correctAnswerDisplay;
    if (fromFeedback) return fromFeedback;
    
    const text = currentQuestion?.correctAnswerText;
    if (text && typeof text === 'string' && text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        return getSelectedAnswerDisplay(currentQuestion, parsed);
      } catch (e) {
        return text;
      }
    }
    return String(text || '');
  })();
  const selectedAnswerDisplay = getSelectedAnswerDisplay(currentQuestion, userAnswer);
  const shadeGridCorrectAnswer = getShadeGridCorrectAnswer(currentQuestion, correctAnswerDisplay);
  const isFillInTheBlankType = ['fillInTheBlank', 'smartTable', 'table', 'gridArithmetic', 'longMultiplication', 'longDivision'].includes(currentQuestion?.type);
  const correctFillInTheBlankAnswer = isFillInTheBlankType ? (
    (typeof feedbackData?.correctAnswerText === 'object' && feedbackData?.correctAnswerText !== null)
      ? feedbackData.correctAnswerText
      : (parseMaybeJson(feedbackData?.correctAnswerText, feedbackData?.correctAnswerText))
  ) : null;
  const isJourney = currentQuestion?.type === 'journey_v1';

  const reviewQuestion =
    currentQuestion?.type === 'shadeGrid' && shadeGridCorrectAnswer
      ? {
        ...withSubmitBehavior(currentQuestion),
        adaptiveConfig: {
          ...(currentQuestion?.adaptiveConfig || {}),
          targetShaded: shadeGridCorrectAnswer.count,
        },
      }
      : withSubmitBehavior(currentQuestion);
  const isOptionType = currentQuestion?.type === 'mcq' || currentQuestion?.type === 'imageChoice';
  const selectedIndexSet = currentQuestion?.isMultiSelect
    ? new Set(Array.isArray(userAnswer) ? userAnswer.map((value) => Number(value)) : [])
    : new Set(Number.isFinite(Number(userAnswer)) ? [Number(userAnswer)] : []);
  const correctIndexSet = new Set(
    Array.isArray(feedbackData?.correctOptionIndices)
      ? feedbackData.correctOptionIndices.map((value) => Number(value))
      : []
  );
  const selectedAnswerOption = getOptionObject(currentQuestion, userAnswer);
  const correctAnswerOption = currentQuestion?.isMultiSelect
    ? Array.from(correctIndexSet).map((idx) => currentQuestion?.options?.[idx]).filter(Boolean)
    : (Number.isFinite(Number(Array.from(correctIndexSet)[0])) ? currentQuestion?.options?.[Number(Array.from(correctIndexSet)[0])] : null);

  useEffect(() => {
    if (!microskillId || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        getSeenStorageKey(microskillId),
        JSON.stringify(seenQuestionIds.map((id) => String(id)))
      );
    } catch {
      // Ignore storage failures.
    }
  }, [microskillId, seenQuestionIds]);

  useEffect(() => {
    let active = true;

    const loadFirstQuestion = async () => {
      setLoadingQuestion(true);
      setSubmitError('');
      setUserAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
      setNextQuestion(null);
      let persistedSeenIds = [];
      if (typeof window !== 'undefined' && microskillId) {
        try {
          const rawSeenIds = window.sessionStorage.getItem(getSeenStorageKey(microskillId));
          const parsedSeenIds = rawSeenIds ? JSON.parse(rawSeenIds) : [];
          persistedSeenIds = Array.isArray(parsedSeenIds)
            ? parsedSeenIds.map((id) => String(id)).filter(Boolean)
            : [];
        } catch {
          persistedSeenIds = [];
        }
      }
      setSeenQuestionIds(persistedSeenIds);
      setAdaptiveSessionId(null);
      setUsingAdaptiveApi(true);
      setAdaptiveMeta(null);
      setAdaptivePhase('warmup');
      setMissStreak(0);

      if (!microskillId) {
        setLoadingQuestion(false);
        return;
      }

      try {
        const studentId = await resolveStudentId();
        setCurrentStudentId(studentId || '');
        let firstQuestion = null;
        let adaptiveInitError = '';

        // Fetch curriculum context first to get the true UUID if using a slug
        const encodedParam = encodeURIComponent(microskillId || '');
        const curriculumRes = await fetch(`/api/curriculum/microskill/${encodedParam}`, { cache: 'no-store' });
        const curriculumPayload = await curriculumRes.json();
        if (!active) return;

        setCurriculumContext({
          grade: curriculumPayload.grade ?? null,
          subject: curriculumPayload.subject ?? null,
          microskill: curriculumPayload.microskill ?? null,
        });

        const actualMicroSkillId = curriculumPayload?.microskill?.id || microskillId;

        if (ENABLE_ADAPTIVE && studentId) {
          try {
            const sessionRes = await fetch('/api/adaptive/session/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId,
                microSkillId: actualMicroSkillId,
                sessionId: getStoredAdaptiveSessionId(actualMicroSkillId),
                includeFirstQuestion: true,
              }),
            });
            const sessionPayload = await sessionRes.json();
            if (!active) return;

            if (!sessionRes.ok || !sessionPayload.sessionId) {
              const reason = sessionPayload?.error || 'Adaptive session could not start.';
              throw new Error(reason);
            }

            setAdaptiveSessionId(String(sessionPayload.sessionId));
            setStoredAdaptiveSessionId(actualMicroSkillId, sessionPayload.sessionId);
            setAdaptivePhase(sessionPayload.phase || 'warmup');

            if (!sessionPayload.question) {
              const reason = sessionPayload?.error || 'Adaptive question selection failed.';
              throw new Error(reason);
            }

            firstQuestion = sessionPayload.question;
            setUsingAdaptiveApi(true);
            setAdaptiveMeta(sessionPayload.selectionMeta || null);
            console.log('Loaded first adaptive question:', firstQuestion.id, firstQuestion.difficulty);
          } catch (adaptiveError) {
            setUsingAdaptiveApi(false);
            setAdaptiveSessionId(null);
            adaptiveInitError = adaptiveError?.message || 'Adaptive init failed';
          }
        }

        if (!firstQuestion) {
          const excludeQuery = persistedSeenIds.length > 0
            ? `?${new URLSearchParams({ exclude: persistedSeenIds.join(',') }).toString()}`
            : '';
          const res = await fetch(`/api/practice/${actualMicroSkillId}${excludeQuery}`, { cache: 'no-store' });
          const payload = await res.json();
          if (!active) return;

          if (!payload?.question) {
            throw new Error(`No questions found in database for skill ID: "${actualMicroSkillId}" (original param: "${microskillId}")`);
          }

          firstQuestion = payload.question;
          if (adaptiveInitError) {
            setSubmitError(`Adaptive disabled: ${adaptiveInitError}`);
          }
        }

        setCurrentQuestion(firstQuestion);
        setQuestionStartedAt(Date.now());
        setSeenQuestionIds((prev) => {
          const merged = new Set(prev.map((id) => String(id)));
          if (firstQuestion?.id) merged.add(String(firstQuestion.id));
          return Array.from(merged);
        });
      } catch (error) {
        if (!active) return;
        setSubmitError(error?.message || 'Could not load first question. Please refresh.');
        setCurrentQuestion(null);
      } finally {
        if (!active) return;
        setLoadingQuestion(false);
      }
    };

    loadFirstQuestion();

    return () => {
      active = false;
    };
  }, [microskillId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hrs: String(hrs).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    };
  };

  const handleFetchExample = async () => {
    if (exampleQuestion) {
      setShowExampleModal(true);
      return;
    }

    setLoadingExample(true);
    setShowExampleModal(true);
    try {
      const res = await fetch(`/api/practice/${microskillId}/example`, { cache: 'no-store' });
      const payload = await res.json();
      if (res.ok && payload?.question) {
        setExampleQuestion(payload.question);
      } else {
        setSubmitError(payload?.error || 'No example available.');
      }
    } catch (err) {
      setSubmitError('Failed to fetch example.');
    } finally {
      setLoadingExample(false);
    }
  };

  const time = formatTime(elapsedTime);

  useEffect(() => {
    if (currentQuestion) {
      console.log("[WEXLS][Debug] Current Question:", currentQuestion);
    }
  }, [currentQuestion]);

  const [showDebugJson, setShowDebugJson] = useState(false);

  const applyNextQuestion = (upcoming) => {
    if (upcoming) {
      setCurrentQuestion(upcoming);
      setQuestionStartedAt(Date.now());
      setNextQuestion(null);
      setUserAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
      setSubmitError('');
      setTransitionStage('idle');
      return;
    }

    setCurrentQuestion(null);
    setUserAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setFeedbackData(null);
    setSubmitError('');
    setTransitionStage('idle');
  };

  const handleSubmit = async (answerPayload = userAnswer) => {
    // Safety check: if called by a button directly, answerPayload might be the Click Event
    const answer = (answerPayload && typeof answerPayload === 'object' && (answerPayload.nativeEvent || answerPayload.type))
      ? userAnswer
      : answerPayload;

    if (!currentQuestion || isAnswered || isSubmitting) return;
    setSubmitError('');
    setFeedbackData(null);
    setUserAnswer(answer);
    setIsAnswered(true); // optimistic: hide question immediately
    setIsCorrect(null); // pending server verdict

    setIsSubmitting(true);
    try {
      const studentId = currentStudentId || await resolveStudentId();
      if (studentId && !currentStudentId) setCurrentStudentId(studentId);
      const actualMicroSkillId = curriculumContext.microskill?.id || microskillId;
      const responseMs = Math.max(1, Date.now() - Number(questionStartedAt || Date.now()));
      const submitBody = {
        studentId,
        microSkillId: actualMicroSkillId,
        sessionId: adaptiveSessionId,
        questionId: currentQuestion.id,
        attemptId: crypto.randomUUID(),
        answer,
        responseMs,
        hintUsed: false,
        attemptsOnQuestion: 1,
        seenQuestionIds,
        adaptiveConfig: currentQuestion.adaptiveConfig,
        correctAnswerText: currentQuestion.correctAnswerText,
        questionSnapshot: currentQuestion,
      };

      console.log('Submit Body:', submitBody);
      let payload = null;
      if (ENABLE_ADAPTIVE && usingAdaptiveApi && adaptiveSessionId) {
        try {
          payload = await submitWithRetry('/api/adaptive/submit-and-next', submitBody);
        } catch (adaptiveError) {
          setUsingAdaptiveApi(false);
          setAdaptiveSessionId(null);
          setSubmitError(`Adaptive submit failed, switched to fallback mode: ${adaptiveError?.message || 'Unknown error'}`);
          payload = await submitWithRetry(`/api/practice/${actualMicroSkillId}/submit`, submitBody);
        }
      } else {
        payload = await submitWithRetry(`/api/practice/${actualMicroSkillId}/submit`, submitBody);
      }

      const correct = Boolean(payload?.result?.isCorrect ?? payload?.isCorrect);
      setIsCorrect(correct);
      setFeedbackData(payload?.result?.feedback || payload?.feedback || null);
      setQuestionsAnswered((prev) => prev + 1);
      const returnedPhase = payload?.sessionUpdate?.phase || adaptivePhase;
      setAdaptivePhase(returnedPhase);
      setAdaptiveMeta(payload?.selectionMeta || null);

      const nextStreak = payload?.sessionUpdate?.currentStreak ?? (correct ? streak + 1 : 0);
      const nextMissStreak = payload?.sessionUpdate?.missStreak ?? (correct ? 0 : missStreak + 1);
      setStreak(nextStreak);
      setMissStreak(nextMissStreak);

      const scoreResult = computeSmartScoreDelta({
        isCorrect: correct,
        masteryScore: payload?.masteryUpdate?.newScore,
        confidence: payload?.masteryUpdate?.confidence,
        difficulty: currentQuestion?.difficulty || payload?.masteryUpdate?.difficultyBand || 'easy',
        phase: returnedPhase,
        responseMs,
        streak: nextStreak,
        missStreak: nextMissStreak,
      });
      const serverScoreResult = payload?.smartScore && typeof payload.smartScore === 'object'
        ? payload.smartScore
        : null;
      const effectiveScore = serverScoreResult || scoreResult;
      setSmartScore((prev) => Math.max(0, Math.min(100, prev + Number(effectiveScore.delta || 0))));
      setSmartScoreBreakdown({
        delta: Number(effectiveScore.delta || 0),
        details: effectiveScore.details,
        questionId: currentQuestion?.id || null,
      });

      if (correct) {
        const newTokens = tokensCollected + 1;
        setTokensCollected(newTokens);
        if (newTokens >= currentChallengeStage.tokensNeeded && currentStage < 2) {
          setCurrentStage(currentStage + 1);
          setTokensCollected(0);
        }
      } else {
        // keep tokens untouched on wrong answers
      }

      setSessionHistory((prev) => [
        ...prev,
        {
          id: currentQuestion.id,
          text: (currentQuestion.adaptiveConfig?.variables?.num_groups && currentQuestion.adaptiveConfig?.variables?.dots_per_group)
            ? `${currentQuestion.questionText || 'Question'} (${currentQuestion.adaptiveConfig.variables.num_groups}x${currentQuestion.adaptiveConfig.variables.dots_per_group})`
            : (currentQuestion.questionText || (currentQuestion.parts?.[0]?.content) || 'N/A'),
          difficulty: currentQuestion.difficulty,
          isCorrect: correct,
          selectedAnswer: getSelectedAnswerDisplay(currentQuestion, answer),
          correctAnswer: (() => {
            const display = payload?.result?.feedback?.correctAnswerDisplay || payload?.feedback?.correctAnswerDisplay;
            if (display) return display;
            
            const text = currentQuestion.correctAnswerText;
            if (text && typeof text === 'string' && text.startsWith('{')) {
              try {
                const parsed = JSON.parse(text);
                return getSelectedAnswerDisplay(currentQuestion, parsed);
              } catch (e) {
                return text;
              }
            }
            return String(text || '');
          })(),
          smartScore: Math.max(0, Math.min(100, (smartScore + Number(effectiveScore.delta || 0)))),
          delta: Number(effectiveScore.delta || 0),
          phase: returnedPhase,
          time: (responseMs / 1000).toFixed(1) + 's',
          meta: payload?.selectionMeta || adaptiveMeta,
        }
      ]);

      const upcoming = payload?.nextQuestion ?? null;
      setNextQuestion(upcoming);

      // Update our seen list with the question we just successfully submitted
      setSeenQuestionIds((prev) => {
        const withCurrent = prev.includes(String(currentQuestion.id)) ? prev : [...prev, String(currentQuestion.id)];
        return upcoming?.id && !withCurrent.includes(String(upcoming.id))
          ? [...withCurrent, String(upcoming.id)]
          : withCurrent;
      });

      // Show feedback briefly for correct answers, then move on
      if (correct) {
        await delay(500);
        applyNextQuestion(upcoming);
      }
    } catch (error) {
      setSubmitError(error?.message || 'Could not fetch next adaptive question.');
      setNextQuestion(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setFeedbackData(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = (answer) => {
    setUserAnswer(answer);
    const effectiveQuestion = withSubmitBehavior(currentQuestion);
    if (effectiveQuestion && !effectiveQuestion.showSubmitButton) {
      handleSubmit(answer);
    }
  };

  const handleNext = () => {
    applyNextQuestion(nextQuestion);
  };

  if (loadingQuestion) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <Image
            src="/wexls-logo.svg"
            alt="WEXLS"
            className={styles.loadingBrand}
            width={56}
            height={56}
            priority
          />
          <div className={styles.loadingSpinner} aria-label="Loading practice" role="status" />
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className={styles.container}>
        <div className={styles.completionCard}>
          <h1>{questionsAnswered === 0 ? 'No Questions Available' : 'Practice Complete'}</h1>
          {submitError && <p className={styles.submitError}>{submitError}</p>}
          {questionsAnswered > 0 && (
            <>
              <p>Final SmartScore: <strong>{smartScore}</strong></p>
              <p>Questions Answered: <strong>{questionsAnswered}</strong></p>
            </>
          )}
          <Link href="/" className={styles.homeButton}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={styles.mobileHeader}>
        <div className={styles.mobileBreadcrumbs}>
          <span>{grade?.name || 'Grade'}</span>
          <span className={styles.chevron}>›</span>
          <span>{microskill?.code} {microskill?.name}</span>
        </div>
        <div className={styles.mobileStatsGrid}>
          <div className={styles.mobileStatCell} style={{ borderBottomColor: '#68b50b' }}>
            <label>Questions</label>
            <div className={styles.mobileStatValue} style={{ color: '#68b50b' }}>{questionsAnswered}</div>
          </div>
          <div className={styles.mobileStatCell} style={{ borderBottomColor: '#2f93be' }}>
            <label>Time</label>
            <div className={styles.mobileStatValue} style={{ color: '#2f93be' }}>{time.mins}:{time.secs}</div>
          </div>
          <div className={styles.mobileStatCell} style={{ borderBottomColor: '#f5821f' }}>
            <label>
              {currentQuestion?.difficulty === 'hard' 
                ? 'Mastery Streak' 
                : `Get ${currentQuestion?.difficulty === 'medium' ? '10 more' : '5'} correct in a row`}
            </label>
            <div className={styles.streakDots}>
              {(() => {
                const isMedium = currentQuestion?.difficulty === 'medium';
                const dotCount = isMedium ? 10 : 5;
                const offset = isMedium ? 5 : 0;
                
                return Array.from({ length: dotCount }).map((_, i) => {
                  const qNum = offset + i;
                  let dotClass = styles.streakDot;
                  if (streak > qNum) {
                    dotClass = styles.streakDotCorrect;
                  } else if (streak === qNum) {
                    dotClass = styles.streakDotActive;
                  }
                  
                  return <div key={i} className={`${styles.streakDot} ${dotClass}`} />;
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topBarLeft}>
            <Link href="/" className={styles.logo}><span>WEXLS</span></Link>
            <div className={styles.skillTag}>{skillTitle}</div>
          </div>
          <div className={styles.topBarStats}>
            <div className={styles.statPill}><span className={styles.statLabel}>Questions</span><strong>{questionsAnswered}</strong></div>
            <div className={styles.statPill}>
              <span className={styles.statLabel}>Streak</span>
              <strong>{showStats ? streak : '—'}</strong>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statLabel}>Time</span>
              <strong>{showStats ? `${time.mins}:${time.secs}` : '—:—'}</strong>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statLabel}>SmartScore</span>
              <strong>{showStats ? smartScore : '—'}</strong>
            </div>
            <div className={styles.statPill}><span className={styles.statLabel}>Level</span><strong style={{ textTransform: 'capitalize' }}>{adaptiveMeta?.difficulty || currentQuestion?.difficulty || 'Easy'}</strong></div>
            <button 
              onClick={() => setShowDebugJson(!showDebugJson)}
              style={{ 
                background: '#334155', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '4px 10px', 
                fontSize: '0.75rem', 
                color: '#f8fafc',
                cursor: 'pointer',
                marginLeft: '8px',
                fontWeight: 600
              }}
            >
              {showDebugJson ? 'Hide JSON' : 'View JSON'}
            </button>
            <button 
              className={styles.toggleStatsButton} 
              onClick={() => setShowStats(!showStats)}
              title={showStats ? "Hide statistics" : "Show statistics"}
            >
              {showStats ? '👁️' : '🙈'}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.breadcrumb}>
        <Link href="/">{grade?.name || 'Grade'}</Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span>{subject?.name || 'Subject'}</span>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span>{microskill?.code || 'Skill'}</span>
      </div>

      <div className={`${styles.layout} ${isJourney ? styles.fullWidthLayout : ''}`}>
        <main className={styles.mainContent}>
          {!isJourney && showExampleButton && (
            <div className={styles.headerActions}>
              <button className={styles.exampleButton} onClick={handleFetchExample}>
                <span className={styles.buttonIcon}>💡</span>Learn with an example
              </button>
            </div>
          )}

          {showDebugJson && (
            <div style={{ 
              margin: '1rem 0', 
              padding: '1.5rem', 
              background: '#0f172a', 
              color: '#38bdf8', 
              borderRadius: '16px', 
              fontSize: '0.8rem', 
              overflow: 'auto',
              maxHeight: '500px',
              border: '2px solid #1e293b',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontFamily: 'monospace'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#f8fafc' }}>Question Snapshot (Debug)</h4>
                <button onClick={() => setShowDebugJson(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>
              <pre>{JSON.stringify(currentQuestion, null, 2)}</pre>
            </div>
          )}

          {!isAnswered && (
            <div
              className={`${styles.questionStage} ${transitionStage === 'exit'
                ? styles.questionExit
                : transitionStage === 'enter'
                  ? styles.questionEnter
                  : ''
                }`}
            >
            <QuestionRenderer
              key={`${currentQuestion.id}-${questionsAnswered}`}
              question={withSubmitBehavior(currentQuestion)}
              userAnswer={userAnswer}
              onAnswer={handleAnswer}
              onSubmit={handleSubmit}
              isAnswered={isAnswered}
              isCorrect={isCorrect}
            />
            </div>
          )}

          {!isAnswered && (
            <div className={styles.workItOutContainer}>
              <button className={styles.workItOutButton} onClick={() => setIsWorkPadOpen(true)}>✏️ Work it out</button>
            </div>
          )}

          {!isAnswered && isWorkPadOpen && (
            <div className={styles.inlineWorkPadWrap}>
              <WorkPad
                open={isWorkPadOpen}
                mode="inline"
                storageKey={currentQuestion?.id || microskillId}
                onClose={() => setIsWorkPadOpen(false)}
              />
            </div>
          )}

          {(!isAnswered && (microskill?.lessonSlug || microskill?.guideId)) && (
            <div className={styles.notReadyContainer}>
              <h3 className={styles.notReadyHeader}>Not feeling ready yet? These can help:</h3>
              <ul className={styles.notReadyList}>
                {microskill?.lessonSlug && (
                  <li>
                    <Link href={`/lesson/${microskill.lessonSlug}`} target="_blank" className={styles.notReadyLink}>
                      <span className={styles.notReadyIcon}>📘</span>Review a lesson: {microskill?.name || 'Related concepts'}
                    </Link>
                  </li>
                )}
                {microskill?.guideId && (
                  <li>
                    <Link href={`/guide/${microskill.guideId}`} target="_blank" className={styles.notReadyLink}>
                      <span className={styles.notReadyIcon}>📘</span>Read the guide: {microskill?.name || 'Related concepts'}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {submitError && <p className={styles.solution}>{submitError}</p>}

          {/* Developer Debug Tools - Only visible with ?debug=true */}
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true' && (
            <>
              {smartScoreBreakdown && (
                <div className={styles.scoreDebugCard}>
                  <div className={styles.scoreDebugTitle}>SmartScore Breakdown</div>
                  <div className={styles.scoreDebugDelta}>
                    Change: <strong>{smartScoreBreakdown.delta > 0 ? `+${smartScoreBreakdown.delta}` : smartScoreBreakdown.delta}</strong>
                  </div>
                  <div className={styles.scoreDebugGrid}>
                    <span>Phase: {smartScoreBreakdown.details?.phase}</span>
                    <span>Difficulty: {smartScoreBreakdown.details?.difficulty}</span>
                    <span>Mastery: {Number(smartScoreBreakdown.details?.masteryScore ?? 0).toFixed(2)}</span>
                    <span>Confidence: {Number(smartScoreBreakdown.details?.confidence ?? 0).toFixed(2)}</span>
                    <span>Response: {Math.round(Number(smartScoreBreakdown.details?.responseMs ?? 0))}ms</span>
                    <span>Fast-guess penalty: {Number(smartScoreBreakdown.details?.fastGuessPenalty ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              )}

              {adaptiveMeta && (
                <div className={styles.adaptiveDebugCard}>
                  <div className={styles.adaptiveDebugTitle}>Adaptive Debug</div>
                  <div className={styles.adaptiveDebugGrid}>
                    <span>Policy: {adaptiveMeta.policy || 'n/a'}</span>
                    <span>Phase: {adaptiveMeta.phase || adaptivePhase || 'n/a'}</span>
                    <span>Reason: {adaptiveMeta.reason || 'n/a'}</span>
                    <span>Difficulty: {adaptiveMeta.difficulty || currentQuestion?.difficulty || 'n/a'}</span>
                    <span>Remediation code: {adaptiveMeta.remediationCode || 'none'}</span>
                    <span>Remediation left: {Number(adaptiveMeta.remediationRemaining ?? 0)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {isAnswered && isCorrect === null && (
            <div className={`${styles.feedback} ${styles.correct}`}>
              <div className={styles.feedbackIcon}>…</div>
              <div className={styles.feedbackContent}>
                <h3>Checking your answer...</h3>
                <p className={styles.solution}>Loading next question...</p>
                <div className={styles.nextLoader} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {isAnswered && isCorrect === true && (
            <div className={`${styles.feedback} ${styles.correct}`}>
              <div className={styles.feedbackIcon}>✓</div>
              <div className={styles.feedbackContent}>
                <h3>Great job!</h3>
                <p className={styles.solution}>
                  {isSubmitting ? 'Loading next question...' : 'Preparing your next question...'}
                </p>
                {isSubmitting && (
                  <div className={styles.nextLoader} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>
          )}

          {isAnswered && isCorrect === false && feedbackData?.intervention === 'SCAFFOLD' && (
            <div className={`${styles.feedback} ${styles.scaffold} ${styles.incorrectDetailed}`}>
              <div className={styles.scaffoldHeader}>
                <span className={styles.scaffoldBadge}>Intervention</span>
                <h2 className={styles.scaffoldTitle}>{feedbackData.message}</h2>
              </div>
              
              <div className={styles.scaffoldBody}>
                {feedbackData.scaffold?.steps?.map((step, idx) => (
                  <div key={`step-${idx}`} className={styles.scaffoldStep}>
                    <div className={styles.stepNumber}>{idx + 1}</div>
                    <div className={styles.stepContent}>
                      {renderMaybeInlineHtml(step)}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.scaffoldAction}>
                <button onClick={handleNext} disabled={isSubmitting} className={styles.nextButton}>
                  {isSubmitting ? 'Loading...' : 'I understand, keep going'}
                </button>
              </div>
            </div>
          )}

          {isAnswered && isCorrect === false && feedbackData?.intervention !== 'SCAFFOLD' && (
            <div className={`${styles.feedback} ${styles.incorrect} ${styles.incorrectDetailed}`}>
              <h2 className={styles.incorrectTitle}>Not quite...</h2>

              {feedbackData?.optionFeedback && (
                <div className={styles.optionFeedbackAlert}>
                  <div className={styles.optionFeedbackContent}>
                    <span className={styles.optionFeedbackIcon}>💡</span>
                    {renderMaybeInlineHtml(feedbackData.optionFeedback)}
                  </div>
                </div>
              )}

              {/* Step 1: Side-by-side comparison */}
              <div className={styles.comparisonGroup}>
                <div className={`${styles.comparisonItem} ${styles.user}`}>
                  <span className={styles.comparisonLabel}>Your choice</span>
                  <div className={styles.comparisonValue}>
                    {selectedAnswerOption ? renderOptionPreview(selectedAnswerOption, 0) : renderMaybeInlineHtml(selectedAnswerDisplay || 'No choice')}
                  </div>
                </div>
                <div className={`${styles.comparisonItem} ${styles.correct}`}>
                  <span className={styles.comparisonLabel}>Correct Answer</span>
                  <div className={styles.comparisonValue}>
                    {correctAnswerOption
                      ? (
                        Array.isArray(correctAnswerOption)
                          ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {correctAnswerOption.map((option, idx) => (
                                <span key={`correct-opt-${idx}`}>{renderOptionPreview(option, idx)}</span>
                              ))}
                            </div>
                          )
                          : renderOptionPreview(correctAnswerOption, 0)
                      )
                      : renderMaybeInlineHtml(correctAnswerDisplay || '—')}
                  </div>
                </div>
              </div>

              {/* Step 2: Question Review */}
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewTitle}>Question</h4>
                <div className={styles.reviewQuestion}>
                  {['fillintheblank', 'gridarithmetic', 'shadegrid', 'arithmetic_journey'].includes(String(currentQuestion?.type || '').toLowerCase()) ? (
                    <QuestionRenderer
                      question={currentQuestion?.type === 'arithmetic_journey' ? feedbackData : reviewQuestion}
                      userAnswer={
                        currentQuestion?.type === 'shadeGrid' ? shadeGridCorrectAnswer :
                          (isFillInTheBlankType && correctFillInTheBlankAnswer) ? correctFillInTheBlankAnswer :
                            userAnswer
                      }
                      onAnswer={() => { }}
                      onSubmit={() => { }}
                      isAnswered
                      isCorrect={false}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <QuestionParts parts={currentQuestion?.parts || []} />
                      
                      {isOptionType && Array.isArray(currentQuestion?.options) && (
                        <div className={styles.reviewOptions} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                          {currentQuestion.options.map((option, index) => (
                            <div
                              key={`review-opt-${index}`}
                              className={`${styles.reviewOption} ${selectedIndexSet.has(index) ? styles.reviewSelected : ''} ${correctIndexSet.has(index) ? styles.reviewCorrect : ''}`}
                              style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', padding: '0.75rem' }}
                            >
                              {renderOptionPreview(option, index)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Concepts Section */}
              {(() => {
                const concepts = feedbackData?.concepts || currentQuestion?.concepts;
                if (!Array.isArray(concepts) || concepts.length === 0) return null;
                return (
                  <div className={styles.conceptsSection}>
                    <h3 className={styles.explanationHeading}>Key Concepts</h3>
                    <div className={styles.conceptsCard}>
                      <QuestionParts parts={concepts} />
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Explanation */}
              <h3 className={styles.explanationHeading}>Explanation</h3>
              {currentQuestion?.type === 'arithmetic_journey' ? (
                <div className={styles.solution} style={{ padding: '0' }}>
                   <QuestionRenderer 
                     question={feedbackData}
                     isAnswered
                     isCorrect={false}
                     showHelp={true}
                   />
                </div>
              ) : hasStructuredSolution ? (
                <div className={styles.solutionSections}>
                  {solutionSections.map((section, idx) => (
                    (() => {
                      const first = section.parts[0];
                      const isDuplicateFirstText = (
                        section.title &&
                        first &&
                        String(first.type || '').toLowerCase() === 'text' &&
                        String(first.content || '').trim().toLowerCase() === String(section.title).trim().toLowerCase()
                      );
                      const visibleParts = isDuplicateFirstText ? section.parts.slice(1) : section.parts;
                      return (
                        <div key={`solution-section-${idx}`} className={styles.explanationSection}>
                          <div className={`${styles.explanationRibbon} ${section.label === 'review' || section.label === 'key idea' ? styles.ribbonReview : styles.ribbonSolve}`}>
                            {section.label === 'review' ? 'review' : section.label === 'key idea' ? 'key idea' : 'solve'}
                          </div>
                          <div className={styles.explanationSectionBody}>
                            {section.title ? <h4 className={styles.explanationSectionTitle}>{section.title}</h4> : null}
                            {visibleParts.length > 0 ? <QuestionParts parts={visibleParts} /> : null}
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              ) : solutionParts ? (
                <div className={styles.solution}>
                  <QuestionParts parts={solutionParts} />
                </div>
              ) : (
                <div className={styles.solution}>{renderMaybeInlineHtml(feedbackData?.solution || '')}</div>
              )}

              <button onClick={handleNext} disabled={isSubmitting} className={styles.nextButton}>
                {isSubmitting ? 'Loading...' : 'Got it'}
              </button>
            </div>
          )}
        </main>

        <aside className={styles.sidebar}>
          {/* Questions Block */}
          {!isJourney && (
            <div className={`${styles.ixlBlock} ${styles.questionsBlock}`}>
              <div className={styles.ixlHeader}>Questions answered</div>
              <div className={styles.ixlValue}>{questionsAnswered}</div>
            </div>
          )}

          {/* Time Block */}
          {!isJourney && (
            <div className={`${styles.ixlBlock} ${styles.timeBlock}`}>
              <div className={styles.ixlHeader}>Time elapsed</div>
              <div className={styles.ixlValue}>
                {time.mins}:{time.secs}
                <div className={styles.pausedLabel}>PAUSED</div>
              </div>
            </div>
          )}

          {/* SmartScore Block */}
          {!isJourney && showStats && (
            <div className={`${styles.ixlBlock} ${styles.smartScoreBlock}`}>
              <div className={styles.ixlHeader}>
                SmartScore 
                <span className={styles.headerSub}>out of 100</span>
                <span className={styles.helpCircle}>?</span>
              </div>
              <div className={styles.ixlValue}>{smartScore}</div>
            </div>
          )}

          {/* Challenge Block (Retained but styled like IXL) */}
          {!isJourney && showStats && (
            <div className={`${styles.ixlBlock} ${styles.challengeBlock}`}>
              <div className={styles.ixlHeader}>Challenge Stage</div>
              <div className={styles.ixlValue}>
                <div className={styles.stageText}>{currentChallengeStage.label}</div>
                <div className={styles.tokensGrid}>
                  {Array.from({ length: currentChallengeStage.tokensNeeded }).map((_, i) => (
                    <div key={i} className={`${styles.ixlToken} ${i < tokensCollected ? styles.ixlCollected : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <Link href={teacherToolsHref} className={styles.teacherTools}>
            <span className={styles.boltIcon}>⚡</span> Teacher tools ›
          </Link>
        </aside>
      </div>

      <button
        type="button"
        className={styles.pencilIcon}
        title="Work it out"
        onClick={() => setIsWorkPadOpen(true)}
      >
        ✏️
      </button>

      {/* Adaptive Debug Analysis Table */}
      <div style={{ width: '100%', maxWidth: '1180px', marginTop: '3rem', padding: '1rem', background: 'rgba(255,255,255,0.8)', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>Adaptive Session Analysis (Debug)</h2>
          <button 
            onClick={() => setShowDebugTable(!showDebugTable)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#e2e8f0', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
          >
            {showDebugTable ? 'Hide Table' : 'Show Table'}
          </button>
        </div>
        
        {showDebugTable && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Question ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Text Preview</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Selected</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Correct Ans</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Diff</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Phase</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Delta</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>SmartScore</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Selection Meta</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.map((entry, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: entry.isCorrect ? 'transparent' : '#fff1f2' }}>
                    <td style={{ padding: '0.75rem' }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>{String(entry.id).slice(-8)}...</td>
                    <td style={{ padding: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.text}</td>
                    <td style={{ padding: '0.75rem', color: entry.isCorrect ? '#166534' : '#991b1b', fontWeight: '600' }}>
                      {entry.selectedAnswer ? String(entry.selectedAnswer).replace(/<[^>]*>?/gm, '') : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#166534', fontWeight: '600' }}>
                      {entry.correctAnswer ? String(entry.correctAnswer).replace(/<[^>]*>?/gm, '') : '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '999px', 
                        background: entry.difficulty === 'hard' ? '#fee2e2' : entry.difficulty === 'medium' ? '#fef3c7' : '#f0fdf4',
                        color: entry.difficulty === 'hard' ? '#991b1b' : entry.difficulty === 'medium' ? '#92400e' : '#166534',
                        fontSize: '0.7rem',
                        fontWeight: '700'
                      }}>
                        {entry.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{entry.isCorrect ? '✅' : '❌'}</td>
                    <td style={{ padding: '0.75rem' }}>{entry.phase}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '700', color: entry.delta >= 0 ? '#166534' : '#991b1b' }}>
                      {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>{entry.smartScore}</td>
                    <td style={{ padding: '0.75rem' }}>{entry.time}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.65rem', color: '#64748b' }}>
                      {entry.meta ? JSON.stringify(entry.meta) : 'N/A'}
                    </td>
                  </tr>
                ))}
                {sessionHistory.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No questions answered yet in this session.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Learn from Example Modal Overlay */}
      {showExampleModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExampleModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>💡 Learn with an example</h2>
              <button className={styles.closeModal} onClick={() => setShowExampleModal(false)}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              {loadingExample ? (
                <div className={styles.modalLoading}>
                  <div className={styles.loadingSpinner} />
                  <p>Finding a perfect example for you...</p>
                </div>
              ) : exampleQuestion ? (
                <div className={styles.exampleContainer}>
                  <div className={styles.exampleSection}>
                    <h3 className={styles.exampleTitle}>Example Question & Solution</h3>
                    <div className={styles.exampleQuestionBox}>
                      <QuestionRenderer 
                        question={exampleQuestion} 
                        isAnswered={true}
                        userAnswer={(() => {
                          try {
                            const parsed = JSON.parse(exampleQuestion.correctAnswerText || '{}');
                            return typeof parsed === 'object' ? parsed : exampleQuestion.correctAnswerText;
                          } catch {
                            return exampleQuestion.correctAnswerText;
                          }
                        })()}
                        isCorrect={true}
                      />
                    </div>
                    <div className={styles.exampleSolutionBox}>
                      <h4 className={styles.exampleSolutionHeading}>Key Concepts</h4>
                      {exampleQuestion.concepts ? (
                        <div className={styles.conceptsCard} style={{ marginBottom: '1.5rem' }}>
                          <QuestionParts parts={exampleQuestion.concepts} />
                        </div>
                      ) : null}
                      
                      <h4 className={styles.exampleSolutionHeading}>Explanation</h4>
                      {(() => {
                        const solParts = parseSolutionParts(exampleQuestion.solution);
                        const solSections = normalizeSolutionSections(solParts);
                        if (solSections.length > 0) {
                          return (
                            <div className={styles.solutionSections}>
                              {solSections.map((section, idx) => (
                                <div key={`ex-sol-section-${idx}`} className={styles.explanationSection}>
                                  <div className={`${styles.explanationRibbon} ${section.label === 'review' ? styles.ribbonReview : styles.ribbonSolve}`}>
                                    {section.label === 'review' ? 'review' : 'solve'}
                                  </div>
                                  <div className={styles.explanationSectionBody}>
                                    {section.title ? <h4 className={styles.explanationSectionTitle}>{section.title}</h4> : null}
                                    <QuestionParts parts={section.parts} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        } else if (solParts) {
                          return <QuestionParts parts={solParts} />;
                        } else {
                          return <div className={styles.solution}>{renderMaybeInlineHtml(exampleQuestion.solution)}</div>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.modalError}>
                  <p>Sorry, we couldn't find a specific example for this skill.</p>
                  <button className={styles.nextButton} onClick={() => setShowExampleModal(false)}>Back to Practice</button>
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button className={styles.nextButton} onClick={() => setShowExampleModal(false)}>Got it, let's practice!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
