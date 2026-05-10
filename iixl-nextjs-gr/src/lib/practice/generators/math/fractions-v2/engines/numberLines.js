/**
 * Number Lines Engine Family
 * Powers: Graph fractions, identify fractions from number line, equivalent fractions on number line.
 * Configured via engineParams.
 */

import { createSeededRandom, getRandomInt } from '../shared/mathCore';
import { buildNumberLineSvg } from '../shared/svgLibrary/numberLines';

let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const numberLinesEngine = (config) => {
  const { engineParams = {}, adaptiveConfig = {}, variables = {} } = config;
  
  // Resolve variables
  const resolvedVars = { ...variables, ...(adaptiveConfig.variables || {}) };
  
  // Combine engine params with any overrides from DB
  const params = {
    ...engineParams,
    ...resolvedVars
  };

  // Setup seeded random
  const seed = params.seed || `number_line_${Date.now()}`;
  const random = createSeededRandom(seed);

  const subType = params.subType || 'identify_point';

  if (subType === 'identify_point') {
    return generateIdentifyPoint(params, random);
  } else if (subType === 'graph_fraction_mcq') {
    return generateGraphFractionMCQ(params, random);
  } else {
    throw new Error(`[NumberLinesEngine] Unsupported subType: ${subType}`);
  }
};

// ============================================================================
// Core Generator Logics
// ============================================================================

function generateIdentifyPoint(params, random) {
  // Extract parameters
  const min = params.min || 0;
  const max = params.max || 1;
  const denominatorPool = params.denominatorPool || [2, 3, 4, 5, 6, 8, 10];
  const denominator = params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
  
  const totalSegments = (max - min) * denominator;
  // Pick a random point that is NOT min or max (optional, but better for practice)
  const numerator = params.numerator || getRandomInt(1, totalSegments - 1, random);
  
  const fractionLabel = `${numerator}/${denominator}`;
  const pointName = params.pointName || 'A';
  const questionText = params.questionText || `Which fraction represents point ${pointName} on the number line?`;

  const numberLineSvg = buildNumberLineSvg({
    min,
    max,
    denominator,
    showLabels: params.showLabels === undefined ? false : params.showLabels, // Usually false for this question type
    showTickMarks: true,
    markedPoints: [
      { numerator, label: pointName, color: '#ef4444', size: 10 }
    ],
    width: 700
  });

  // Distractors
  const distractors = new Set();
  while (distractors.size < 3) {
      const dNum = getRandomInt(1, totalSegments, random);
      const dDenom = [denominator, denominator * 2, denominator === 2 ? 4 : denominator === 4 ? 2 : denominator][Math.floor(random() * 3)];
      
      const dVal = dNum / dDenom;
      const cVal = numerator / denominator;
      
      if (Math.abs(dVal - cVal) > 0.01) { // Avoid exact equivalents
         distractors.add(`${dNum}/${dDenom}`);
      }
  }

  const rawOptions = [
    { id: 'opt_correct', content: fractionLabel, isCorrect: true, type: 'text' },
    ...Array.from(distractors).map((d, i) => ({ id: `opt_distractor_${i}`, content: d, isCorrect: false, type: 'text' }))
  ];

  // Shuffle
  for (let i = rawOptions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
  }

  const correctIdx = rawOptions.findIndex((o) => o.id === 'opt_correct');

  return {
    id: `q_frac_nl_${uid()}`,
    type: 'mcq',
    questionText,
    parts: [
        { type: 'text', content: questionText },
        { type: 'svg', content: numberLineSvg }
    ],
    options: rawOptions,
    correctAnswerId: 'opt_correct',
    correctAnswerIndex: correctIdx,
    isGrid: true,
    layoutConfig: { columns: 2, gap: '1rem' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'number_lines_identify',
      variables: {
        numerator,
        denominator,
        min,
        max,
        seed: params.seed
      }
    }
  };
}

function generateGraphFractionMCQ(params, random) {
    const min = params.min || 0;
    const max = params.max || 1;
    const denominatorPool = params.denominatorPool || [2, 3, 4, 5, 6, 8];
    const denominator = params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
    
    const totalSegments = (max - min) * denominator;
    const numerator = params.numerator || getRandomInt(1, totalSegments - 1, random);
    
    const fractionLabel = `${numerator}/${denominator}`;
    const questionText = params.questionText || `Which number line correctly shows the fraction ${fractionLabel}?`;
  
    // Correct Option
    const correctSvg = buildNumberLineSvg({
        min, max, denominator, showLabels: false,
        markedPoints: [{ numerator, color: '#3b82f6', size: 10 }],
        width: 400, height: 100
    });

    // Distractor 1: Off by one tick
    const offset = random() > 0.5 ? 1 : -1;
    let distractor1Num = numerator + offset;
    if (distractor1Num <= 0) distractor1Num = 2;
    if (distractor1Num >= totalSegments) distractor1Num = totalSegments - 1;
    
    const distractor1Svg = buildNumberLineSvg({
        min, max, denominator, showLabels: false,
        markedPoints: [{ numerator: distractor1Num, color: '#3b82f6', size: 10 }],
        width: 400, height: 100
    });

    // Distractor 2: Numerator as denominator logic (e.g. 3/4 -> mark at 4/3 if possible, or just random)
    let distractor2Num = Math.floor(totalSegments / 2);
    if (distractor2Num === numerator) distractor2Num++;
    
    const distractor2Svg = buildNumberLineSvg({
        min, max, denominator, showLabels: false,
        markedPoints: [{ numerator: distractor2Num, color: '#3b82f6', size: 10 }],
        width: 400, height: 100
    });

    const rawOptions = [
      { id: 'opt_correct', content: correctSvg, isCorrect: true, type: 'svg' },
      { id: 'opt_distractor_1', content: distractor1Svg, isCorrect: false, type: 'svg' },
      { id: 'opt_distractor_2', content: distractor2Svg, isCorrect: false, type: 'svg' },
    ];
  
    // Shuffle
    for (let i = rawOptions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
    }
  
    const correctIdx = rawOptions.findIndex((o) => o.id === 'opt_correct');
  
    return {
      id: `q_frac_nl_graph_${uid()}`,
      type: 'mcq',
      questionText,
      parts: [{ type: 'text', content: questionText }],
      options: rawOptions,
      correctAnswerId: 'opt_correct',
      correctAnswerIndex: correctIdx,
      isGrid: false,
      layoutConfig: { columns: 1, gap: '1.5rem' },
      adaptiveConfig: {
        logic_type: params.logic_type || 'number_lines_graph',
        variables: { numerator, denominator, seed: params.seed }
      }
    };
}
