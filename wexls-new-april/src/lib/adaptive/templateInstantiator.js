/**
 * TEMPLATE INSTANTIATOR (Proprietary)
 * Hydrates base question templates with dynamic variables and contexts.
 */

export function instantiate(template, variables) {
  let questionText = template.question_text || '';
  let solutionText = template.solution_explanation || '';

  // 1. Variable Hydration: Replace {varName} with its value
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    questionText = questionText.replace(regex, value);
    solutionText = solutionText.replace(regex, value);
  }

  // 2. Handle Complex Renderers (Fractions, Decimals, etc.)
  // Templates may include a "parts" array representing UI components
  const hydratedParts = (template.parts || []).map(part => {
    const newPart = { ...part };
    
    // Recursive hydration for nested properties in UI components
    if (newPart.props) {
      Object.keys(newPart.props).forEach(propKey => {
        if (typeof newPart.props[propKey] === 'string') {
          Object.keys(variables).forEach(varKey => {
            const regex = new RegExp(`{${varKey}}`, 'g');
            newPart.props[propKey] = newPart.props[propKey].replace(regex, variables[varKey]);
          });
        }
      });
    }
    
    return newPart;
  });

  return {
    ...template,
    question_text: questionText,
    solution_explanation: solutionText,
    parts: hydratedParts,
    correct_answer: template.correct_answer_text ? 
      template.correct_answer_text.replace(/{(\w+)}/g, (_, key) => variables[key]) : 
      null
  };
}

/**
 * Example Generator: Generate variables for a specific template
 * E.g., for "Rounding to 10", generate a random number between 10 and 99.
 */
export function generateVariables(microSkillId, stage) {
  const vars = {};
  
  if (microSkillId === 'rounding-10') {
    const num = Math.floor(Math.random() * 90) + 10; // 10-99
    vars.num = num;
    vars.ans = Math.round(num / 10) * 10;
  }
  
  if (microSkillId === 'fractions-basic') {
    const total = 4;
    const shaded = Math.floor(Math.random() * 3) + 1; // 1-3
    vars.total_parts = total;
    vars.shaded_parts = shaded;
    vars.fraction_text = `${shaded}/${total}`;
  }

  return vars;
}
