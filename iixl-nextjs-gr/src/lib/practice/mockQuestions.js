export const MOCK_QUESTIONS = [
  {
    id: 'q1',
    type: 'mcq',
    parts: [{ type: 'text', content: 'What is the capital of France?' }],
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correctAnswerIndex: 1,
    solution: 'Paris is the capital city of France.',
    difficulty: 'easy',
    isMultiSelect: false,
    isVertical: false,
    showSubmitButton: false,
    sortOrder: 1,
  },
  {
    id: 'q2',
    type: 'imageChoice',
    parts: [{ type: 'text', content: 'Which shape is a circle?' }],
    options: [
      'https://cdn-icons-png.flaticon.com/512/3105/3105807.png',
      'https://cdn-icons-png.flaticon.com/512/2618/2618245.png',
      'https://cdn-icons-png.flaticon.com/512/5974/5974636.png',
    ],
    correctAnswerIndex: 0,
    solution: 'A circle is a round shape with no corners.',
    difficulty: 'easy',
    isMultiSelect: false,
    isVertical: false,
    showSubmitButton: false,
    sortOrder: 2,
  },
  {
    id: 'q3',
    type: 'textInput',
    parts: [{ type: 'text', content: 'What is 5 + 3?' }],
    correctAnswerText: '8',
    solution: '5 + 3 equals 8.',
    difficulty: 'easy',
    showSubmitButton: true,
    sortOrder: 3,
  },
  {
    id: 'q4',
    type: 'fillInTheBlank',
    parts: [
      { type: 'text', content: 'The quick ' },
      { type: 'blank', id: 'blank1' },
      { type: 'text', content: ' fox jumps over the ' },
      { type: 'blank', id: 'blank2' },
      { type: 'text', content: ' dog.' },
    ],
    correctAnswerText: '{"blank1":"brown","blank2":"lazy"}',
    solution: "The complete phrase is: 'The quick brown fox jumps over the lazy dog.'",
    difficulty: 'medium',
    showSubmitButton: true,
    sortOrder: 4,
  },
  {
    id: 'q5',
    type: 'mcq',
    parts: [{ type: 'text', content: 'Which of these are primary colors? (Select all that apply)' }],
    options: ['Red', 'Green', 'Blue', 'Yellow', 'Purple'],
    correctAnswerIndices: [0, 2, 3],
    solution: 'The primary colors are Red, Blue, and Yellow.',
    difficulty: 'medium',
    isMultiSelect: true,
    isVertical: false,
    showSubmitButton: true,
    sortOrder: 5,
  },
  {
    id: 'q6',
    type: 'imageChoice',
    parts: [{ type: 'text', content: 'In which scenario do particles have higher kinetic energy?' }],
    options: [
      'https://cdn-icons-png.flaticon.com/512/3105/3105807.png',
      'https://cdn-icons-png.flaticon.com/512/2618/2618245.png',
    ],
    correctAnswerIndex: 0,
    solution: 'Higher temperature means more kinetic energy.',
    difficulty: 'medium',
    isMultiSelect: false,
    isVertical: true,
    showSubmitButton: false,
    sortOrder: 6,
  },
  {
    id: 'q7',
    type: 'textInput',
    parts: [{ type: 'text', content: 'How many days are in a week?' }],
    correctAnswerText: '7',
    solution: 'There are 7 days in a week.',
    difficulty: 'easy',
    showSubmitButton: true,
    sortOrder: 7,
  },
  {
    id: 'q8',
    type: 'sorting',
    parts: [{ type: 'text', content: 'Arrange these numbers from smallest to largest:' }],
    items: [
      { id: 'item1', content: '25', correctPosition: 1 },
      { id: 'item2', content: '8', correctPosition: 0 },
      { id: 'item3', content: '100', correctPosition: 3 },
      { id: 'item4', content: '42', correctPosition: 2 },
    ],
    correctAnswerText: '["item2","item1","item4","item3"]',
    solution: 'The correct order from smallest to largest is: 8, 25, 42, 100.',
    difficulty: 'medium',
    showSubmitButton: true,
    sortOrder: 8,
  },
  {
    id: 'q9',
    type: 'dragAndDrop',
    parts: [{ type: 'text', content: 'Match each animal to its group:' }],
    dragItems: [
      { id: 'cat', content: 'Cat', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2138/2138440.png', targetGroupId: 'mammals' },
      { id: 'eagle', content: 'Eagle', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2405/2405471.png', targetGroupId: 'birds' },
      { id: 'dog', content: 'Dog', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2138/2138166.png', targetGroupId: 'mammals' },
      { id: 'parrot', content: 'Parrot', imageUrl: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png', targetGroupId: 'birds' },
    ],
    dropGroups: [
      { id: 'mammals', label: 'Mammals' },
      { id: 'birds', label: 'Birds' },
    ],
    solution: 'Cats and dogs are mammals. Eagles and parrots are birds.',
    difficulty: 'medium',
    showSubmitButton: true,
    sortOrder: 9,
  },
  {
    id: 'q10',
    type: 'measure',
    parts: [{ type: 'text', content: 'Measure the length of the dark line.' }],
    correctAnswerText: '7',
    solution: 'The line extends to 7 cm.',
    difficulty: 'medium',
    showSubmitButton: true,
    adaptiveConfig: {
      unit: 'cm',
      object_width: 280,
    },
    sortOrder: 10,
  },
  {
    id: 'q11_g3',
    logic_type: 'rounding_mcq_v2',
    data_source: { range: [101, 999], round_to: 100 },
    difficulty: 'medium',
    parts: [{ type: 'text', content: 'Round **{num}** to the nearest **hundred**.' }],
    options: [
      { content: '{correct_ans}', feedback: 'Correct! You looked at the tens digit ({right_digit}).' },
      { content: '{stay_error_ans}', feedback: 'Check the tens digit ({right_digit}). Should we stay at {lower_multiple}?' },
      { content: '{up_error_ans}', feedback: 'Is the tens digit ({right_digit}) enough to go up to {higher_multiple}?' }
    ],
    solution: [{ "type": "text", "content": "To round to the nearest {target_place}, look at the {right_place} digit: **{right_digit}**. Since it is {right_digit}, the car goes **{hill_direction}**." }],
    sortOrder: 11
  },
  {
    id: 'q12_g4',
    logic_type: 'rounding_mcq_v2',
    data_source: { range: [1001, 9999], round_to: 1000 },
    difficulty: 'hard',
    parts: [{ type: 'text', content: 'Round **{num}** to the nearest **thousand**.' }],
    options: [
      { content: '{correct_ans}', feedback: 'Correct! You checked the hundreds digit ({right_digit}).' },
      { content: '{stay_error_ans}', feedback: 'Look at the hundreds digit ({right_digit}). Should we stay at {lower_multiple}?' }
    ],
    solution: [{ "type": "text", "content": "To round to the nearest {target_place}, look at the {right_place} digit: **{right_digit}**. Since it is {right_digit}, the car goes **{hill_direction}**." }],
    sortOrder: 12
  },
  {
    id: 'q13_g5',
    logic_type: 'rounding_mcq_v2',
    data_source: { range: [10001, 99999], round_to: 10000 },
    difficulty: 'hard',
    parts: [{ type: 'text', content: 'Round **{num}** to the nearest **ten thousand**.' }],
    options: [
      { content: '{correct_ans}', feedback: 'Great! You identified the thousands digit ({right_digit}) correctly.' },
      { content: '{stay_error_ans}', feedback: 'The thousands digit is {right_digit}. Does that mean we stay at {lower_multiple}?' }
    ],
    solution: [{ "type": "text", "content": "To round to the nearest {target_place}, look at the {right_place} digit: **{right_digit}**. Since it is {right_digit}, the car goes **{hill_direction}**." }],
    sortOrder: 13
  },
  {
    id: 'q14_g3',
    type: 'mcq',
    logic_type: 'number_word_to_digit_v1',
    difficulty: 'easy',
    parts: [
      { "type": "text", "content": "How do you write this number using digits?" },
      { "type": "text", "content": "### **{number_in_words}**" }
    ],
    options: [
      { "content": "{num}", "feedback": "Great job! You identified each place value correctly." },
      { "content": "{teen_error}", "feedback": "Listen closely to the word. Did you hear 'twenty' or 'fourteen'?" },
      { "content": "{swap_error}", "feedback": "Check the tens and ones places again. Which digit is in the tens place?" },
      { "content": "{hundred_error}", "feedback": "Look at the first word: '**{hundred_word}**'. That tells us the hundreds digit." }
    ],
    solution: [
      { "type": "text", "content": "### 📊 Place Value Chart" },
      { "type": "text", "content": "| hundreds | tens | ones |\n| :---: | :---: | :---: |\n| **{digit_3}** | **{digit_2}** | **{digit_1}** |" },
      { "type": "text", "content": "\nYou write **{number_in_words}** as **{num}**." }
    ],
    sortOrder: 14
  },
  {
    id: 'q15_count',
    logic_type: 'interactive_object_counting_v1',
    data_source: { range: [1, 20] },
    difficulty: 'easy',
    sortOrder: 15
  },
  {
    id: 'q16_even_odd',
    logic_type: 'even_odd_multi_v1',
    difficulty: 'medium',
    sortOrder: 16
  }
];
