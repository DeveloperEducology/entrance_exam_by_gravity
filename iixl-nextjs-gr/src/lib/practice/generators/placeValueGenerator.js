export function generatePlaceValueQuestion() {
  // 1. Generate a 5-digit number with unique digits
  const digits = [];
  while (digits.length < 5) {
    const d = Math.floor(Math.random() * 10);
    if (digits.length === 0 && d === 0) continue;
    if (!digits.includes(d)) {
      digits.push(d);
    }
  }
  const number = parseInt(digits.join(''), 10);
  
  // 2. Pick a random position (0-4)
  const pos = Math.floor(Math.random() * 5);
  const targetDigit = digits[pos];
  
  // 3. Define metadata for the template
  const placeMultipliers = [10000, 1000, 100, 10, 1];
  const placeNames = ["Ten Thousands", "Thousands", "Hundreds", "Tens", "Ones"];
  
  const placeName = placeNames[pos];
  const multiplier = placeMultipliers[pos];
  const correctValue = targetDigit * multiplier;

  // 4. Return as a full Question Object
  return {
    id: `generated_pv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: 'fillInTheBlank',
    difficulty: 'medium',
    questionText: 'Understand numerical value vs place name.',
    parts: [
      {
        type: 'text',
        content: "What is the **value** of the digit {target_digit} in the number **{number}**?"
      },
      {
        type: 'text',
        content: "Answer: [ans_value]"
      }
    ],
    correctAnswerText: JSON.stringify({ ans_value: String(correctValue) }),
    adaptiveConfig: {
      correctAnswerText: JSON.stringify({ ans_value: String(correctValue) }),
      variables: {
        number: number,
        target_digit: targetDigit,
        place_name: placeName,
        place_multiplier: multiplier
      },
      scaffold: {
        id: "place_vs_value_scaffold",
        steps: [
          "Wait! You gave the **Place Name** ({place_name}).",
          "The question asked for the **Value**.",
          "To find the Value: Multiply the digit ({target_digit}) by its place multiplier ({place_multiplier}).",
          "{target_digit} × {place_multiplier} = [ans_step]"
        ]
      }
    }
  };
}
