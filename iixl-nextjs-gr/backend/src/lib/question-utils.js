function parseMaybeJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseNumber(value, fallback = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolveShadeGridGeometry(question) {
  const config = parseMaybeJson(question?.adaptiveConfig || question?.adaptive_config, {});
  const explicitRows = parseNumber(config.rows);
  const explicitCols = parseNumber(config.columns ?? config.cols);
  const totalCellsArg = parseNumber(config.totalCells ?? config.total_cells);

  const denominator = config.denominator ? parseNumber(config.denominator) : null;
  const fraction = (config.numerator != null && config.denominator != null)
    ? { numerator: parseNumber(config.numerator), denominator }
    : null;

  const modeRaw = String(config.mode || config.gridMode || "").trim().toLowerCase();
  const validModes = ["auto", "fractionbar", "hundredsblock"];
  const gridMode = validModes.includes(modeRaw) ? modeRaw : "auto";
  const orientation = String(config.orientation || "").trim().toLowerCase() === "horizontal" ? "horizontal" : "vertical";

  if (gridMode === "hundredsblock") {
    return { rows: 10, cols: 10, totalCells: 100, fraction };
  }

  const shouldUseFractionBar = (
    gridMode === "fractionbar" ||
    (gridMode === "auto" && denominator && denominator > 1 && denominator <= 20)
  );

  let rows = explicitRows;
  let cols = explicitCols;
  if (shouldUseFractionBar && denominator) {
    if (orientation === "horizontal") {
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
  return { rows, cols, totalCells: rows * cols, fraction };
}

function parseShadeGridTarget(question) {
  const config = parseMaybeJson(question?.adaptiveConfig || question?.adaptive_config, {});
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

  return parseNumber(question?.correctAnswerText || question?.correct_answer_text);
}

function normalizeQuestionDoc(row) {
  const options = parseMaybeJson(row.options, []);
  const items = parseMaybeJson(row.items, []);

  return {
    id: String(row.id || row._id || ""),
    microSkillId: String(row.microSkillId || row.micro_skill_id || row.microskill_id || ""),
    questionText: row.questionText || row.question_text || "",
    type: row.type || "mcq",
    difficulty: row.difficulty || "easy",
    complexity: Number(row.complexity || 0),
    parts: parseMaybeJson(row.parts, []),
    options,
    items,
    dragItems: parseMaybeJson(row.dragItems || row.drag_items, []),
    dropGroups: parseMaybeJson(row.dropGroups || row.drop_groups, []),
    adaptiveConfig: parseMaybeJson(row.adaptiveConfig || row.adaptive_config, null),
    isMultiSelect: Boolean(row.isMultiSelect ?? row.is_multi_select),
    isVertical: Boolean(row.isVertical ?? row.is_vertical),
    showSubmitButton: Boolean(row.showSubmitButton ?? row.show_submit_button ?? true),
    correctAnswerIndex: Number(row.correctAnswerIndex ?? row.correct_answer_index ?? -1),
    correctAnswerIndices: parseMaybeJson(row.correctAnswerIndices || row.correct_answer_indices, []),
    correctAnswerText: row.correctAnswerText ?? row.correct_answer_text ?? "",
    solution: row.solution || "",
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? row.idx ?? 0),
  };
}

function getOptionLabel(option, idx) {
  if (typeof option === "object" && option !== null) {
    const label = option.label || option.text || "";
    if (label) return String(label);
  }
  if (typeof option === "string") return option;
  return `Option ${idx + 1}`;
}

function validateAnswer(question, answer) {
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
    case 'smarttable':
    case 'advanced_math': {
      const correctAnswers = parseMaybeJson(question.correctAnswerText, {});
      if (!correctAnswers || typeof correctAnswers !== 'object') return false;
      return Object.keys(correctAnswers).every((key) => {
        return String(answer?.[key] ?? '').trim().toLowerCase() === String(correctAnswers[key]).trim().toLowerCase();
      });
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
      if ((question.items || []).some((item) => item.correctPosition != null)) {
        const expectedByPosition = [...(question.items || [])]
          .sort((a, b) => Number(a.correctPosition ?? 0) - Number(b.correctPosition ?? 0))
          .map((item) => String(item.id));
        return JSON.stringify((answer || []).map(String)) === JSON.stringify(expectedByPosition);
      }
      return false;
    }

    case 'fourpicsoneword':
      return (Array.isArray(answer) ? answer.join('') : String(answer ?? '')).toUpperCase() === String(question.correctAnswerText ?? '').toUpperCase();

    case 'measure': {
      const config = parseMaybeJson(question.adaptiveConfig || question.adaptive_config, {});
      const expected = parseNumber(config.target_units) ??
        parseNumber(config.line_units) ??
        parseNumber(config.line_length) ??
        parseNumber(config.target_length) ??
        parseNumber(question.correctAnswerText);
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

function buildFeedback(question) {
  const feedback = {
    solution: question?.solution ?? '',
    correctAnswerDisplay: '',
    correctOptionIndices: [],
  };
  if (!question) return feedback;
  const type = String(question.type || '').trim().toLowerCase();

  switch (type) {
    case 'mcq':
    case 'imagechoice':
      if (question.isMultiSelect) {
        const indices = Array.isArray(question.correctAnswerIndices) ? question.correctAnswerIndices : [];
        feedback.correctOptionIndices = indices.map((i) => Number(i)).filter(Number.isFinite);
        feedback.correctAnswerDisplay = feedback.correctOptionIndices
          .map((idx) => getOptionLabel(question.options?.[idx], idx))
          .join(', ');
        return feedback;
      }
      feedback.correctOptionIndices = [Number(question.correctAnswerIndex)].filter(Number.isFinite);
      feedback.correctAnswerDisplay = feedback.correctOptionIndices.length > 0
        ? getOptionLabel(question.options?.[feedback.correctOptionIndices[0]], feedback.correctOptionIndices[0])
        : '';
      return feedback;

    case 'fillintheblank':
    case 'gridarithmetic':
    case 'table':
    case 'smarttable':
    case 'advanced_math': {
      const parsed = parseMaybeJson(question.correctAnswerText, {});
      if (parsed && typeof parsed === 'object') {
        const arithmeticPart = (question.parts || []).find((part) => part?.type === 'arithmeticLayout');
        const rows = Array.isArray(arithmeticPart?.layout?.rows) ? arithmeticPart.layout.rows : [];
        const answerRow = rows.find((row) => String(row?.kind || '').toLowerCase() === 'answer');
        const cells = Array.isArray(answerRow?.cells) ? answerRow.cells : [];

        if (cells.length > 0) {
          const prefix = String(answerRow?.prefix || '');
          const joined = cells.map((cell, idx) => String(parsed[cell?.id ?? `cell_${idx}`] ?? '')).join('');
          feedback.correctAnswerDisplay = `${prefix}${joined}`.trim();
        } else {
          feedback.correctAnswerDisplay = Object.values(parsed).join(', ');
        }
      } else {
        feedback.correctAnswerDisplay = String(question.correctAnswerText ?? '');
      }
      return feedback;
    }

    case 'sorting': {
      const orderedIds = parseMaybeJson(question.correctAnswerText, []);
      if (Array.isArray(orderedIds) && orderedIds.length > 0) {
        const labelById = new Map((question.items || []).map((item) => [String(item.id), String(item.content ?? item.id)]));
        feedback.correctAnswerDisplay = orderedIds.map((id) => labelById.get(String(id)) || String(id)).join(', ');
      } else {
        feedback.correctAnswerDisplay = String(question.correctAnswerText ?? '');
      }
      return feedback;
    }

    case 'draganddrop': {
      const groupMap = new Map((question.dropGroups || []).map((g) => [String(g.id), String(g.label || g.id)]));
      const textHints = (question.dragItems || [])
        .filter((item) => item.targetGroupId != null && String(item.targetGroupId).trim() !== '')
        .map((item) => {
          const content = String(item.content || item.id || '');
          const gId = String(item.targetGroupId);
          const gLabel = groupMap.get(gId) || gId;
          return `${content} → ${gLabel}`;
        });
      feedback.correctAnswerDisplay = textHints.join('; ');
      return feedback;
    }

    case 'fourpicsoneword':
      feedback.correctAnswerDisplay = String(question.correctAnswerText ?? '').toUpperCase();
      return feedback;

    case 'textinput':
    case 'shadegrid':
    case 'measure':
    default:
      feedback.correctAnswerDisplay = String(question.correctAnswerText ?? '');
      return feedback;
  }
}


module.exports = { normalizeQuestionDoc, validateAnswer, buildFeedback };
