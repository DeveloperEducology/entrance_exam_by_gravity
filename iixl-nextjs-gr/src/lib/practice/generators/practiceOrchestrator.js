const { generatorRegistry } = require('./registry');

/**
 * Hydrates a template node (string, array, or object) by replacing {variable} placeholders
 * with values from templateVars.
 */
function hydrateNode(node, templateVars) {
  if (typeof node === 'string') {
    const exactMatch = node.match(/^\{([^}]+)\}$/);
    if (exactMatch) {
      const key = exactMatch[1];
      if (templateVars[key] !== undefined) {
        return templateVars[key];
      }
    }
    return node.replace(/\{([^}]+)\}/g, (match, key) => templateVars[key] !== undefined ? templateVars[key] : match);
  }
  if (Array.isArray(node)) {
    return node.map(n => hydrateNode(n, templateVars));
  }
  if (typeof node === 'object' && node !== null) {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = hydrateNode(v, templateVars);
    }
    return out;
  }
  return node;
}

/**
 * Main entry point for instantiating a question template based on its logic_type.
 * Dispatches to modular generators registered in registry.js.
 */
function instantiateTemplate(question, overrideVariables = null) {
  if (!question) return question;

  const logic = question.logic_type || question.adaptiveConfig?.logic_type || question.adaptiveConfig?.logic;
  if (!logic) return question;

  let inst = JSON.parse(JSON.stringify(question));
  inst.adaptiveConfig = inst.adaptiveConfig || {};

  if (overrideVariables && typeof overrideVariables === 'object') {
    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...overrideVariables
    };
  }

  if (generatorRegistry[logic]) {
    inst = generatorRegistry[logic](inst, overrideVariables);
  }

  const finalVars = inst.adaptiveConfig?.variables || {};
  if (Object.keys(finalVars).length > 0) {
    if (inst.questionText && String(inst.questionText).includes('{')) {
      inst.questionText = hydrateNode(inst.questionText, finalVars);
    }
    if (inst.question_text && String(inst.question_text).includes('{')) {
      inst.question_text = hydrateNode(inst.question_text, finalVars);
    }
    if (inst.solution && (typeof inst.solution !== 'string' || String(inst.solution).includes('{'))) {
      inst.solution = hydrateNode(inst.solution, finalVars);
    }

    const rawAns = inst.correctAnswerText || inst.correct_answer_text || inst.adaptiveConfig?.correctAnswerText;
    if (rawAns) {
      const hydratedAns = hydrateNode(rawAns, finalVars);
      inst.correctAnswerText = hydratedAns;
      inst.correct_answer_text = hydratedAns;
      inst.adaptiveConfig.correctAnswerText = hydratedAns;
    }

    if (inst.parts) inst.parts = hydrateNode(inst.parts, finalVars);
    if (inst.options) inst.options = hydrateNode(inst.options, finalVars);
  }

  return inst;
}

module.exports = {
  hydrateNode,
  instantiateTemplate
};
