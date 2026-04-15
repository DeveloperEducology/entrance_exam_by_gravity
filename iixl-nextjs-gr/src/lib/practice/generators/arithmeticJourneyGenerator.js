
/**
 * arithmeticJourneyGenerator.js
 * Generates step-by-step arithmetic journeys for Addition, Subtraction, and Multiplication.
 * Follows the Indian Numbering System and supports carry/regrouping logic.
 */

const formatIndian = (num) => {
  if (num === null || num === undefined) return "";
  return Number(num).toLocaleString('en-IN');
};

/**
 * Helper to get a string of digits with Indian commas at fixed positions from the right.
 * Positions are: 3, 5, 7, 9...
 */
const formatGridString = (num, width) => {
  let s = String(Math.abs(Number(num)));
  let res = "";
  let digitCount = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    res = s[i] + res;
    digitCount++;
    if (i > 0) {
      if (digitCount === 3) res = "," + res;
      else if (digitCount > 3 && (digitCount - 3) % 2 === 0) res = "," + res;
    }
  }
  return res.padStart(width, " ");
};

/**
 * Addition Journey
 */
export function generateAdditionJourney(v1, v2) {
  const n1 = Number(v1);
  const n2 = Number(v2);
  const res = n1 + n2;

  const maxWidth = formatGridString(res, 0).length;
  const s1Full = formatGridString(n1, maxWidth);
  const s2Full = formatGridString(n2, maxWidth);

  const padded1 = s1Full.split('');
  const padded2 = s2Full.split('');

  const steps = [];
  let carries = {};
  let currentResult = Array(maxWidth).fill(" ");
  let carryValue = 0;

  for (let i = maxWidth - 1; i >= 0; i--) {
    const char1 = padded1[i];
    const char2 = padded2[i];
    if (char1 === ',' || char1 === ' ') {
      if (char1 === ',') currentResult[i] = ',';
      continue;
    }

    const d1 = parseInt(char1) || 0;
    const d2 = parseInt(char2) || 0;
    const sum = d1 + d2 + carryValue;
    const resDigit = sum % 10;
    const nextCarry = Math.floor(sum / 10);

    if (carryValue > 0) carries[i] = String(carryValue);
    currentResult[i] = String(resDigit);

    steps.push({
      instruction: carryValue > 0
        ? `Addition: ${carryValue} (carried) + ${d1} + ${d2} = ${sum}. Write ${resDigit}${nextCarry > 0 ? `, carry ${nextCarry}` : ""}.`
        : `Addition: ${d1} + ${d2} = ${sum}. Write ${resDigit}${nextCarry > 0 ? `, carry ${nextCarry}` : ""}.`,
      highlights: [i],
      carries: { ...carries },
      result: [...currentResult]
    });
    carryValue = nextCarry;
  }

  if (carryValue > 0) {
    let lastIdx = -1;
    for (let j = 0; j < maxWidth; j++) if (padded1[j] !== ' ' || padded2[j] !== ' ') { lastIdx = j; break; }
    if (lastIdx > 0) {
      const carryIdx = lastIdx - 1;
      currentResult[carryIdx] = String(carryValue);
      steps.push({
        instruction: `Finally, bring down the carried ${carryValue}.`,
        highlights: [carryIdx],
        carries: { ...carries },
        result: [...currentResult]
      });
    }
  }

  return {
    id: `arith_journey_addition_${Date.now()}`,
    type: "arithmetic_journey",
    operation: "addition",
    title: `Addition: ${formatIndian(n1)} + ${formatIndian(n2)}`,
    operands: [s1Full, s2Full],
    steps,
    footer: `The sum is ${formatIndian(res)}.`
  };
}

/**
 * Subtraction Journey
 */
export function generateSubtractionJourney(v1, v2) {
  const n1 = Math.max(Number(v1), Number(v2));
  const n2 = Math.min(Number(v1), Number(v2));
  const res = n1 - n2;

  const maxWidth = formatGridString(n1, 0).length;
  const s1Full = formatGridString(n1, maxWidth);
  const s2Full = formatGridString(n2, maxWidth);

  const workingTop = s1Full.split('');
  const padded2 = s2Full.split('');

  const steps = [];
  let regroups = {};
  let currentResult = Array(maxWidth).fill(" ");

  for (let i = maxWidth - 1; i >= 0; i--) {
    const char1 = workingTop[i];
    const char2 = padded2[i];
    if (char1 === ',' || char1 === ' ') {
      if (char1 === ',') currentResult[i] = ',';
      continue;
    }

    let d1 = parseInt(char1) || 0;
    const d2 = parseInt(char2) || 0;

    if (d1 < d2) {
      let borrowIdx = i - 1;
      while (borrowIdx >= 0) {
        if (workingTop[borrowIdx] === ',' || workingTop[borrowIdx] === ' ') { borrowIdx--; continue; }
        if (parseInt(workingTop[borrowIdx]) === 0) {
          workingTop[borrowIdx] = '9';
          regroups[borrowIdx] = { val: '9', slash: true };
          borrowIdx--;
        } else {
          const valBefore = parseInt(workingTop[borrowIdx]);
          workingTop[borrowIdx] = String(valBefore - 1);
          regroups[borrowIdx] = { val: String(valBefore - 1), slash: true };
          break;
        }
      }
      d1 += 10;
      workingTop[i] = String(d1);
      regroups[i] = { val: String(d1), slash: true };
      steps.push({
        instruction: `Regroup: ${d1 - 10} < ${d2}, so borrow from the next place.`,
        highlights: [i],
        regroups: { ...regroups },
        result: [...currentResult]
      });
    }

    const diff = d1 - d2;
    currentResult[i] = String(diff);
    steps.push({
      instruction: `Subtract: ${d1} – ${d2} = ${diff}.`,
      highlights: [i],
      regroups: { ...regroups },
      result: [...currentResult]
    });
  }

  return {
    id: `arith_journey_subtraction_${Date.now()}`,
    type: "arithmetic_journey",
    operation: "subtraction",
    title: `Subtraction: ${formatIndian(n1)} – ${formatIndian(n2)}`,
    operands: [s1Full, s2Full],
    steps,
    footer: `The difference is ${formatIndian(res)}.`
  };
}

/**
 * Multiplication Journey (Granular Standard Algorithm)
 */
export function generateMultiplicationJourney(v1, v2) {
  const n1 = Math.max(Number(v1), Number(v2));
  const n2 = Math.min(Number(v1), Number(v2));
  const prod = n1 * n2;
  
  const maxWidth = formatGridString(prod, 0).length;
  const s1Full = formatGridString(n1, maxWidth);
  const s2Full = formatGridString(n2, maxWidth);
  const prodFull = formatGridString(prod, maxWidth);
  
  const padded1 = s1Full.split('');
  const multiplierDigits = String(n2).split('').reverse();
  
  const steps = [];
  const subRows = [];
  
  multiplierDigits.forEach((mDigitChar, mIdx) => {
    const mDigit = parseInt(mDigitChar);
    let currentRowDigits = Array(maxWidth).fill(" ");
    let carries = {};
    let currentCarry = 0;
    
    // Add new subrow for this partial product
    subRows.push({ val: Array(maxWidth).fill(" "), active: true });
    for(let p=0; p < subRows.length - 1; p++) subRows[p].active = false;

    // Placeholders for shifts
    for(let s=0; s<mIdx; s++) {
        const resetPos = maxWidth - 1 - s;
        currentRowDigits[resetPos] = "0";
    }
    subRows[subRows.length-1].val = [...currentRowDigits];

    // Multiply mDigit by n1 digits
    for (let i = maxWidth - 1; i >= 0; i--) {
        const char1 = padded1[i];
        if (char1 === ',' || char1 === ' ') continue;

        const d1 = parseInt(char1);
        const res = (d1 * mDigit) + currentCarry;
        const resDigit = res % 10;
        const nextCarry = Math.floor(res / 10);

        // Find correct placement for digit in subrow
        // It's i - mIdx (with adjustment for commas)
        // Simplified approach: use the same column i but shift it visually
        // For standard grid, partial products align their right side with the multiplier digit
        const targetPos = i - mIdx; 
        // Note: Real alignment requires complex comma-aware math, but for now we follow the d1 column
        if (targetPos >= 0) {
            currentRowDigits[targetPos] = String(resDigit);
            subRows[subRows.length - 1].val = [...currentRowDigits];
        }

        if (currentCarry > 0) carries[i] = String(currentCarry);

        steps.push({
            instruction: currentCarry > 0 
                ? `Multiply: ${mDigit} × ${d1} + ${currentCarry} (carry) = ${res}. Write ${resDigit}, carry ${nextCarry}.`
                : `Multiply: ${mDigit} × ${d1} = ${res}. Write ${resDigit}, carry ${nextCarry}.`,
            highlights: [i],
            carries: { ...carries },
            subRows: subRows.map(r => ({ ...r, val: [...r.val] })),
            result: Array(maxWidth).fill(" ")
        });

        currentCarry = nextCarry;
    }

    if (currentCarry > 0) {
        // Find leftmost digit pos
        let leftmost = -1;
        for(let k=0; k<maxWidth; k++) if(padded1[k] !== ' ' && padded1[k] !== ',') { leftmost = k; break; }
        if (leftmost - mIdx - 1 >= 0) {
            currentRowDigits[leftmost - mIdx - 1] = String(currentCarry);
            subRows[subRows.length - 1].val = [...currentRowDigits];
            steps.push({
                instruction: `Finally, bring down the carried ${currentCarry}.`,
                highlights: [leftmost - mIdx - 1],
                carries: { ...carries },
                subRows: subRows.map(r => ({ ...r, val: [...r.val] })),
                result: Array(maxWidth).fill(" ")
            });
        }
    }
  });

  steps.push({
    instruction: "Finally, add the partial products to find the final product.",
    highlights: [],
    subRows: subRows.map(r => ({ ...r, active: false })),
    result: prodFull.split('')
  });

  return {
    id: `arith_journey_multiplication_${Date.now()}`,
    type: "arithmetic_journey",
    operation: "multiplication",
    title: `Multiplication: ${formatIndian(n1)} × ${formatIndian(n2)}`,
    operands: [s1Full, s2Full],
    steps,
    footer: `The product is ${formatIndian(prod)}.`
  };
}
