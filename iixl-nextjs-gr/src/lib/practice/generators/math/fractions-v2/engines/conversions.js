/**
 * Conversions Engine Family
 * Powers: Fractions to decimals, decimals to fractions
 * Configured via engineParams.
 */

import { createSeededRandom, getRandomInt, simplifyFraction } from '../shared/mathCore';

let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const conversionsEngine = (config) => {
  const { engineParams = {}, adaptiveConfig = {}, variables = {} } = config;
  
  const resolvedVars = { ...variables, ...(adaptiveConfig.variables || {}) };
  const params = { ...engineParams, ...resolvedVars };

  const seed = params.seed || `conversions_${Date.now()}`;
  const random = createSeededRandom(seed);

  const subType = params.subType || 'fraction_to_decimal';

  if (subType === 'fraction_to_decimal') {
    return generateFractionToDecimal(params, random);
  } else if (subType === 'decimal_to_fraction') {
    return generateDecimalToFraction(params, random);
  } else {
    throw new Error(`[ConversionsEngine] Unsupported subType: ${subType}`);
  }
};

// ============================================================================
// Core Generator Logics
// ============================================================================

const fractionLatex = (num, den) => `\\frac{${num}}{${den}}`;

function generateFractionToDecimal(params, random) {
  const denominators = params.denominators || [10, 100];
  const denominator = denominators[Math.floor(random() * denominators.length)];
  
  const numerator = params.numerator || getRandomInt(1, denominator - 1, random);
  
  const decimalValue = numerator / denominator;
  const decimalStr = decimalValue.toString();
  
  const fractionLatexStr = fractionLatex(numerator, denominator);
  const questionText = params.questionText || `Write ${numerator}/${denominator} as a decimal number.`;

  return {
    id: `q_frac_conv_f2d_${uid()}`,
    type: 'fillInTheBlank',
    questionText,
    parts: [
      { type: 'text', content: 'Write ', isVertical: true },
      { type: 'latex', content: fractionLatexStr, isVertical: true },
      { type: 'text', content: ' as a decimal number.', isVertical: true },
      { type: 'input', id: 'ans', size: 'medium', isVertical: true }
    ],
    options: [],
    correctAnswerText: decimalStr,
    validation: { type: 'exact', answer: { ans: decimalStr } },
    solution: [
        {
            type: 'section',
            label: 'solve',
            parts: [
                { type: 'text', content: `To write a fraction with a denominator of ${denominator} as a decimal, simply divide ${numerator} by ${denominator}.` },
                { type: 'text', content: `The decimal value is **${decimalStr}**.` }
            ]
        }
    ],
    layoutConfig: { partsDirection: 'row' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'conversions_fraction_to_decimal',
      variables: {
        numerator,
        denominator,
        seed: params.seed
      }
    }
  };
}

function generateDecimalToFraction(params, random) {
  const denominators = params.denominators || [10, 100];
  const denominator = denominators[Math.floor(random() * denominators.length)];
  
  const numerator = params.numerator || getRandomInt(1, denominator - 1, random);
  
  const decimalValue = numerator / denominator;
  const decimalStr = decimalValue.toString();
  
  let expectedAnswerStr = `${numerator}/${denominator}`;
  let simplifiedStr = null;
  
  if (params.requireSimplified) {
      const simplified = simplifyFraction(numerator, denominator);
      simplifiedStr = `${simplified.numerator}/${simplified.denominator}`;
      expectedAnswerStr = simplifiedStr;
  }
  
  const questionText = params.questionText || `Write ${decimalStr} as a fraction.`;

  return {
    id: `q_frac_conv_d2f_${uid()}`,
    type: 'fillInTheBlank',
    questionText,
    parts: [
        { type: 'text', content: questionText, isVertical: true },
        {
            type: 'text',
            content: 'Use a forward slash ( / ) to separate the numerator and denominator.',
            isVertical: true,
            style: { fontStyle: 'italic', marginTop: '20px' }
        },
        { type: 'input', id: 'ans', size: 'medium', isVertical: true }
    ],
    options: [],
    correctAnswerText: expectedAnswerStr,
    validation: { type: 'exact', answer: { ans: expectedAnswerStr } },
    solution: [
        {
            type: 'section',
            label: 'solve',
            parts: [
                { type: 'text', content: `The decimal ${decimalStr} can be written as the fraction ${numerator}/${denominator}.` },
                ...(simplifiedStr ? [{ type: 'text', content: `When simplified, it becomes **${simplifiedStr}**.` }] : [])
            ]
        }
    ],
    layoutConfig: { partsDirection: 'row' },
    adaptiveConfig: {
      logic_type: params.logic_type || 'conversions_decimal_to_fraction',
      variables: {
        numerator,
        denominator,
        seed: params.seed
      }
    }
  };
}
