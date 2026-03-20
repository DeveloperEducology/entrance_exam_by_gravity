/**
 * multiplicationUtils.js
 * Utilities for vertical multiplication quizzes, including dynamic explanation step generation with carries.
 */

export function generateMultiplicationExplanation(v1, v2) {
    const val1 = Number(v1);
    const val2 = Number(v2);
    const result = val1 * val2;
    const resStr = String(result);
    
    // Choose operands for optimal vertical layout
    const top = String(val1).length >= String(val2).length ? String(val1) : String(val2);
    const bottom = String(val1).length >= String(val2).length ? String(val2) : String(val1);
    const sections = [];

    // 1. Review Section
    sections.push({
        type: 'section',
        label: 'review',
        title: 'Review the problem',
        parts: [
            {
                type: 'text',
                content: `Find the product of **${top}** and **${bottom}**.`
            },
            {
                type: 'verticalMultiply',
                layout: {
                    v1: top,
                    v2: bottom,
                    showQuestionMark: true
                }
            }
        ]
    });

    // 2. Setup Section
    if (String(v1).length < String(v2).length) {
        sections.push({
            type: 'section',
            label: 'solve',
            title: 'Arrange correctly',
            parts: [
                {
                    type: 'text',
                    content: "To make multiplying easier, we put the longer number on top."
                },
                {
                    type: 'verticalMultiply',
                    layout: {
                        v1: top,
                        v2: bottom,
                        showQuestionMark: true
                    }
                }
            ]
        });
    }

    // 3. Step-by-Step with Carries
    const multiplicandDigits = top.split('').reverse();
    const multiplierDigit = Number(bottom); 
    
    let currentCarry = 0;
    const carryHistory = []; // Tracks carries shown at each step
    const resultDigits = []; // Tracks the result as it's built

    multiplicandDigits.forEach((digitStr, index) => {
        const digit = Number(digitStr);
        const placeNames = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
        const placeName = placeNames[index] || `place ${index + 1}`;
        
        const rawProduct = digit * multiplierDigit;
        const total = rawProduct + currentCarry;
        const writtenDigit = total % 10;
        const nextCarry = Math.floor(total / 10);

        // Indices for highlighting
        const topDigitIdx = top.length - 1 - index;
        
        resultDigits.unshift(writtenDigit);
        // The display string for the result buildup
        const displayResult = resultDigits.join('').padStart(resStr.length, ' ');

        // Description of the carry
        let carryText = "";
        if (currentCarry > 0) {
            carryText = ` Add the carry of **${currentCarry}** from the previous step to get **${total}**.`;
        } else {
            carryText = ` The result is **${total}**.`;
        }

        let nextCarryText = "";
        if (nextCarry > 0 && index < multiplicandDigits.length - 1) {
            nextCarryText = ` Write **${writtenDigit}** in the ${placeName} place and carry **${nextCarry}** to the next place.`;
        } else if (nextCarry > 0 && index === multiplicandDigits.length - 1) {
             nextCarryText = ` Write **${total}** as the final part of the product.`;
             // In the last step, the full 'total' is written, but our loop logic might need to adjust.
             // If carry > 0 on last digit, we actually prepend it.
             if (nextCarry > 0) {
                 // The 'writtenDigit' is already unshifted. We now prepend the remaining carry.
                 // Wait, resultDigits.join('') already has the written digit. 
                 // If we have a carry on the last digit, we should show it in the final result.
             }
        } else {
            nextCarryText = ` Write **${writtenDigit}** in the ${placeName} place.`;
        }

        sections.push({
            type: 'section',
            label: 'solve',
            title: `Step ${index + 1}: Multiply ${placeName}`,
            parts: [
                {
                    type: 'text',
                    content: `Multiply **${multiplierDigit}** by the **${digit}** in the ${placeName} place.${carryText}${nextCarryText}`
                },
                {
                    type: 'verticalMultiply',
                    layout: {
                        v1: top,
                        v2: bottom,
                        result: (index === multiplicandDigits.length - 1 && nextCarry > 0) ? String(total).concat(resultDigits.slice(1).join('')) : displayResult,
                        highlightTop: [topDigitIdx],
                        highlightBottom: [0],
                        highlightResult: (index === multiplicandDigits.length - 1 && nextCarry > 0) 
                            ? [0, 1] // Highlight both digits of the final total
                            : [resStr.length - 1 - index],
                        carries: [...carryHistory, nextCarry > 0 ? String(nextCarry) : '']
                    }
                }
            ]
        });

        // Prepare for next step
        if (nextCarry > 0) {
            carryHistory[index + 1] = String(nextCarry);
        } else {
            carryHistory[index + 1] = '';
        }
        currentCarry = nextCarry;
    });

    // 4. Final Section
    sections.push({
        type: 'section',
        label: 'solve',
        title: 'Final Product',
        parts: [
            {
                type: 'text',
                content: `You have completed all steps. The final product of ${v1} and ${v2} is **${result}**.`
            },
            {
                type: 'verticalMultiply',
                layout: {
                    v1: top,
                    v2: bottom,
                    result: resStr,
                    extraSpacing: true
                }
            }
        ]
    });

    return sections;
}
