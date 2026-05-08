/**
 * Fractions Generator - Deep Search Version
 * Aggressively finds and resolves variables in complex DB structures.
 */

// "targetFraction": "halves"
// "targetFraction": "thirds"
// "targetFraction": "fourths"
// "targetFraction": "sixths"
// "targetFraction": "6ths"

export const FRACTIONS_IMAGE_CUTS_TEMPLATE_ID = 'fractions_image_cuts_v1';
export const FRACTIONS_SHAPE_EQUAL_PARTS_TEMPLATE_ID = 'fractions_shape_equal_parts_v1';
export const FRACTIONS_SHADED_FRACTION_TEMPLATE_ID = 'fractions_shaded_fraction_v1';
export const FRACTIONS_IDENTIFY_FRACTION_TEMPLATE_ID = 'fractions_identify_fraction_v1'; // NEW

const SVG_JS_CDN = 'https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js';

const svgToDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const FRACTION_IMAGE_ASSETS = [
  {
    id: 'pizza_pepperoni',
    label: 'pizza',
    src: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
        <defs>
          <radialGradient id="cheese" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stop-color="#fff6b8"/>
            <stop offset="70%" stop-color="#ffd861"/>
            <stop offset="100%" stop-color="#f6a623"/>
          </radialGradient>
        </defs>
        <circle cx="120" cy="120" r="106" fill="#d78520"/>
        <circle cx="120" cy="120" r="99" fill="#f8b733"/>
        <circle cx="120" cy="120" r="88" fill="#d7221f"/>
        <circle cx="120" cy="120" r="80" fill="url(#cheese)"/>
        <g fill="none" stroke="#ef3b24" stroke-width="6" stroke-linecap="round" opacity=".9">
          <path d="M52 100c22-25 53-35 92-25"/>
          <path d="M86 174c32 14 68 8 94-15"/>
          <path d="M67 142c22-7 40-5 57 6"/>
          <path d="M135 104c25-12 45-9 61 8"/>
        </g>
        <g fill="#dd2f28" stroke="#fff4d0" stroke-width="3">
          <circle cx="70" cy="71" r="13"/><circle cx="113" cy="92" r="13"/>
          <circle cx="166" cy="74" r="14"/><circle cx="185" cy="123" r="13"/>
          <circle cx="145" cy="144" r="13"/><circle cx="86" cy="139" r="14"/>
          <circle cx="104" cy="184" r="13"/><circle cx="169" cy="178" r="13"/>
        </g>
        <g fill="#3f3f3f" stroke="#0f172a" stroke-width="2">
          <circle cx="93" cy="66" r="5"/><circle cx="141" cy="70" r="5"/>
          <circle cx="195" cy="91" r="5"/><circle cx="58" cy="119" r="5"/>
          <circle cx="128" cy="164" r="5"/><circle cx="188" cy="162" r="5"/>
        </g>
        <g fill="#faf0d9" stroke="#b99b76" stroke-width="2">
          <path d="M133 49c10-5 18 4 12 12-5 7-15 4-16-4-8 2-12-6-6-11 5-5 11-2 10 3z"/>
          <path d="M74 166c10-5 18 4 12 12-5 7-15 4-16-4-8 2-12-6-6-11 5-5 11-2 10 3z"/>
          <path d="M167 135c10-5 18 4 12 12-5 7-15 4-16-4-8 2-12-6-6-11 5-5 11-2 10 3z"/>
        </g>
        <g fill="#2f9e44">
          <path d="M80 91c-14 2-21 11-19 26 13-3 21-11 19-26z"/>
          <path d="M149 116c-13 3-20 12-17 26 13-3 20-12 17-26z"/>
          <path d="M154 190c-13 2-21 11-19 25 13-3 21-11 19-25z"/>
          <path d="M180 96c-12 1-20 9-19 22 12-1 20-9 19-22z"/>
        </g>
        <g fill="none" stroke="#c084fc" stroke-width="2">
          <circle cx="64" cy="153" r="11"/><circle cx="103" cy="118" r="12"/>
          <circle cx="151" cy="94" r="11"/><circle cx="198" cy="145" r="11"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'pie_apple',
    label: 'pie',
    src: 'https://cdn-icons-png.flaticon.com/512/3497/3497893.png',
  },
  {
    id: 'chocolate_bar',
    label: 'chocolate bar',
    src: 'https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1778215497101-ymnj4yv02wq.png',
  },
];

const FRACTION_TARGETS = {
  halves: { denominator: 2, word: 'halves', singular: 'half' },
  thirds: { denominator: 3, word: 'thirds', singular: 'third' },
  fourths: { denominator: 4, word: 'fourths', singular: 'fourth' },
  sixths: { denominator: 6, word: 'sixths', singular: 'sixth' },
  '6ths': { denominator: 6, word: 'sixths', singular: 'sixth' },
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const createSeededRandom = (seedInput) => {
  const str = String(seedInput || 'fractions');
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) % 2147483647;
  }
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
};

const pickWithRandom = (items, random = Math.random) => items[Math.floor(random() * items.length)];

const createInstanceSeed = (templateConfig = {}, resolvedVars = {}) => {
  if (resolvedVars.seed) return resolvedVars.seed;
  const id = String(templateConfig.id || '');
  if (id.startsWith('inst_') || id.startsWith('q_')) return id;
  return `shape_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
};

// ── uid helper: prevents id collisions in batch generation ──────────────────
let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

const SHAPE_PALETTES = [
  { id: 'purple', fill: '#c9a5f4', stroke: '#9b4de1' },
  { id: 'red', fill: '#fb8b8f', stroke: '#d72323' },
  { id: 'yellow', fill: '#ffe27a', stroke: '#a76500' },
  { id: 'green', fill: '#79d89c', stroke: '#0f7f34' },
];

const SHAPE_VARIANTS = [
  { shape: 'rectangle', orientation: 'vertical', parts: 2 },
  { shape: 'rectangle', orientation: 'horizontal', parts: 2 },
  { shape: 'rectangle', orientation: 'horizontal', parts: 4 },
  { shape: 'rectangle', orientation: 'vertical', parts: 4 },
  { shape: 'square', orientation: 'grid', parts: 4 },
];

const gcd = (a, b) => {
  let x = Math.abs(Number(a) || 0);
  let y = Math.abs(Number(b) || 0);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

const resolveValue = (val, seen = new Set()) => {
  if (val && typeof val === 'object') {
    if (seen.has(val)) return '[circular]';
    seen.add(val);
    if (val.random && Array.isArray(val.random)) {
      return val.random[Math.floor(Math.random() * val.random.length)];
    }
    if (val.randomInt) {
      const min = val.randomInt.min || 0;
      const max = val.randomInt.max || 10;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    if (Array.isArray(val)) {
      return val.map((v) => resolveValue(v, seen));
    }
    return Object.fromEntries(
      Object.entries(val).map(([key, nested]) => [key, resolveValue(nested, seen)])
    );
  }
  return val;
};

const interpolateString = (str, vars) => {
  const exactMatch = str.match(/^\{(\w+)\}$/);
  if (exactMatch && vars[exactMatch[1]] !== undefined) {
    return vars[exactMatch[1]];
  }
  return str.replace(/{(\w+)}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{${key}}`;
  });
};

const interpolate = (value, vars) => {
  if (typeof value === 'string') return interpolateString(value, vars);
  if (Array.isArray(value)) return value.map((item) => interpolate(item, vars));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, interpolate(nested, vars)])
    );
  }
  return value;
};

const getLogicKey = (templateConfig = {}) => (
  templateConfig.logic_type
  || templateConfig.logicType
  || templateConfig.adaptiveConfig?.logic_type
  || templateConfig.adaptiveConfig?.logicType
  || templateConfig.adaptiveConfig?.logic
  || null // ← no longer falls back to template_id to avoid wrong-type dispatch
);

const escapeAttr = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Identify-Fraction question type
// Renders 4 shape options (circle, rectangle, kite, pentagon variants).
// One option shows the correct fraction; the other three are distinct distractors.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds an SVG for a shape showing numerator/denominator with coloured parts.
 * shapeType: 'circle' | 'rectangle' | 'kite' | 'pentagon'
 */
const buildIdentifyShapeSvg = ({ shapeType, numerator, denominator, fillColor, strokeColor, size = 200 }) => {
  const W = 200;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2;

  // ── Helper: pie-wedge builder (reused by circle + kite) ──────────────────
  const makePieWedges = (cx, cy, r, n, d, fill, stroke) =>
    Array.from({ length: d }, (_, i) => {
      const a0 = -Math.PI / 2 + (2 * Math.PI * i) / d;
      const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / d;
      const x1 = (cx + r * Math.cos(a0)).toFixed(3);
      const y1 = (cy + r * Math.sin(a0)).toFixed(3);
      const x2 = (cx + r * Math.cos(a1)).toFixed(3);
      const y2 = (cy + r * Math.sin(a1)).toFixed(3);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const cellFill = i < n ? fill : '#ffffff';
      return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${cellFill}" stroke="${stroke}" stroke-width="2.5"/>`;
    }).join('');

  // ── Circle ────────────────────────────────────────────────────────────────
  if (shapeType === 'circle') {
    const r = 72;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} circle">
      ${makePieWedges(cx, cy, r, numerator, denominator, fillColor, strokeColor)}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // ── Rectangle (columns, not rows — easier to see at high denominators) ────
  if (shapeType === 'rectangle') {
    // Cap at 6 cols for visual clarity; shrink denominator visually if > 6
    const safeDenom = Math.min(denominator, 6);
    const safeNum = Math.min(numerator, safeDenom);
    const rx = 20, ry = 50, rw = 160, rh = 100;
    const colW = rw / safeDenom;
    const cells = Array.from({ length: safeDenom }, (_, i) => {
      const cellFill = i < safeNum ? fillColor : '#ffffff';
      return `<rect x="${(rx + i * colW).toFixed(2)}" y="${ry}" width="${colW.toFixed(2)}" height="${rh}" fill="${cellFill}" stroke="${strokeColor}" stroke-width="2"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} rectangle">
      ${cells}
      <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // ── Kite / Diamond (pie wedges inside a diamond outline) ──────────────────
  if (shapeType === 'kite') {
    // Draw denominator pie wedges on a circle, then overlay a diamond outline
    const r = 68;
    const wedges = makePieWedges(cx, cy, r, numerator, denominator, fillColor, strokeColor);
    // Diamond clip-path outline
    const diamond = `M${cx},${cy - 82} L${cx + 66},${cy} L${cx},${cy + 72} L${cx - 66},${cy} Z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} kite">
      <clipPath id="kite-clip-${numerator}-${denominator}">
        <path d="${diamond}"/>
      </clipPath>
      <g clip-path="url(#kite-clip-${numerator}-${denominator})">
        ${wedges}
      </g>
      <path d="${diamond}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // ── Pentagon / Polygon (always uses exactly `denominator` wedge segments) ─
  if (shapeType === 'pentagon') {
    // Use denominator as sides so the fraction is visually accurate
    const sides = Math.max(3, Math.min(denominator, 8));
    const safeNum = Math.min(numerator, sides);
    const r = 74;
    const angleOffset = -Math.PI / 2;
    const vertices = Array.from({ length: sides }, (_, i) => {
      const angle = angleOffset + (2 * Math.PI * i) / sides;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    const paths = vertices.map((v, i) => {
      const next = vertices[(i + 1) % sides];
      const cellFill = i < safeNum ? fillColor : '#ffffff';
      return `<path d="M${cx},${cy} L${v[0].toFixed(2)},${v[1].toFixed(2)} L${next[0].toFixed(2)},${next[1].toFixed(2)} Z" fill="${cellFill}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    }).join('');
    const outline = vertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${v[0].toFixed(2)},${v[1].toFixed(2)}`).join(' ') + ' Z';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} polygon">
      ${paths}
      <path d="${outline}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // ── Fallback: circle ──────────────────────────────────────────────────────
  return buildIdentifyShapeSvg({ shapeType: 'circle', numerator, denominator, fillColor, strokeColor, size });
};

/**
 * Generates distractors for the identify-fraction question.
 * Rules:
 *   - Each distractor has the same denominator but a different numerator, OR
 *     a different denominator altogether.
 *   - No two options have the same (numerator, denominator) pair.
 */
const generateIdentifyFractionDistractors = ({ numerator, denominator, random }) => {
  const used = new Set([`${numerator}/${denominator}`]);
  const distractors = [];

  // Strategy A: same denominator, different numerator
  const candidatesA = Array.from({ length: denominator - 1 }, (_, i) => i + 1)
    .filter((n) => n !== numerator);
  // Strategy B: different denominator (±1 or ±2 of original)
  const altDenoms = [denominator - 1, denominator + 1, denominator - 2, denominator + 2]
    .filter((d) => d >= 2 && d <= 8);

  const pool = [
    ...candidatesA.map((n) => ({ numerator: n, denominator })),
    ...altDenoms.flatMap((d) => [
      { numerator: 1, denominator: d },
      { numerator: Math.floor(d / 2), denominator: d },
    ]),
  ].filter(({ numerator: n, denominator: d }) => {
    const key = `${n}/${d}`;
    if (used.has(key) || n < 1 || n >= d) return false;
    used.add(key);
    return true;
  });

  // Shuffle pool with seeded random
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 3); // we need exactly 3 distractors
};

/**
 * generateIdentifyFractionQuestion
 *
 * Question: "Which shape shows the fraction N/D?"
 * Renders 4 SVG options in a 2×2 or 1×4 grid.
 * Each option uses a different shape type for visual variety.
 */
function generateIdentifyFractionQuestion(templateConfig = {}) {
  const variablesBlock = (
    templateConfig.adaptiveConfig?.variables
    || templateConfig.variables
    || templateConfig.data_source?.variables
    || {}
  );
  const resolvedVars = Object.fromEntries(
    Object.entries(variablesBlock).map(([key, value]) => [key, resolveValue(value)])
  );

  const instanceSeed = createInstanceSeed(templateConfig, resolvedVars);
  const random = createSeededRandom(instanceSeed);

  // ── Target fraction ──────────────────────────────────────────────────────
  const denominatorPool = [2, 3, 4, 5, 6];
  const denominator = Number(resolvedVars.denominator) || pickWithRandom(denominatorPool, random);
  const numerator = Number(resolvedVars.numerator)
    || (Math.floor(random() * (denominator - 1)) + 1);

  // ── Colour palette ────────────────────────────────────────────────────────
  const palettes = [
    { name: 'blue', fill: '#bfdbfe', stroke: '#3b82f6' },
    { name: 'green', fill: '#bbf7d0', stroke: '#16a34a' },
    { name: 'teal', fill: '#99f6e4', stroke: '#0d9488' },
    { name: 'orange', fill: '#fed7aa', stroke: '#ea580c' },
    { name: 'purple', fill: '#e9d5ff', stroke: '#9333ea' },
  ];
  // Each of the 4 options gets its own palette so they look distinct
  const shuffledPalettes = [...palettes];
  for (let i = shuffledPalettes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledPalettes[i], shuffledPalettes[j]] = [shuffledPalettes[j], shuffledPalettes[i]];
  }

  // ── Shape rotation ────────────────────────────────────────────────────────
  const shapeTypes = ['circle', 'rectangle', 'kite', 'pentagon'];
  const shuffledShapes = [...shapeTypes];
  for (let i = shuffledShapes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledShapes[i], shuffledShapes[j]] = [shuffledShapes[j], shuffledShapes[i]];
  }

  // ── Distractors ───────────────────────────────────────────────────────────
  const distractors = generateIdentifyFractionDistractors({ numerator, denominator, random });

  // ── Build 4 options ────────────────────────────────────────────────────────
  // Slot 0 = correct. We'll shuffle below.
  const rawOptions = [
    {
      id: 'opt_correct',
      numerator,
      denominator,
      isCorrect: true,
    },
    ...distractors.map((d, i) => ({
      id: `opt_distractor_${i}`,
      numerator: d.numerator,
      denominator: d.denominator,
      isCorrect: false,
    })),
  ];

  // Assign shape + palette to each option
  const optionsWithSvg = rawOptions.map((opt, i) => {
    const palette = shuffledPalettes[i % shuffledPalettes.length];
    const shapeType = shuffledShapes[i % shuffledShapes.length];
    const svg = buildIdentifyShapeSvg({
      shapeType,
      numerator: opt.numerator,
      denominator: opt.denominator,
      fillColor: palette.fill,
      strokeColor: palette.stroke,
    });
    return {
      ...opt,
      type: 'svg',
      content: svg,
      label: `${opt.numerator}/${opt.denominator}`,
      meta: { shapeType, numerator: opt.numerator, denominator: opt.denominator, palette: palette.name },
    };
  });

  // ── Shuffle ───────────────────────────────────────────────────────────────
  for (let i = optionsWithSvg.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [optionsWithSvg[i], optionsWithSvg[j]] = [optionsWithSvg[j], optionsWithSvg[i]];
  }
  const correctIdx = optionsWithSvg.findIndex((o) => o.id === 'opt_correct');
  if (correctIdx < 0) {
    throw new Error('[FractionsGenerator] identify-fraction: correct option lost during shuffle');
  }

  const fractionLabel = `${numerator}/${denominator}`;
  const questionText = resolvedVars.questionText
    || `Look at the coloured part of each shape. Which shape shows the fraction ${fractionLabel}?`;

  // ── Correct answer SVG for solution panel ────────────────────────────────
  const correctOpt = optionsWithSvg[correctIdx];

  return {
    id: `q_frac_identify_${uid()}`,
    type: 'mcq',
    questionText,
    question_text: questionText,
    parts: [{ type: 'text', content: questionText }],
    options: optionsWithSvg,
    correctAnswerId: 'opt_correct',
    correctAnswerIndex: correctIdx,
    correctAnswerIndices: [correctIdx],
    correctAnswerText: fractionLabel,
    correct_answer_index: correctIdx,
    correct_answer_id: 'opt_correct',
    correct_answer_text: fractionLabel,
    validation: { type: 'exact', answer: correctIdx },
    showSubmitButton: true,
    show_submit_button: true,
    isGrid: true,
    layoutConfig: { columns: 4, gap: '1rem' },
    adaptiveConfig: {
      ...(templateConfig.adaptiveConfig || {}),
      logic_type: FRACTIONS_IDENTIFY_FRACTION_TEMPLATE_ID,
      variables: {
        ...resolvedVars,
        seed: instanceSeed,
        numerator,
        denominator,
        targetFraction: fractionLabel,
      },
    },
    concepts: [
      {
        type: 'text',
        content: `The **numerator** (${numerator}) tells how many parts are coloured. The **denominator** (${denominator}) tells how many equal parts in total.`,
      },
    ],
    solution: [
      {
        type: 'section',
        label: 'key idea',
        parts: [
          {
            type: 'text',
            content: `A fraction **${fractionLabel}** means ${numerator} out of ${denominator} equal parts are coloured.`,
          },
        ],
      },
      {
        type: 'section',
        label: 'solve',
        parts: [
          { type: 'text', content: `The correct shape has exactly ${numerator} out of ${denominator} equal parts coloured:` },
          { type: 'svg', content: correctOpt.content },
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing generators (unchanged logic, uid() fix applied)
// ─────────────────────────────────────────────────────────────────────────────

const getCutLines = ({ denominator, isEqual }) => {
  if (isEqual) {
    if (denominator === 2) return [{ x1: 120, y1: 18, x2: 120, y2: 222 }];
    if (denominator === 3) return [
      { x1: 120, y1: 120, x2: 120, y2: 18 },
      { x1: 120, y1: 120, x2: 31, y2: 171 },
      { x1: 120, y1: 120, x2: 209, y2: 171 },
    ];
    if (denominator === 6) return [
      { x1: 120, y1: 18, x2: 120, y2: 222 },
      { x1: 31, y1: 69, x2: 209, y2: 171 },
      { x1: 31, y1: 171, x2: 209, y2: 69 },
    ];
    return [
      { x1: 120, y1: 18, x2: 120, y2: 222 },
      { x1: 18, y1: 120, x2: 222, y2: 120 },
    ];
  }
  if (denominator === 2) return [{ x1: 95, y1: 18, x2: 95, y2: 222 }];
  if (denominator === 3) return [
    { x1: 120, y1: 120, x2: 120, y2: 18 },
    { x1: 120, y1: 120, x2: 45, y2: 188 },
    { x1: 120, y1: 120, x2: 214, y2: 154 },
  ];
  if (denominator === 6) return [
    { x1: 120, y1: 18, x2: 120, y2: 222 },
    { x1: 24, y1: 86, x2: 216, y2: 86 },
    { x1: 24, y1: 154, x2: 216, y2: 154 },
    { x1: 68, y1: 36, x2: 172, y2: 204 },
  ];
  return [
    { x1: 120, y1: 18, x2: 120, y2: 222 },
    { x1: 24, y1: 103, x2: 216, y2: 103 },
    { x1: 18, y1: 158, x2: 222, y2: 158 },
  ];
};

const createImageCutSvg = ({ asset, denominator = 4, isEqual = true, size = 240 }) => {
  const lines = getCutLines({ denominator, isEqual });
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}" role="img" aria-label="${escapeAttr(asset.label)} cut ${isEqual ? 'equally' : 'unequally'}">
      <image href="${escapeAttr(asset.src)}" x="12" y="12" width="216" height="216" preserveAspectRatio="xMidYMid meet"/>
      <g stroke="#2f2f2f" stroke-width="3.4" stroke-linecap="square" opacity=".92">
        ${lines.map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('')}
      </g>
    </svg>
  `;
};

function generateImageCutsQuestion(templateConfig = {}) {
  const variablesBlock = (
    templateConfig.adaptiveConfig?.variables
    || templateConfig.variables
    || templateConfig.data_source?.variables
    || {}
  );
  const resolvedVars = Object.fromEntries(
    Object.entries(variablesBlock).map(([key, value]) => [key, resolveValue(value)])
  );

  const assetPool = Array.isArray(templateConfig.imageAssets) && templateConfig.imageAssets.length > 0
    ? templateConfig.imageAssets
    : FRACTION_IMAGE_ASSETS;
  const asset = resolvedVars.assetId
    ? (assetPool.find((a) => a.id === resolvedVars.assetId) || assetPool[0])
    : pickRandom(assetPool);
  const target = FRACTION_TARGETS[resolvedVars.targetFraction] || FRACTION_TARGETS.fourths;
  const noun = resolvedVars.itemName || asset.label || 'shape';
  const questionText = resolvedVars.questionText || `Which ${noun} is cut into ${target.word}?`;

  const correctOption = {
    id: 'opt_correct',
    type: 'svg',
    content: createImageCutSvg({ asset, denominator: target.denominator, isEqual: true }),
    label: `${noun} cut into ${target.word}`,
    isCorrect: true,
    meta: { assetId: asset.id, denominator: target.denominator, isEqual: true },
  };
  const distractorOption = {
    id: 'opt_distractor_unequal',
    type: 'svg',
    content: createImageCutSvg({ asset, denominator: target.denominator, isEqual: false }),
    label: `${noun} cut into unequal pieces`,
    misconception: 'unequal_partition',
    meta: { assetId: asset.id, denominator: target.denominator + 2, isEqual: false },
  };

  const options = [correctOption, distractorOption];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctIdx = options.findIndex((o) => o.id === 'opt_correct');

  const correctSvg = createImageCutSvg({ asset, denominator: target.denominator, isEqual: true, size: 220 });
  const unequalSvg = createImageCutSvg({ asset, denominator: target.denominator, isEqual: false, size: 220 });

  return {
    id: `q_frac_img_${uid()}`,
    type: 'mcq',
    questionText,
    question_text: questionText,
    parts: [{ type: 'text', content: questionText }],
    options,
    correctAnswerId: 'opt_correct',
    correctAnswerIndex: correctIdx,
    correctAnswerIndices: [correctIdx],
    correctAnswerText: `${noun} cut into ${target.word}`,
    correct_answer_index: correctIdx,
    correct_answer_id: 'opt_correct',
    correct_answer_text: `${noun} cut into ${target.word}`,
    validation: { type: 'exact', answer: correctIdx },
    showSubmitButton: true,
    show_submit_button: true,
    isGrid: true,
    layoutConfig: { columns: 2, gap: '1.25rem' },
    adaptiveConfig: {
      ...(templateConfig.adaptiveConfig || {}),
      logic_type: FRACTIONS_IMAGE_CUTS_TEMPLATE_ID,
      variables: {
        ...resolvedVars,
        assetId: asset.id,
        itemName: noun,
        targetFraction: target.word,
        denominator: target.denominator,
      },
    },
    imageAssets: assetPool.map(({ id, label, src }) => ({ id, label, src })),
    concepts: [
      { type: 'text', content: `**${target.word[0].toUpperCase()}${target.word.slice(1)}** means ${target.denominator} equal parts.` },
    ],
    solution: [
      {
        type: 'section', label: 'key idea', title: '',
        parts: [{ type: 'text', content: `**${target.word[0].toUpperCase()}${target.word.slice(1)}** means ${target.denominator} equal parts.` }],
      },
      {
        type: 'section', label: 'solve', title: '',
        parts: [
          { type: 'text', content: `This ${noun} is cut into ${target.denominator} equal pieces. It is cut into **${target.word}**.` },
          { type: 'svg', content: correctSvg },
          { type: 'html', content: '<hr style="border:none;border-top:1px solid #cfcfcf;margin:24px 0;" />' },
          { type: 'text', content: `The other ${noun} is cut into unequal pieces. It is not cut into ${target.word}.` },
          { type: 'svg', content: unequalSvg },
        ],
      },
    ],
  };
}

const getShapeRect = ({ shape, orientation }) => {
  if (shape === 'square') return { x: 50, y: 42, width: 220, height: 220 };
  if (orientation === 'horizontal') return { x: 76, y: 28, width: 174, height: 236 };
  return { x: 28, y: 82, width: 264, height: 132 };
};

const getShapePartitionLines = ({ rect, orientation, parts, isEqual }) => {
  if (orientation === 'grid') {
    const midX = rect.x + rect.width / 2;
    const midY = rect.y + rect.height / 2;
    if (isEqual) {
      return [
        { x1: midX, y1: rect.y, x2: midX, y2: rect.y + rect.height },
        { x1: rect.x, y1: midY, x2: rect.x + rect.width, y2: midY },
      ];
    }
    return [
      { x1: rect.x + rect.width * 0.42, y1: rect.y, x2: rect.x + rect.width * 0.42, y2: rect.y + rect.height },
      { x1: rect.x, y1: rect.y + rect.height * 0.58, x2: rect.x + rect.width, y2: rect.y + rect.height * 0.58 },
    ];
  }
  const isHorizontalCuts = orientation === 'horizontal';
  const length = isHorizontalCuts ? rect.height : rect.width;
  const start = isHorizontalCuts ? rect.y : rect.x;
  const equalPositions = Array.from({ length: parts - 1 }, (_, i) => start + (length / parts) * (i + 1));
  const unequalRatios = parts === 2 ? [0.34] : parts === 3 ? [0.28, 0.7] : [0.22, 0.62, 0.82];
  const positions = isEqual
    ? equalPositions
    : unequalRatios.slice(0, parts - 1).map((r) => start + length * r);
  return positions.map((pos) => (
    isHorizontalCuts
      ? { x1: rect.x, y1: pos, x2: rect.x + rect.width, y2: pos }
      : { x1: pos, y1: rect.y, x2: pos, y2: rect.y + rect.height }
  ));
};

const shapeSvgLibrary = {
  cdn: SVG_JS_CDN,
  makeRectPicture({ variant, palette, isEqual, size = 320 }) {
    const rect = getShapeRect(variant);
    const lines = getShapePartitionLines({ ...variant, rect, isEqual });
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="${size}" height="${size}" role="img" aria-label="${isEqual ? 'Equal' : 'Unequal'} parts">
        <rect x="4" y="4" width="312" height="312" rx="4" fill="#ffffff" stroke="#aeeaff" stroke-width="3"/>
        <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="4"/>
        <g stroke="${palette.stroke}" stroke-width="4" stroke-linecap="square">
          ${lines.map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('')}
        </g>
      </svg>
    `;
  },
};

function generateShapeEqualPartsQuestion(templateConfig = {}) {
  const variablesBlock = (
    templateConfig.adaptiveConfig?.variables
    || templateConfig.variables
    || templateConfig.data_source?.variables
    || {}
  );
  const resolvedVars = Object.fromEntries(
    Object.entries(variablesBlock).map(([key, value]) => [key, resolveValue(value)])
  );
  const instanceSeed = createInstanceSeed(templateConfig, resolvedVars);
  const random = createSeededRandom(instanceSeed);

  const variant = resolvedVars.shapeVariant
    ? (SHAPE_VARIANTS.find((v) => v.shape === resolvedVars.shapeVariant || `${v.shape}_${v.orientation}_${v.parts}` === resolvedVars.shapeVariant) || pickRandom(SHAPE_VARIANTS))
    : pickWithRandom(SHAPE_VARIANTS, random);
  const correctPalette = resolvedVars.correctPalette
    ? (SHAPE_PALETTES.find((p) => p.id === resolvedVars.correctPalette) || pickWithRandom(SHAPE_PALETTES, random))
    : pickWithRandom(SHAPE_PALETTES, random);
  const distractorPalette = resolvedVars.distractorPalette
    ? (SHAPE_PALETTES.find((p) => p.id === resolvedVars.distractorPalette) || pickWithRandom(SHAPE_PALETTES, random))
    : pickWithRandom(SHAPE_PALETTES.filter((p) => p.id !== correctPalette.id), random);
  const distractorVariant = { ...variant, orientation: resolvedVars.distractorOrientation || variant.orientation };
  const questionText = resolvedVars.questionText || 'Which picture shows equal parts?';

  const correctOption = {
    id: 'opt_correct', type: 'svg',
    content: shapeSvgLibrary.makeRectPicture({ variant, palette: correctPalette, isEqual: true }),
    label: 'Equal parts', isCorrect: true,
    meta: { shape: variant.shape, orientation: variant.orientation, parts: variant.parts, isEqual: true, svgLibraryCdn: shapeSvgLibrary.cdn },
  };
  const distractorOption = {
    id: 'opt_distractor_unequal', type: 'svg',
    content: shapeSvgLibrary.makeRectPicture({ variant: distractorVariant, palette: distractorPalette, isEqual: false }),
    label: 'Unequal parts', misconception: 'unequal_partition',
    meta: { shape: distractorVariant.shape, orientation: distractorVariant.orientation, parts: distractorVariant.parts, isEqual: false, svgLibraryCdn: shapeSvgLibrary.cdn },
  };

  const options = [correctOption, distractorOption];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctIdx = options.findIndex((o) => o.id === 'opt_correct');

  return {
    id: `q_frac_shape_${uid()}`,
    type: 'mcq', questionText, question_text: questionText,
    parts: [{ type: 'text', content: questionText }],
    options,
    correctAnswerId: 'opt_correct', correctAnswerIndex: correctIdx,
    correctAnswerIndices: [correctIdx], correctAnswerText: 'Equal parts',
    correct_answer_index: correctIdx, correct_answer_id: 'opt_correct',
    correct_answer_text: 'Equal parts',
    validation: { type: 'exact', answer: correctIdx },
    showSubmitButton: true, show_submit_button: true, isGrid: true,
    layoutConfig: { columns: 2, gap: '1.5rem' },
    adaptiveConfig: {
      ...(templateConfig.adaptiveConfig || {}),
      logic_type: FRACTIONS_SHAPE_EQUAL_PARTS_TEMPLATE_ID,
      variables: { ...resolvedVars, seed: instanceSeed, shape: variant.shape, orientation: variant.orientation, parts: variant.parts },
      libraries: { ...(templateConfig.adaptiveConfig?.libraries || {}), svgjs: SVG_JS_CDN },
    },
    shapeLibrary: { renderer: 'svg', svgjsCdn: SVG_JS_CDN, centralizedBuilder: 'shapeSvgLibrary.makeRectPicture' },
    concepts: [{ type: 'text', content: '**Equal parts** are parts that are exactly the same size.' }],
    solution: [
      { type: 'section', label: 'key idea', parts: [{ type: 'text', content: '**Equal parts** are parts that are exactly the same size.' }] },
      {
        type: 'section', label: 'solve',
        parts: [
          { type: 'text', content: 'The correct picture has matching pieces. Each part is the same size.' },
          { type: 'svg', content: correctOption.content },
          { type: 'html', content: '<hr style="border:none;border-top:1px solid #cfcfcf;margin:24px 0;" />' },
          { type: 'text', content: 'The other picture has pieces with different sizes, so it does not show equal parts.' },
          { type: 'svg', content: distractorOption.content },
        ],
      },
    ],
  };
}

const getGridDimensions = (totalParts) => {
  if (totalParts <= 2) return { rows: 1, cols: totalParts };
  if (totalParts === 3) return { rows: 1, cols: 3 };
  if (totalParts === 4) return { rows: 2, cols: 2 };
  if (totalParts === 6) return { rows: 2, cols: 3 };
  if (totalParts === 8) return { rows: 2, cols: 4 };
  return { rows: 3, cols: Math.ceil(totalParts / 3) };
};

const createShadedFractionSvg = ({ shape = 'circle', totalParts = 4, shadedParts = 1, shadeColor = '#9fc2f5', stroke = '#3f78bf', size = 260 }) => {
  const normalizedShape = shape === 'pie' ? 'circle' : shape;
  const safeTotal = Math.max(2, Number(totalParts) || 4);
  const safeShaded = Math.min(Math.max(0, Number(shadedParts) || 1), safeTotal);

  if (normalizedShape === 'circle') {
    const cx = 130, cy = 130, r = 82;
    const wedges = Array.from({ length: safeTotal }, (_, i) => {
      const start = (-Math.PI / 2) + (2 * Math.PI * i) / safeTotal;
      const end = (-Math.PI / 2) + (2 * Math.PI * (i + 1)) / safeTotal;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const largeArc = (end - start) > Math.PI ? 1 : 0;
      const fill = i < safeShaded ? shadeColor : '#ffffff';
      return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="${size}" height="${size}" role="img" aria-label="${safeShaded} of ${safeTotal} parts shaded">
      ${wedges}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="3"/>
    </svg>`;
  }

  const { rows, cols } = getGridDimensions(safeTotal);
  const isSquare = normalizedShape === 'square';
  const width = isSquare ? 170 : 220, height = isSquare ? 170 : 130;
  const x = (260 - width) / 2, y = (260 - height) / 2;
  const cellW = width / cols, cellH = height / rows;
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    if (i >= safeTotal) return '';
    const row = Math.floor(i / cols), col = i % cols;
    const fill = i < safeShaded ? shadeColor : '#ffffff';
    return `<rect x="${(x + col * cellW).toFixed(2)}" y="${(y + row * cellH).toFixed(2)}" width="${cellW.toFixed(2)}" height="${cellH.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="${size}" height="${size}" role="img" aria-label="${safeShaded} of ${safeTotal} parts shaded">
    ${cells}
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${stroke}" stroke-width="3"/>
  </svg>`;
};

function generateShadedFractionQuestion(templateConfig = {}) {
  const variablesBlock = (
    templateConfig.adaptiveConfig?.variables
    || templateConfig.variables
    || templateConfig.data_source?.variables
    || {}
  );
  const resolvedVars = Object.fromEntries(
    Object.entries(variablesBlock).map(([key, value]) => [key, resolveValue(value)])
  );

  const instanceSeed = createInstanceSeed(templateConfig, resolvedVars);
  const random = createSeededRandom(instanceSeed);

  // ── ALL random picks use seeded rng in fixed order ─────────────────────
  const shapePool = ['circle', 'pie', 'square', 'rectangle'];
  const rawShape = (resolvedVars.shape && resolvedVars.shape !== 'random')
    ? resolvedVars.shape
    : pickWithRandom(shapePool, random); // call #1

  // Normalise early so denominatorPool and stored variables are consistent
  const shape = rawShape === 'pie' ? 'circle' : rawShape;

  const denominatorPool = (shape === 'circle') ? [2, 3, 4, 6] : [2, 4, 6, 8];
  const totalParts = Number(resolvedVars.totalParts || resolvedVars.denominator)
    || pickWithRandom(denominatorPool, random); // call #2

  const shadedParts = Number(resolvedVars.shadedParts || resolvedVars.numerator)
    || (Math.floor(random() * (totalParts - 1)) + 1); // call #3

  const palettes = [
    { name: 'blue', shade: '#9fc2f5', stroke: '#3f78bf' },
    { name: 'green', shade: '#bbf7d0', stroke: '#16a34a' },
    { name: 'purple', shade: '#e9d5ff', stroke: '#9333ea' },
    { name: 'orange', shade: '#fed7aa', stroke: '#ea580c' },
  ];
  const palette = pickWithRandom(palettes, random); // call #4

  const colorName = resolvedVars.colorName || palette.name;
  const shadeColor = resolvedVars.shadeColor || palette.shade;
  const stroke = resolvedVars.stroke || palette.stroke;

  const fraction = `${shadedParts}/${totalParts}`;
  const divisor = gcd(shadedParts, totalParts);
  const simplified = `${shadedParts / divisor}/${totalParts / divisor}`;
  const answerText = fraction;

  const questionText = resolvedVars.questionText || `What fraction of the shape is ${colorName}?`;
  const shapeSvg = createShadedFractionSvg({ shape, totalParts, shadedParts, shadeColor, stroke });

  return {
    id: `q_frac_shaded_${uid()}`,
    type: 'fillInTheBlank',
    questionText, question_text: questionText,
    parts: [
      { type: 'text', content: questionText, isVertical: true },
      { type: 'svg', content: shapeSvg, isVertical: true },
      { type: 'text', content: 'Use a forward slash ( / ) to separate the numerator and denominator.', isVertical: true, style: { fontStyle: 'italic', marginTop: '20px' } },
      { type: 'input', id: 'ans', size: 'medium', isVertical: true },
    ],
    // ── Fix: correctAnswerText is the bare fraction string; validation holds the object ──
    correctAnswerText: answerText,
    correct_answer_text: answerText,
    validation: { type: 'exact', answer: { ans: answerText } },
    showSubmitButton: true, show_submit_button: true,
    adaptiveConfig: {
      ...(templateConfig.adaptiveConfig || {}),
      logic_type: FRACTIONS_SHADED_FRACTION_TEMPLATE_ID,
      variables: {
        ...resolvedVars,
        seed: instanceSeed,
        shape, // normalised value stored
        totalParts, shadedParts, colorName,
        answer: answerText, simplifiedAnswer: simplified,
      },
    },
    concepts: [{ type: 'text', content: 'The numerator counts the shaded parts. The denominator counts all equal parts.' }],
    solution: [
      {
        type: 'section', label: 'solve',
        parts: [
          { type: 'svg', content: shapeSvg },
          { type: 'text', content: `Count the number of equal parts. There are ${totalParts} equal parts.` },
          { type: 'text', content: `Count the number of ${colorName} parts. There ${shadedParts === 1 ? 'is' : 'are'} ${shadedParts} ${colorName} ${shadedParts === 1 ? 'part' : 'parts'}.` },
          { type: 'text', content: `${shadedParts} out of ${totalParts} equal parts ${shadedParts === 1 ? 'is' : 'are'} ${colorName}. Write ${shadedParts} out of ${totalParts} as a fraction:` },
          { type: 'text', content: `**${answerText}**` },
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function generateFractionsQuestion(templateConfig = {}) {
  const logicKey = getLogicKey(templateConfig);

  if (logicKey === FRACTIONS_SHADED_FRACTION_TEMPLATE_ID) return generateShadedFractionQuestion(templateConfig);
  if (logicKey === FRACTIONS_SHAPE_EQUAL_PARTS_TEMPLATE_ID) return generateShapeEqualPartsQuestion(templateConfig);
  if (logicKey === FRACTIONS_IMAGE_CUTS_TEMPLATE_ID) return generateImageCutsQuestion(templateConfig);
  if (logicKey === FRACTIONS_IDENTIFY_FRACTION_TEMPLATE_ID) return generateIdentifyFractionQuestion(templateConfig); // NEW

  // ── Generic deep-search fallback ──────────────────────────────────────────
  const findInObject = (obj, key) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[key]) return obj[key];
    for (const v of Object.values(obj)) {
      const found = findInObject(v, key);
      if (found) return found;
    }
    return null;
  };

  const variablesBlock = findInObject(templateConfig, 'variables') || {};
  const optionsBlock = findInObject(templateConfig, 'options') || [];
  const questionTextRaw = findInObject(templateConfig, 'questionText')
    || findInObject(templateConfig, 'question_text')
    || 'Which {targetShape} shows equal parts?';

  const variables = {};
  for (const [key, val] of Object.entries(variablesBlock)) {
    variables[key] = resolveValue(val);
  }
  if (Object.keys(variables).length === 0) {
    variables.targetShape = ['circle', 'square', 'rectangle', 'hexagon', 'triangle'][Math.floor(Math.random() * 5)];
    variables.partitionCount = [2, 3, 4][Math.floor(Math.random() * 3)];
    variables.baseRotation = [0, 45, 90, 180][Math.floor(Math.random() * 4)];
  }

  const colors = ['#bfdbfe', '#bbf7d0', '#e9d5ff', '#fecaca', '#fed7aa', '#fef08a'];
  const resolvedOptions = optionsBlock.map((opt) => {
    const resolvedOpt = { ...opt };
    for (const [key, val] of Object.entries(resolvedOpt)) {
      let v = resolveValue(val);
      v = interpolate(v, variables);
      resolvedOpt[key] = v;
    }
    if (!resolvedOpt.fill) resolvedOpt.fill = colors[Math.floor(Math.random() * colors.length)];
    if (resolvedOpt.id === 'opt_correct') resolvedOpt.isCorrect = true;
    return resolvedOpt;
  });

  const shuffled = [...resolvedOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let correctIdx = shuffled.findIndex((o) => o.id === 'opt_correct' || o.isCorrect === true);
  if (correctIdx < 0) {
    console.error('[FractionsGenerator] No correct option found in options block — check your config.');
    return { error: 'no_correct_option', raw: shuffled };
  }
  const correctOption = shuffled[correctIdx];
  const questionText = interpolate(questionTextRaw, variables);

  return {
    id: `q_frac_${uid()}`,
    type: 'mcq', questionText, question_text: questionText,
    options: shuffled,
    parts: [{ type: 'text', content: questionText }],
    correctAnswerId: correctOption.id,
    correctAnswerIndex: correctIdx,
    correctAnswerIndices: [correctIdx],
    correctAnswerText: correctOption.label || 'Equal parts',
    validation: { type: 'exact', answer: correctIdx },
    adaptiveConfig: { ...(templateConfig.adaptiveConfig || {}), variables },
    correct_answer_index: correctIdx,
    correct_answer_id: correctOption.id,
    correct_answer_text: correctOption.label || 'Equal parts',
    showSubmitButton: true, show_submit_button: true,
    explanation: { type: 'text', content: `A ${variables.targetShape || 'shape'} has equal parts when every section is exactly the same size.` },
  };
}