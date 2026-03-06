#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function makeQuestion({ id, difficulty, complexity, prompt, answer, solution, conceptTags, misconceptionCode, sortOrder }) {
  return {
    type: 'fillInTheBlank',
    difficulty,
    complexity,
    marks: 1,
    sort_order: sortOrder,
    is_multi_select: false,
    is_vertical: false,
    show_submit_button: true,
    parts: [
      {
        id: `p_${id}`,
        type: 'text',
        content: prompt,
        isVertical: true,
        hasAudio: true
      },
      {
        id: 'answer_1',
        type: 'input',
        content: '',
        isVertical: false,
        hasAudio: false,
        expectedType: 'number'
      }
    ],
    options: [],
    items: [],
    drag_items: [],
    drop_groups: [],
    correct_answer_index: -1,
    correct_answer_indices: [],
    correct_answer_text: JSON.stringify({ answer_1: String(answer) }),
    solution,
    adaptive_config: {
      policyVersion: 'misconception_v2',
      conceptTags,
      misconceptionCode,
      targetComplexityBand: difficulty === 'easy' ? 'low' : (difficulty === 'medium' ? 'mid' : 'high'),
      inputMode: 'digit_pad',
      isRemediation: false,
      remediationLevel: 0
    }
  };
}

const rows = [];
let sortOrder = 1;

const easy = [
  ['e01', '18 + 7 =', 25, '18 + 7 = 25.', ['addition', 'single_carry'], 'addition_fact_error', 8],
  ['e02', '34 - 9 =', 25, '34 - 9 = 25.', ['subtraction', 'single_borrow'], 'borrow_missed', 10],
  ['e03', '6 × 7 =', 42, '6 × 7 = 42.', ['multiplication', 'facts'], 'times_table_confusion', 12],
  ['e04', '63 ÷ 9 =', 7, '63 divided by 9 is 7.', ['division', 'facts'], 'division_fact_error', 14],
  ['e05', '25 + 18 =', 43, '25 + 18 = 43.', ['addition', 'carry'], 'carry_not_applied', 16],
  ['e06', '52 - 27 =', 25, '52 - 27 = 25.', ['subtraction', 'borrow'], 'borrow_missed', 18],
  ['e07', '19 + 26 =', 45, '19 + 26 = 45.', ['addition', 'carry'], 'place_value_shift', 20],
  ['e08', '70 - 38 =', 32, '70 - 38 = 32.', ['subtraction', 'borrow'], 'borrow_missed', 22],
  ['e09', '48 + 17 =', 65, '48 + 17 = 65.', ['addition', 'carry'], 'carry_not_applied', 24],
  ['e10', '81 - 46 =', 35, '81 - 46 = 35.', ['subtraction', 'borrow'], 'borrow_missed', 26],
];

const medium = [
  ['m01', '124 + 379 =', 503, '124 + 379 = 503.', ['addition', '3_digit'], 'carry_chain_error', 38],
  ['m02', '602 - 287 =', 315, '602 - 287 = 315.', ['subtraction', '3_digit'], 'borrow_chain_error', 40],
  ['m03', '36 × 7 =', 252, '36 × 7 = 252.', ['multiplication', '2d_x_1d'], 'place_shift_error', 42],
  ['m04', '144 ÷ 12 =', 12, '144 divided by 12 is 12.', ['division', '2d_divisor'], 'division_setup_error', 44],
  ['m05', '58 × 6 =', 348, '58 × 6 = 348.', ['multiplication', '2d_x_1d'], 'carry_not_added', 46],
  ['m06', '925 - 468 =', 457, '925 - 468 = 457.', ['subtraction', '3_digit'], 'borrow_chain_error', 48],
  ['m07', '417 + 286 =', 703, '417 + 286 = 703.', ['addition', '3_digit'], 'carry_chain_error', 50],
  ['m08', '84 × 9 =', 756, '84 × 9 = 756.', ['multiplication', '2d_x_1d'], 'place_value_shift', 52],
  ['m09', '735 ÷ 5 =', 147, '735 divided by 5 is 147.', ['division', 'long_division'], 'division_remainder_confusion', 54],
  ['m10', '900 - 455 =', 445, '900 - 455 = 445.', ['subtraction', '3_digit'], 'borrow_chain_error', 56],
];

const hard = [
  ['h01', '247 × 23 =', 5681, '247 × 23 = 5681.', ['multiplication', '2d_x_2d'], 'partial_product_missing', 74],
  ['h02', '384 × 16 =', 6144, '384 × 16 = 6144.', ['multiplication', '3d_x_2d'], 'place_shift_error', 76],
  ['h03', '4521 ÷ 9 =', 502.3333333333, '4521 ÷ 9 = 502 remainder 3 (or 502.333...).', ['division', 'long_division'], 'remainder_handling_error', 78],
  ['h04', '1305 - 789 =', 516, '1305 - 789 = 516.', ['subtraction', '4_digit'], 'borrow_chain_error', 80],
  ['h05', '906 + 1987 =', 2893, '906 + 1987 = 2893.', ['addition', '4_digit'], 'carry_chain_error', 82],
  ['h06', '125 × 48 =', 6000, '125 × 48 = 6000.', ['multiplication', '3d_x_2d'], 'partial_product_missing', 84],
  ['h07', '999 - 478 =', 521, '999 - 478 = 521.', ['subtraction', '3_digit'], 'borrow_chain_error', 86],
  ['h08', '672 ÷ 14 =', 48, '672 ÷ 14 = 48.', ['division', '2d_divisor'], 'quotient_estimation_error', 88],
  ['h09', '318 × 27 =', 8586, '318 × 27 = 8586.', ['multiplication', '3d_x_2d'], 'partial_product_shift_error', 90],
  ['h10', '2404 + 3897 =', 6301, '2404 + 3897 = 6301.', ['addition', '4_digit'], 'carry_chain_error', 92],
];

for (const [id, prompt, answer, solution, tags, misconception, complexity] of easy) {
  rows.push(makeQuestion({ id, difficulty: 'easy', complexity, prompt, answer, solution, conceptTags: tags, misconceptionCode: misconception, sortOrder: sortOrder++ }));
}
for (const [id, prompt, answer, solution, tags, misconception, complexity] of medium) {
  rows.push(makeQuestion({ id, difficulty: 'medium', complexity, prompt, answer, solution, conceptTags: tags, misconceptionCode: misconception, sortOrder: sortOrder++ }));
}
for (const [id, prompt, answer, solution, tags, misconception, complexity] of hard) {
  rows.push(makeQuestion({ id, difficulty: 'hard', complexity, prompt, answer, solution, conceptTags: tags, misconceptionCode: misconception, sortOrder: sortOrder++ }));
}

const outPath = path.resolve(process.cwd(), 'supabase/seeds/adaptive_smartscore_scale_test_30_questions.json');
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} questions to ${outPath}`);
