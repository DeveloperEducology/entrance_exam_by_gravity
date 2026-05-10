/**
 * Visual Models Engine Family
 * Powers: Match fraction to model, area model, strip model, pie model, identify fraction.
 * Configured via engineParams.
 */

import { createSeededRandom } from '../shared/mathCore';
import { buildIdentifyShapeSvg, makeRectPicture, buildShapeSetSvg } from '../shared/svgLibrary/shapes';

// uid helper: prevents id collisions in batch generation
let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const visualModelsEngine = (config) => {
  const { engineParams = {}, adaptiveConfig = {}, variables = {} } = config;
  
  // Resolve variables
  const resolvedVars = { ...variables, ...(adaptiveConfig.variables || {}) };
  
  // Combine engine params with any overrides from DB
  const params = {
    ...engineParams,
    ...resolvedVars
  };

  // Setup seeded random
  const seed = params.seed || `visual_model_${Date.now()}`;
  const random = createSeededRandom(seed);

  // Core logic based on sub-type
  const subType = params.subType || 'identify_fraction';

  if (subType === 'identify_fraction') {
    return generateIdentifyFraction(params, random);
  } else if (subType === 'equal_parts') {
    return generateEqualParts(params, random);
  } else if (subType === 'fraction_of_set') {
    return generateFractionOfSet(params, random);
  } else {
      throw new Error(`[VisualModelsEngine] Unsupported subType: ${subType}`);
  }
};

// ============================================================================
// Core Generator Logics
// ============================================================================

function generateIdentifyFraction(params, random) {
  // Extract parameters
  const denominatorPool = params.denominatorPool || [2, 3, 4, 5, 6, 8];
  const denominator = params.denom || params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
  const numerator = params.num || params.numerator || (Math.floor(random() * (denominator - 1)) + 1);
  
  const shapeTypes = params.shapeTypes || ['circle', 'rectangle', 'kite', 'pentagon'];
  const shuffledShapes = [...shapeTypes];
  for (let i = shuffledShapes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledShapes[i], shuffledShapes[j]] = [shuffledShapes[j], shuffledShapes[i]];
  }

  const fractionLabel = `${numerator}/${denominator}`;
  const questionText = params.questionText || `Which shape shows the fraction ${fractionLabel}?`;

  const palettes = [
    { name: 'blue', fill: '#bfdbfe', stroke: '#3b82f6' },
    { name: 'green', fill: '#bbf7d0', stroke: '#16a34a' },
    { name: 'teal', fill: '#99f6e4', stroke: '#0d9488' },
    { name: 'orange', fill: '#fed7aa', stroke: '#ea580c' },
    { name: 'purple', fill: '#e9d5ff', stroke: '#9333ea' },
  ];
  
  const shuffledPalettes = [...palettes];
  for (let i = shuffledPalettes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledPalettes[i], shuffledPalettes[j]] = [shuffledPalettes[j], shuffledPalettes[i]];
  }

  const distractors = generateIdentifyFractionDistractors(numerator, denominator, random);

  const rawOptions = [
    { id: 'opt_correct', numerator, denominator, isCorrect: true },
    ...distractors.map((d, i) => ({ id: `opt_distractor_${i}`, numerator: d.numerator, denominator: d.denominator, isCorrect: false }))
  ];

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

  for (let i = optionsWithSvg.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [optionsWithSvg[i], optionsWithSvg[j]] = [optionsWithSvg[j], optionsWithSvg[i]];
  }
  
  const correctIdx = optionsWithSvg.findIndex((o) => o.id === 'opt_correct');

  return {
    id: `q_frac_vis_${uid()}`,
    type: 'mcq',
    questionText,
    parts: [{ type: 'text', content: questionText }],
    options: optionsWithSvg,
    correctAnswerId: 'opt_correct',
    correctAnswerIndex: correctIdx,
    validation: { type: 'exact', answer: correctIdx },
    isGrid: true,
    layoutConfig: { columns: 4, gap: '1rem' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'visual_models_identify',
      variables: {
        num: numerator,
        denom: denominator,
        seed: params.seed
      }
    }
  };
}

function generateIdentifyFractionDistractors(numerator, denominator, random) {
  const used = new Set([`${numerator}/${denominator}`]);
  
  const candidatesA = Array.from({ length: denominator - 1 }, (_, i) => i + 1)
    .filter((n) => n !== numerator);
    
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

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 3);
}

function generateEqualParts(params, random) {
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

  const variant = params.variant 
    ? (SHAPE_VARIANTS.find((v) => v.shape === params.variant || `${v.shape}_${v.orientation}_${v.parts}` === params.variant) || SHAPE_VARIANTS[Math.floor(random() * SHAPE_VARIANTS.length)])
    : SHAPE_VARIANTS[Math.floor(random() * SHAPE_VARIANTS.length)];
    
  const correctPalette = SHAPE_PALETTES[Math.floor(random() * SHAPE_PALETTES.length)];
  const remainingPalettes = SHAPE_PALETTES.filter((p) => p.id !== correctPalette.id);
  const distractorPalette = remainingPalettes[Math.floor(random() * remainingPalettes.length)];
  
  const distractorVariant = { ...variant, orientation: params.distractorOrientation || variant.orientation };
  
  const questionText = params.questionText || 'Which picture shows equal parts?';

  const correctOption = {
    id: 'opt_correct', 
    type: 'svg',
    content: makeRectPicture({ variant, palette: correctPalette, isEqual: true }),
    label: 'Equal parts', 
    isCorrect: true,
  };
  
  const distractorOption = {
    id: 'opt_distractor_unequal', 
    type: 'svg',
    content: makeRectPicture({ variant: distractorVariant, palette: distractorPalette, isEqual: false }),
    label: 'Unequal parts', 
    isCorrect: false,
  };

  const options = [correctOption, distractorOption];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  const correctIdx = options.findIndex((o) => o.id === 'opt_correct');

  return {
    id: `q_frac_shape_${uid()}`,
    type: 'mcq', 
    questionText, 
    parts: [{ type: 'text', content: questionText }],
    options,
    correctAnswerId: 'opt_correct', 
    correctAnswerIndex: correctIdx,
    validation: { type: 'exact', answer: correctIdx },
    isGrid: true,
    layoutConfig: { columns: 2, gap: '1.5rem' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'visual_models_equal_parts',
      variables: { 
        seed: params.seed, 
        variant: variant.shape, // Changed key to 'variant' for consistency
        orientation: variant.orientation, 
        parts: variant.parts 
      },
    }
  };
}

function generateFractionOfSet(params, random) {
  const denominatorPool = params.denominatorPool || [2, 3, 4, 5, 6];
  const denominator = params.denom || params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
  const numerator = params.num || params.numerator || (Math.floor(random() * (denominator - 1)) + 1);

  const shapeTypes = ['circle', 'square', 'triangle', 'pentagon'];
  const numTargets = params.numTargets || 1; 
  
  // Pick random target shape(s)
  const shuffledShapes = [...shapeTypes].sort(() => random() - 0.5);
  const targetShapeTypes = shuffledShapes.slice(0, numTargets);
  
  // Pick a distractor shape that is not a target
  const remainingShapes = shuffledShapes.slice(numTargets);
  const distractorShapeType = remainingShapes[0];

  const palettes = [
    { fill: '#79d89c', stroke: '#0f7f34' }, // Green
    { fill: '#ff9845', stroke: '#d97706' }, // Orange
    { fill: '#72a0fc', stroke: '#2563eb' }, // Blue
    { fill: '#c9a5f4', stroke: '#9b4de1' }, // Purple
  ];

  const shuffledPalettes = [...palettes].sort(() => random() - 0.5);
  const targetPalette = shuffledPalettes[0];
  const distractorPalette = shuffledPalettes[1];

  // Build the array of shapes
  const shapes = [];
  for (let i = 0; i < numerator; i++) {
    // If multiple targets, alternate between them
    const tShape = targetShapeTypes[i % targetShapeTypes.length];
    shapes.push({ type: tShape, fill: targetPalette.fill, stroke: targetPalette.stroke });
  }
  for (let i = 0; i < (denominator - numerator); i++) {
    shapes.push({ type: distractorShapeType, fill: distractorPalette.fill, stroke: distractorPalette.stroke });
  }

  // Shuffle the shapes randomly
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  const svgContent = buildShapeSetSvg({ shapes, size: 80 });

  const shapeNames = {
    'circle': 'circles',
    'square': 'squares',
    'triangle': 'triangles',
    'pentagon': 'pentagons'
  };

  const targetNames = targetShapeTypes.map(t => shapeNames[t]).join(' or ');
  const questionText = params.questionText || `What fraction of the shapes are ${targetNames}?`;

  if (params.isFillInTheBlank) {
    return {
      id: `q_frac_set_${uid()}`,
      type: 'fill_in_the_blank',
      questionText,
      parts: [
        { type: 'text', content: questionText },
        { type: 'svg', content: svgContent }
      ],
      options: [],
      correctAnswerText: `${numerator}/${denominator}`,
      validation: { type: 'exact', answer: `${numerator}/${denominator}` },
      adaptiveConfig: {
        logic_type: params.logic_type || 'visual_models_fraction_of_set',
        variables: { num: numerator, denom: denominator, seed: params.seed }
      }
    };
  }

  const fractionOptionSvg = (num, den) => `<svg width="40" height="70" viewBox="0 0 40 70"><text x="20" y="26" text-anchor="middle" font-size="24" font-family="sans-serif" font-weight="500">${num}</text><line x1="2" y1="35" x2="38" y2="35" stroke="black" stroke-width="2"/><text x="20" y="60" text-anchor="middle" font-size="24" font-family="sans-serif" font-weight="500">${den}</text></svg>`;

  const distractors = generateIdentifyFractionDistractors(numerator, denominator, random);

  const rawOptions = [
    { id: 'opt_correct', content: fractionOptionSvg(numerator, denominator), isCorrect: true, type: 'svg' },
    ...distractors.map((d, i) => ({ id: `opt_distractor_${i}`, content: fractionOptionSvg(d.numerator, d.denominator), isCorrect: false, type: 'svg' }))
  ];

  for (let i = rawOptions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
  }

  const correctIdx = rawOptions.findIndex((o) => o.id === 'opt_correct');

  return {
    id: `q_frac_set_${uid()}`,
    type: 'mcq',
    questionText,
    parts: [
      { type: 'text', content: questionText },
      { type: 'svg', content: svgContent }
    ],
    options: rawOptions,
    correctAnswerId: 'opt_correct',
    correctAnswerIndex: correctIdx,
    validation: { type: 'exact', answer: correctIdx },
    isGrid: true,
    layoutConfig: { columns: 4, gap: '1rem' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'visual_models_fraction_of_set',
      variables: {
        num: numerator,
        denom: denominator,
        seed: params.seed
      }
    }
  };
}
