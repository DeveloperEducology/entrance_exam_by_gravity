
/**
 * arithmeticJourneyGenerator.js
 * Generates step-by-step arithmetic journeys for Addition, Subtraction, and Multiplication.
 * Follows the Indian Numbering System and supports carry/regrouping logic.
 */

const formatIndian = (num) => {
  if (num === null || num === undefined) return "";
  return Number(num).toLocaleString('en-IN');
};

const pad = (arr, len) => {
  const safeLen = Math.max(0, len - (arr?.length || 0));
  return [...Array(safeLen).fill(" "), ...(arr || [])];
};

/**
 * Helper to get a string of digits with Indian commas at fixed positions from the right.
 * Positions are: 3, 5, 7, 9...
 */
const formatGridString = (num, width) => {
    let s = String(Number(num));
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
  
  // Calculate max width including commas
  const maxWidth = formatGridString(res, 0).length;
  
  const s1Full = formatGridString(n1, maxWidth);
  const s2Full = formatGridString(n2, maxWidth);
  const srFull = formatGridString(res, maxWidth);
  
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

    const d1 = isNaN(parseInt(char1)) ? 0 : parseInt(char1);
    const d2 = isNaN(parseInt(char2)) ? 0 : parseInt(char2);
    const sum = d1 + d2 + carryValue;
    const resDigit = sum % 10;
    const nextCarry = Math.floor(sum / 10);

    if (carryValue > 0) {
        carries[i] = String(carryValue);
    }

    currentResult[i] = String(resDigit);
    
    const instruction = carryValue > 0 
        ? `Addition: ${carryValue} (carried) + ${d1} + ${d2} = ${sum}. Write ${resDigit}${nextCarry > 0 ? `, carry ${nextCarry}` : ""}.`
        : `Addition: ${d1} + ${d2} = ${sum}. Write ${resDigit}${nextCarry > 0 ? `, carry ${nextCarry}` : ""}.`;
    
    steps.push({
      instruction,
      highlights: [i],
      carries: { ...carries },
      result: [...currentResult]
    });

    carryValue = nextCarry;
  }
  
  // Last carry if any
  if (carryValue > 0) {
      // Find the leftmost empty slot or space
      let lastIdx = -1;
      for(let j=0; j<maxWidth; j++) {
          if (padded1[j] !== ' ' || padded2[j] !== ' ') {
              lastIdx = j;
              break;
          }
      }
      // If we need to put a carry at the very front
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
    id: `arith_journey_add_${Date.now()}`,
    type: "addition",
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
  
  const padded1 = s1Full.split('');
  const padded2 = s2Full.split('');
  
  const steps = [];
  let regroups = {};
  let currentResult = Array(maxWidth).fill(" ");
  let workingTop = [...padded1];

  for (let i = maxWidth - 1; i >= 0; i--) {
    const char1 = workingTop[i];
    const char2 = padded2[i];
    
    if (char1 === ',' || char1 === ' ') {
        if (char1 === ',') currentResult[i] = ',';
        continue;
    }

    let d1 = parseInt(char1);
    const d2 = isNaN(parseInt(char2)) ? 0 : parseInt(char2);

    if (d1 < d2) {
      let borrowIdx = i - 1;
      while (borrowIdx >= 0) {
          if (workingTop[borrowIdx] === ',' || workingTop[borrowIdx] === ' ') {
              borrowIdx--;
              continue;
          }
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
      regroups[i] = { val: String(d1), slash: true }; // Slash the original digit in Row 2
      
      steps.push({
        instruction: `Regroup: ${d1-10} < ${d2}, so borrow from the next place.`,
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
    id: `arith_journey_sub_${Date.now()}`,
    type: "subtraction",
    title: `Subtraction: ${formatIndian(n1)} – ${formatIndian(n2)}`,
    operands: [s1Full, s2Full],
    steps,
    footer: `The difference is ${formatIndian(res)}.`
  };
}

/**
 * Multiplication Journey
 */
export function generateMultiplicationJourney(v1, v2) {
  const n1 = Math.max(Number(v1), Number(v2));
  const n2 = Math.min(Number(v1), Number(v2));
  const res = n1 * n2;
  
  const s1 = formatIndian(n1);
  const s2 = formatIndian(n2);
  const sr = formatIndian(res);
  
  const multiplierDigits = String(n2).split('').reverse();
  const steps = [];
  const subRows = [];
  
  multiplierDigits.forEach((multDigit, i) => {
    const powerOfTen = Math.pow(10, i);
    const partialProduct = n1 * Number(multDigit) * powerOfTen;
    
    let ppDigits = String(n1 * Number(multDigit)).split('');
    for(let z=0; z<i; z++) ppDigits.push("0");

    subRows.push({ val: ppDigits, active: true });
    for(let prev=0; prev < subRows.length - 1; prev++) subRows[prev].active = false;

    steps.push({
      instruction: `Multiply: ${multDigit} × ${formatIndian(n1)} = ${formatIndian(n1 * Number(multDigit))}.${i > 0 ? ` Shift left by ${i}.` : ''}`,
      highlights: [],
      subRows: subRows.map(r => ({ ...r, val: [...r.val] })),
      result: Array(sr.length).fill(" ")
    });
  });

  steps.push({
    instruction: `Add the partial products to get the sum: ${formatIndian(res)}.`,
    highlights: [],
    subRows: subRows.map(r => ({ ...r, active: false })),
    result: sr.split('')
  });

  return {
    id: `arith_journey_mul_${Date.now()}`,
    type: "multiplication",
    title: `Multiplication: ${s1} × ${s2}`,
    operands: [s1, s2],
    steps,
    footer: `The product is ${sr}.`
  };
}
