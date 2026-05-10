/**
 * Operations Engine Family
 * Powers: Basic arithmetic operations with fractions (Addition, Subtraction)
 */

import { createSeededRandom, getRandomInt, simplifyFraction } from '../shared/mathCore';

let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const operationsEngine = (config) => {
  const { engineParams = {}, adaptiveConfig = {}, variables = {} } = config;
  
  const resolvedVars = { ...variables, ...(adaptiveConfig.variables || {}) };
  const params = { ...engineParams, ...resolvedVars };

  const seed = params.seed || `ops_${Date.now()}`;
  const random = createSeededRandom(seed);

  const subType = params.subType || 'add_like_denominators';

  if (subType === 'add_like_denominators') {
    return generateAdditionLikeDenominators(params, random);
  } else if (subType === 'subtract_like_denominators') {
    return generateSubtractionLikeDenominators(params, random);
  } else {
    throw new Error(`[OperationsEngine] Unsupported subType: ${subType}`);
  }
};

// Helper for rendering stacked fractions using LaTeX
const fractionLatex = (num, den) => `\\frac{${num}}{${den}}`;

function generateAdditionLikeDenominators(params, random) {
    const denominatorPool = params.denominatorPool || [3, 4, 5, 6, 8, 10, 12];
    const denom = params.denom || params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
    
    // Ensure num1 + num2 doesn't exceed denominator unless we want improper fractions
    const allowImproper = params.allowImproper || false;
    const maxSum = allowImproper ? denom * 2 : denom;
    
    const num1 = params.num1 || getRandomInt(1, denom - 1, random);
    const num2 = params.num2 || getRandomInt(1, maxSum - num1, random);
    
    const sum = num1 + num2;
    
    // Simplification check
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(sum, denom);
    const isSimplifiable = divisor > 1 && sum < denom;
    const simNum = sum / divisor;
    const simDen = denom / divisor;

    const latexQuestion = `${fractionLatex(num1, denom)} + ${fractionLatex(num2, denom)} = ?`;
    
    const solutionSteps = [
        { type: 'text', content: `To add fractions with the same denominator, simply add the numerators and keep the denominator the same.` },
        { type: 'latex', content: `${fractionLatex(num1, denom)} + ${fractionLatex(num2, denom)} = \\frac{${num1} + ${num2}}{${denom}} = ${fractionLatex(sum, denom)}` }
    ];

    if (isSimplifiable && sum < denom) {
        solutionSteps.push({ type: 'text', content: `This can be simplified by dividing the numerator and denominator by ${divisor}:` });
        solutionSteps.push({ type: 'latex', content: `${fractionLatex(sum, denom)} = ${fractionLatex(simNum, simDen)}` });
    }

    const solution = [
        {
            type: 'section',
            label: 'solve',
            parts: solutionSteps
        }
    ];

    return {
        id: `q_frac_op_add_${uid()}`,
        type: 'fillInTheBlank',
        questionText: `Add the fractions.`,
        parts: [
            { type: 'text', content: 'Add.', isVertical: true },
            { type: 'latex', content: latexQuestion, isVertical: true },
            {
                type: 'text',
                content: 'Use a forward slash ( / ) to separate the numerator and denominator.',
                isVertical: true,
                style: { fontStyle: 'italic', marginTop: '20px' }
            },
            { type: 'input', id: 'ans', size: 'medium', isVertical: true }
        ],
        options: [],
        correctAnswerText: JSON.stringify({ ans: `${sum}/${denom}` }),
        validation: { 
            type: 'exact', 
            answer: { ans: `${sum}/${denom}` }, 
            altAnswers: isSimplifiable ? [{ ans: `${simNum}/${simDen}` }] : [] 
        },
        solution: solution,
        layoutConfig: { partsDirection: 'column' },
        adaptiveConfig: {
            logic_type: params.logic_type || 'operations_add_like_denominators',
            variables: { denom, num1, num2, seed: params.seed }
        }
    };
}

function generateSubtractionLikeDenominators(params, random) {
    const denominatorPool = params.denominatorPool || [3, 4, 5, 6, 8, 10, 12];
    const denom = params.denom || params.denominator || denominatorPool[Math.floor(random() * denominatorPool.length)];
    
    const num1 = params.num1 || getRandomInt(2, denom, random);
    const num2 = params.num2 || getRandomInt(1, num1 - 1, random); // Ensure positive result
    
    const diff = num1 - num2;
    
    // Simplification check
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(diff, denom);
    const isSimplifiable = divisor > 1;
    const simNum = diff / divisor;
    const simDen = denom / divisor;

    const latexQuestion = `${fractionLatex(num1, denom)} - ${fractionLatex(num2, denom)} = ?`;
    
    const solutionSteps = [
        { type: 'text', content: `To subtract fractions with the same denominator, subtract the second numerator from the first and keep the denominator the same.` },
        { type: 'latex', content: `${fractionLatex(num1, denom)} - ${fractionLatex(num2, denom)} = \\frac{${num1} - ${num2}}{${denom}} = ${fractionLatex(diff, denom)}` }
    ];

    if (isSimplifiable) {
        solutionSteps.push({ type: 'text', content: `This can be simplified by dividing the numerator and denominator by ${divisor}:` });
        solutionSteps.push({ type: 'latex', content: `${fractionLatex(diff, denom)} = ${fractionLatex(simNum, simDen)}` });
    }

    const solution = [
        {
            type: 'section',
            label: 'solve',
            parts: solutionSteps
        }
    ];

    return {
        id: `q_frac_op_sub_${uid()}`,
        type: 'fillInTheBlank',
        questionText: `Subtract the fractions.`,
        parts: [
            { type: 'text', content: 'Subtract.', isVertical: true },
            { type: 'latex', content: latexQuestion, isVertical: true },
            {
                type: 'text',
                content: 'Use a forward slash ( / ) to separate the numerator and denominator.',
                isVertical: true,
                style: { fontStyle: 'italic', marginTop: '20px' }
            },
            { type: 'input', id: 'ans', size: 'medium', isVertical: true }
        ],
        options: [],
        correctAnswerText: JSON.stringify({ ans: `${diff}/${denom}` }),
        validation: { 
            type: 'exact', 
            answer: { ans: `${diff}/${denom}` }, 
            altAnswers: isSimplifiable ? [{ ans: `${simNum}/${simDen}` }] : [] 
        },
        solution: solution,
        layoutConfig: { partsDirection: 'column' },
        adaptiveConfig: {
            logic_type: params.logic_type || 'operations_subtract_like_denominators',
            variables: { denom, num1, num2, seed: params.seed }
        }
    };
}
