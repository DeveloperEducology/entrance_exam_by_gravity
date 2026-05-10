/**
 * Word Problems Engine Family
 * Powers: Word problems involving fraction models
 */

import { createSeededRandom, getRandomInt } from '../shared/mathCore';
import { buildIdentifyShapeSvg } from '../shared/svgLibrary/shapes';

let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const wordProblemsEngine = (config) => {
  const { engineParams = {}, adaptiveConfig = {}, variables = {} } = config;
  
  const resolvedVars = { ...variables, ...(adaptiveConfig.variables || {}) };
  const params = { ...engineParams, ...resolvedVars };

  const seed = params.seed || `wp_${Date.now()}`;
  const random = createSeededRandom(seed);

  const subType = params.subType || 'fraction_model';

  if (subType === 'fraction_model') {
    return generateFractionModelWordProblem(params, random);
  } else if (subType === 'fraction_value') {
    return generateFractionValueWordProblem(params, random);
  } else if (subType === 'fraction_of_set') {
    return generateFractionOfSetWordProblem(params, random);
  } else {
    throw new Error(`[WordProblemsEngine] Unsupported subType: ${subType}`);
  }
};

const NAMES = [
    'Aarav', 'Ananya', 'Ishaan', 'Vihaan', 'Aditi', 'Arjun', 'Saanvi', 'Kabir', 'Diya', 'Rohan',
    'Nina', 'Nicholas', 'Emma', 'Liam', 'Katie'
];

const SCENARIOS = [
    {
        id: 'popcorn',
        story: "{name}'s mother has made popcorn for family film night. {name} serves themselves a large bowl of popcorn and serves their siblings smaller bowls of popcorn. 'Wait!' says their mother. 'Make sure everyone gets the same amount of popcorn.' So, {name} divides the popcorn into {denominator} equal-sized bowls.",
        question: "Which fraction model represents each bowl of the popcorn?",
        shapeType: 'circle',
        fillColor: '#fef08a', strokeColor: '#ca8a04', // Yellow
        denominators: [3, 4, 5, 6, 8],
        numerator: 1
    },
    {
        id: 'shelf',
        story: "{name} has built a long shelf for her collection of textbooks. Before putting her books on the shelf, she divides the shelf into {denominator} equal sections.",
        question: "Which fraction model represents one section of the shelf?",
        shapeType: 'rectangle',
        fillColor: '#fdb44d', strokeColor: '#ea580c', // Orange
        denominators: [3, 4, 5, 6],
        numerator: 1
    },
    {
        id: 'pie',
        story: "{name}'s Great Grandma Zelda makes the best apple pie. Somehow, she always brings too much when she comes for the holidays. This year, there's a whole pie left over! {name} cuts the leftover pie into {denominator} equal pieces. Then, {name} offers the pieces to the guests as they leave for home.",
        question: "Which fraction model represents one piece of the pie?",
        shapeType: 'circle',
        fillColor: '#38bdf8', strokeColor: '#0284c7', // Blue
        denominators: [2, 3, 4, 6, 8],
        numerator: 1
    },
    {
        id: 'barfi',
        story: "{name} bought a large rectangular tray of Kaju Katli. To share it with friends, {name} cuts the tray into {denominator} equal rows.",
        question: "Which fraction model represents one row of the barfi?",
        shapeType: 'rectangle',
        fillColor: '#f3f4f6', strokeColor: '#9ca3af', // Silver/Grey
        denominators: [3, 4, 6, 8],
        numerator: 1
    },
    {
        id: 'chapati',
        story: "For dinner, {name} is helping in the kitchen. {name} takes a round, freshly made chapati and folds it into {denominator} equal parts to dip into the dal.",
        question: "Which fraction model represents one part of the chapati?",
        shapeType: 'circle',
        fillColor: '#fbbf24', strokeColor: '#b45309', // Golden Brown
        denominators: [2, 4],
        numerator: 1
    },
    {
        id: 'rangoli',
        story: "During Diwali, {name} draws a long rectangular rangoli border along the porch. {name} divides the border into {denominator} equal segments to paint each with a different color.",
        question: "Which fraction model represents one segment of the rangoli?",
        shapeType: 'rectangle',
        fillColor: '#ec4899', strokeColor: '#be185d', // Pink/Deep Rose
        denominators: [4, 5, 6, 10],
        numerator: 1
    },
    {
        id: 'dosa',
        story: "{name} is eating a giant paper roast dosa. To make it easier to eat, {name} tears the round dosa into {denominator} equal pieces.",
        question: "Which fraction model represents one piece of the dosa?",
        shapeType: 'circle',
        fillColor: '#fde047', strokeColor: '#a16207', // Yellow/Mustard
        denominators: [3, 4, 6, 8],
        numerator: 1
    },
    {
        id: 'train_berth',
        story: "{name} is traveling on the Shatabdi Express. The long padded bench in the cabin is divided into {denominator} equal seats for the passengers.",
        question: "Which fraction model represents one seat on the bench?",
        shapeType: 'rectangle',
        fillColor: '#60a5fa', strokeColor: '#1d4ed8', // Bright Blue
        denominators: [3, 4],
        numerator: 1
    },
    {
        id: 'papad',
        story: "{name} has a large, round roasted papad. Since it's very crunchy, {name} carefully breaks it into {denominator} equal wedges to share with siblings.",
        question: "Which fraction model represents one wedge of the papad?",
        shapeType: 'circle',
        fillColor: '#fef3c7', strokeColor: '#d97706', // Cream/Tan
        denominators: [2, 4, 6, 8],
        numerator: 1
    },
    {
        id: 'chocolate_bar',
        story: "{name} got a long Cadbury bar from the local Kiranastore. The bar is divided into {denominator} equal blocks.",
        question: "Which fraction model represents one block of the chocolate?",
        shapeType: 'rectangle',
        fillColor: '#78350f', strokeColor: '#451a03', // Brown
        denominators: [4, 5, 6, 8, 10],
        numerator: 1
    },
    {
        id: 'cricket_pitch',
        story: "{name} is marking a rectangular practice pitch in the colony park. {name} divides the length of the pitch into {denominator} equal zones for bowling practice.",
        question: "Which fraction model represents one zone of the pitch?",
        shapeType: 'rectangle',
        fillColor: '#4ade80', strokeColor: '#15803d', // Green
        denominators: [3, 4, 5],
        numerator: 1
    },
    {
        id: 'paratha',
        story: "{name} has a round Aloo Paratha for lunch. {name} uses a knife to cut the paratha into {denominator} equal slices for the family.",
        question: "Which fraction model represents one slice of the paratha?",
        shapeType: 'circle',
        fillColor: '#f97316', strokeColor: '#9a3412', // Orange/Brown
        denominators: [2, 4, 6, 8],
        numerator: 1
    },
    {
        id: 'sari_border',
        story: "{name} is designing a pattern for a sari. {name} takes a long rectangular strip of fabric and divides it into {denominator} equal sections for different embroidery designs.",
        question: "Which fraction model represents one section of the fabric strip?",
        shapeType: 'rectangle',
        fillColor: '#a855f7', strokeColor: '#6b21a8', // Purple
        denominators: [4, 5, 6, 8],
        numerator: 1
    }
];

function generateFractionModelWordProblem(params, random) {
    const name = params.name || NAMES[Math.floor(random() * NAMES.length)];
    const scenarioId = params.scenario_id;
    const scenario = scenarioId ? SCENARIOS.find(s => s.id === scenarioId) : SCENARIOS[Math.floor(random() * SCENARIOS.length)];
    const denominator = params.denominator || scenario.denominators[Math.floor(random() * scenario.denominators.length)];
    const numerator = scenario.numerator;

    const storyText = scenario.story.replace(/{name}/g, name).replace(/{denominator}/g, denominator);

    const correctSvg = buildIdentifyShapeSvg({
        shapeType: scenario.shapeType,
        numerator,
        denominator,
        fillColor: scenario.fillColor,
        strokeColor: scenario.strokeColor,
        size: 280
    });

    // Distractor logic: different denominator, same numerator
    let distractorDenom = denominator;
    while(distractorDenom === denominator) {
        distractorDenom = scenario.denominators[Math.floor(random() * scenario.denominators.length)];
    }

    const distractorSvg = buildIdentifyShapeSvg({
        shapeType: scenario.shapeType,
        numerator,
        denominator: distractorDenom,
        fillColor: scenario.fillColor,
        strokeColor: scenario.strokeColor,
        size: 280
    });

    const rawOptions = [
        { id: 'opt_correct', content: correctSvg, isCorrect: true, type: 'svg' },
        { id: 'opt_distractor', content: distractorSvg, isCorrect: false, type: 'svg' }
    ];

    // Shuffle
    for (let i = rawOptions.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
    }

    const correctIdx = rawOptions.findIndex((o) => o.id === 'opt_correct');

    return {
        id: `q_frac_wp_${uid()}`,
        type: 'mcq',
        questionText: scenario.question,
        parts: [
            { type: 'text', content: storyText },
            { type: 'text', content: scenario.question }
        ],
        options: rawOptions,
        correctAnswerId: 'opt_correct',
        correctAnswerIndex: correctIdx,
        isGrid: true,
        layoutConfig: { columns: 2, gap: '2rem' },
        adaptiveConfig: {
            logic_type: params.logic_type || 'word_problems_fraction_model',
            variables: {
                name,
                denominator,
                scenario_id: scenario.id,
                seed: params.seed
            }
        }
    };
}

function generateFractionValueWordProblem(params, random) {
    const name = params.name || NAMES[Math.floor(random() * NAMES.length)];
    const scenarioId = params.scenario_id;
    const scenario = scenarioId ? SCENARIOS.find(s => s.id === scenarioId) : SCENARIOS[Math.floor(random() * SCENARIOS.length)];
    const denominator = params.denominator || scenario.denominators[Math.floor(random() * scenario.denominators.length)];
    const numerator = scenario.numerator;

    const storyText = scenario.story.replace(/{name}/g, name).replace(/{denominator}/g, denominator);
    const questionText = scenario.question.replace('Which fraction model represents', 'What fraction represents');

    return {
        id: `q_frac_wp_val_${uid()}`,
        type: 'fillInTheBlank',
        questionText: questionText,
        parts: [
            { type: 'text', content: storyText, isVertical: true },
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
        correctAnswerText: JSON.stringify({ ans: `${numerator}/${denominator}` }),
        validation: { type: 'exact', answer: { ans: `${numerator}/${denominator}` } },
        adaptiveConfig: {
            logic_type: params.logic_type || 'word_problems_fraction_value',
            variables: {
                name,
                denominator,
                scenario_id: scenario.id,
                seed: params.seed
            }
        },
        solution: [
            {
                type: 'section',
                label: 'solve',
                parts: [
                    { type: 'text', content: storyText },
                    { type: 'text', content: questionText },
                    { type: 'text', content: `The correct fraction is **${numerator}/${denominator}**.` }
                ]
            }
        ]
    };
}

const FRACTION_SET_SCENARIOS = [
    {
        id: 'cupcakes',
        story: "{name} made {total} cupcakes. {pronoun} put sprinkles on {amount1} of the cupcakes and coconut on the rest.",
        question: "What fraction of the cupcakes have coconut now?",
        itemPlural: "cupcakes",
        propertyRest: "coconut"
    },
    {
        id: 'flowers',
        story: "{name} bought a bouquet of {total} flowers. {amount1} of the flowers are red roses and the rest are yellow tulips.",
        question: "What fraction of the flowers are yellow tulips?",
        itemPlural: "flowers",
        propertyRest: "yellow tulips"
    },
    {
        id: 'birds',
        story: "{name} saw {total} birds on a tree. {amount1} of the birds were sparrows and the rest were pigeons.",
        question: "What fraction of the birds were pigeons?",
        itemPlural: "birds",
        propertyRest: "pigeons"
    },
    {
        id: 'marbles',
        story: "{name} has a bag of {total} marbles. {amount1} of the marbles are blue and the rest are green.",
        question: "What fraction of the marbles are green?",
        itemPlural: "marbles",
        propertyRest: "green"
    }
];

function generateFractionOfSetWordProblem(params, random) {
    const name = params.name || NAMES[Math.floor(random() * NAMES.length)];
    const pronoun = params.pronoun || (random() > 0.5 ? 'She' : 'He');
    const scenarioId = params.scenario_id;
    const scenario = scenarioId ? FRACTION_SET_SCENARIOS.find(s => s.id === scenarioId) : FRACTION_SET_SCENARIOS[Math.floor(random() * FRACTION_SET_SCENARIOS.length)];
    
    const total = params.total || (Math.floor(random() * 9) + 4);
    const amount1 = params.amount1 || (Math.floor(random() * (total - 1)) + 1);
    const amountRest = total - amount1;

    let storyText = scenario.story
        .replace(/{name}/g, name)
        .replace(/{pronoun}/g, pronoun)
        .replace(/{total}/g, total)
        .replace(/{amount1}/g, amount1);

    const questionText = scenario.question;
    
    // Simplification check
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(amountRest, total);
    const isSimplifiable = divisor > 1;
    const simNum = amountRest / divisor;
    const simDen = total / divisor;

    const fractionLatex = (num, den) => `\\frac{${num}}{${den}}`;

    const solutionSteps = [
        { type: 'text', content: `${amountRest} out of ${total} ${scenario.itemPlural} are ${scenario.propertyRest}. ${amountRest}/${total} are ${scenario.propertyRest}.` }
    ];

    if (isSimplifiable) {
        solutionSteps.push({ type: 'text', content: `This fraction can be simplified.` });
        solutionSteps.push({ type: 'text', content: `The greatest common factor of ${amountRest} and ${total} is ${divisor}.` });
        solutionSteps.push({ type: 'text', content: `Divide the numerator and the denominator by ${divisor}:` });
        solutionSteps.push({ type: 'latex', content: fractionLatex(amountRest, total) });
        solutionSteps.push({ type: 'text', content: ` = ` });
        solutionSteps.push({ type: 'latex', content: fractionLatex(simNum, simDen) });
    }

    const solution = [
        {
            type: 'section',
            label: 'solve',
            parts: solutionSteps
        }
    ];

    return {
        id: `q_frac_wp_set_${uid()}`,
        type: 'fillInTheBlank',
        questionText: questionText,
        parts: [
            { type: 'text', content: storyText, isVertical: true },
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
        correctAnswerText: JSON.stringify({ ans: `${amountRest}/${total}` }),
        validation: { 
            type: 'exact', 
            answer: { ans: `${amountRest}/${total}` },
            altAnswers: isSimplifiable ? [{ ans: `${simNum}/${simDen}` }] : []
        },
        solution: solution,
        adaptiveConfig: {
            logic_type: params.logic_type || 'word_problems_fraction_of_set',
            variables: {
                name,
                total,
                amount1,
                scenario_id: scenario.id,
                seed: params.seed
            }
        }
    };
}
