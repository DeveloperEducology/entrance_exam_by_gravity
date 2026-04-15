/**
 * Dynamically generates a step-by-step long division journey based on the 
 * DMSB (Divide, Multiply, Subtract, Bring down) cycle.
 */
export function generateLongDivisionJourney(numA, numB) {
  // For now, let's stick to 2-digit by 1-digit with no remainder for simplicity
  // Example: 75 / 3 = 25
  const dividend = numA || 75;
  const divisor = numB || 3;
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;

  const divStr = String(dividend);
  const d1 = Number(divStr[0]);
  const d2 = Number(divStr[1]);

  const q1 = Math.floor(d1 / divisor);
  const m1 = q1 * divisor;
  const s1 = d1 - m1;
  const combined = s1 * 10 + d2;
  const q2 = Math.floor(combined / divisor);
  const m2 = q2 * divisor;
  const s2 = combined - m2;

  return {
    question_id: `div_long_${Date.now()}`,
    title: "Long Division: Step-by-Step",
    concept: "Division with Remainder",
    problem: {
      dividend,
      divisor
    },
    ui_config: {
      type: "ladder_focus",
      show_carry_indicators: true
    },
    steps: [
      {
        step_id: "D1",
        step_number: 1,
        cycle: 1,
        action: "DIVIDE",
        instruction: `Step 1: Divide. How many times does ${divisor} go into ${d1}?`,
        hint: `Think: ${divisor} x ? is close to ${d1} without going over.`,
        expected_answer: String(q1),
        target_position: "quotient_tens",
        feedback: {
          success: `Correct! ${divisor} goes into ${d1} ${q1} times ($${divisor} \\times ${q1} = ${m1}$).`,
          fail: `Think: ${divisor} x ? is close to ${d1} without going over.`
        }
      },
      {
        step_id: "M1",
        step_number: 2,
        cycle: 1,
        action: "MULTIPLY",
        instruction: `Step 2: Multiply. What is ${divisor} times ${q1}?`,
        expected_answer: String(m1),
        target_position: "below_tens",
        feedback: {
          success: `Yes! We write ${m1} right under the ${d1}.`,
          fail: `What is ${divisor} x ${q1}?`
        }
      },
      {
        step_id: "S1",
        step_number: 3,
        cycle: 1,
        action: "SUBTRACT",
        instruction: `Step 3: Subtract. What is ${d1} minus ${m1}?`,
        expected_answer: String(s1),
        target_position: "remainder_row_1",
        feedback: {
          success: `Great. The remainder is ${s1}.`,
          fail: `Calculate ${d1} - ${m1}.`
        }
      },
      {
        step_id: "B1",
        step_number: 4,
        cycle: 1,
        action: "BRING_DOWN",
        instruction: `Step 4: Bring Down. Bring the ${d2} down next to the ${s1}.`,
        animation_trigger: `move_digit_${d2}_to_row_2`,
        expected_answer: String(d2),
        target_position: "next_to_remainder_1",
        feedback: {
          success: `Now we have the number ${combined} to work with!`,
          fail: `Just bring down the ${d2} from the dividend.`
        }
      },
      {
        step_id: "D2",
        step_number: 5,
        cycle: 2,
        action: "DIVIDE",
        instruction: `Cycle 2: Divide. How many times does ${divisor} go into ${combined}?`,
        expected_answer: String(q2),
        target_position: "quotient_ones",
        feedback: {
          success: `Exactly! $${divisor} \\times ${q2} = ${m2}$.`,
          fail: `Think: ${divisor} x ? = ${combined}.`
        }
      },
      {
        step_id: "M2",
        step_number: 6,
        cycle: 2,
        action: "MULTIPLY",
        instruction: `Multiply ${divisor} times ${q2}.`,
        expected_answer: String(m2),
        target_position: "below_combined",
        feedback: {
          success: `Write ${m2} below ${combined}.`,
          fail: `What is ${divisor} x ${q2}?`
        }
      },
      {
        step_id: "S2",
        step_number: 7,
        cycle: 2,
        action: "SUBTRACT",
        instruction: `Final Subtraction. What is ${combined} minus ${m2}?`,
        expected_answer: String(s2),
        target_position: "final_remainder",
        feedback: {
          success: s2 === 0 ? "Perfect! The remainder is 0. You finished the problem!" : `Good! The remainder is ${s2}.`,
          fail: `Calculate ${combined} - ${m2}.`
        }
      }
    ],
    final_result: {
      quotient,
      remainder: s2
    }
  };
}
