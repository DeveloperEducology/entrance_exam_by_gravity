import { generatePlaceValueQuestion } from './placeValueGenerator';
// Triggering rebuild after cleanup

export function hydrateNode(node, templateVars) {
  if (typeof node === 'string') {
    // Check if the node is exactly a single template variable like "{items}" or "{{items}}"
    const exactMatch = node.match(/^\{\{?([^}]+)\}\}?$/);
    if (exactMatch) {
      const key = exactMatch[1];
      if (templateVars[key] !== undefined) {
        return templateVars[key];
      }
    }
    // Match both {{var}} and {var}
    return node.replace(/\{\{?([^}]+)\}\}?/g, (match, key) => templateVars[key] !== undefined ? templateVars[key] : match);
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

export function instantiateTemplate(question, overrideVariables = null) {
  if (!question) return question;

  const logic = question.logic_type || question.adaptiveConfig?.logic_type || question.adaptiveConfig?.logic;
  if (!logic) return question;

  let inst = JSON.parse(JSON.stringify(question));
  inst.adaptiveConfig = inst.adaptiveConfig || {};

  // Merge override variables if provided (critical for server-side validation desync)
  if (overrideVariables && typeof overrideVariables === 'object') {
    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...overrideVariables
    };
  }

if (logic === 'division_countdown_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    const divisor = ds.divisor || 3; 
    const quotient = ds.quotient || 4; 
    const dividend = divisor * quotient;

    inst.adaptiveConfig.variables = { dividend, divisor, quotient };

    const steps = [];
    let currentVal = dividend;
    
    for (let i = 1; i <= quotient; i++) {
      const nextVal = currentVal - divisor;
      steps.push({
        stepNum: i,
        equation: `${currentVal} - ${divisor} =`,
        result: nextVal,
        id: `step_${i}` // Becomes ans_step_1, ans_step_2, etc.
      });
      currentVal = nextVal;
    }

    // 1. Instructions
    inst.parts = [
      { 
        type: 'text', 
        content: `Division is like a countdown. To solve $${dividend} \\div ${divisor}$, we keep taking away **${divisor}** until we hit zero.`, 
        isVertical: true,
        style: { marginBottom: '20px', fontSize: '18px' }
      }
    ];

    // 2. Vertical Rows (Fixes the horizontal overlap seen in your screenshot)
    steps.forEach(step => {
      inst.parts.push({
        type: 'pair',
        isVertical: false, // Keep equation and input on same line
        style: { margin: '12px 0', fontSize: '20px', display: 'flex', alignItems: 'center' },
        parts: [
          { type: 'text', content: `**Step ${step.stepNum}:** ${step.equation}`, style: { marginRight: '10px' } },
          { type: 'input', id: step.id, size: 'small' }
        ]
      });
    });

    inst.parts.push({ type: 'text', content: '---', isVertical: true, style: { margin: '20px 0' } });

    // 3. Result reasoning
    inst.parts.push({
      type: 'pair',
      style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', fontSize: '18px' },
      parts: [
        { type: 'text', content: `Since we subtracted **${divisor}** exactly ` },
        { type: 'input', id: 'total_count', size: 'small', style: { margin: '0 5px' } },
        { type: 'text', content: ` times to reach zero:` }
      ]
    });

    // 4. Final Equation
    inst.parts.push({
      type: 'pair',
      style: { marginTop: '20px', fontSize: '24px', fontWeight: 'bold' },
      parts: [
        { type: 'text', content: `$${dividend} \\div ${divisor} = $` },
        { type: 'input', id: 'final_ans', size: 'small', style: { marginLeft: '10px' } }
      ]
    });

    // 5. Correct Answers Mapping (The Grader Fix)
    const finalAnswers = {};
    steps.forEach(s => {
      // Ensure key matches the ID provided in the parts exactly
      finalAnswers[`ans_${s.id}`] = String(s.result);
    });
    finalAnswers.ans_total_count = String(quotient);
    finalAnswers.ans_final_ans = String(quotient);

    inst.solution = [
      { type: 'text', content: `### Step-by-Step Countdown`, isVertical: true },
      { type: 'text', content: `We started at **${dividend}** and took away **${divisor}** groups.`, isVertical: true },
      { type: 'text', content: `Count of groups: **${quotient}**`, isVertical: true },
      { type: 'text', content: `So, $${dividend} \\div ${divisor} = ${quotient}$.`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify(finalAnswers);

    return inst;
  }

  
  if (logic === 'drag_drop_v2_sorting_v1') {
    const config = inst.adaptiveConfig || {};
    const taskType = config.taskType || 'prime_composite';
    const itemCount = Number(config.itemCount || 4);

    let dragItems = [];
    let dropGroups = [];
    let solutionText = "";

    if (taskType === 'prime_composite') {
      const primes = [];
      const composites = [];
      const isP = (n) => {
        if (n < 2) return false;
        for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
        return true;
      };

      while (primes.length < Math.floor(itemCount / 2)) {
        const n = Math.floor(Math.random() * 48) + 2;
        if (isP(n) && !primes.includes(n)) primes.push(n);
      }
      while (composites.length < Math.ceil(itemCount / 2)) {
        const n = Math.floor(Math.random() * 46) + 4;
        if (!isP(n) && !composites.includes(n)) composites.push(n);
      }

      dragItems = [
        ...primes.map((v, i) => ({ id: `p-${i}`, content: String(v), targetGroupId: 'prime' })),
        ...composites.map((v, i) => ({ id: `c-${i}`, content: String(v), targetGroupId: 'composite' }))
      ];
      dropGroups = [
        { id: 'prime', label: 'Prime', hint: 'Exactly 2 factors' },
        { id: 'composite', label: 'Composite', hint: 'More than 2 factors' }
      ];
      solutionText = `Prime numbers are divisible only by 1 and himself (${primes.join(', ')}), while composite numbers have more than two factors (${composites.join(', ')}).`;
    } else if (taskType === 'even_odd') {
      const evens = [];
      const odds = [];
      while (evens.length < Math.floor(itemCount / 2)) {
        const n = (Math.floor(Math.random() * 49) + 1) * 2;
        if (!evens.includes(n)) evens.push(n);
      }
      while (odds.length < Math.ceil(itemCount / 2)) {
        const n = (Math.floor(Math.random() * 49) * 2) + 1;
        if (!odds.includes(n)) odds.push(n);
      }
      dragItems = [
        ...evens.map((v, i) => ({ id: `e-${i}`, content: String(v), targetGroupId: 'even' })),
        ...odds.map((v, i) => ({ id: `o-${i}`, content: String(v), targetGroupId: 'odd' }))
      ];
      dropGroups = [
        { id: 'even', label: 'Even', hint: 'Ends in 0, 2, 4, 6, 8' },
        { id: 'odd', label: 'Odd', hint: 'Ends in 1, 3, 5, 7, 9' }
      ];
      solutionText = `Even numbers are divisible by 2 (${evens.join(', ')}), while odd numbers have a remainder when divided by 2 (${odds.join(', ')}).`;
    }

    inst.dragItems = dragItems.sort(() => Math.random() - 0.5);
    inst.dropGroups = dropGroups;
    inst.solution = solutionText;
    inst.type = 'dragAndDropv2';
    return inst;
  }

  const isExplicitlyCorrect = (value) =>
    value === true || value === 1 || String(value).toLowerCase() === 'true';


  if (logic === 'estimate_products_rounding_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [11, 99];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      // Generate two numbers, avoiding perfect tens to make the rounding meaningful
      do {
        n1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        n2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      } while (n1 % 10 === 0 || n2 % 10 === 0);
    }

    const round = (num) => Math.round(num / 10) * 10;
    const r1 = round(n1);
    const r2 = round(n2);
    const estimatedProd = r1 * r2;
    const exactProd = n1 * n2;

    const estimated_prod_fmt = estimatedProd.toLocaleString('en-IN');
    const exact_prod_fmt = exactProd.toLocaleString('en-IN');

    const templateVars = {
      n1, n2, r1, r2,
      estimated_prod: estimatedProd,
      estimated_prod_fmt,
      exact_prod: exactProd,
      exact_prod_fmt
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = [
      {
        type: 'text',
        content: 'Estimate the product. Round each factor to the nearest ten, then multiply.',
        isVertical: true
      },
      {
        type: 'text',
        content: `### ${n1} × ${n2}`,
        isVertical: true,
        style: { margin: '20px 0' }
      },
      {
        type: 'pair',
        parts: [
          { type: 'text', content: 'The product is approximately ' },
          { type: 'input', id: 'ans', size: 'medium' },
          { type: 'text', content: '.' }
        ]
      }
    ];

    inst.solution = [
      { type: 'text', content: '### Round the first factor to the nearest ten.', isVertical: true },
      { type: 'text', content: `${n1} × ${n2} = ?\n↓\n**${r1}** × ${n2} = ?`, isVertical: true },

      { type: 'text', content: '### Round the second factor to the nearest ten.', isVertical: true },
      { type: 'text', content: `${r1} × ${n2} = ?\n↓\n${r1} × **${r2}** = ?`, isVertical: true },

      { type: 'text', content: '### Now multiply:', isVertical: true },
      { type: 'text', content: `${r1} × ${r2} = **${estimated_prod_fmt}**`, isVertical: true },

      { type: 'text', content: `The product is approximately **${estimated_prod_fmt}**.`, isVertical: true },

      { type: 'text', content: '### Compare your estimate to the exact answer:', isVertical: true },
      { type: 'text', content: `${n1} × ${n2} = **${exact_prod_fmt}**`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ ans: String(estimatedProd) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    return inst;
  }


  if (logic === 'interactive_paragraph_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const variables = dataSource.variables || {};
    const currentVars = { ...variables, ...(overrideVariables || {}) };

    // PRO FIX: Use parts if present, otherwise fallback to template
    if (dataSource.parts && Array.isArray(dataSource.parts) && dataSource.parts.length > 0) {
      inst.parts = hydrateNode(dataSource.parts, currentVars);
    } else {
      const template = dataSource.template || "Solve: [[ans]]";
      const hydratedContent = hydrateNode(template, variables);
      const finalContent = hydrateNode(hydratedContent, currentVars);
      
      inst.parts = [
        {
          type: 'text',
          content: finalContent,
          isVertical: true
        }
      ];
    }

    inst.type = 'fillInTheBlank';
    // If correct answers are provided in dataSource.answers, use them
    if (dataSource.answers) {
      inst.correctAnswerText = JSON.stringify(hydrateNode(dataSource.answers, currentVars));
    }
    
    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...currentVars };
    return inst;
  }

  if (logic === 'estimate_products_rounding_v2') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [11, 99];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      // Logic: Ensure we don't pick perfect tens (e.g., 50) to make rounding educational
      do {
        n1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        n2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      } while (n1 % 10 === 0 || n2 % 10 === 0);
    }

    const round = (num) => Math.round(num / 10) * 10;
    const r1 = round(n1);
    const r2 = round(n2);
    const estimatedProd = r1 * r2;
    const exactProd = n1 * n2;

    const templateVars = {
      n1, n2, r1, r2,
      n1_fmt: n1.toLocaleString('en-IN'),
      n2_fmt: n2.toLocaleString('en-IN'),
      r1_fmt: r1.toLocaleString('en-IN'),
      r2_fmt: r2.toLocaleString('en-IN'),
      estimated_prod: estimatedProd,
      estimated_prod_fmt: estimatedProd.toLocaleString('en-IN'),
      exact_prod: exactProd,
      exact_prod_fmt: exactProd.toLocaleString('en-IN')
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    // Matches the "Question" section of your screenshot
    inst.parts = [
      { type: 'text', content: 'Estimate the product. Round each factor to the nearest ten, then multiply.', isVertical: true },
      { type: 'text', content: `### ${n1} × ${n2}`, isVertical: true, style: { margin: '20px 0', fontSize: '24px' } },
      {
        type: 'pair',
        parts: [
          { type: 'text', content: 'The product is approximately ' },
          { type: 'input', id: 'ans', size: 'medium' },
          { type: 'text', content: '.' }
        ]
      }
    ];

    // Matches the "Solution" section of your screenshot with arrows and bolded steps
    inst.solution = [
      { type: 'text', content: '### Round the first factor to the nearest ten.', isVertical: true },
      { type: 'text', content: `**${n1}** × ${n2} = ?\n↓\n**${r1}** × ${n2} = ?`, isVertical: true },

      { type: 'text', content: '### Round the second factor to the nearest ten.', isVertical: true },
      { type: 'text', content: `${r1} × **${n2}** = ?\n↓\n${r1} × **${r2}** = ?`, isVertical: true },

      { type: 'text', content: '### Now multiply:', isVertical: true },
      { type: 'text', content: `${r1} × ${r2} = **${templateVars.estimated_prod_fmt}**`, isVertical: true },

      { type: 'text', content: `The product is approximately **${templateVars.estimated_prod_fmt}**.`, isVertical: true },

      { type: 'text', content: '### Compare your estimate to the exact answer:', isVertical: true },
      { type: 'text', content: `${n1} × ${n2} = **${templateVars.exact_prod_fmt}**`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ ans: String(estimatedProd) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    return inst;
  }

  if (logic === 'estimate_products_rounding_v3') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [11, 99];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      do {
        n1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        n2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      } while (n1 % 10 === 0 || n2 % 10 === 0);
    }

    const round = (num) => Math.round(num / 10) * 10;
    const r1 = round(n1);
    const r2 = round(n2);
    const estimatedProd = r1 * r2;

    const templateVars = {
      n1, n2, r1, r2,
      estimated_prod: estimatedProd,
      estimated_prod_fmt: estimatedProd.toLocaleString('en-IN')
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = [
      { type: 'text', content: '### Estimate the product', isVertical: true },
      { type: 'text', content: `Round each factor to the nearest ten to estimate **${n1} &times; ${n2}**.`, isVertical: true },
      { 
        type: 'text', 
        content: `[[r1]] &times; [[r2]] = [[ans]]`,
        isVertical: true,
        style: { fontSize: '24px', margin: '20px 0', textAlign: 'center' }
      }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ 
      r1: String(r1),
      r2: String(r2),
      ans: String(estimatedProd)
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    return inst;
  }

  if (logic === 'svg_number_line_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [0, 10];
    const step = dataSource.step || 1;
    
    let target;
    if (overrideVariables && overrideVariables.target) {
      target = Number(overrideVariables.target);
    } else {
      do {
        target = Math.floor(Math.random() * (range[1] - range[0] - 1) * 10) / 10 + range[0] + 0.5;
        target = parseFloat(target.toFixed(1));
      } while (Number.isInteger(target));
    }
    
    const templateVars = { target, range };
    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    // Generate SVG for a number line
    const width = 600;
    const height = 100;
    const margin = 40;
    const lineY = 50;
    const scale = (width - 2 * margin) / (range[1] - range[0]);
    
    let ticks = "";
    for (let i = range[0]; i <= range[1]; i += step) {
      const x = margin + (i - range[0]) * scale;
      ticks += `<line x1="${x}" y1="${lineY - 10}" x2="${x}" y2="${lineY + 10}" stroke="#94a3b8" stroke-width="2" />`;
      ticks += `<text x="${x}" y="${lineY + 30}" text-anchor="middle" font-size="14" font-weight="600" fill="#64748b" font-family="Nunito, sans-serif">${i}</text>`;
    }
    
    const targetX = margin + (target - range[0]) * scale;
    
    const svgContent = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto;">
        <line x1="${margin}" y1="${lineY}" x2="${width - margin}" y2="${lineY}" stroke="#475569" stroke-width="3" stroke-linecap="round" />
        ${ticks}
        <circle cx="${targetX}" cy="${lineY}" r="8" fill="#3b82f6" stroke="white" stroke-width="2" />
        <foreignObject x="${targetX - 30}" y="${lineY - 55}" width="60" height="45">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
            [[ans]]
          </div>
        </foreignObject>
      </svg>
    `;

    inst.parts = [
      { type: 'text', content: dataSource.instruction || `Where is **${target}** on the number line?`, isVertical: true },
      { type: 'svg', content: svgContent.trim(), isVertical: true },
      { type: 'text', content: `Round **${target}** to the nearest whole number: [[rounded]]`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ 
      ans: String(target),
      rounded: String(Math.round(target))
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    return inst;
  }

  if (logic === 'dot_grid_interaction_v1') {
    const config = inst.adaptiveConfig || {};
    const taskType = config.taskType || 'right_angle'; // square, triangle, rectangle, right_angle
    
    inst.type = 'dotGrid';
    inst.adaptiveConfig = {
      rows: 8,
      cols: 12,
      spacing: 40,
      ...config
    };

    const instructions = {
      right_angle: "Draw a **right angle** on the grid.",
      square: "Draw a **square** of any size.",
      rectangle: "Draw a **rectangle** (not a square).",
      triangle: "Draw any **triangle**."
    };

    inst.questionText = instructions[taskType] || "Draw on the dot grid.";

    // Validation logic (Simplified for template)
    // In a real system, this would be a backend check, 
    // but we can provide the logic as a 'correctAnswerText' schema
    inst.validation = {
      type: 'geometric',
      task: taskType
    };

    // For testing/preview, we can generate a solution shape
    const solutions = {
      right_angle: [["2-2", "2-4"], ["2-4", "4-4"]],
      square: [["2-2", "2-5"], ["2-5", "5-5"], ["5-5", "5-2"], ["5-2", "2-2"]],
      triangle: [["2-2", "2-6"], ["2-6", "5-4"], ["5-4", "2-2"]],
      rectangle: [["2-2", "2-7"], ["2-7", "4-7"], ["4-7", "4-2"], ["4-2", "2-2"]]
    };

    inst.solution = [
      { type: 'text', content: "### Possible Solution", isVertical: true },
      { type: 'text', content: `Here is one way to draw the **${taskType.replace('_', ' ')}**:`, isVertical: true },
      { type: 'dotGrid', adaptiveConfig: { ...inst.adaptiveConfig, initialLines: solutions[taskType] }, isVertical: true }
    ];

    return inst;
  }


  if (logic === 'sum_difference_pairs_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const diffRange = dataSource.diff_range || [2, 10];

    let targetSum, targetDiff, n1, n2;

    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
      targetSum = n1 + n2;
      targetDiff = n1 - n2;
    } else {
      // Pick difference first
      targetDiff = Math.floor(Math.random() * (diffRange[1] - diffRange[0] + 1)) + diffRange[0];

      // Ensure Sum > Diff and shares same parity to result in whole numbers
      const minSum = targetDiff + 2;
      const maxSum = minSum + 16;
      do {
        targetSum = Math.floor(Math.random() * (maxSum - minSum + 1)) + minSum;
      } while ((targetSum + targetDiff) % 2 !== 0);

      n1 = (targetSum + targetDiff) / 2;
      n2 = (targetSum - targetDiff) / 2;
    }

    const templateVars = {
      n1, n2, targetSum, targetDiff,
      sum_fmt: targetSum.toLocaleString('en-IN'),
      diff_fmt: targetDiff.toLocaleString('en-IN')
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = [
      {
        type: 'text',
        content: `The difference of two numbers is **${targetDiff}**. The sum of the two numbers is **${targetSum}**. What are the two numbers?`,
        isVertical: true
      },
      {
        type: 'pair',
        parts: [
          { type: 'input', id: 'ans_1', size: 'small' },
          { type: 'text', content: ' and ' },
          { type: 'input', id: 'ans_2', size: 'small' }
        ]
      }
    ];

    // Build the Solution Table Rows
    const tableRows = [];
    // Show 4 rows, with the correct answer being the 3rd one
    const startN1 = n1 - 2;

    for (let i = 0; i < 4; i++) {
      const curN1 = startN1 + i;
      const curN2 = curN1 - targetDiff;
      const curSum = curN1 + curN2;
      const isCorrect = (curSum === targetSum);

      // We push an array of cells, each with a 'content' string
      tableRows.push([
        {
          content: `${curN1} − ${curN2} = ${targetDiff}`,
          style: { color: isCorrect ? '#3b82f6' : 'inherit', fontWeight: isCorrect ? '700' : '400' }
        },
        {
          content: `${curN1} + ${curN2} = ${curSum}`,
          style: { color: isCorrect ? '#3b82f6' : 'inherit', fontWeight: isCorrect ? '700' : '400' }
        }
      ]);
    }

    inst.solution = [
      { type: 'text', content: `Think of pairs of numbers whose difference is **${targetDiff}**. Then find the sum of each pair.`, isVertical: true },
      {
        type: 'smartTable',
        headers: ['DIFFERENCE', 'SUM'],
        rows: tableRows,
        config: {
          showBorders: true,
          alignment: 'center',
          headerBackground: '#f8fafc'
        },
        isVertical: true
      },
      { type: 'text', content: `The numbers are **${n1}** and **${n2}**.`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    // Accepts inputs in any order
    inst.correctAnswerText = JSON.stringify({
      ans_1: [String(n1), String(n2)],
      ans_2: [String(n2), String(n1)]
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

if (logic === 'read_table_generic_comparison_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    // Context Retrieval
    const instruction = ds.instruction || "Look at the table to answer the question.";
    const headers = ds.headers || ["PLAYER", "MATCH 1", "MATCH 2"];
    const entities = ds.entities || ["Virat", "Rohit", "Gill", "Rahul"];
    const unit = ds.unit || "runs";
    
    let tableData, targetEntity;

    if (overrideVariables) {
      tableData = overrideVariables.tableData;
      targetEntity = overrideVariables.targetEntity;
    } else {
      const range = ds.value_range || [10, 99];
      tableData = {};
      entities.forEach(ent => {
        tableData[ent] = [
          Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0],
          Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
        ];
      });
      targetEntity = entities[Math.floor(Math.random() * entities.length)];
    }

    const val1 = tableData[targetEntity][0];
    const val2 = tableData[targetEntity][1];
    
    // Adaptive Wording Logic
    const isMore = val1 > val2;
    const comparisonWord = isMore ? "more" : "fewer";
    const difference = Math.abs(val1 - val2);

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        tableData, targetEntity, val1, val2, difference, comparisonWord 
    };

    // Construct Markdown Table manually
    let markdownTable = `| ${headers[0]} | ${headers[1]} | ${headers[2]} |\n| :--- | :---: | :---: |\n`;
    entities.forEach(ent => {
      const isTarget = ent === targetEntity;
      const row = isTarget 
        ? `| **${ent}** | **${tableData[ent][0]}** | **${tableData[ent][1]}** |` 
        : `| ${ent} | ${tableData[ent][0]} | ${tableData[ent][1]} |`;
      markdownTable += row + "\n";
    });

    inst.parts = [
      { type: 'text', content: instruction, isVertical: true },
      // Direct Markdown injection
      { type: 'text', content: markdownTable, isVertical: true, style: { margin: '20px 0' } },
      { 
        type: 'text', 
        content: `How many **${comparisonWord}** ${unit} did **${targetEntity}** have in the ${headers[1]} than in the ${headers[2]}?`, 
        isVertical: true
      },
      { 
        type: 'pair', 
        parts: [
          { type: 'input', id: 'ans', size: 'small' },
          { type: 'text', content: ` ${unit}` }
        ]
      }
    ];

    inst.solution = [
      { type: 'text', content: `### Step 1: Find the data`, isVertical: true },
      { type: 'text', content: `Locate **${targetEntity}** in the table. Compare the values:`, isVertical: true },
      { type: 'text', content: `- ${headers[1]}: **${val1}**\n- ${headers[2]}: **${val2}**`, isVertical: true },
      { type: 'text', content: `### Step 2: Calculate`, isVertical: true },
      { type: 'text', content: `Subtract the smaller number from the larger number to find the difference:`, isVertical: true },
      { type: 'text', content: `**${Math.max(val1, val2)} − ${Math.min(val1, val2)} = ${difference}**`, isVertical: true },
      { type: 'text', content: `### Conclusion`, isVertical: true },
      { type: 'text', content: `${targetEntity} had **${difference} ${comparisonWord}** ${unit} in ${headers[1]}.`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ ans: String(difference) });
    
    return inst;
  }


  if (logic === 'read_table_concept_mcq_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    // Context Retrieval (Defaults to Cricket if not in JSON)
    const instruction = ds.instruction || "Look at the table to answer the question.";
    const headers = ds.headers || ["PLAYER", "MATCH 1", "MATCH 2"];
    const entities = ds.entities || ["Virat", "Rohit", "Gill", "Rahul"];
    const unit = ds.unit || "runs";
    
    let tableData, targetEntity;

    if (overrideVariables) {
      tableData = overrideVariables.tableData;
      targetEntity = overrideVariables.targetEntity;
    } else {
      const range = ds.value_range || [10, 99];
      tableData = {};
      entities.forEach(ent => {
        // Ensure values are NOT equal so there is always a clear more/fewer answer
        let v1, v2;
        do {
          v1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
          v2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        } while (v1 === v2);
        tableData[ent] = [v1, v2];
      });
      targetEntity = entities[Math.floor(Math.random() * entities.length)];
    }

    const val1 = tableData[targetEntity][0];
    const val2 = tableData[targetEntity][1];
    
    // Logic: Identify the correct concept
    const isMore = val1 > val2;
    const correctAnswer = isMore ? "more" : "fewer";

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        tableData, targetEntity, val1, val2, correctAnswer 
    };

    // Construct Markdown Table
    let markdownTable = `| ${headers[0]} | ${headers[1]} | ${headers[2]} |\n| :--- | :---: | :---: |\n`;
    entities.forEach(ent => {
      const isTarget = ent === targetEntity;
      markdownTable += isTarget 
        ? `| **${ent}** | **${tableData[ent][0]}** | **${tableData[ent][1]}** |\n` 
        : `| ${ent} | ${tableData[ent][0]} | ${tableData[ent][1]} |\n`;
    });

    inst.parts = [
      { type: 'text', content: instruction, isVertical: true },
      { type: 'text', content: markdownTable, isVertical: true, style: { margin: '20px 0' } },
      { 
        type: 'text', 
        content: `Did **${targetEntity}** have **more** or **fewer** ${unit} in the ${headers[1]} than in the ${headers[2]}?`, 
        isVertical: true
      }
    ];

    // MCQ Choices
    inst.options = [
      { label: "more", content: "more" },
      { label: "fewer", content: "fewer" }
    ];

    inst.solution = [
      { type: 'text', content: `### Step 1: Compare the numbers`, isVertical: true },
      { type: 'text', content: `Look at the row for **${targetEntity}**:`, isVertical: true },
      { type: 'text', content: `- ${headers[1]}: **${val1}**\n- ${headers[2]}: **${val2}**`, isVertical: true },
      { type: 'text', content: `### Step 2: Determine the word`, isVertical: true },
      { 
        type: 'text', 
        content: isMore 
          ? `Since **${val1}** is a larger number than **${val2}**, ${targetEntity} had **more** ${unit}.` 
          : `Since **${val1}** is a smaller number than **${val2}**, ${targetEntity} had **fewer** ${unit}.`, 
        isVertical: true 
      }
    ];

    inst.type = 'mcq';
    inst.correctAnswerIndex = isMore ? 0 : 1;
    inst.correctAnswerText = correctAnswer;
    
    return inst;
  }

  if (logic === 'probability_counts_comparison_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    let colorA, colorB, countA, countB, marbleItems;

    if (overrideVariables && overrideVariables.marble_items) {
      colorA = overrideVariables.colorA;
      colorB = overrideVariables.colorB;
      countA = Number(overrideVariables.countA);
      countB = Number(overrideVariables.countB);
      marbleItems = overrideVariables.marble_items;
    } else {
      colorA = ds.itemA?.color || 'black';
      colorB = ds.itemB?.color || 'purple';
      const rangeA = ds.itemA?.range || [3, 7];
      const rangeB = ds.itemB?.range || [3, 7];
      
      // Ensure counts are different to have a clear 'more likely' answer
      do {
        countA = Math.floor(Math.random() * (rangeA[1] - rangeA[0] + 1)) + rangeA[0];
        countB = Math.floor(Math.random() * (rangeB[1] - rangeB[0] + 1)) + rangeB[0];
      } while (countA === countB);

      const items = [];
      const width = ds.patch_width || 300;
      const height = ds.patch_height || 200;
      const marbleSize = 45;

      const generateMarbles = (color, count) => {
        for (let i = 0; i < count; i++) {
          items.push({
            id: `m-${color}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            color: color,
            top: Math.floor(Math.random() * (height - marbleSize)),
            left: Math.floor(Math.random() * (width - marbleSize))
          });
        }
      };

      generateMarbles(colorA, countA);
      generateMarbles(colorB, countB);
      marbleItems = items;
    }

    const isMatch = countA > countB;
    const correctAnswer = isMatch ? colorA : colorB;
    
    const templateVars = {
      colorA, colorB, countA, countB,
      marble_items: marbleItems,
      correct_answer: correctAnswer
    };

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        ...templateVars 
    };

    inst.parts = hydrateNode(inst.parts || [], templateVars);
    inst.options = hydrateNode(inst.options || [], templateVars);
    inst.solution = hydrateNode(inst.solution || [], templateVars);

    inst.type = 'mcq';
    inst.correctAnswerIndex = isMatch ? 0 : 1;
    inst.correctAnswerText = correctAnswer;
    
    return inst;
  }

  if (logic === 'spinner_probability_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    const colorPool = [
      { name: 'blue', hex: '#00CCFF' },
      { name: 'pink', hex: '#F06292' },
      { name: 'orange', hex: '#FF9800' },
      { name: 'green', hex: '#4CAF50' },
      { name: 'yellow', hex: '#FFEB3B' },
      { name: 'white', hex: '#FFFFFF' },
      { name: 'purple', hex: '#9C27B0' }
    ];

    let colorA, colorB, weightA, weightB;

    if (overrideVariables && overrideVariables.colorA) {
      // Re-hydration logic
      const findColor = (name) => colorPool.find(c => c.name === name) || { name, hex: '#ccc' };
      colorA = typeof overrideVariables.colorA === 'object' ? overrideVariables.colorA : findColor(overrideVariables.colorA);
      colorB = typeof overrideVariables.colorB === 'object' ? overrideVariables.colorB : findColor(overrideVariables.colorB);
      weightA = Number(overrideVariables.weightA);
      weightB = Number(overrideVariables.weightB);
      // Optional 3rd color
      if (overrideVariables.colorC) {
        const colorC = typeof overrideVariables.colorC === 'object' ? overrideVariables.colorC : findColor(overrideVariables.colorC);
        const weightC = Number(overrideVariables.weightC);
        // Special multi-color handling if needed, but for now we prioritize 2-color logic
      }
    } else {
      const shuffled = [...colorPool].sort(() => Math.random() - 0.5);
      colorA = shuffled[0];
      colorB = shuffled[1];
      const colorC = shuffled[2];

      const numColors = Math.random() > 0.7 ? 3 : 2; // 30% chance for 3 colors

      if (numColors === 2) {
        const portionTypes = [[1, 3], [2, 2], [3, 1], [3, 5], [4, 4]];
        const portions = portionTypes[Math.floor(Math.random() * portionTypes.length)];
        weightA = portions[0];
        weightB = portions[1];
      } else {
        const portionTypes = [[2, 2, 2], [1, 1, 2], [2, 1, 1], [4, 2, 2]];
        const portions = portionTypes[Math.floor(Math.random() * portionTypes.length)];
        weightA = portions[0];
        weightB = portions[1];
        const weightC = portions[2];
        
        const weights = [weightA, weightB, weightC];
        const maxWeight = Math.max(...weights);
        const winners = weights.filter(w => w === maxWeight);
        
        const spinnerSlices = [
          { weight: weightA, color: colorA.hex },
          { weight: weightB, color: colorB.hex },
          { weight: weightC, color: colorC.hex }
        ];

        const isEqual = winners.length === 3;
        const startRotation = Math.floor(Math.random() * 360);
        const templateVars = {
          colorA: colorA.name, colorB: colorB.name, colorC: colorC.name,
          weightA, weightB, weightC,
          totalWeight: weightA + weightB + weightC,
          spinner_slices: spinnerSlices,
          correct_answer: isEqual ? 'neither' : (weightA === maxWeight ? colorA.name : (weightB === maxWeight ? colorB.name : colorC.name)),
          equal_text: isEqual 
            ? `neither; ${colorA.name}, ${colorB.name}, and ${colorC.name} are equally likely`
            : `neither; ${colorA.name} and ${colorB.name} are equally likely`,
          start_rotation: startRotation
        };

        inst.adaptiveConfig.variables = { ...templateVars };
        inst.parts = hydrateNode(inst.parts || [], templateVars);
        inst.options = hydrateNode(inst.options || [], templateVars);
        inst.solution = hydrateNode(inst.solution || [], templateVars);
        inst.type = 'mcq';
        
        // Options for 3 colors
        inst.options = [
          { label: colorA.name, content: colorA.name },
          { label: colorB.name, content: colorB.name },
          { label: colorC.name, content: colorC.name },
          { label: templateVars.equal_text, content: templateVars.equal_text }
        ];

        if (isEqual) inst.correctAnswerIndex = 3;
        else if (winners.length > 1) inst.correctAnswerIndex = 3; // Mixed equal cases
        else {
          const winningIdx = weights.indexOf(maxWeight);
          inst.correctAnswerIndex = winningIdx;
        }
        inst.correctAnswerText = templateVars.correct_answer;
        return inst;
      }
    }

    const totalWeight = weightA + weightB;
    const isEqual = weightA === weightB;
    const isAMore = weightA > weightB;
    
    let correctAnswer;
    if (isEqual) {
      correctAnswer = 'neither';
    } else {
      correctAnswer = isAMore ? colorA.name : colorB.name;
    }

    const spinnerSlices = [
      { weight: weightA, color: colorA.hex },
      { weight: weightB, color: colorB.hex }
    ];

    const templateVars = {
      colorA: colorA.name,
      colorB: colorB.name,
      weightA,
      weightB,
      totalWeight,
      spinner_slices: spinnerSlices,
      correct_answer: correctAnswer,
      equal_text: `neither; ${colorA.name} and ${colorB.name} are equally likely`,
      comparison_word: isEqual ? 'equal to' : (isAMore ? 'greater than' : 'less than'),
      correct_answer_text: isEqual ? 'equally likely' : `more likely for the spinner to land on ${correctAnswer}`
    };

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        ...templateVars 
    };

    inst.parts = hydrateNode(inst.parts || [], templateVars);
    inst.options = hydrateNode(inst.options || [], templateVars);
    inst.solution = hydrateNode(inst.solution || [], templateVars);

    inst.type = 'mcq';
    if (isEqual) {
      inst.correctAnswerIndex = 2; // "neither" is always 3rd option in template
    } else {
      inst.correctAnswerIndex = isAMore ? 0 : 1;
    }
    inst.correctAnswerText = correctAnswer;
    
    return inst;
  }
  if (logic === 'spinner_description_v1') {
    const config = inst.adaptiveConfig || {};
    
    const colorPool = [
      { name: 'blue', hex: '#00CCFF' },
      { name: 'pink', hex: '#F06292' },
      { name: 'orange', hex: '#FF9800' },
      { name: 'green', hex: '#4CAF50' },
      { name: 'yellow', hex: '#FFEB3B' },
      { name: 'white', hex: '#FFFFFF' },
      { name: 'purple', hex: '#9C27B0' }
    ];

    let targetColor, otherColor, targetWeight, totalWeight;

    if (overrideVariables && overrideVariables.targetColor) {
      const findColor = (name) => colorPool.find(c => c.name === name) || { name, hex: '#ccc' };
      targetColor = typeof overrideVariables.targetColor === 'object' ? overrideVariables.targetColor : findColor(overrideVariables.targetColor);
      otherColor = typeof overrideVariables.otherColor === 'object' ? overrideVariables.otherColor : findColor(overrideVariables.otherColor);
      targetWeight = Number(overrideVariables.targetWeight);
      totalWeight = Number(overrideVariables.totalWeight);
    } else {
      const shuffled = [...colorPool].sort(() => Math.random() - 0.5);
      targetColor = shuffled[0];
      otherColor = shuffled[1];

      // Randomize the total weight (e.g. 100 for percentage-like precision)
      totalWeight = 100;
      
      const scenarioType = Math.floor(Math.random() * 4); // 0: Impossible, 1: Unlikely, 2: Likely, 3: Certain
      
      if (scenarioType === 0) {
        targetWeight = 0;
      } else if (scenarioType === 3) {
        targetWeight = 100;
      } else if (scenarioType === 1) {
        // Unlikely: between 5% and 45%
        targetWeight = Math.floor(Math.random() * 40) + 5;
      } else {
        // Likely: between 55% and 95%
        targetWeight = Math.floor(Math.random() * 40) + 55;
      }
    }

    let description;
    if (targetWeight === 0) description = 'impossible';
    else if (targetWeight === totalWeight) description = 'certain';
    else if (targetWeight > totalWeight / 2) description = 'likely';
    else if (targetWeight < totalWeight / 2) description = 'unlikely';
    else description = 'even chance'; // Handling the 50/50 case just in case

    // Random rotation for the whole spinner (0 to 360 degrees)
    const startRotation = Math.floor(Math.random() * 360);

    const spinnerSlices = [];
    if (targetWeight > 0) {
      spinnerSlices.push({ weight: targetWeight, color: targetColor.hex });
    }
    if (totalWeight - targetWeight > 0) {
      spinnerSlices.push({ weight: totalWeight - targetWeight, color: otherColor.hex });
    }

    const templateVars = {
      targetColor: targetColor.name,
      otherColor: otherColor.name,
      targetWeight,
      totalWeight,
      spinner_slices: spinnerSlices,
      correct_answer: description,
      start_rotation: startRotation
    };

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        ...templateVars 
    };

    inst.parts = hydrateNode(inst.parts || [], templateVars);
    inst.options = hydrateNode(inst.options || [], templateVars);
    inst.solution = hydrateNode(inst.solution || [], templateVars);

    inst.type = 'mcq';
    const options = ['certain', 'likely', 'unlikely', 'impossible'];
    inst.correctAnswerIndex = options.indexOf(description);
    if (inst.correctAnswerIndex === -1 && description === 'even chance') {
        // Fallback for even chance if it appears
        inst.correctAnswerIndex = 1; // Mark as likely or add option
    }
    inst.correctAnswerText = description;
    
    return inst;
  }

  if (logic === 'division_journey_v1') {
    const { generateDivisionJourney } = require('@/lib/practice/generators/math/divisionJourneyGenerator');
    const generated = generateDivisionJourney();
    const templateVars = overrideVariables || generated.variables;

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        ...templateVars 
    };

    // DEEP RECOVERY: Find parts anywhere they might be hiding
    const rawParts = (Array.isArray(inst.parts) && inst.parts.length > 0) 
        ? inst.parts 
        : (inst.data_source?.parts || inst.adaptiveConfig?.data_source?.parts || []);
    
    inst.parts = hydrateNode(rawParts, templateVars);
    
    // Ensure data_source exists and is hydrated
    const ds = inst.data_source || inst.adaptiveConfig?.data_source || {};
    inst.data_source = hydrateNode(ds, templateVars);
    inst.data_source.parts = inst.parts; // Keep them synced
    
    // Explicitly hydrate question text for the UI
    inst.questionText = hydrateNode(inst.questionText || '', templateVars);

    // Deeply hydrate answers for the validation engine
    const rawAnswers = inst.answers || inst.data_source?.answers || inst.adaptiveConfig?.data_source?.answers || {};
    if (Object.keys(rawAnswers).length > 0) {
       const hydratedAnswers = hydrateNode(rawAnswers, templateVars);
       inst.correctAnswerText = JSON.stringify(hydratedAnswers);
    }

    inst.solution = hydrateNode(inst.solution || [], templateVars);
    return inst;
  }

  if (logic === 'place_value_template_v1' || logic === 'random_digit_selection' || logic === 'indian_system_generator') {
    let number, targetDigit, placeName, multiplier, correctValue, pos, uniqueInstantiatedAskTypeForGenerator;

    if (overrideVariables) {
      // Re-hydrate an exact instance from a previous state (like answering a question)
      number = overrideVariables.number;
      targetDigit = overrideVariables.target_digit;
      placeName = overrideVariables.place_name;
      multiplier = overrideVariables.place_multiplier;
      correctValue = overrideVariables.value || (targetDigit * multiplier);
      // Force correctValue to be a number if possible, to avoid template loop
      if (typeof correctValue === 'string' && correctValue.includes('{')) {
        correctValue = Number(targetDigit) * Number(multiplier);
      }
      uniqueInstantiatedAskTypeForGenerator = overrideVariables.ask_type;

      // Guess pos for underlining if not saved (works since digits are currently unique)
      pos = String(number).indexOf(String(targetDigit));
    } else {
      // Setup metadata first so we know what kind of number to generate
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999], exclude_zeros: true };
      const templateId = question.template_id || inst.template_id || inst.adaptiveConfig?.template_id;
      uniqueInstantiatedAskTypeForGenerator = dataSource.ask_type || inst.adaptiveConfig?.ask_type;

      // Auto-detect ask_type based on template_id if not specified
      if (!uniqueInstantiatedAskTypeForGenerator) {
        const content = String(question.parts?.[0]?.content || '').toLowerCase();
        if (templateId?.includes('word_to_digits')) {
          uniqueInstantiatedAskTypeForGenerator = 'digits';
        } else if (templateId?.includes('which_place') || content.includes('which place')) {
          uniqueInstantiatedAskTypeForGenerator = 'place_name';
        } else if (content.includes('what digit') || content.includes('which digit')) {
          uniqueInstantiatedAskTypeForGenerator = 'digit';
        }
      }

      // Generate a new set of numbers dynamically
      const range = dataSource.range || [1000, 9999];
      const min = range[0] || 1000;
      const max = range[1] || 9999;
      const step = Math.max(1, dataSource.step || 1);
      const uniqueDigits = dataSource.unique_digits || uniqueInstantiatedAskTypeForGenerator === 'place_name' || uniqueInstantiatedAskTypeForGenerator === 'digit';
      const maxAttempts = 50;
      let attempt = 0;

      do {
        number = Math.floor(Math.random() * ((max - min) / step + 1)) * step + min;
        const numStr = String(number);
        const uniqueChars = new Set(numStr.split('')).size;

        if (!uniqueDigits || uniqueChars === numStr.length) break;
        attempt++;
      } while (attempt < maxAttempts);

      const numStr = String(number);
      const digitsArr = numStr.split('').map(Number);
      const targetLength = numStr.length;

      const placeMultipliers = [1000000, 100000, 10000, 1000, 100, 10, 1].slice(-targetLength);
      const placeNamesMap = {
        1000000: "Ten Lakhs", 100000: "Lakhs", 10000: "Ten Thousands",
        1000: "Thousands", 100: "Hundreds", 10: "Tens", 1: "Ones"
      };

      // Filter allowed positions based on min_multiplier constraint or exclude_zeros
      let validIndices = [];
      const minMult = dataSource.min_multiplier || 1;
      for (let i = 0; i < digitsArr.length; i++) {
        const mult = placeMultipliers[i];
        if (mult >= minMult) {
          if (!dataSource.exclude_zeros || digitsArr[i] !== 0) {
            validIndices.push(i);
          }
        }
      }

      if (validIndices.length === 0) validIndices = digitsArr.map((_, i) => i);

      pos = validIndices[Math.floor(Math.random() * validIndices.length)];
      targetDigit = digitsArr[pos];
      multiplier = placeMultipliers[pos];
      placeName = placeNamesMap[multiplier];
      correctValue = targetDigit * multiplier;
    }

    // Save variables for hydration
    inst.adaptiveConfig.variables = {
      ...inst.adaptiveConfig.variables,
      number: number,
      target_digit: targetDigit,
      place_name: placeName,
      place_multiplier: multiplier,
      value: correctValue,
      ask_type: uniqueInstantiatedAskTypeForGenerator
    };

    // Add explicitly mapped formatted numbers using the Indian Numbering System ('en-IN')
    const templateVars = {
      ...inst.adaptiveConfig.variables,
      number: number,
      value: correctValue,
      number_formatted: Number(number).toLocaleString('en-IN'),
      value_formatted: Number(correctValue).toLocaleString('en-IN'),
      place_multiplier_formatted: Number(multiplier).toLocaleString('en-IN'),

      // Helper aliases for better template readability
      target_place: placeName,
      correct_digit: targetDigit,
      is_ones_target: String(multiplier === 1),
      is_tens_target: String(multiplier === 10),
      is_hundreds_target: String(multiplier === 100),
      is_thousands_target: String(multiplier === 1000)
    };

    // Calculate expanded form components (only non-zero digits)
    const expandedParts = [];
    const expandedWithInput = [];

    // Iterate from biggest place to smallest
    const numDigits = String(number).length;
    const places = [1000000, 100000, 10000, 1000, 100, 10, 1].slice(-numDigits);
    const digitsInNum = String(number).split('').map(Number);

    for (let i = 0; i < digitsInNum.length; i++) {
      if (digitsInNum[i] !== 0) {
        const val = digitsInNum[i] * places[i];
        const fmtVal = val.toLocaleString('en-IN');
        expandedParts.push(fmtVal);

        if (places[i] === multiplier) {
          // This is the place we are asking for
          expandedWithInput.push(`{ans}`);
        } else {
          expandedWithInput.push(fmtVal);
        }
      }
    }

    const expandedBefore = [];
    const expandedAfter = [];
    let foundInput = false;

    for (let i = 0; i < digitsInNum.length; i++) {
      if (digitsInNum[i] !== 0) {
        const val = digitsInNum[i] * places[i];
        const fmtVal = val.toLocaleString('en-IN');

        if (places[i] === multiplier) {
          foundInput = true;
        } else {
          if (!foundInput) expandedBefore.push(fmtVal);
          else expandedAfter.push(fmtVal);
        }
      }
    }

    templateVars.expanded_form_before = expandedBefore.length > 0 ? expandedBefore.join(' + ') + ' + ' : '';
    templateVars.expanded_form_after = expandedAfter.length > 0 ? ' + ' + expandedAfter.join(' + ') : '';
    templateVars.expanded_form = expandedParts.join(' + ');

    // Persist ALL generated variables to the question instance
    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars
    };

    // Automatically inject {digit_1} (Ones), {digit_2} (Tens), etc into templateVars
    const numStr = String(number);
    for (let i = 0; i < numStr.length; i++) {
      const placeIndex = numStr.length - i; // length 5, i=0 -> digit_5
      templateVars[`digit_${placeIndex}`] = numStr[i];
    }
    // Fill in upper digits with blank if they are missing (to avoid {digit_4} showing up for 3-digit numbers)
    for (let i = numStr.length + 1; i <= 7; i++) {
      templateVars[`digit_${i}`] = '';
    }

    // Generate number_underlined (e.g. 1<u>2</u>34)
    // We'll use LaTeX \underline if it's within a math block, or just <u> if supported.
    // Given the renderer's LaTeX support, let's provide a few variants.
    const underlinedArr = numStr.split('');
    const posInStr = pos; // pos is index in slice(-targetLength)
    underlinedArr[posInStr] = `\\underline{${underlinedArr[posInStr]}}`;
    templateVars.number_underlined = `\\(${underlinedArr.join('')}\\)`;

    // Also provide a simple underline variant if requested
    templateVars.target_digit_underlined = `\\underline{${targetDigit}}`;

    // Hydrate options if they exist (crucial for MCQ questions)
    if (question.options) {
      inst.options = hydrateNode(question.options, templateVars);
    }

    // Hydrate Parts (the main prompt) if they haven't been hydrated yet on the frontend
    inst.parts = hydrateNode(question.parts || [], templateVars);

    // Hydrate Solution
    if (question.solution) {
      // Sometimes solution is passed as a stringified json
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    // Hydrate Scaffold dynamically 
    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
        inst.adaptiveConfig.scaffold.id = (inst.template_id || inst.adaptiveConfig?.template_id || 'v1') + '_scaffold';
      }
      if (!inst.adaptiveConfig.scaffold.trigger_on) {
        inst.adaptiveConfig.scaffold.trigger_on = ["place_name_error"];
      }
    }

    let ansValue;
    if (uniqueInstantiatedAskTypeForGenerator === 'place_name') {
      ansValue = placeName;
    } else if (uniqueInstantiatedAskTypeForGenerator === 'digit') {
      ansValue = String(targetDigit);
    } else if (uniqueInstantiatedAskTypeForGenerator === 'whole_number' || uniqueInstantiatedAskTypeForGenerator === 'digits' || uniqueInstantiatedAskTypeForGenerator === 'number') {
      ansValue = String(number);
      // Also update value in templateVars to be the whole number if we are asking for it
      templateVars.value = number;
      templateVars.value_formatted = Number(number).toLocaleString('en-IN');
      // Update inst.parts/solution if they were already hydrated with the single digit value
      inst.parts = hydrateNode(question.parts || [], templateVars);
      if (question.solution) {
        let parsedSolution = question.solution;
        if (typeof parsedSolution === 'string') {
          try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
        }
        inst.solution = hydrateNode(parsedSolution, templateVars);
      }
    } else {
      ansValue = String(correctValue);
    }

    // FINAL SYNC before hydration: Ensure any variables added late are persisted
    const allVars = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars,
      ans_value_generated: ansValue
    };
    inst.adaptiveConfig.variables = allVars;

    // Now use allVars for the hydration calls in this block
    const finalTemplateVars = allVars;
    // Switch to MCQ if asking for place name (usually involves choosing from Thousands, Hundreds, etc)
    if (uniqueInstantiatedAskTypeForGenerator === 'place_name' || (question.options?.length > 0 && uniqueInstantiatedAskTypeForGenerator !== 'digits' && uniqueInstantiatedAskTypeForGenerator !== 'whole_number')) {
      inst.type = 'mcq';
      // Auto-calculate the correct index for MCQ
      if (inst.options?.length > 0) {
        // First, check if any option explicitly says it's correct (via template variable)
        const explicitIdx = inst.options.findIndex(opt => {
          const isCorr = opt.is_correct ?? opt.isCorrect;
          return isExplicitlyCorrect(isCorr);
        });

        if (explicitIdx >= 0) {
          inst.correctAnswerIndex = explicitIdx;
        } else {
          // Fallback to text matching
          inst.correctAnswerIndex = inst.options.findIndex(opt => {
            const content = String(typeof opt === 'string' ? opt : (opt.content || '')).trim().toLowerCase();
            return content === String(ansValue).toLowerCase() || content === String(placeName).toLowerCase() || content === String(correctValue).toLowerCase();
          });
        }

        // For MCQs, the ansValue should be the text of the correct option for display purposes
        if (inst.correctAnswerIndex >= 0) {
          const correctOpt = inst.options[inst.correctAnswerIndex];
          ansValue = typeof correctOpt === 'string' ? correctOpt : (correctOpt.content || ansValue);
        }
      }
    }

    const finalCorrectAnswer = (question.correctAnswerText || question.correct_answer_text)
      ? hydrateNode(question.correctAnswerText || question.correct_answer_text, finalTemplateVars)
      : JSON.stringify({ ans_value: ansValue });

    inst.correctAnswerText = finalCorrectAnswer;
    inst.correct_answer_text = finalCorrectAnswer;
    inst.adaptiveConfig.correctAnswerText = finalCorrectAnswer;

    // Redundant but safe: Ensure parts and solution are hydrated with the FINAL vars
    inst.parts = hydrateNode(question.parts || [], finalTemplateVars);
    if (question.solution) {
      let parsedSol = question.solution;
      if (typeof parsedSol === 'string') try { parsedSol = JSON.parse(parsedSol); } catch (e) { }
      inst.solution = hydrateNode(parsedSol, finalTemplateVars);
    }
  }


  if (logic === 'count_currency_notes_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [1000, 9999];
    const noteValue = dataSource.note_value || 10; // Default to ₹10 notes
    
    let totalAmount;
    if (overrideVariables) {
      totalAmount = Number(overrideVariables.total_amount);
    } else {
      // Generate a random amount within range
      totalAmount = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    // Calculation logic: How many notes of X fit into the total
    const totalNotes = Math.floor(totalAmount / noteValue);
    const remainder = totalAmount % noteValue;
    
    const amountFmt = totalAmount.toLocaleString('en-IN');
    const noteFmt = noteValue.toLocaleString('en-IN');

    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        total_amount: totalAmount,
        total_notes: totalNotes,
        remainder: remainder,
        note_value: noteValue,
        amount_fmt: amountFmt,
        note_fmt: noteFmt
    };

    inst.parts = [
      { 
        type: 'text', 
        content: `How many notes of **₹${noteFmt}** are there in **₹${amountFmt}**?`, 
        isVertical: true 
      },
      { 
        type: 'pair', 
        parts: [
          { type: 'input', id: 'ans', size: 'medium' },
          { type: 'text', content: ` notes` }
        ]
      }
    ];

    // Solution explanation based on the place value logic
    inst.solution = [
      { type: 'text', content: `### Step-by-Step Solution`, isVertical: true },
      { type: 'text', content: `To find how many ₹${noteFmt} notes are in ₹${amountFmt}, we look at the **Tens** place and everything to its left.`, isVertical: true },
      { 
        type: 'text', 
        content: `| Thousands | Hundreds | Tens | Ones |\n| :---: | :---: | :---: | :---: |\n| ${Math.floor(totalAmount/1000)} | ${Math.floor((totalAmount%1000)/100)} | **${Math.floor((totalAmount%100)/10)}** | ${totalAmount%10} |`, 
        isVertical: true 
      },
      { type: 'text', content: `1. **Identify the place value:** ₹${noteFmt} notes correspond to the Tens place.`, isVertical: true },
      { type: 'text', content: `2. **Include everything to the left:** We count all thousands, hundreds, and tens together.`, isVertical: true },
      { type: 'text', content: `3. **Calculate:** There are **${totalNotes}** tens in the number ${totalAmount}.`, isVertical: true },
      { type: 'text', content: `### Final Answer`, isVertical: true },
      { type: 'text', content: `There are **${totalNotes}** notes of ₹${noteFmt} in ₹${amountFmt}. (The remaining ₹${remainder} is not enough for another note).`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ ans: String(totalNotes) });
    
    return inst;
  }

 if (logic === 'classification_random_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    let numberDisplay, isNatural, rawNumber;

    if (overrideVariables) {
      numberDisplay = overrideVariables.numberDisplay;
      isNatural = overrideVariables.isNatural;
    } else {
      const types = ['whole', 'fraction', 'decimal'];
      const chosenType = types[Math.floor(Math.random() * types.length)];

      if (chosenType === 'whole') {
        const val = Math.floor(Math.random() * 20); 
        rawNumber = String(val);
        // Using \text{} for consistent font sizing in LaTeX blocks
        numberDisplay = `$${val}$`; 
        isNatural = val > 0; 
      } else if (chosenType === 'fraction') {
        const whole = Math.floor(Math.random() * 5) + 1;
        rawNumber = `${whole} 1/2`;
        // LaTeX Mixed Fraction formatting
        numberDisplay = `$${whole} \\frac{1}{2}$`;
        isNatural = false;
      } else {
        const dec = (Math.random() * 10).toFixed(1);
        rawNumber = String(dec);
        numberDisplay = `$${dec}$`;
        isNatural = false;
      }
    }

    const targetSet = "natural number";
    const setDefinition = "counting numbers: $1, 2, 3, \\dots$";

    inst.adaptiveConfig.variables = { numberDisplay, isNatural, targetSet, rawNumber };

    inst.parts = [
      { 
        type: 'text', 
        content: `Is ${numberDisplay} a **${targetSet}**?`, 
        isVertical: true,
        style: { fontSize: '24px', marginBottom: '20px' }
      }
    ];

    inst.options = [
      { label: "yes", content: "yes" },
      { label: "no", content: "no" }
    ];

    inst.instructionalFeedback = {
      remember: {
        title: "remember",
        content: `**Natural numbers** are ${setDefinition}.`
      },
      solve: {
        title: "solve",
        content: `Natural numbers are the numbers you use for counting (like $1, 2, 3$). Since ${numberDisplay} is ${isNatural ? 'a counting number' : 'not a counting number'}, it is ${isNatural ? 'a' : 'not a'} natural number.`
      }
    };

    inst.type = 'mcq';
    inst.correctAnswerIndex = isNatural ? 0 : 1;
    inst.correctAnswerText = isNatural ? "yes" : "no";

    return inst;
  }


  if (logic === 'universal_number_classifier_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    // Target set from JSON
    const targetSet = ds.target_set || "whole number";
    
    // Data Pools
    const pools = {
      natural: ["5", "12", "100", "7", "42"],
      whole: ["0"], 
      integer: ["-3", "-10", "-25", "-1"],
      rational: ["\\frac{1}{9}", "\\frac{3}{5}", "6.136", "0.75", "\\frac{8}{9}"],
      irrational: ["\\pi", "\\sqrt{2}", "\\sqrt{3}"]
    };

    let options = [];
    let correctValue;

    if (overrideVariables) {
      options = overrideVariables.options;
      correctValue = overrideVariables.correctValue;
    } else {
      // 1. Pick Correct Answer based on targetSet
      const typeKey = targetSet.split(' ')[0]; // 'natural', 'whole', etc.
      const correctPool = pools[typeKey];
      correctValue = correctPool[Math.floor(Math.random() * correctPool.length)];

      // 2. STRICTOR DISTRACTOR LOGIC (The Fix)
      // We must avoid picking numbers that technically belong to the targetSet
      let forbiddenKeys = [typeKey];
      
      if (targetSet === "whole number") forbiddenKeys.push("natural");
      if (targetSet === "integer") forbiddenKeys.push("natural", "whole");
      if (targetSet === "rational number") forbiddenKeys.push("natural", "whole", "integer");

      let availableDistractors = [];
      Object.keys(pools).forEach(key => {
        if (!forbiddenKeys.includes(key)) {
          availableDistractors = [...availableDistractors, ...pools[key]];
        }
      });
      
      const shuffled = availableDistractors.sort(() => 0.5 - Math.random());
      options = [correctValue, ...shuffled.slice(0, 3)].sort(() => 0.5 - Math.random());
    }

    inst.adaptiveConfig.variables = { options, correctValue, targetSet };

    // UI Structure
    inst.parts = [
      { 
        type: 'text', 
        content: `Which of the following is a **${targetSet}**?`, 
        isVertical: true,
        style: { fontSize: '24px', marginBottom: '30px', textAlign: 'center' }
      }
    ];

    inst.options = options.map(opt => ({
      label: opt.toString(),
      content: `$${opt}$`
    }));

    // Improved Solution with Rules
    const definitions = {
      "natural number": "counting numbers starting from $1$.",
      "whole number": "counting numbers that include zero ($0$).",
      "integer": "whole numbers and their negative opposites.",
      "rational number": "numbers that can be written as a fraction.",
      "irrational number": "numbers that cannot be written as simple fractions."
    };

    inst.solution = [
      { type: 'text', content: `### Let's Identify the ${targetSet}`, isVertical: true },
      { type: 'text', content: `A **${targetSet}** is ${definitions[targetSet]}`, isVertical: true },
      { type: 'text', content: `### Analysis of Choices`, isVertical: true },
      { type: 'text', content: `- $${correctValue}$ is the only choice that fits this exact group.\n- Other choices like fractions, decimals, or roots belong to different families.`, isVertical: true }
    ];

    inst.type = 'mcq';
    inst.correctAnswerIndex = options.indexOf(correctValue);
    inst.correctAnswerText = String(correctValue);

    return inst;
  }

if (logic === 'digit_arrangement_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    const digitCount = ds.digit_count || 3;
    const goal = ds.goal || "greatest"; 

    let digits;
    if (overrideVariables) {
      digits = overrideVariables.digits;
    } else {
      digits = [];
      while (digits.length < digitCount) {
        let d = Math.floor(Math.random() * 10);
        if (!digits.includes(d)) digits.push(d);
      }
    }

    // Use a copy to avoid mutating the original digits array
    let sortedDesc = [...digits].sort((a, b) => b - a);
    const greatestNum = parseInt(sortedDesc.join(''));
    
    let sortedAsc = [...digits].sort((a, b) => a - b);
    if (sortedAsc[0] === 0 && sortedAsc.length > 1) {
      for (let i = 1; i < sortedAsc.length; i++) {
        if (sortedAsc[i] !== 0) {
          [sortedAsc[0], sortedAsc[i]] = [sortedAsc[i], sortedAsc[0]];
          break;
        }
      }
    }
    const smallestNum = parseInt(sortedAsc.join(''));

    const correctValue = goal === "greatest" ? greatestNum : smallestNum;
    
    // Improved Distractor Logic using Set to ensure uniqueness
    const distractorSet = new Set();
    distractorSet.add(goal === "greatest" ? smallestNum : greatestNum);
    
    let attempts = 0;
    while (distractorSet.size < 3 && attempts < 50) {
      attempts++;
      let shuffled = [...digits].sort(() => Math.random() - 0.5).join('');
      let val = parseInt(shuffled);
      if (val !== correctValue) {
        distractorSet.add(val);
      }
    }

    const finalOptions = [correctValue, ...Array.from(distractorSet)].slice(0, 4);
    // Sort deterministically: Even numbers first, then Odd numbers
    finalOptions.sort((a, b) => {
      if (a % 2 === 0 && b % 2 !== 0) return -1;
      if (a % 2 !== 0 && b % 2 === 0) return 1;
      return a - b; // Numerical sort within the same group
    });

    inst.adaptiveConfig.variables = { digits, goal, correctValue, options: finalOptions };

    inst.parts = [
      { 
        type: 'text', 
        content: `What is the **${goal}** whole number you can make using all the following digits?`, 
        isVertical: true,
        style: { fontSize: '22px', fontWeight: 'bold' }
      },
      {
        type: 'text',
        content: `### ${digits.join('  ')}`, 
        isVertical: true,
        style: { textAlign: 'center', fontSize: '32px', margin: '20px 0', letterSpacing: '10px' }
      }
    ];

    inst.options = finalOptions.map(opt => ({
      label: opt.toString(),
      content: opt.toString() 
    }));

    inst.solution = [
      { type: 'text', content: `### Step-by-Step Solution`, isVertical: true },
      { 
        type: 'text', 
        content: goal === "greatest" 
          ? `To make the **greatest** number, arrange digits from **largest to smallest**: \n**${sortedDesc.join(' > ')}**`
          : `To make the **smallest** number, arrange digits from **smallest to largest**: \n**${sortedAsc.join(' < ')}**`,
        isVertical: true 
      },
      { type: 'text', content: `### Final Result`, isVertical: true },
      { type: 'text', content: `The ${goal} number is **${correctValue}**.`, isVertical: true }
    ];

    inst.type = 'mcq';
    inst.correctAnswerIndex = finalOptions.indexOf(correctValue);
    inst.correctAnswerText = String(correctValue);

    return inst;
  }

  
  if (logic === 'regrouping_multi_blank_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    const range = ds.range || [1000, 9999];
    
    let num;
    if (overrideVariables) {
      num = Number(overrideVariables.num);
    } else {
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    // Standard extraction of digits
    const th = Math.floor(num / 1000);
    const h = Math.floor((num % 1000) / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;

    inst.adaptiveConfig.variables = { num, th, h, t, o };

    // Define which digits are blanks based on JSON (e.g., ["th", "h"])
    const blanks = ds.blanks || ["th", "h", "t", "o"]; 
    
    const getVal = (val, key) => blanks.includes(key) ? `[[ans_${key}]]` : `${val}`;

    inst.parts = [
      { type: 'text', content: "Write the number in standard place value form:", isVertical: true },
      { 
        type: 'text', 
        content: `### ${num.toLocaleString('en-IN')} = ${getVal(th, 'th')} Thousands + ${getVal(h, 'h')} Hundreds + ${getVal(t, 't')} Tens + ${getVal(o, 'o')} Ones`, 
        isVertical: true,
        style: { marginTop: '20px', fontSize: '22px' } 
      }
    ];

    inst.solution = [
      { type: 'text', content: `### How to find Standard Form`, isVertical: true },
      { type: 'text', content: `Place the number **${num.toLocaleString('en-IN')}** into a place value chart:`, isVertical: true },
      { 
        type: 'text', 
        content: `| Thousands | Hundreds | Tens | Ones |\n| :---: | :---: | :---: | :---: |\n| **${th}** | **${h}** | **${t}** | **${o}** |`, 
        isVertical: true 
      },
      { type: 'text', content: `### Final Answer`, isVertical: true },
      { type: 'text', content: `**${th}** Thousands + **${h}** Hundreds + **${t}** Tens + **${o}** Ones`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    const finalAnswers = {};
    blanks.forEach(key => {
      if (key === 'th') finalAnswers.ans_th = String(th);
      if (key === 'h') finalAnswers.ans_h = String(h);
      if (key === 't') finalAnswers.ans_t = String(t);
      if (key === 'o') finalAnswers.ans_o = String(o);
    });
    inst.correctAnswerText = JSON.stringify(finalAnswers);
    
    return inst;
  }


  if (logic === 'expanded_form_universal_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    const range = ds.range || [100, 999];
    const mode = ds.mode || 'to_expanded'; // 'to_expanded' or 'to_number'
    
    let num;
    if (overrideVariables) {
      num = Number(overrideVariables.num);
    } else {
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    // Breakdown values
    const th = Math.floor(num / 1000) * 1000;
    const h = Math.floor((num % 1000) / 100) * 100;
    const t = Math.floor((num % 100) / 10) * 10;
    const o = num % 10;

    // Filter out zero places for the equation
    const parts_raw = [
      { val: th, key: 'th', label: 'Thousands' },
      { val: h, key: 'h', label: 'Hundreds' },
      { val: t, key: 't', label: 'Tens' },
      { val: o, key: 'o', label: 'Ones' }
    ].filter(p => p.val > 0 || p.key === 'o');

    inst.adaptiveConfig.variables = { num, th, h, t, o };

    const blanks = ds.blanks || (mode === 'to_number' ? ['num'] : ['h', 't', 'o']);
    
    // Build Question UI
    const equationParts = [];
    if (blanks.includes('num')) {
      equationParts.push({ type: 'input', id: 'ans_num', size: 'small' });
    } else {
      equationParts.push({ type: 'text', content: `**${num.toLocaleString('en-IN')}**` });
    }
    
    equationParts.push({ type: 'text', content: ' = ' });

    parts_raw.forEach((p, idx) => {
      if (blanks.includes(p.key)) {
        equationParts.push({ type: 'input', id: `ans_${p.key}`, size: 'small' });
      } else {
        equationParts.push({ type: 'text', content: `${p.val.toLocaleString('en-IN')}` });
      }
      if (idx < parts_raw.length - 1) equationParts.push({ type: 'text', content: ' + ' });
    });

    inst.parts = [
      { type: 'text', content: mode === 'to_number' ? "Write the number for the expanded form:" : "Write the number in expanded form:", isVertical: true },
      { 
        type: 'pair', 
        parts: equationParts, 
        isVertical: false,
        style: { marginTop: '20px', fontSize: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' } 
      }
    ];

    // Solution Logic
    inst.solution = [
      { type: 'text', content: `### Step-by-Step Breakdown`, isVertical: true },
      { type: 'text', content: `We look at the place value of each digit in **${num.toLocaleString('en-IN')}**:`, isVertical: true },
      { 
        type: 'text', 
        content: parts_raw.map(p => `- ${p.val / (p.val === 0 ? 1 : Math.pow(10, Math.log10(p.val)))} in ${p.label} place = **${p.val.toLocaleString('en-IN')}**`).join('\n'), 
        isVertical: true 
      },
      { type: 'text', content: `### Final Expanded Form`, isVertical: true },
      { type: 'text', content: `**${parts_raw.map(p => p.val).join(' + ')} = ${num}**`, isVertical: true }
    ];

    inst.type = 'fillInTheBlank';
    const finalAnswers = {};
    if (blanks.includes('num')) finalAnswers.ans_num = String(num);
    parts_raw.forEach(p => {
      if (blanks.includes(p.key)) finalAnswers[`ans_${p.key}`] = String(p.val);
    });
    inst.correctAnswerText = JSON.stringify(finalAnswers);
    
    return inst;
  }

  if (logic === 'lcm_journey_v1') {
    let numA, numB;
    if (overrideVariables) {
      numA = overrideVariables.numA;
      numB = overrideVariables.numB;
    } else {
      // Pick two numbers that have a common multiple in first five steps
      const pairs = [[2, 3], [3, 4], [4, 6], [6, 8], [2, 5], [3, 5], [4, 5]];
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      numA = pair[0];
      numB = pair[1];
    }

    const multiplesA = Array.from({ length: 5 }, (_, i) => numA * (i + 1));
    const multiplesB = Array.from({ length: 5 }, (_, i) => numB * (i + 1));
    const commonValues = multiplesA.filter(v => multiplesB.includes(v));
    const lcm = commonValues[0] || (numA * numB); // Fallback to product if none in first 5

    inst.type = 'stepwise';
    inst.question_id = `lcm_step_listing_${Date.now()}`;
    inst.title = "Finding LCM using the Listing Method";
    inst.numbers = [numA, numB];

    inst.steps = [
      {
        step_number: 1,
        type: "input_array",
        instruction: `List the first five multiples of **${numA}**.`,
        placeholder: ["1st", "2nd", "3rd", "4th", "5th"],
        expected_answer: multiplesA,
        feedback: {
          success: `Great! You've got the ${numA}-times table down.`,
          fail: `Remember, multiples are like skip counting: ${numA}, ${numA}+${numA}, ${numA}+${numA}+${numA}...`
        }
      },
      {
        step_number: 2,
        type: "input_array",
        instruction: `Now, list the first five multiples of **${numB}**.`,
        placeholder: ["1st", "2nd", "3rd", "4th", "5th"],
        expected_answer: multiplesB,
        feedback: {
          success: "Perfect! Now let's compare the two lists.",
          fail: `Try the ${numB}-times table: ${numB}, ${numB * 2}, ${numB * 3}...`
        }
      },
      {
        step_number: 3,
        type: "multi_select",
        instruction: "Identify the 'twins'! Which number appears in both lists?",
        ui_layout: "side_by_side_lists",
        // Providing structured data for the UI to render the side-by-side lists
        data_source: {
          list_1: { label: `M${numA}`, values: multiplesA },
          list_2: { label: `M${numB}`, values: multiplesB }
        },
        // In the UI, the user will select from the tokens in the lists.
        // We calculate which values are "twins"
        expected_answer: commonValues,
        feedback: {
          success: `Exactly! ${lcm} is a 'Common Multiple' because it's in both lists.`,
          fail: "Look closely for a number that is exactly the same in both rows."
        }
      },
      {
        step_number: 4,
        type: "single_input",
        instruction: `Since ${lcm} is the very first (smallest) common multiple, what is the LCM?`,
        expected_answer: String(lcm),
        feedback: {
          success: "Boom! You found the Least Common Multiple (LCM)! 🌟",
          fail: "The smallest common multiple you just found is the LCM."
        }
      }
    ];

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      numA, numB, lcm, multiplesA, multiplesB, commonValues
    };
    inst.correctAnswerText = String(lcm);
  }

  if (logic === 'hcf_listing_factors_v1') {
    let numA, numB;
    if (overrideVariables) {
      numA = Number(overrideVariables.numA);
      numB = Number(overrideVariables.numB);
    } else {
      // Pick two numbers with a decent number of factors but not too many
      const pairs = [[12, 18], [24, 36], [30, 42], [20, 30], [28, 42], [16, 24], [15, 25]];
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      numA = pair[0];
      numB = pair[1];
    }

    const getFactors = (n) => {
      const factors = [];
      for (let i = 1; i <= n; i++) {
        if (n % i === 0) factors.push(i);
      }
      return factors;
    };

    const factorsA = getFactors(numA);
    const factorsB = getFactors(numB);
    const commonValues = factorsA.filter(v => factorsB.includes(v));
    const hcf = Math.max(...commonValues);

    const templateVars = {
      numA,
      numB,
      factorsA,
      factorsB,
      factorsA_joined: factorsA.join(', '),
      factorsB_joined: factorsB.join(', '),
      commonFactors: commonValues,
      commonFactors_joined: commonValues.join(', '),
      hcf: String(hcf)
    };

    inst.type = 'stepwise';
    inst.question_id = `hcf_listing_${Date.now()}`;
    inst.title = "Finding HCF using the Listing Method";
    inst.numbers = [numA, numB];

    const steps = [
      {
        step_number: 1,
        type: "input_array",
        instruction: `List all the factors of **${numA}** in ascending order.`,
        placeholder: "Factor",
        expected_answer: factorsA,
        feedback: {
          success: `Correct! Those are all the factors of ${numA}.`,
          fail: `Remember, a factor is a number that divides ${numA} exactly without a remainder.`
        }
      },
      {
        step_number: 2,
        type: "input_array",
        instruction: `Now, list all the factors of **${numB}** in ascending order.`,
        placeholder: "Factor",
        expected_answer: factorsB,
        feedback: {
          success: `Great! You've listed all the factors of ${numB}.`,
          fail: `Check if you missed any numbers that divide ${numB} evenly.`
        }
      },
      {
        step_number: 3,
        type: "multi_select",
        instruction: "Identify the **common factors** that appear in both lists.",
        ui_layout: "side_by_side_lists",
        data_source: {
          list_1: { label: `Factors of ${numA}`, values: factorsA },
          list_2: { label: `Factors of ${numB}`, values: factorsB }
        },
        expected_answer: commonValues,
        feedback: {
          success: `Exactly! ${commonValues.join(', ')} are the factors common to both numbers.`,
          fail: `Look for numbers that are present in both the factor lists above.`
        }
      },
      {
        step_number: 4,
        type: "single_input",
        instruction: `The HCF is the largest of these common factors. What is the **HCF** of ${numA} and ${numB}?`,
        expected_answer: String(hcf),
        feedback: {
          success: `Excellent! The Highest Common Factor (HCF) is ${hcf}. 🌟`,
          fail: `Look at your list of common factors. Which one is the greatest?`
        }
      }
    ];

    inst.parts = [
      {
        type: "text",
        content: `Find the HCF of **${numA}** and **${numB}** by listing their factors.`
      }
    ];

    inst.solution = [
      { type: "paragraph", content: `To find the HCF of ${numA} and ${numB}:` },
      { type: "paragraph", content: `1. **List the factors of ${numA}:** ${factorsA.join(', ')}` },
      { type: "paragraph", content: `2. **List the factors of ${numB}:** ${factorsB.join(', ')}` },
      { type: "paragraph", content: `3. **Common Factors:** The numbers appearing in both lists are ${commonValues.join(', ')}.` },
      { type: "paragraph", content: `4. **Highest Common Factor:** The greatest among these common factors is ${hcf}.` },
      { type: "paragraph", content: `**Hence, HCF(${numA}, {numB}) = ${hcf}.**` }
    ];

    inst.steps = steps;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars
    };
    inst.correctAnswerText = String(hcf);
  }

  if (logic === 'long_division_journey_v1') {
    let numA, numB;
    if (overrideVariables) {
      numA = overrideVariables.dividend;
      numB = overrideVariables.divisor;
    } else {
      // Pick numbers that divide cleanly for 2-digit by 1-digit
      const dividends = [48, 75, 96, 84, 72, 65, 91];
      const divisors = [3, 4, 6, 7];
      numA = dividends[Math.floor(Math.random() * dividends.length)];
      numB = divisors[Math.floor(Math.random() * divisors.length)];
      if (numA < numB) [numA, numB] = [numB, numA];
    }

    const { generateLongDivisionJourney } = require('./longDivisionGenerator');
    const journey = generateLongDivisionJourney(numA, numB);

    inst = {
      ...inst,
      ...journey,
      type: 'stepwise',
      logic_type: 'long_division_journey_v1',
      adaptiveConfig: {
        ...inst.adaptiveConfig,
        variables: { dividend: numA, divisor: numB, ...journey.final_result }
      },
      correctAnswerText: String(journey.final_result.quotient)
    };
  }

  if (logic === 'arithmetic_journey_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    const type = ds.type || 'addition'; 
    const allowCarry = ds.carry !== false;
    const range = ds.range || [1000, 9999];
    
    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      if (type === 'multiplication') {
        const r1 = ds.range_top || [100, 999];
        const r2 = ds.range_bottom || [2, 9];
        n1 = Math.floor(Math.random() * (r1[1] - r1[0] + 1)) + r1[0];
        n2 = Math.floor(Math.random() * (r2[1] - r2[0] + 1)) + r2[0];
        
        if (!allowCarry) {
          // Simplistic "no carry" for multi: digits * single digit sum < 10
          // e.g. 123 * 3 -> 1*3=3, 2*3=6, 3*3=9.
          n2 = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
          let s1 = "";
          for(let i=0; i<3; i++) {
             s1 += Math.floor(Math.random() * Math.floor(9/n2));
          }
          n1 = Number(s1);
        }
      } else {
        const minNum = range[0];
        const maxNum = range[1];
        
        if (!allowCarry) {
          const len = String(maxNum).length;
          let s1 = "", s2 = "";
          for(let i=0; i<len; i++) {
            if (type === 'addition') {
                const d1 = Math.floor(Math.random() * 5); 
                const d2 = Math.floor(Math.random() * (9 - d1));
                s1 = d1 + s1; s2 = d2 + s2;
            } else {
                const d1 = Math.floor(Math.random() * 9) + (i === len-1 ? 1 : 0);
                const d2 = Math.floor(Math.random() * (d1 + 1));
                s1 = d1 + s1; s2 = d2 + s2;
            }
          }
          n1 = Number(s1); n2 = Number(s2);
        } else {
          n1 = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
          n2 = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
          if (type === 'subtraction' && n1 < n2) [n1, n2] = [n2, n1];
        }
      }
    }
    
    const { 
      generateAdditionJourney, 
      generateSubtractionJourney, 
      generateMultiplicationJourney 
    } = require('./arithmeticJourneyGenerator');
    
    let problem;
    if (type === 'addition') problem = generateAdditionJourney(n1, n2);
    else if (type === 'subtraction') problem = generateSubtractionJourney(n1, n2);
    else if (type === 'multiplication') problem = generateMultiplicationJourney(n1, n2);
    
    const resultValue = (type === 'addition' || type === 'subtraction' || type === 'multiplication') ? problem.footer.match(/[\d,]+/g).pop().replace(/,/g, '') : "0";

    inst = {
      ...inst,
      ...problem,
      operation: problem.type, // Preserve 'addition', 'subtraction', or 'multiplication'
      type: 'arithmetic_journey',
      logic_type: 'arithmetic_journey_v1',
      adaptiveConfig: {
        ...inst.adaptiveConfig,
        variables: { ...(inst.adaptiveConfig.variables || {}), n1, n2, type }
      },
      correctAnswerText: resultValue
    };
    return inst;
  }

  if (logic === 'table_min_max_comparison') {
    let names = [], values = [], correctIndex;

    let target = inst.adaptiveConfig?.target || 'min';
    if (target === 'random') {
      target = Math.random() < 0.5 ? 'min' : 'max';
    }

    if (overrideVariables) {
      names = overrideVariables.names;
      values = overrideVariables.values;
      correctIndex = overrideVariables.correct_index;
      target = overrideVariables.target || target;
    } else {
      const namesPool = ["Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "Emma", "Olivia", "Sophia", "Ava", "Isabella", "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Kiara", "Prisha", "Riya"];

      // Shuffle and pick 4 names
      const shuffledNames = namesPool.sort(() => 0.5 - Math.random());
      names = shuffledNames.slice(0, 4);

      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999] };
      let minVal = dataSource.range[0];
      let maxVal = dataSource.range[1];

      // Generate 4 unique random numbers
      let attempts = 0;
      while (values.length < 4 && attempts < 100) {
        let v = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        if (!values.includes(v)) values.push(v);
        attempts++;
      }

      // Calculate correct index
      if (target === 'min') {
        const minNum = Math.min(...values);
        correctIndex = values.indexOf(minNum);
      } else {
        const maxNum = Math.max(...values);
        correctIndex = values.indexOf(maxNum);
      }
    }

    const superlative = target === 'min' ? 'fewest' : 'most';
    const comparative = target === 'min' ? 'smallest' : 'largest';

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      names: names,
      values: values,
      correct_index: correctIndex,
      correct_name: names[correctIndex],
      correct_value: values[correctIndex],
      target: target,
      superlative: superlative,
      comparative: comparative
    };

    const templateVars = {
      ...inst.adaptiveConfig.variables,
      name_1: names[0], name_2: names[1], name_3: names[2], name_4: names[3],
      num_1: values[0], num_2: values[1], num_3: values[2], num_4: values[3],
      num_1_formatted: Number(values[0]).toLocaleString('en-IN'),
      num_2_formatted: Number(values[1]).toLocaleString('en-IN'),
      num_3_formatted: Number(values[2]).toLocaleString('en-IN'),
      num_4_formatted: Number(values[3]).toLocaleString('en-IN'),
      correct_name: names[correctIndex],
      correct_value_formatted: Number(values[correctIndex]).toLocaleString('en-IN')
    };

    // Inject digit variables for each number (e.g. num_1_d1 for Ones, num_1_d2 for Tens)
    for (let i = 0; i < 4; i++) {
      const numStr = String(values[i]);
      for (let j = 0; j < numStr.length; j++) {
        const placeIndex = numStr.length - j; // d1=Ones, d2=Tens, d3=Hundreds, etc.
        templateVars[`num_${i + 1}_d${placeIndex}`] = numStr[j];
      }
    }

    inst.type = 'mcq'; // Switch template to MCQ renderer
    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.options) {
      let parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      inst.options = hydrateNode(parsedOptions, templateVars);
    } else {
      // If the user forgot options, auto-generate them
      inst.options = [
        { type: "text", content: names[0] },
        { type: "text", content: names[1] },
        { type: "text", content: names[2] },
        { type: "text", content: names[3] }
      ];
    }

    if (question.solution) {
      let parsedSolution = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
        inst.adaptiveConfig.scaffold.id = (inst.template_id || 'v1') + '_scaffold';
      }
    }

    inst.correctAnswerIndex = correctIndex;
    const answerPayload = JSON.stringify({ ans_value: names[correctIndex] });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  // Add more logic blocks for other templates here...

  if (logic === 'number_comparison') {
    let num1, num2, correctPhrase;

    if (overrideVariables) {
      num1 = overrideVariables.num_1;
      num2 = overrideVariables.num_2;
      correctPhrase = overrideVariables.correct_phrase;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] };
      const minVal = dataSource.range[0];
      const maxVal = dataSource.range[1];

      const isEq = Math.random() < 0.25;
      const varyLengths = Math.random() < 0.5; // 50% chance to force different lengths

      if (isEq) {
        num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        num2 = num1;
      } else {
        num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;

        if (varyLengths && String(maxVal).length > String(minVal).length) {
          // pick a power of 10 smaller or larger
          const len1 = String(num1).length;
          const newLen = len1 > String(minVal).length ? len1 - 1 : len1 + 1;
          const min2 = Math.pow(10, newLen - 1);
          const max2 = Math.pow(10, newLen) - 1;
          num2 = Math.floor(Math.random() * (max2 - min2 + 1)) + min2;
        } else {
          // same length, vary slightly
          let change = Math.floor(Math.random() * 90) + 1;
          num2 = Math.random() < 0.5 ? num1 + change : num1 - change;
          if (String(num2).length !== String(num1).length) num2 = num1; // reset if overflow
        }
      }

      if (num1 > num2) correctPhrase = "is greater than";
      else if (num1 < num2) correctPhrase = "is less than";
      else correctPhrase = "is equal to";
    }

    const n1Str = String(num1);
    const n2Str = String(num2);
    const n1Fmt = Number(num1).toLocaleString('en-IN');
    const n2Fmt = Number(num2).toLocaleString('en-IN');

    // Procedurally generate the exact solution breakdown
    let breakdown = `First, count the number of digits in each number. There are ${n1Str.length} digits in ${n1Fmt} and ${n2Str.length} digits in ${n2Fmt}. `;

    if (n1Str.length !== n2Str.length) {
      breakdown += `The number with more digits is always greater.\n\n**${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;
    } else {
      breakdown += `They have the same number of digits.\n\n`;
      const placesArray = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs"];
      let diffFound = false;

      for (let i = 0; i < n1Str.length; i++) {
        let pName = placesArray[n1Str.length - 1 - i];
        breakdown += `Compare the ${pName} digits. The ${pName} digit in ${n1Fmt} is ${n1Str[i]}. The ${pName} digit in ${n2Fmt} is ${n2Str[i]}. `;
        if (n1Str[i] === n2Str[i]) {
          breakdown += `They have the same ${pName} digit.\n\n`;
        } else {
          breakdown += `${n1Str[i]} is ${n1Str[i] > n2Str[i] ? 'greater' : 'less'} than ${n2Str[i]}.\n\n`;
          diffFound = true;
          breakdown += `**${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;

          breakdown = breakdown.replace('Compare the hundreds', 'Now compare the hundreds')
            .replace('Compare the tens', 'Now compare the tens')
            .replace('Compare the ones', 'Now compare the ones');
          breakdown = breakdown.replace(/^Now /, '');
          breakdown = breakdown.replace(/\n\nNow /, '\n\nNow ');
          breakdown = breakdown.replace(/\n\nCompare /, '\n\nNow compare ');
          breakdown = breakdown.replace(/^Compare /, 'Compare ');
          breakdown = breakdown.replace(/\n\nNow/, '\n\nNow');

          breakdown = breakdown.split('\n\n').map((line, idx) => {
            if (idx === 1 && line.startsWith('Now ')) return line.substring(4);
            return line;
          }).join('\n\n');

          break;
        }
      }
      if (!diffFound) {
        breakdown += `Since all the digits are the same, **${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;
      }
    }

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      num_1: num1,
      num_2: num2,
      num_1_fmt: n1Fmt,
      num_2_fmt: n2Fmt,
      correct_phrase: correctPhrase,
      solution_breakdown: breakdown
    };

    const templateVars = { ...inst.adaptiveConfig.variables };

    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);

    inst.options = [
      { type: "text", content: "is greater than" },
      { type: "text", content: "is less than" },
      { type: "text", content: "is equal to" }
    ];

    inst.correctAnswerIndex = inst.options.findIndex(opt => opt.content === correctPhrase);

    if (question.solution) {
      let parsedSolution = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const answerPayload = JSON.stringify({ ans_value: correctPhrase });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'place_value_underlined_choice_v1') {
    let targetValue, correctNum, wrongNum, targetPlace, targetDigit, otherDigit;
    let opt1Html, opt2Html, opt1IsCorrect;

    if (overrideVariables) {
      targetValue = overrideVariables.value;
      correctNum = overrideVariables.correct_number;
      wrongNum = overrideVariables.wrong_number;
      targetPlace = overrideVariables.target_place;
      targetDigit = overrideVariables.target_digit;
      opt1Html = overrideVariables.opt1Html;
      opt2Html = overrideVariables.opt2Html;
      opt1IsCorrect = overrideVariables.opt1IsCorrect;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
      const range = dataSource.range || [10, 99];
      targetPlace = range[1] > 99 ? 100 : 10; // Auto-detect Tens or Hundreds

      // Choose a random target digit (e.g., 1-9)
      targetDigit = Math.floor(Math.random() * 9) + 1;
      targetValue = targetDigit * targetPlace;

      // Generate the CORRECT number (e.g., 96 for target 90)
      otherDigit = Math.floor(Math.random() * 9) + 1;
      correctNum = targetValue + (Math.random() < 0.5 ? otherDigit : 0);

      // Generate the INCORRECT number (e.g., 39 for target 90)
      wrongNum = (otherDigit * 10) + targetDigit;

      const rawOptCorrect = targetPlace === 10 ? `<u>${targetDigit}</u>${correctNum % 10}` : `<u>${targetDigit}</u>xx`;
      const rawOptWrong = targetPlace === 10 ? `${wrongNum / 10 | 0}<u>${targetDigit}</u>` : `x<u>${targetDigit}</u>x`;

      // Shuffle options safely by saving the exact state
      if (Math.random() < 0.5) {
        opt1Html = rawOptCorrect;
        opt2Html = rawOptWrong;
        opt1IsCorrect = true;
      } else {
        opt1Html = rawOptWrong;
        opt2Html = rawOptCorrect;
        opt1IsCorrect = false;
      }
    }

    const items = [
      { content: opt1Html, label: opt1Html, isCorrect: opt1IsCorrect },
      { content: opt2Html, label: opt2Html, isCorrect: !opt1IsCorrect }
    ];

    inst.options = items;
    inst.correctAnswerIndex = items.findIndex(i => i.isCorrect);

    const templateVars = {
      value: targetValue,
      target_digit: targetDigit,
      correct_number: correctNum,
      wrong_number: wrongNum,
      target_place: targetPlace,
      place_name: targetPlace === 10 ? 'tens' : 'hundreds',
      opt1Html: opt1Html,
      opt2Html: opt2Html,
      opt1IsCorrect: opt1IsCorrect
    };

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars
    };

    inst.parts = hydrateNode(question.parts || [], templateVars);

    // Fallback options hydration
    if (question.options) {
      inst.options = inst.options.map(opt => hydrateNode(opt, templateVars));
    }

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, templateVars);
    }

    inst.correctAnswerText = hydrateNode(question.correctAnswerText || '', templateVars);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'place_value_conversion') {
    let baseQty, derivedQty, largerPlace, smallerPlace, largerSingular, smallerPlural, correctValue;

    if (overrideVariables) {
      baseQty = overrideVariables.base_qty;
      derivedQty = overrideVariables.derived_qty;
      largerPlace = overrideVariables.larger_place;
      smallerPlace = overrideVariables.smaller_place;
      largerSingular = overrideVariables.larger_singular;
      smallerPlural = overrideVariables.smaller_plural;
      correctValue = overrideVariables.value;
    } else {
      const places = [
        { name: "ten thousands", singular: "ten thousand" },
        { name: "thousands", singular: "thousand" },
        { name: "hundreds", singular: "hundred" },
        { name: "tens", singular: "ten" },
        { name: "ones", singular: "one" }
      ];

      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
      const minBase = dataSource.min_base || 1;
      const maxBase = dataSource.max_base || 9;

      baseQty = Math.floor(Math.random() * (maxBase - minBase + 1)) + minBase;
      derivedQty = baseQty * 10;

      const idx = Math.floor(Math.random() * (places.length - 1));
      largerPlace = places[idx].name;
      largerSingular = places[idx].singular;
      smallerPlace = places[idx + 1].name;
      smallerPlural = places[idx + 1].name;

      const target = inst.adaptiveConfig?.target || 'base'; // 'base' means answering the larger side
      correctValue = target === 'base' ? baseQty : derivedQty;
    }

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      base_qty: baseQty,
      derived_qty: derivedQty,
      larger_place: largerPlace,
      smaller_place: smallerPlace,
      larger_singular: largerSingular,
      smaller_plural: smallerPlural,
      value: correctValue
    };

    const templateVars = { ...inst.adaptiveConfig.variables, value: correctValue };

    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
        inst.adaptiveConfig.scaffold.id = (inst.template_id || 'v1') + '_scaffold';
      }
      if (!inst.adaptiveConfig.scaffold.trigger_on) {
        inst.adaptiveConfig.scaffold.trigger_on = ["conversion_error", "place_name_error"];
      }
    }

    const answerPayload = JSON.stringify({ ans_value: String(correctValue) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'even_odd_multi_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 50], category_target: 'even' };
    const range = dataSource.range || [1, 50];
    const targetCategory = dataSource.category_target || 'even';
    const otherCategory = targetCategory === 'even' ? 'odd' : 'even';

    // Generate candidates
    const allNumbers = [];
    for (let i = range[0]; i <= range[1]; i++) allNumbers.push(i);

    // Shuffle and pick 4 unique numbers
    const shuffled = [...allNumbers].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);

    const matches = selected.filter(n => (targetCategory === 'even' ? n % 2 === 0 : n % 2 !== 0));
    const nonMatches = selected.filter(n => (targetCategory === 'even' ? n % 2 !== 0 : n % 2 === 0));

    const templateVars = {
      category_target: targetCategory,
      other_category: otherCategory,
      list_of_matches: matches.length > 0 ? matches.join(', ') : 'None',
      list_of_non_matches: nonMatches.length > 0 ? nonMatches.join(', ') : 'None',
      num_1: selected[0],
      num_2: selected[1],
      num_3: selected[2],
      num_4: selected[3],
      num_list: selected
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.parts = hydrateNode(question.parts || [], templateVars);
    inst.solution = hydrateNode(question.solution || [], templateVars);

    inst.options = selected.map(n => ({
      content: String(n),
      isCorrect: (targetCategory === 'even' ? n % 2 === 0 : n % 2 !== 0)
    }));

    inst.isMultiSelect = matches.length > 1;
    inst.showSubmitButton = inst.isMultiSelect; // Force submit button if multi-select
    inst.type = 'mcq';

    // Build answer key metadata for internal validation
    inst.correctAnswerIndices = inst.options
      .map((opt, i) => (opt.isCorrect ? i : null))
      .filter(v => v !== null);

    if (!inst.isMultiSelect && inst.correctAnswerIndices.length > 0) {
      inst.correctAnswerIndex = inst.correctAnswerIndices[0];
    }
  }

  if (logic === 'grade_5_arithmetic_word_problem') {
    let name, num1, num2, unit, color1, color2, sum;

    if (overrideVariables) {
      name = overrideVariables.name;
      num1 = overrideVariables.num_1;
      num2 = overrideVariables.num_2;
      unit = overrideVariables.unit;
      color1 = overrideVariables.color_1;
      color2 = overrideVariables.color_2;
      sum = overrideVariables.sum;
    } else {
      const names = ["Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "Emma", "Olivia", "Sophia", "Ava", "Isabella", "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Kiara", "Prisha", "Riya"];
      const units = ["litres", "kilograms", "meters", "boxes", "bags"];
      const colors = ["white", "sea green", "blue", "red", "yellow", "orange", "purple"];

      name = names[Math.floor(Math.random() * names.length)];
      unit = units[Math.floor(Math.random() * units.length)];
      const shuffledColors = colors.sort(() => 0.5 - Math.random());
      color1 = shuffledColors[0];
      color2 = shuffledColors[1];

      // Easy Mode: Sum of digits in each place < 10 (No carries)
      let n1, n2;
      let valid = false;
      while (!valid) {
        n1 = Math.floor(Math.random() * 90000) + 10000;
        n2 = Math.floor(Math.random() * 90) + 10;

        const s1 = String(n1);
        const s2 = String(n2);

        // Check ones:
        const d1_o = Number(s1[s1.length - 1]);
        const d2_o = Number(s2[s2.length - 1]);
        // Check tens:
        const d1_t = Number(s1[s1.length - 2]);
        const d2_t = Number(s2[s2.length - 2]);

        if (d1_o + d2_o < 10 && d1_t + d2_t < 10) {
          valid = true;
          num1 = n1;
          num2 = n2;
        }
      }
      sum = num1 + num2;
    }

    const n1Fmt = Number(num1).toLocaleString('en-IN');
    const n2Fmt = Number(num2).toLocaleString('en-IN');
    const sumFmt = Number(sum).toLocaleString('en-IN');

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      name, num_1: num1, num_2: num2, unit, color_1: color1, color_2: color2, sum,
      num_1_fmt: n1Fmt, num_2_fmt: n2Fmt, sum_fmt: sumFmt
    };

    const vars = inst.adaptiveConfig.variables;
    inst.parts = hydrateNode(question.parts || [], vars);

    // Procedural Solution Generation
    const s1 = String(num1);
    const s2 = String(num2);
    const sSum = String(sum);

    const d1_o = s1[s1.length - 1]; const d2_o = s2[s2.length - 1]; const r_o = sSum[sSum.length - 1];
    const d1_t = s1[s1.length - 2]; const d2_t = s2[s2.length - 2]; const r_t = sSum[sSum.length - 2];
    const d1_h = s1[s1.length - 3]; const r_h = sSum[sSum.length - 3];
    const d1_th = s1[s1.length - 4]; const r_th = sSum[sSum.length - 4];
    const d1_tth = s1[s1.length - 5]; const r_tth = sSum[sSum.length - 5];

    const generateArith = (highlightPos = null) => {
      const rows = [
        { kind: "text", text: `  ${n1Fmt.padStart(6, ' ')}` },
        { kind: "text", text: `+ ${n2Fmt.padStart(6, ' ')}` },
        { kind: "divider" }
      ];

      let resultLine = `  ${sumFmt.padStart(6, ' ')}`;
      // Simple highlighting hack for static solution: wrap in stars for renderer to bold if it supports it
      // Or we can just use the vertical display style.
      rows.push({ kind: "text", text: resultLine });
      return { type: "arithmeticLayout", layout: { rows: rows } };
    };

    // For a "pro" solution like the screenshot, we want vertical parts
    const solutionParts = [
      { type: "text", content: `Add the numbers of ${unit}.` },
      { type: "text", content: `**Add:**` },
      {
        type: "arithmeticLayout", layout: {
          rows: [
            { kind: "text", text: `${n1Fmt.padStart(10, ' ')}` },
            { kind: "text", text: `+ ${n2Fmt.padStart(8, ' ')}` },
            { kind: "divider" }
          ]
        }
      },
      { type: "text", content: `Add the ones. Add ${d1_o} + ${d2_o} = ${r_o}.` },
      {
        type: "arithmeticLayout", layout: {
          rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -1)}*${d1_o}`.padStart(10, ' ') },
            { kind: "text", text: `+ ${n2Fmt.slice(0, -1)}*${d2_o}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_o}`.padStart(10, ' ') }
          ]
        }
      },
      { type: "text", content: `Add the tens. Add ${d1_t} + ${d2_t} = ${r_t}.` },
      {
        type: "arithmeticLayout", layout: {
          rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -2)}*${d1_t}${d1_o}`.padStart(10, ' ') },
            { kind: "text", text: `+ *${d2_t}${d2_o}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_t}${r_o}`.padStart(10, ' ') }
          ]
        }
      },
      { type: "text", content: `Add the hundreds. Bring down the ${d1_h}.` },
      {
        type: "arithmeticLayout", layout: {
          rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -4)}*${d1_h}${s1.slice(-2).padStart(3, ',')}`.padStart(10, ' ') },
            { kind: "text", text: `+ ${n2Fmt}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_h}${sSum.slice(-2).padStart(3, ',')}`.padStart(10, ' ') }
          ]
        }
      },
      { type: "text", content: `The sum is ${sumFmt}. ${name} used ${sumFmt} ${unit} of paint in all.` }
    ];

    inst.solution = solutionParts.map(p => ({ ...p, isVertical: true }));

    const answerPayload = JSON.stringify({ ans_value: String(sum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'rounding_template_v1') {
    let number, targetPlaceMultiplier, targetPlaceName, roundedValue, targetDigit, rightDigit, isRoundUp;

    if (overrideVariables) {
      number = overrideVariables.number;
      targetPlaceMultiplier = overrideVariables.target_place_multiplier;
      targetPlaceName = overrideVariables.target_place_name;
      roundedValue = overrideVariables.rounded_value;
      targetDigit = overrideVariables.target_digit;
      rightDigit = overrideVariables.right_digit;
      isRoundUp = overrideVariables.is_round_up;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999] };
      const range = dataSource.range || [1000, 9999];
      number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      const places = [1000, 100, 10]; // Supported rounding targets
      const names = { 1000: "thousand", 100: "hundred", 10: "ten" };

      // Filter based on number magnitude (don't round to thousands if number is < 1000)
      const validMultipliers = places.filter(p => p * 10 <= number * 10);
      targetPlaceMultiplier = validMultipliers[Math.floor(Math.random() * validMultipliers.length)];
      targetPlaceName = names[targetPlaceMultiplier];

      // Calculate rounding
      const factor = targetPlaceMultiplier;
      const rightPlaceMultiplier = factor / 10;

      targetDigit = Math.floor((number / factor) % 10);
      rightDigit = Math.floor((number / rightPlaceMultiplier) % 10);

      isRoundUp = rightDigit >= 5;

      if (isRoundUp) {
        roundedValue = (Math.floor(number / factor) + 1) * factor;
      } else {
        roundedValue = Math.floor(number / factor) * factor;
      }
    }

    const numStr = String(number);
    const nFmt = number.toLocaleString('en-IN');
    const rFmt = roundedValue.toLocaleString('en-IN');

    // Highlight digits in formatted strings
    const highlightInFormatted = (fmtStr, targetDigitValue, isRight = false) => {
      // Find the digit in the formatted string. 
      // For rounding, we usually want the specific place.
      // If it's the target digit, it's the first occurrence of that digit at the expected place.
      // A safer way: iterate chars and count digits.
      const chars = fmtStr.split('');
      let digitCount = 0;
      const targetDigitPos = numStr.length - 1 - (isRight ? (Math.log10(targetPlaceMultiplier) - 1) : Math.log10(targetPlaceMultiplier));

      for (let i = 0; i < chars.length; i++) {
        if (/[0-9]/.test(chars[i])) {
          if (digitCount === targetDigitPos) {
            chars[i] = `<span style="color:blue;font-weight:800">${chars[i]}</span>`;
            break;
          }
          digitCount++;
        }
      }
      return chars.join('');
    };

    const highlightRangeInFormatted = (fmtStr, startDigitPos, color = 'blue') => {
      const chars = fmtStr.split('');
      let digitCount = 0;
      for (let i = 0; i < chars.length; i++) {
        if (/[0-9]/.test(chars[i])) {
          if (digitCount >= startDigitPos) {
            chars[i] = `<span style="color:${color};font-weight:800">${chars[i]}</span>`;
          }
          digitCount++;
        }
      }
      return chars.join('');
    };

    const targetPos = numStr.length - 1 - Math.log10(targetPlaceMultiplier);
    const rightPos = targetPos + 1;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      number, target_place_multiplier: targetPlaceMultiplier, target_place_name: targetPlaceName,
      rounded_value: roundedValue, target_digit: targetDigit, right_digit: rightDigit, is_round_up: isRoundUp
    };

    const templateVars = {
      ...inst.adaptiveConfig.variables,
      number_formatted: nFmt,
      rounded_formatted: rFmt,
      target_digit_highlighted: highlightInFormatted(nFmt, targetDigit, false),
      right_digit_highlighted: highlightInFormatted(nFmt, rightDigit, true),
      round_direction: isRoundUp ? "up" : "down",
      comparison_text: isRoundUp ? "5 or higher" : "less than 5",
      remainder_highlighted_src: highlightRangeInFormatted(nFmt, rightPos),
      remainder_highlighted_dest: highlightRangeInFormatted(rFmt, rightPos)
    };

    inst.parts = hydrateNode(question.parts || [], templateVars);
    if (question.solution) {
      const sol = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(sol, templateVars);
    }

    inst.correctAnswerText = JSON.stringify({ ans: String(roundedValue) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'multiplication_fixed_factor_v1' || logic === 'multiplication_zero_property_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [1, 20];
    const fixedFactor = Number(dataSource.fixed_factor ?? 0);
    const layoutType = dataSource.layout_type || inst.adaptiveConfig?.layout_type || "vertical";
    const topOrBottom = Math.random() < 0.5;

    let num2;
    if (overrideVariables) {
      num2 = overrideVariables.num2;
    } else {
      num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const v1 = topOrBottom ? fixedFactor : num2;
    const v2 = topOrBottom ? num2 : fixedFactor;
    const result = fixedFactor * num2;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      num1: fixedFactor,
      num2: num2,
      v1: v1,
      v2: v2,
      result: result,
      fixed_factor: fixedFactor
    };

    const v1Str = String(v1);
    const v2Str = String(v2);
    const resStr = String(result);
    const resDigits = resStr.split('');
    const maxDigits = Math.max(v1Str.length, v2Str.length, resDigits.length);
    const resPadding = Math.max(0, maxDigits - resDigits.length);

    const getFixedCells = (val, padCols) => {
      const str = String(val).padStart(padCols, ' ');
      return str.split('').map(char => ({
        kind: 'fixed',
        value: char === ' ' ? '\u00A0' : char
      }));
    };

    if (layoutType === "table") {
      const answerCells = [];
      const correctPayload = {};

      for (let i = 0; i < maxDigits; i++) {
        const digitPos = maxDigits - 1 - i;
        const cellId = `ans_${digitPos}`;
        const charIdx = i - resPadding;

        answerCells.push({
          id: cellId,
          type: "digit"
        });
        correctPayload[cellId] = charIdx >= 0 ? resDigits[charIdx] : "";

        if (digitPos === 3 && maxDigits > 3) {
          answerCells.push({ kind: "fixed", value: "," });
        }
      }

      inst.parts = [
        { type: "text", content: "Multiply." },
        {
          type: "arithmeticLayout",
          isVertical: true,
          layout: {
            mode: "placeValue",
            inputMode: "digitPad",
            rows: [
              { kind: "answer", prefix: "\u00A0", cells: getFixedCells(v1, maxDigits) },
              { kind: "answer", prefix: "×", cells: getFixedCells(v2, maxDigits) },
              { kind: "divider" },
              { kind: "answer", prefix: "\u00A0", cells: answerCells }
            ]
          }
        }
      ];
      inst.correctAnswerText = JSON.stringify(correctPayload);
    } else {
      inst.parts = [
        { type: "text", content: "Multiply." },
        {
          type: "verticalMultiply",
          id: "ans",
          layout: {
            v1: v1Str,
            v2: v2Str,
            operator: "×",
            ans: resStr
          }
        }
      ];
      inst.correctAnswerText = JSON.stringify({ ans: resStr });
    }

    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    let rule = "";
    let explanation = "";

    if (fixedFactor === 0) {
      rule = "The Zero Property of Multiplication says that the product of any number and 0 is always 0.";
      explanation = `This means that 0 times any number (like ${num2}) is 0.`;
    } else if (fixedFactor === 1) {
      rule = "The Identity Property of Multiplication (Property of 1) says that the product of any number and 1 is the number itself.";
      explanation = `This means that 1 times any number (like ${num2}) is ${num2}.`;
    } else if (fixedFactor === 2) {
      rule = "Multiplying a number by 2 is the same as doubling it.";
      explanation = `This means that ${num2} + ${num2} = ${result}.`;
    } else if (fixedFactor === 3) {
      rule = "Multiplying a number by 3 means adding the number three times.";
      explanation = `This means that ${num2} + ${num2} + ${num2} = ${result}.`;
    } else {
      rule = `Multiplying by ${fixedFactor} means adding the number ${fixedFactor} times.`;
      explanation = `The product of ${num2} and ${fixedFactor} is ${result}.`;
    }

    const solutionCells = [];
    for (let i = 0; i < maxDigits; i++) {
      const digitPos = maxDigits - 1 - i;
      const charIdx = i - resPadding;
      solutionCells.push({
        kind: "fixed",
        value: charIdx >= 0 ? resDigits[charIdx] : ""
      });
      if (digitPos === 3 && maxDigits > 3) {
        solutionCells.push({ kind: "fixed", value: "," });
      }
    }

    inst.solution = [
      { type: "text", content: rule },
      { type: "text", content: explanation },
      {
        type: (layoutType === "table") ? "arithmeticLayout" : "verticalMultiply",
        isVertical: true,
        layout: (layoutType === "table") ? {
          mode: "placeValue",
          rows: [
            { kind: "answer", prefix: "\u00A0", cells: getFixedCells(v1, maxDigits) },
            { kind: "answer", prefix: "×", cells: getFixedCells(v2, maxDigits) },
            { kind: "divider" },
            { kind: "answer", prefix: "\u00A0", cells: solutionCells }
          ]
        } : {
          v1: v1Str,
          v2: v2Str,
          operator: "×",
          ans: resStr
        }
      }
    ];
  }

  if (logic === 'multiplication_patterns_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const f1Range = dataSource.f1_range || [2, 9];
    const f2Range = dataSource.f2_range || [2, 9];

    let f1, f2;
    if (overrideVariables) {
      f1 = overrideVariables.f1;
      f2 = overrideVariables.f2;
    } else {
      f1 = Math.floor(Math.random() * (f1Range[1] - f1Range[0] + 1)) + f1Range[0];
      f2 = Math.floor(Math.random() * (f2Range[1] - f2Range[0] + 1)) + f2Range[0];
    }
    const baseResult = f1 * f2;

    inst.adaptiveConfig.variables = { f1, f2, base: baseResult };

    const steps = [1, 10, 100, 1000, 10000, 100000, 1000000];
    const correctPayload = {};
    const parts = [{ type: 'text', content: 'Complete the pattern:' }];

    steps.forEach((multiplier, i) => {
      const f2Expanded = f2 * multiplier;
      const f2Str = f2Expanded.toLocaleString();
      const ans = baseResult * multiplier;
      const ansStr = String(ans);
      const cellId = `ans_${i}`;

      parts.push({
        type: 'text',
        content: `${f1} × ${f2Str} =`
      });
      parts.push({
        type: 'digit_blank',
        id: cellId,
        size: "small",
        placeholder: ""
      });

      correctPayload[cellId] = ansStr;
    });

    inst.isVertical = false;
    inst.parts = parts;
    inst.correctAnswerText = JSON.stringify(correctPayload);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    // Solution
    const sol = [
      { type: 'text', content: 'Step 1: Multiply the basic facts.' },
      { type: 'text', content: `**${f1} × ${f2}** ones = **${baseResult}** ones` },
      { type: 'text', content: `**${f1} × ${f2} = ${baseResult}**` },
      { type: 'text', content: 'Step 2: Use place value to complete the pattern.' }
    ];

    const placeNames = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
    steps.slice(1).forEach((multiplier, i) => {
      sol.push({
        type: 'text',
        content: `**${f1} × ${f2} ${placeNames[i + 1]}** = **${baseResult} ${placeNames[i + 1]}** (${(baseResult * multiplier).toLocaleString()})`
      });
    });

    sol.push({
      type: 'text',
      content: `***Tip:** Notice how the number of zeros in the product matches the number of zeros in the factor!*`
    });

    inst.solution = sol;
  }

  if (logic === 'multiplication_array_model_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const rowRange = dataSource.row_range || [2, 5];
    const colRange = dataSource.col_range || [2, 5];

    let rows, cols;
    if (overrideVariables) {
      rows = overrideVariables.rows;
      cols = overrideVariables.cols;
    } else {
      rows = Math.floor(Math.random() * (rowRange[1] - rowRange[0] + 1)) + rowRange[0];
      cols = Math.floor(Math.random() * (colRange[1] - colRange[0] + 1)) + colRange[0];
    }
    const product = rows * cols;

    const gridRows = 10;
    const gridCols = 10;
    const correctIndices = [];

    // Use integer indices (row * width + col)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        correctIndices.push(String(r * gridCols + c));
      }
    }

    inst.type = "shadeGrid";
    const correctAnswerVal = product; // For numeric comparison fallback if needed

    inst.adaptiveConfig = {
      ...inst.adaptiveConfig,
      logic_type: logic,
      variables: { rows, cols, product },
      gridRows,
      gridCols,
      lineColor: "#16a34a",
      targetShaded: product,
      correctAnswerText: `${product} squares`,
      enforceShape: "rectangle"
    };

    inst.parts = [
      { type: "text", content: `Make a rectangular array of squares to model **${rows} × ${cols} = ${product}**.` }
    ];

    // Simplest form for the server and UI logic
    inst.correctAnswerText = String(product);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    // Remove complex value to avoid JSON bubble in UI
    delete inst.correctAnswerValue;
    delete inst.adaptiveConfig.correctAnswerValue;

    // Solution
    const solutionLabels = [];
    for (let r = 1; r <= rows; r++) {
      solutionLabels.push({ row: r - 1, col: -1, text: String(r) });
    }
    for (let c = 1; c <= cols; c++) {
      solutionLabels.push({ row: -1, col: c - 1, text: String(c) });
    }

    // Solution Visual configuration
    const solutionShaded = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        solutionShaded.push(String(r * gridCols + c));
      }
    }

    inst.solution = [
      { type: "text", content: "Arrays are made up of rows. All the rows have the same length." },
      { type: "text", content: `An array that models **${rows} × ${cols} = ${product}** has **${rows} rows** with **${cols} squares** in each row.` },
      {
        type: "shadeGrid",
        gridRows,
        gridCols,
        shaded: solutionShaded,
        labels: solutionLabels,
        lineColor: "#16a34a",
        fillColor: "#6ee7b7"
      },
      { type: "text", content: `There are **${product} squares** in the array.` }
    ];
  }

  if (logic === 'match_multiplication_fact_to_area_model_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const baseRange = dataSource.target_base_range || [1, 10];
    const layoutChoices = Array.isArray(dataSource.shuffle_layout) && dataSource.shuffle_layout.length > 0
      ? dataSource.shuffle_layout
      : ['grid_2x2', 'column'];

    let targetBase;
    let selectedLayout;
    let dynamicColor;

    if (overrideVariables) {
      targetBase = overrideVariables.target_base;
      selectedLayout = overrideVariables.selected_layout;
      dynamicColor = overrideVariables.dynamic_color;
    } else {
      targetBase = Math.floor(Math.random() * (baseRange[1] - baseRange[0] + 1)) + baseRange[0];
      selectedLayout = layoutChoices[Math.floor(Math.random() * layoutChoices.length)];
      const palette = ['#FF7B7B', '#60A5FA', '#34D399', '#F59E0B', '#A78BFA', '#FB7185'];
      dynamicColor = palette[Math.floor(Math.random() * palette.length)];
    }

    const targetProduct = targetBase * targetBase;
    const letters = ['A', 'B', 'C', 'D'];

    const sameDims = (a, b) => a.rows === b.rows && a.cols === b.cols;
    const renderAreaModelSvg = (rows, cols, fillColor) => {
      const cell = Math.max(10, Math.min(24, Math.floor(132 / Math.max(rows, cols))));
      const gridWidth = cols * cell;
      const gridHeight = rows * cell;
      const width = Math.max(164, gridWidth + 32);
      const height = Math.max(132, gridHeight + 38);
      const x = Math.round((width - gridWidth) / 2);
      const y = 18;

      let cellsSvg = '';
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          cellsSvg += `<rect x="${x + (c * cell)}" y="${y + (r * cell)}" width="${cell}" height="${cell}" fill="${fillColor}" stroke="#ffffff" stroke-width="1.5" />`;
        }
      }

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
          <rect x="${x}" y="${y}" width="${gridWidth}" height="${gridHeight}" fill="none" stroke="#334155" stroke-width="2" />
          ${cellsSvg}
        </svg>
      `;
    };

    const findRectangleWithSameArea = () => {
      for (let factor = 1; factor <= Math.floor(Math.sqrt(targetProduct)); factor += 1) {
        if (targetProduct % factor !== 0) continue;
        const other = targetProduct / factor;
        if (factor !== other && !(factor === targetBase && other === targetBase)) {
          return { rows: factor, cols: other };
        }
      }
      return { rows: 1, cols: targetProduct };
    };

    const rectangleModel = findRectangleWithSameArea();
    const offByOneBase = targetBase <= 1 ? 2 : (Math.random() < 0.5 ? targetBase + 1 : targetBase - 1);
    const offByOneModel = {
      rows: Math.max(1, offByOneBase),
      cols: Math.max(1, offByOneBase)
    };

    const swapCandidates = [
      { rows: targetBase, cols: targetBase + 1 },
      { rows: targetBase + 1, cols: targetBase },
      { rows: targetBase, cols: Math.max(1, targetBase - 1) },
      { rows: Math.max(1, targetBase - 1), cols: targetBase },
      { rows: targetBase, cols: targetBase + 2 },
      { rows: targetBase + 2, cols: targetBase }
    ];
    const swapModel = swapCandidates.find((candidate) => (
      candidate.rows !== candidate.cols &&
      !sameDims(candidate, { rows: targetBase, cols: targetBase }) &&
      !sameDims(candidate, rectangleModel) &&
      !sameDims(candidate, offByOneModel)
    )) || { rows: targetBase, cols: targetBase + 1 };

    const optionSet = [
      {
        kind: 'correct',
        rows: targetBase,
        cols: targetBase,
        markup: renderAreaModelSvg(targetBase, targetBase, dynamicColor)
      },
      {
        kind: 'rectangle',
        rows: rectangleModel.rows,
        cols: rectangleModel.cols,
        markup: renderAreaModelSvg(rectangleModel.rows, rectangleModel.cols, dynamicColor)
      },
      {
        kind: 'off_by_one',
        rows: offByOneModel.rows,
        cols: offByOneModel.cols,
        markup: renderAreaModelSvg(offByOneModel.rows, offByOneModel.cols, dynamicColor)
      },
      {
        kind: 'swap',
        rows: swapModel.rows,
        cols: swapModel.cols,
        markup: renderAreaModelSvg(swapModel.rows, swapModel.cols, dynamicColor)
      }
    ];

    for (let i = optionSet.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionSet[i], optionSet[j]] = [optionSet[j], optionSet[i]];
    }

    const correctIndex = optionSet.findIndex((option) => option.kind === 'correct');
    const correctLetter = letters[correctIndex] || 'A';

    inst.type = 'mcq';
    inst.isGrid = selectedLayout === 'grid_2x2';
    inst.isVertical = selectedLayout === 'column';
    inst.showSubmitButton = false;
    inst.adaptiveConfig = {
      ...inst.adaptiveConfig,
      variables: {
        ...(inst.adaptiveConfig?.variables || {}),
        target_base: targetBase,
        target_product: targetProduct,
        dynamic_color: dynamicColor,
        selected_layout: selectedLayout,
        correct_letter: correctLetter,
      }
    };

    inst.parts = [
      {
        type: 'text',
        content: `Which model shows **${targetBase} × ${targetBase}**?`,
        isVertical: true
      }
    ];

    inst.options = optionSet.map((option) => option.markup);
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = '';

    inst.solution = [
      {
        type: 'text',
        content: `To match **${targetBase} × ${targetBase}**, we need a square that is **${targetBase}** units wide and **${targetBase}** units high.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Look for the width: the first number in **${targetBase} × ${targetBase}** is the width. Count the top edge of each grid.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Look for the height: the second number is the height. Count the side edge of each grid.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Find the perfect match: the model for **${targetBase} × ${targetBase}** has both dimensions matching. The total area is **${targetProduct}**.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `The correct model is **Option ${correctLetter}**.`,
        isVertical: true
      }
    ];
  }

  if (logic === 'multiplication_multi_strategy_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const aRange = dataSource.factor_a_range || [1, 100];
    const bRange = dataSource.factor_b_range || [1, 10];
    const strategies = Array.isArray(dataSource.strategies) && dataSource.strategies.length > 0
      ? dataSource.strategies
      : ['area_model', 'equal_groups', 'zero_property'];

    let factorA, factorB;
    if (overrideVariables) {
      factorA = Number(overrideVariables.factor_a);
      factorB = Number(overrideVariables.factor_b);
    } else {
      factorA = Math.floor(Math.random() * (aRange[1] - aRange[0] + 1)) + aRange[0];
      factorB = Math.floor(Math.random() * (bRange[1] - bRange[0] + 1)) + bRange[0];
    }

    const product = factorA * factorB;
    const availableStrategies = strategies.filter(Boolean);
    let selectedStrategy = availableStrategies[0] || 'area_model';

    if (factorA === 0 || factorB === 0) {
      selectedStrategy = 'zero_property';
    } else if (availableStrategies.includes('equal_groups') && factorB <= 5 && product <= 60) {
      selectedStrategy = 'equal_groups';
    } else if (availableStrategies.includes('area_model') && factorA <= 12 && factorB <= 12) {
      selectedStrategy = 'area_model';
    } else {
      selectedStrategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)] || 'area_model';
    }

    const renderAreaModelSvg = () => {
      const rows = Math.min(factorB, 10);
      const cols = Math.min(factorA, 10);
      const cell = 26;
      const x = 18;
      const y = 18;
      const width = x * 2 + cols * cell;
      const height = y * 2 + rows * cell + 28;
      let cells = '';
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          cells += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="#A2C367" stroke="#ffffff" stroke-width="1.5" />`;
        }
      }
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-width:360px;">
          <rect x="${x}" y="${y}" width="${cols * cell}" height="${rows * cell}" fill="none" stroke="#334155" stroke-width="2" />
          ${cells}
        </svg>
      `;
    };

    const renderEqualGroupsSvg = () => {
      const groups = Math.min(factorB, 5);
      const perGroup = Math.min(factorA, 6);
      const cell = 18;
      const gapX = 18;
      const x = 18;
      const y = 18;
      const groupWidth = perGroup * cell + 18;
      const height = 96;
      const width = x * 2 + groups * groupWidth + (groups - 1) * gapX;
      let groupsSvg = '';
      for (let g = 0; g < groups; g += 1) {
        const groupX = x + g * (groupWidth + gapX);
        groupsSvg += `<rect x="${groupX}" y="${y}" width="${groupWidth}" height="58" fill="#ffffff" stroke="#334155" stroke-width="2" />`;
        for (let i = 0; i < perGroup; i += 1) {
          groupsSvg += `<circle cx="${groupX + 16 + i * cell}" cy="${y + 29}" r="6.5" fill="#A2C367" />`;
        }
      }
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-width:420px;">
          ${groupsSvg}
        </svg>
      `;
    };

    const renderZeroPropertySvg = () => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 92" style="width:100%;height:auto;max-width:320px;">
        <text x="20" y="38" font-size="28" font-weight="700" fill="#111827">${factorA}</text>
        <text x="78" y="38" font-size="26" font-weight="700" fill="#64748b">×</text>
        <text x="120" y="38" font-size="28" font-weight="700" fill="#111827">${factorB}</text>
        <text x="178" y="38" font-size="26" font-weight="700" fill="#64748b">=</text>
        <text x="220" y="38" font-size="28" font-weight="700" fill="#111827">0</text>
        <text x="20" y="74" font-size="15" fill="#475569">Any number multiplied by 0 equals 0.</text>
      </svg>
    `;

    const strategySvg = selectedStrategy === 'equal_groups'
      ? renderEqualGroupsSvg()
      : selectedStrategy === 'zero_property'
        ? renderZeroPropertySvg()
        : renderAreaModelSvg();

    let step1Text = '';
    if (selectedStrategy === 'zero_property') {
      step1Text = `Use the zero property of multiplication. Since one factor is **0**, the product is **0**.`;
    } else if (selectedStrategy === 'equal_groups') {
      step1Text = `Think of **${factorB} groups** with **${factorA}** in each group. Add equal groups or multiply to find the total.`;
    } else {
      step1Text = `Use an area model. Multiply the side lengths **${factorA}** and **${factorB}** to find the total number of squares.`;
    }

    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      factor_a: factorA,
      factor_b: factorB,
      product,
      selected_strategy: selectedStrategy,
      strategy_svg: strategySvg,
      step_1_text: step1Text
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;
    inst.showSubmitButton = true;

    inst.parts = [
      {
        type: 'text',
        content: 'Multiply:',
        hasAudio: true,
        isVertical: true
      },
      {
        type: 'pair',
        isVertical: false,
        parts: [
          { type: 'text', content: `${factorA} × ${factorB} = ` },
          {
            type: 'digit_blank',
            id: 'ans_1',
            size: Math.max(1, String(product).length),
            answerType: 'number'
          }
        ]
      }
    ];

    inst.solution = [
      {
        type: 'text',
        content: 'Solution Strategy',
        isVertical: true
      },
      {
        type: 'svg',
        content: strategySvg,
        isVertical: true
      },
      {
        type: 'text',
        content: step1Text,
        isVertical: true
      },
      {
        type: 'text',
        content: `**${factorA} × ${factorB} = ${product}**`,
        isVertical: true
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans_1: String(product) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'vertical_multiplication_single_digit_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const multiplicandRange = dataSource.multiplicand_range || [10, 99];
    const multiplierRange = dataSource.multiplier_range || [2, 9];
    const carryMode = String(
      dataSource.carry_mode ||
      (dataSource.allow_carry === true ? 'with_carry' : dataSource.allow_carry === false ? 'without_carry' : 'mixed')
    ).toLowerCase();
    const inputFromLeftToRight = dataSource.input_from_left_to_right !== undefined
      ? Boolean(dataSource.input_from_left_to_right)
      : true;

    let multiplicand;
    let multiplier;

    if (overrideVariables) {
      multiplicand = Number(overrideVariables.multiplicand);
      multiplier = Number(overrideVariables.multiplier);
    } else {
      const candidates = [];
      for (let n = multiplicandRange[0]; n <= multiplicandRange[1]; n += 1) {
        const digits = String(n).split('').map(Number);
        if (digits.length < 2 || digits.length > 3) continue;

        for (let m = multiplierRange[0]; m <= multiplierRange[1]; m += 1) {
          let carry = 0;
          let hasCarry = false;
          for (let idx = digits.length - 1; idx >= 0; idx -= 1) {
            const total = digits[idx] * m + carry;
            carry = Math.floor(total / 10);
            if (carry > 0) hasCarry = true;
          }

          const matchesCarryMode = (
            carryMode === 'with_carry' ? hasCarry :
              carryMode === 'without_carry' ? !hasCarry :
                true
          );

          if (matchesCarryMode) {
            candidates.push({ multiplicand: n, multiplier: m });
          }
        }
      }

      const picked = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : { multiplicand: 13, multiplier: 3 };

      multiplicand = picked.multiplicand;
      multiplier = picked.multiplier;
    }

    const product = multiplicand * multiplier;
    const digits = String(multiplicand).split('');
    const placeNames = digits.length === 3 ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones'];
    const highlightColor = '#4f46e5';
    const defaultColor = '#111827';

    const steps = [];
    let carry = 0;
    for (let idx = digits.length - 1; idx >= 0; idx -= 1) {
      const digit = Number(digits[idx]);
      const incomingCarry = carry;
      const multiplied = digit * multiplier;
      const total = multiplied + incomingCarry;
      const writeDigit = total % 10;
      const nextCarry = Math.floor(total / 10);

      steps.unshift({
        idx,
        placeName: placeNames[idx],
        digit,
        incomingCarry,
        multiplied,
        total,
        writeDigit,
        nextCarry
      });

      carry = nextCarry;
    }

    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      multiplicand,
      multiplier,
      product,
      carry_mode: carryMode,
      input_from_left_to_right: inputFromLeftToRight,
      hundreds_digit: digits.length === 3 ? Number(digits[0]) : '',
      tens_digit: Number(digits[digits.length - 2]),
      ones_digit: Number(digits[digits.length - 1]),
      hundreds_product: steps.find((step) => step.placeName === 'hundreds')?.writeDigit ?? '',
      tens_product: steps.find((step) => step.placeName === 'tens')?.writeDigit ?? '',
      ones_product: steps.find((step) => step.placeName === 'ones')?.writeDigit ?? ''
    };

    const padCells = (values, targetLength) => {
      const items = [...values];
      while (items.length < targetLength) items.unshift('');
      return items;
    };

    const columnCount = Math.max(digits.length + 1, String(product).length);
    const topRow = padCells(digits, columnCount);
    const multiplierRow = padCells([String(multiplier)], columnCount);

    const renderCells = (values, highlightedIndex = -1, emptyColor = 'transparent') => values
      .map((value, idx) => {
        const display = value === '' ? '&nbsp;' : value;
        const color = value === '' ? emptyColor : (idx === highlightedIndex ? highlightColor : defaultColor);
        return `<span style="display:inline-block;width:22px;text-align:center;color:${color};">${display}</span>`;
      })
      .join('');

    const renderCarryCells = (values, highlightedIndex = -1) => values
      .map((value, idx) => {
        const display = value === '' ? '&nbsp;' : value;
        const color = value === '' ? 'transparent' : (idx === highlightedIndex ? highlightColor : '#16a34a');
        return `<span style="display:inline-block;width:22px;text-align:center;color:${color};min-height:20px;">${display}</span>`;
      })
      .join('');

    const buildCarryRow = (step) => {
      const row = Array.from({ length: columnCount }).fill('');
      for (const previousStep of steps) {
        if (previousStep.idx > step.idx && previousStep.nextCarry > 0) {
          const targetIndex = columnCount - digits.length + previousStep.idx - 1;
          if (targetIndex >= 0) row[targetIndex] = String(previousStep.nextCarry);
        }
      }
      return row;
    };

    const buildResultRow = (step) => {
      const resultDigits = Array.from({ length: columnCount }).fill('');
      let carryIntoFront = '';
      for (const currentStep of steps) {
        if (currentStep.idx >= step.idx) {
          const resultIndex = columnCount - digits.length + currentStep.idx;
          resultDigits[resultIndex] = String(currentStep.writeDigit);
        }
      }
      if (step.idx === 0 && step.nextCarry > 0) {
        carryIntoFront = String(step.nextCarry);
      }
      if (carryIntoFront) {
        const firstFilled = resultDigits.findIndex((value) => value !== '');
        const frontIndex = Math.max(0, firstFilled - 1);
        resultDigits[frontIndex] = carryIntoFront;
      }
      return resultDigits;
    };

    const renderStepHtml = (step) => {
      const highlightedTopIndex = columnCount - digits.length + step.idx;
      const highlightedCarryIndex = step.incomingCarry > 0 ? highlightedTopIndex - 1 : -1;
      const carryRow = buildCarryRow(step);
      const resultRow = buildResultRow(step);
      const highlightedResultIndex = resultRow.findIndex((value, idx) => idx >= highlightedTopIndex - (step.nextCarry > 0 ? 1 : 0) && value !== '');

      return `
        <div style="font-family: Arial, Verdana, sans-serif; line-height: 1.7; color: ${defaultColor};">
          <div style="display:inline-flex; flex-direction:column; align-items:flex-end; font-size:24px; font-weight:600;">
            <div style="letter-spacing:0.08em; min-height:22px;">
              ${renderCarryCells(carryRow, highlightedCarryIndex)}
            </div>
            <div style="letter-spacing:0.14em;">
              ${renderCells(topRow, highlightedTopIndex)}
            </div>
            <div style="letter-spacing:0.14em;">
              <span style="display:inline-block;width:22px;text-align:center;color:${defaultColor};">×</span>
              ${renderCells(multiplierRow, columnCount - 1)}
            </div>
            <div style="width:100%; border-top:2px solid ${defaultColor}; margin:4px 0 3px;"></div>
            <div style="letter-spacing:0.14em; min-height:32px;">
              ${renderCells(resultRow, highlightedResultIndex)}
            </div>
          </div>
        </div>
      `;
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;
    inst.showSubmitButton = true;
    inst.parts = [
      {
        type: 'text',
        content: question.questionText || question.question_text || 'Multiply.',
        isVertical: true
      },
      {
        type: 'verticalMultiply',
        id: 'ans',
        isVertical: true,
        layout: {
          v1: String(multiplicand),
          v2: String(multiplier),
          operator: '×',
          ans: String(product),
          inputFromLeftToRight
        }
      }
    ];

    const solution = [];
    for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
      const step = steps[stepIndex];
      const carrySentence = step.incomingCarry > 0
        ? ` Add the carried ${step.incomingCarry} to get ${step.total}.`
        : '';
      const writeSentence = step.nextCarry > 0
        ? ` Write ${step.writeDigit} and carry ${step.nextCarry}.`
        : ` Write ${step.writeDigit}.`;

      solution.push({
        type: 'text',
        content: `Multiply the ${step.placeName}.`,
        isVertical: true
      });
      solution.push({
        type: 'text',
        content: `${multiplier} × ${step.digit} = ${step.multiplied}.${carrySentence}${writeSentence}`,
        isVertical: true
      });
      solution.push({
        type: 'html',
        content: renderStepHtml(step),
        isVertical: true
      });
    }

    solution.push({
      type: 'text',
      content: `The product is ${product}.`,
      isVertical: true
    });

    inst.solution = solution;

    inst.correctAnswerText = JSON.stringify({ ans: String(product) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'multiplication_number_line_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const nRange = dataSource.n_range || [2, 6];
    const sRange = dataSource.s_range || [2, 8];

    let n, s;
    if (overrideVariables) {
      n = overrideVariables.n;
      s = overrideVariables.s;
    } else {
      n = Math.floor(Math.random() * (nRange[1] - nRange[0] + 1)) + nRange[0];
      s = Math.floor(Math.random() * (sRange[1] - sRange[0] + 1)) + sRange[0];
    }

    const p = n * s;
    const maxVal = Math.max(p + (s * 2), s * 6);
    const landedValues = Array.from({ length: n + 1 }, (_, idx) => idx * s);

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      n,
      s,
      p
    };

    const generateSvg = ({ highlightN = n, showJumpNumbers = false, showOnlyLandedLabels = true } = {}) => {
      const width = 820;
      const height = 200;
      const margin = 48;
      const xStart = margin;
      const xEnd = width - margin;
      const yLine = 112;
      const pixelsPerUnit = (xEnd - xStart) / maxVal;

      const getArrowHead = (x, y, color) => `
        <polygon points="${x},${y} ${x - 10},${y - 6} ${x - 2},${y - 14}" fill="${color}" />
      `;

      let jumpsSvg = '';
      for (let i = 0; i < n; i++) {
        const x1 = xStart + (i * s) * pixelsPerUnit;
        const x2 = xStart + ((i + 1) * s) * pixelsPerUnit;
        const xm = (x1 + x2) / 2;
        const h = 40;

        const path = `M ${x1} ${yLine} Q ${xm} ${yLine - h} ${x2} ${yLine}`;
        const isHighlighted = i < highlightN;
        const color = isHighlighted ? '#1787ff' : '#b7c5d9';
        const strokeWidth = isHighlighted ? 3.5 : 2.5;

        jumpsSvg += `
          <path d="${path}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" />
          ${getArrowHead(x2, yLine, color)}
        `;

        if (showJumpNumbers && i < highlightN) {
          jumpsSvg += `
            <circle cx="${xm}" cy="${yLine - h - 10}" r="16" fill="white" stroke="#3b82f6" stroke-width="2" />
            <text x="${xm}" y="${yLine - h - 4}" text-anchor="middle" fill="#3b82f6" font-size="14" font-weight="700">${i + 1}</text>
          `;
        }
      }

      let ticksSvg = '';
      for (let i = 0; i <= maxVal; i++) {
        const x = xStart + i * pixelsPerUnit;
        const isLanded = landedValues.includes(i);
        const isEndpoint = i === p;
        const tickHeight = isLanded ? 16 : 9;
        const shouldShowLabel = showOnlyLandedLabels ? isLanded : (isLanded || i % 5 === 0 || i === maxVal);

        ticksSvg += `<line x1="${x}" y1="${yLine - tickHeight}" x2="${x}" y2="${yLine + tickHeight}" stroke="#6b7280" stroke-width="2" />`;
        if (shouldShowLabel) {
          const labelWidth = Math.max(26, String(i).length * 12 + 8);
          const decoration = isEndpoint
            ? `<rect x="${x - (labelWidth / 2)}" y="${yLine + 24}" width="${labelWidth}" height="28" fill="white" stroke="#3b82f6" stroke-width="2" />`
            : '';
          ticksSvg += `
            ${decoration}
            <text x="${x}" y="${yLine + 44}" text-anchor="middle" fill="#374151" font-size="13" font-weight="${isEndpoint ? '700' : '500'}">${i}</text>
          `;
        }
      }

      return `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="number-line-svg" style="width: 100%; height: auto; max-width: 980px;">
          <line x1="${xStart - 20}" y1="${yLine}" x2="${xEnd + 20}" y2="${yLine}" stroke="#7b818c" stroke-width="3" />
          <polygon points="${xStart - 26},${yLine} ${xStart - 14},${yLine - 8} ${xStart - 14},${yLine + 8}" fill="#7b818c" />
          <polygon points="${xEnd + 26},${yLine} ${xEnd + 14},${yLine - 8} ${xEnd + 14},${yLine + 8}" fill="#7b818c" />
          ${ticksSvg}
          ${jumpsSvg}
        </svg>
      `;
    };

    inst.parts = [
      { type: 'text', content: 'Complete the multiplication number sentence that describes the model.', isVertical: true },
      { type: 'svg', content: generateSvg({ highlightN: n, showJumpNumbers: false, showOnlyLandedLabels: true }), isVertical: true },
      {
        type: 'pair',
        isVertical: false,
        parts: [
          { type: 'text', content: `${n} × ` },
          { type: 'digit_blank', id: 'ans', size: Math.max(1, String(s).length), answerType: 'number' },
          { type: 'text', content: ` = ${p}` }
        ]
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans: String(s) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    inst.solution = [
      { type: 'text', content: 'To understand the model, look at the arrows.', isVertical: true },
      { type: 'text', content: `The first arrow starts at 0. It ends at **${s}**. So, the length of each section on the number line is **${s}**.`, isVertical: true },
      { type: 'svg', content: generateSvg({ highlightN: 1, showJumpNumbers: false, showOnlyLandedLabels: true }), isVertical: true },
      { type: 'text', content: `Count by **${s}s**. Since there are **${n}** arrows, count forward **${n}** times.`, isVertical: true },
      { type: 'svg', content: generateSvg({ highlightN: n, showJumpNumbers: true, showOnlyLandedLabels: true }), isVertical: true },
      { type: 'text', content: `The last arrow ends at **${p}**. So, the multiplication number sentence that describes the model is **${n} × ${s} = ${p}**.`, isVertical: true },
      {
        type: 'html',
        isVertical: true,
        content: `
          <div style="display:flex;flex-direction:column;align-items:center;margin-top:20px;">
            <div style="font-size:48px;font-weight:800;color:#1e293b;display:flex;align-items:baseline;gap:20px;">
              <div>${n}</div>
              <div style="font-size:32px;color:#94a3b8;">×</div>
              <div>${s}</div>
              <div style="font-size:32px;color:#94a3b8;">=</div>
              <div>${p}</div>
            </div>
            <div style="display:flex;gap:40px;margin-top:10px;">
              <div style="text-align:center;width:80px;">
                <div style="font-size:24px;">↑</div>
                <div style="font-size:12px;color:#64748b;">Number of jumps</div>
              </div>
              <div style="text-align:center;width:80px;">
                <div style="font-size:24px;">↑</div>
                <div style="font-size:12px;color:#64748b;">Length of each jump</div>
              </div>
              <div style="text-align:center;width:80px;">
                <div style="font-size:24px;">↑</div>
                <div style="font-size:12px;color:#64748b;">End of the last jump</div>
              </div>
            </div>
          </div>
        `
      }
    ];
  }

  if (logic === 'box_method_multiplication_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const aRange = dataSource.factor_a_range || [11, 99];
    const bRange = dataSource.factor_b_range || [11, 99];
    const showCommas = dataSource.show_commas !== false;

    let factorA;
    let factorB;

    if (overrideVariables) {
      factorA = Number(overrideVariables.factor_a);
      factorB = Number(overrideVariables.factor_b);
    } else {
      factorA = Math.floor(Math.random() * (aRange[1] - aRange[0] + 1)) + aRange[0];
      factorB = Math.floor(Math.random() * (bRange[1] - bRange[0] + 1)) + bRange[0];
    }

    const aTensVal = Math.floor(factorA / 10) * 10;
    const aOnesVal = factorA % 10;
    const bTensVal = Math.floor(factorB / 10) * 10;
    const bOnesVal = factorB % 10;

    const formatNumber = (value) => showCommas ? Number(value).toLocaleString('en-IN') : String(value);
    const maskProduct = (value) => {
      const formatted = formatNumber(value);
      return formatted.replace(/\d/g, '?');
    };

    const cell00 = bTensVal * aTensVal;
    const cell01 = bTensVal * aOnesVal;
    const cell10 = bOnesVal * aTensVal;
    const cell11 = bOnesVal * aOnesVal;
    const rowSumTop = cell00 + cell01;
    const rowSumBottom = cell10 + cell11;
    const product = factorA * factorB;

    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      factor_a: factorA,
      factor_b: factorB,
      a_tens_val: aTensVal,
      a_ones_val: aOnesVal,
      b_tens_val: bTensVal,
      b_ones_val: bOnesVal,
      cell_00: formatNumber(cell00),
      cell_01: formatNumber(cell01),
      cell_10: formatNumber(cell10),
      cell_11: formatNumber(cell11),
      row_sum_top: formatNumber(rowSumTop),
      row_sum_bottom: formatNumber(rowSumBottom),
      product: formatNumber(product),
      product_masked: maskProduct(product)
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;
    inst.showSubmitButton = true;

    inst.parts = [
      {
        type: 'text',
        content: `Use the box method to find ${factorA} × ${factorB}.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `<em>Calculate the sums on the right. Add these sums to find ${factorA} × ${factorB}.</em>`,
        isVertical: true
      },
      {
        type: 'text',
        content: `${factorA} × ${factorB} = ${maskProduct(product)}`,
        isVertical: true
      },
      {
        type: 'boxMethodMultiply',
        isVertical: true,
        layout: {
          top_parts: [String(aTensVal), String(aOnesVal)],
          left_parts: [String(bTensVal), String(bOnesVal)],
          cells: [
            formatNumber(cell00),
            formatNumber(cell01),
            formatNumber(cell10),
            formatNumber(cell11)
          ],
          sum_inputs: [
            { id: 'row_sum_top', size: 'large', active: true },
            { id: 'row_sum_bottom', size: 'large' }
          ],
          final_input: { id: 'ans', size: 'large' },
          row_sums: [formatNumber(rowSumTop), formatNumber(rowSumBottom)],
          final_product: formatNumber(product),
          show_commas: showCommas,
          show_place_guides: true
        }
      }
    ];

    inst.solution = [
      {
        type: 'text',
        content: 'Break each factor into tens and ones.',
        isVertical: true
      },
      {
        type: 'text',
        content: `${factorA} = ${aTensVal} + ${aOnesVal} and ${factorB} = ${bTensVal} + ${bOnesVal}.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Find each box product: ${bTensVal} × ${aTensVal} = ${formatNumber(cell00)}, ${bTensVal} × ${aOnesVal} = ${formatNumber(cell01)}, ${bOnesVal} × ${aTensVal} = ${formatNumber(cell10)}, and ${bOnesVal} × ${aOnesVal} = ${formatNumber(cell11)}.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Add across the rows: ${formatNumber(cell00)} + ${formatNumber(cell01)} = ${formatNumber(rowSumTop)} and ${formatNumber(cell10)} + ${formatNumber(cell11)} = ${formatNumber(rowSumBottom)}.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Finally, ${formatNumber(rowSumTop)} + ${formatNumber(rowSumBottom)} = ${formatNumber(product)}.`,
        isVertical: true
      }
    ];

    inst.correctAnswerText = JSON.stringify({
      row_sum_top: formatNumber(rowSumTop),
      row_sum_bottom: formatNumber(rowSumBottom),
      ans: formatNumber(product)
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'missing_factor_groups_of_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const groupRange = dataSource.group_count_range || [2, 5];
    const perGroupRange = dataSource.per_group_range || [1, 5];

    let groupCount, perGroup;
    if (overrideVariables) {
      groupCount = overrideVariables.group_count;
      perGroup = overrideVariables.per_group;
    } else {
      groupCount = Math.floor(Math.random() * (groupRange[1] - groupRange[0] + 1)) + groupRange[0];
      perGroup = Math.floor(Math.random() * (perGroupRange[1] - perGroupRange[0] + 1)) + perGroupRange[0];
    }

    const totalVal = groupCount * perGroup;
    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      group_count: groupCount,
      per_group: perGroup,
      total_val: totalVal
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    inst.parts = [
      {
        type: 'text',
        content: question.questionText || question.question_text || 'Fill in the missing number.',
        isVertical: true
      },
      {
        type: 'pair',
        isVertical: false,
        parts: [
          { type: 'text', content: `${groupCount} groups of ` },
          { type: 'digit_blank', id: 'ans', size: Math.max(1, String(perGroup).length), answerType: 'number' },
          { type: 'text', content: ` equal ${totalVal}.` }
        ]
      }
    ];

    const multiplicationFacts = [];
    for (let i = 1; i <= perGroup; i += 1) {
      multiplicationFacts.push(`${groupCount} × ${i} = ${groupCount * i}`);
    }

    inst.solution = [
      {
        type: 'text',
        content: 'You can use multiplication to find the missing number.',
        isVertical: true
      },
      {
        type: 'text',
        content: 'This multiplication number sentence describes the problem:',
        isVertical: true
      },
      {
        type: 'text',
        content: `**${groupCount} × ? = ${totalVal}**`,
        isVertical: true
      },
      {
        type: 'text',
        content: `(${groupCount} groups) × (number in each group) = (${totalVal} total)`,
        isVertical: true
      },
      {
        type: 'text',
        content: `To find the number in each group, list multiplication facts for **${groupCount}** until you reach **${totalVal}**:`,
        isVertical: true
      },
      {
        type: 'text',
        content: multiplicationFacts.map((fact) => `- ${fact}`).join('\n'),
        isVertical: true
      },
      {
        type: 'text',
        content: `${groupCount} groups of **${perGroup}** equal **${totalVal}**.`,
        isVertical: true
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans: String(perGroup) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'missing_number_of_groups_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const groupRange = dataSource.group_count_range || [2, 5];
    const perGroupRange = dataSource.per_group_range || [2, 5];

    let groupCount, perGroup;
    if (overrideVariables) {
      groupCount = overrideVariables.group_count;
      perGroup = overrideVariables.per_group;
    } else {
      groupCount = Math.floor(Math.random() * (groupRange[1] - groupRange[0] + 1)) + groupRange[0];
      perGroup = Math.floor(Math.random() * (perGroupRange[1] - perGroupRange[0] + 1)) + perGroupRange[0];
    }

    const totalVal = groupCount * perGroup;
    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      group_count: groupCount,
      per_group: perGroup,
      total_val: totalVal
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    inst.parts = [
      {
        type: 'text',
        content: question.questionText || question.question_text || 'Fill in the missing number.',
        isVertical: true
      },
      {
        type: 'pair',
        isVertical: false,
        parts: [
          { type: 'digit_blank', id: 'ans', size: Math.max(1, String(groupCount).length), answerType: 'number' },
          { type: 'text', content: ` groups of ${perGroup} equal ${totalVal}.` }
        ]
      }
    ];

    const skipCounts = [];
    for (let i = 1; i <= groupCount; i += 1) {
      const verb = i === 1 ? 'is' : 'are';
      skipCounts.push(`${i} group${i === 1 ? '' : 's'} of ${perGroup} ${verb} ${i * perGroup}`);
    }

    inst.solution = [
      {
        type: 'text',
        content: 'You can use multiplication to find the missing number.',
        isVertical: true
      },
      {
        type: 'text',
        content: 'This multiplication number sentence describes the problem:',
        isVertical: true
      },
      {
        type: 'text',
        content: `**? × ${perGroup} = ${totalVal}**`,
        isVertical: true
      },
      {
        type: 'text',
        content: `(Number of groups) × (number in each group) = (${totalVal} total)`,
        isVertical: true
      },
      {
        type: 'text',
        content: `To find the number of groups, skip count by **${perGroup}** until you reach **${totalVal}**:`,
        isVertical: true
      },
      {
        type: 'text',
        content: skipCounts.map((line) => `- ${line}`).join('\n'),
        isVertical: true
      },
      {
        type: 'text',
        content: `Since it takes **${groupCount}** groups of **${perGroup}** to make **${totalVal}**, the missing number is **${groupCount}**.`,
        isVertical: true
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans: String(groupCount) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'multiplication_sentence_from_factors_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const targetRange = dataSource.product_target_range || [12, 48];
    const itemCount = Math.max(4, Number(dataSource.item_count || 4));

    let boxNumbers, productTarget, factor1, factor2;

    if (overrideVariables) {
      boxNumbers = Array.isArray(overrideVariables.box_numbers) ? overrideVariables.box_numbers : [];
      productTarget = overrideVariables.product_target;
      factor1 = overrideVariables.factor_1;
      factor2 = overrideVariables.factor_2;
    } else {
      const possiblePairs = [];
      for (let a = 2; a <= 12; a += 1) {
        for (let b = a; b <= 12; b += 1) {
          const p = a * b;
          if (p >= targetRange[0] && p <= targetRange[1]) {
            possiblePairs.push({ a, b, p });
          }
        }
      }
      const picked = possiblePairs[Math.floor(Math.random() * possiblePairs.length)];
      factor1 = picked.a;
      factor2 = picked.b;
      productTarget = picked.p;

      const pool = new Set([factor1, factor2]);
      let attempts = 0;
      while (pool.size < itemCount && attempts < 100) {
        const candidate = Math.floor(Math.random() * 11) + 2;
        if (candidate !== factor1 && candidate !== factor2) pool.add(candidate);
        attempts += 1;
      }
      boxNumbers = Array.from(pool);
      for (let i = boxNumbers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [boxNumbers[i], boxNumbers[j]] = [boxNumbers[j], boxNumbers[i]];
      }
    }

    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      box_numbers: boxNumbers,
      product_target: productTarget,
      factor_1: factor1,
      factor_2: factor2
    };
    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    inst.parts = [
      {
        type: 'text',
        content: 'Choose two numbers from the box to complete the multiplication number sentence.',
        isVertical: true
      },
      {
        type: 'box_display',
        content: boxNumbers,
        isVertical: true
      },
      {
        type: 'pair',
        isVertical: false,
        parts: [
          { type: 'input', id: 'ans_1', size: 'small', answerType: 'number', maxLength: String(factor1).length },
          { type: 'text', content: ' × ' },
          { type: 'input', id: 'ans_2', size: 'small', answerType: 'number', maxLength: String(factor2).length },
          { type: 'text', content: ` = ${productTarget}` }
        ]
      }
    ];

    inst.solution = [
      {
        type: 'text',
        content: `Look for numbers in the box that are factors of **${productTarget}**.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Pick a number: **${factor1}** is in the box. Is it a factor?`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Test it: What number can you multiply by **${factor1}** to get **${productTarget}**?`,
        isVertical: true
      },
      {
        type: 'text',
        content: `**${factor1} × ${factor2} = ${productTarget}**`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Check the box: Is **${factor2}** also in the box? Yes!`,
        isVertical: true
      },
      {
        type: 'text',
        content: `The multiplication number sentence is **${factor1} × ${factor2} = ${productTarget}**.`,
        isVertical: true
      }
    ];

    inst.correctAnswerText = JSON.stringify({
      ans_1: [String(factor1), String(factor2)],
      ans_2: [String(factor2), String(factor1)]
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'multiplication_true_false_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const aRange = dataSource.factor_a_range || [2, 9];
    const bRange = dataSource.factor_b_range || [2, 9];
    const falseProbability = Number.isFinite(Number(dataSource.make_false_probability))
      ? Number(dataSource.make_false_probability)
      : 0.5;
    const offsetRange = dataSource.false_offset_range || [1, 9];

    let factorA, factorB, shownResult, actualResult, isTrueSentence;
    if (overrideVariables) {
      factorA = Number(overrideVariables.factor_a);
      factorB = Number(overrideVariables.factor_b);
      actualResult = Number(overrideVariables.actual_result);
      shownResult = Number(overrideVariables.shown_result);
      isTrueSentence = String(overrideVariables.is_true_sentence) === 'true';
    } else {
      factorA = Math.floor(Math.random() * (aRange[1] - aRange[0] + 1)) + aRange[0];
      factorB = Math.floor(Math.random() * (bRange[1] - bRange[0] + 1)) + bRange[0];
      actualResult = factorA * factorB;
      isTrueSentence = Math.random() >= falseProbability;

      if (isTrueSentence) {
        shownResult = actualResult;
      } else {
        const minOffset = Math.max(1, Number(offsetRange[0] || 1));
        const maxOffset = Math.max(minOffset, Number(offsetRange[1] || minOffset));
        let offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
        if (Math.random() > 0.5) offset *= -1;
        if (actualResult + offset <= 0) offset = Math.abs(offset);
        if (offset === 0) offset = 1;
        shownResult = actualResult + offset;
      }
    }

    const templateVars = {
      factor_a: factorA,
      factor_b: factorB,
      actual_result: actualResult,
      shown_result: shownResult,
      correct_label: isTrueSentence ? 'true' : 'false',
      correct_index: isTrueSentence ? 0 : 1,
      is_true_sentence: String(isTrueSentence),
      solution_sentence: isTrueSentence
        ? `The number sentence is **true** because both sides are equal.`
        : `The number sentence is **false** because its two sides are not equal.`,
      multiplication_check: `${factorA} × ${factorB} = ${actualResult}${isTrueSentence ? '' : `, not ${shownResult}`}.`
    };

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars
    };

    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      {
        type: 'text',
        content: '{factor_a} × {factor_b} = {shown_result}',
        isVertical: true
      }
    ], templateVars);

    const hydratedOptions = hydrateNode(question.options && question.options.length > 0 ? question.options : [
      { label: 'true', value: 'true' },
      { label: 'false', value: 'false' }
    ], templateVars);
    inst.options = hydratedOptions;
    inst.correctAnswerIndex = templateVars.correct_index;
    inst.correctAnswerText = templateVars.correct_label;
    inst.solution = hydrateNode(question.solution && question.solution.length > 0 ? question.solution : [
      {
        type: 'text',
        content: 'A number sentence is true if its two sides are equal.',
        isVertical: true
      },
      {
        type: 'text',
        content: '{solution_sentence}',
        isVertical: true
      },
      {
        type: 'text',
        content: '{multiplication_check}',
        isVertical: true
      }
    ], templateVars);
  }

  if (logic === 'multiplication_equation_true_false_v2') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const leftARange = dataSource.factor_a_range || [2, 9];
    const leftBRange = dataSource.factor_b_range || [2, 9];
    const rightARange = dataSource.factor_c_range || [2, 9];
    const rightBRange = dataSource.factor_d_range || [2, 9];
    const makeTrueProbability = Number.isFinite(Number(dataSource.make_true_probability))
      ? Number(dataSource.make_true_probability)
      : 0.5;
    const allowCommutativeTrue = dataSource.allow_commutative_true !== false;

    let leftA, leftB, rightA, rightB, leftProduct, rightProduct, isTrueSentence;

    if (overrideVariables) {
      leftA = Number(overrideVariables.left_a);
      leftB = Number(overrideVariables.left_b);
      rightA = Number(overrideVariables.right_a);
      rightB = Number(overrideVariables.right_b);
      leftProduct = Number(overrideVariables.left_product);
      rightProduct = Number(overrideVariables.right_product);
      isTrueSentence = String(overrideVariables.is_true_sentence) === 'true';
    } else {
      leftA = Math.floor(Math.random() * (leftARange[1] - leftARange[0] + 1)) + leftARange[0];
      leftB = Math.floor(Math.random() * (leftBRange[1] - leftBRange[0] + 1)) + leftBRange[0];
      leftProduct = leftA * leftB;
      isTrueSentence = Math.random() < makeTrueProbability;

      if (isTrueSentence) {
        const equalChoices = [];
        for (let a = rightARange[0]; a <= rightARange[1]; a += 1) {
          for (let b = rightBRange[0]; b <= rightBRange[1]; b += 1) {
            if ((a * b) !== leftProduct) continue;
            if (!allowCommutativeTrue && a === leftA && b === leftB) continue;
            equalChoices.push([a, b]);
          }
        }

        if (equalChoices.length > 0) {
          [rightA, rightB] = equalChoices[Math.floor(Math.random() * equalChoices.length)];
        } else {
          rightA = leftA;
          rightB = leftB;
        }
      } else {
        let attempts = 0;
        do {
          rightA = Math.floor(Math.random() * (rightARange[1] - rightARange[0] + 1)) + rightARange[0];
          rightB = Math.floor(Math.random() * (rightBRange[1] - rightBRange[0] + 1)) + rightBRange[0];
          attempts += 1;
        } while ((rightA * rightB) === leftProduct && attempts < 100);
      }

      rightProduct = rightA * rightB;
      isTrueSentence = leftProduct === rightProduct;
    }

    const templateVars = {
      left_a: leftA,
      left_b: leftB,
      right_a: rightA,
      right_b: rightB,
      left_product: leftProduct,
      right_product: rightProduct,
      correct_label: isTrueSentence ? 'true' : 'false',
      correct_index: isTrueSentence ? 0 : 1,
      is_true_sentence: String(isTrueSentence),
      solution_sentence: isTrueSentence
        ? 'The number sentence is **true** because its two sides are equal.'
        : 'The number sentence is **false** because its two sides are not equal.',
      comparison_sentence: isTrueSentence
        ? `${leftA} × ${leftB} equals ${rightA} × ${rightB}.`
        : `${leftA} × ${leftB} does not equal ${rightA} × ${rightB}.`
    };

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      ...templateVars
    };

    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      {
        type: 'text',
        content: '{left_a} × {left_b} = {right_a} × {right_b}',
        isVertical: true
      }
    ], templateVars);

    inst.options = hydrateNode(question.options && question.options.length > 0 ? question.options : [
      { label: 'true', value: 'true' },
      { label: 'false', value: 'false' }
    ], templateVars);
    inst.correctAnswerIndex = templateVars.correct_index;
    inst.correctAnswerText = templateVars.correct_label;
    inst.solution = hydrateNode(question.solution && question.solution.length > 0 ? question.solution : [
      {
        type: 'text',
        content: 'A number sentence is true if its two sides are equal.',
        isVertical: true
      },
      {
        type: 'text',
        content: '{solution_sentence}',
        isVertical: true
      },
      {
        type: 'text',
        content: 'On the left side, {left_a} × {left_b} = **{left_product}**.',
        isVertical: true
      },
      {
        type: 'text',
        content: 'On the right side, {right_a} × {right_b} = **{right_product}**.',
        isVertical: true
      },
      {
        type: 'text',
        content: '{comparison_sentence}',
        isVertical: true
      }
    ], templateVars);
  } if (logic === 'addition_basic_v1') {
    const ds = question.data_source || inst.adaptiveConfig?.data_source || {};
    const rangeA = ds.range_a || [1, 9];
    const rangeB = ds.range_b || [1, 9];

    let a, b;
    if (overrideVariables) {
      a = overrideVariables.num1 || overrideVariables.a;
      b = overrideVariables.num2 || overrideVariables.b;
    } else {
      a = Math.floor(Math.random() * (rangeA[1] - rangeA[0] + 1)) + rangeA[0];
      b = Math.floor(Math.random() * (rangeB[1] - rangeB[0] + 1)) + rangeB[0];
    }

    const sum = a + b;

    inst.type = 'fillInTheBlank';
    inst.parts = [
      { type: 'text', content: ds.instruction || 'Add.', hasAudio: true },
      {
        type: 'pair',
        parts: [
          { type: 'text', content: `**${a} + ${b} = **` },
          { type: 'digit_blank', id: 'ans_1', size: String(sum).length }
        ]
      }
    ];

    inst.solution = [
      {
        type: 'section',
        label: 'solve',
        contentParts: [
          { type: 'text', content: `To find the sum of **${a}** and **${b}**, you can count forward from ${Math.max(a, b)}.` },
          { type: 'text', content: `**${a} + ${b} = ${sum}**` }
        ]
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans_1: String(sum) });
    inst.adaptiveConfig.variables = { a, b, num1: a, num2: b, sum, result: sum };
    return inst;
  }

  if (logic === 'arithmetic_template_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const vars = inst.adaptiveConfig?.variables || {};
    const operation = vars.operation || dataSource.operation || (Math.random() > 0.5 ? 'addition' : 'subtraction');
    const digits = dataSource.digits || 3;
    const range = digits === 3 ? [100, 999] : [1000, 9999];

    let n1 = vars.num1 || (Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
    let n2 = vars.num2 || (Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);

    if (operation === 'subtraction' && !vars.num1) {
      if (n1 < n2) [n1, n2] = [n2, n1];
    }

    const result = operation === 'addition' ? n1 + n2 : n1 - n2;
    const resStr = String(result);
    const n1Str = String(n1);
    const n2Str = String(n2);

    // Determine max columns needed
    const maxLen = Math.max(n1Str.length, n2Str.length, resStr.length);

    const getCellsForNum = (num) => {
      return String(num).split('').map((char) => ({
        kind: 'fixed',
        value: char
      }));
    };

    const answerCells = [];
    const correctPayload = {};
    const resArr = resStr.split('');
    const resPadding = Math.max(0, maxLen - resArr.length);

    for (let i = 0; i < maxLen; i++) {
      const cellId = `a_${i}`;
      answerCells.push({ id: cellId, type: 'digit' });

      // Map result digits from left to right, considering padding
      const resIdx = i - resPadding;
      correctPayload[cellId] = resIdx >= 0 ? resArr[resIdx] : "";
    }

    const rows = [
      {
        kind: 'answer',
        cells: getCellsForNum(n1)
      },
      {
        kind: 'answer',
        prefix: operation === 'addition' ? '+' : '-',
        cells: getCellsForNum(n2)
      },
      { kind: 'divider' },
      {
        kind: 'answer',
        cells: answerCells
      }
    ];

    const arithmeticPart = {
      type: 'arithmeticLayout',
      isVertical: true,
      layout: {
        mode: 'placeValue',
        inputMode: 'digitPad',
        rows: rows
      }
    };

    inst.parts = [
      ...(question.parts || []).filter(p => p.type !== 'arithmeticLayout'),
      arithmeticPart
    ];

    inst.correctAnswerText = JSON.stringify(correctPayload);
    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      num1: n1, num2: n2, result, operation
    };
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    // Auto-generate solution text if not provided
    if (!inst.solution || inst.solution === "[]") {
      inst.solution = `${n1} ${operation === 'addition' ? '+' : '-'} ${n2} = ${result}`;
    }
  }

  if (logic === 'base_ten_blocks_v1') {
    let number;
    let dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 9999] };
    let range = dataSource.range || [100, 9999];

    if (overrideVariables) {
      number = overrideVariables.number;
    } else {
      number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const th = Math.floor(number / 1000);
    const h = Math.floor((number % 1000) / 100);
    const t = Math.floor((number % 100) / 10);
    const o = number % 10;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      number,
      thousand_count: th,
      hundred_count: h,
      ten_count: t,
      one_count: o
    };

    const templateVars = {
      ...inst.adaptiveConfig.variables,
      number_formatted: number.toLocaleString('en-IN')
    };

    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    } else {
      inst.solution = `Showing ${th} thousands, ${h} hundreds, ${t} tens and ${o} ones. Total number is ${number}.`;
    }

    const answerPayload = JSON.stringify({ ans: String(number) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'base_ten_model_selection_v1') {
    let targetNum, distractorNum;

    if (overrideVariables) {
      targetNum = overrideVariables.target_num;
      distractorNum = overrideVariables.distractor_num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      targetNum = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      const placeStep = targetNum >= 100 ? 100 : 10;
      const upDist = targetNum + placeStep;
      const downDist = targetNum - placeStep;
      const isUpValid = upDist <= range[1];
      const isDownValid = downDist >= range[0];

      if (isUpValid && isDownValid) {
        distractorNum = Math.random() < 0.5 ? upDist : downDist;
      } else if (isUpValid) {
        distractorNum = upDist;
      } else {
        distractorNum = downDist;
      }
    }

    const decomposeBaseTen = (num) => ({
      thousands: Math.floor(num / 1000),
      hundreds: Math.floor((num % 1000) / 100),
      tens: Math.floor((num % 100) / 10),
      ones: num % 10,
    });

    const targetModel = decomposeBaseTen(targetNum);
    const distractorModel = decomposeBaseTen(distractorNum);

    const tThousands = targetModel.thousands;
    const tHundreds = targetModel.hundreds;
    const tTens = targetModel.tens;
    const tOnes = targetNum % 10;
    const dThousands = distractorModel.thousands;
    const dHundreds = distractorModel.hundreds;
    const dTens = distractorModel.tens;
    const dOnes = distractorModel.ones;



    const shuffledOrder = [0, 1];

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      target_num: targetNum,
      target_thousands: tThousands,
      target_hundreds: tHundreds,
      target_tens: tTens,
      target_ones: tOnes,
      distractor_num: distractorNum,
      distractor_thousands: dThousands,
      distractor_hundreds: dHundreds,
      distractor_tens: dTens,
      distractor_ones: dOnes,
      shuffled_order: shuffledOrder
    };

    const baseTenVars = inst.adaptiveConfig.variables;

    let customOptions = [];
    if (question.options && question.options.length > 0) {
      customOptions = hydrateNode(question.options, baseTenVars).map(o => ({
        ...o,
        parts: o.parts,
        label: o.label || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? String(targetNum) : String(distractorNum)),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      customOptions = [
        {
          parts: [{ type: "baseTenBlocks", thousands: tThousands, hundreds: tHundreds, tens: tTens, ones: tOnes, variant: "green" }],
          label: String(targetNum),
          isCorrect: true
        },
        {
          parts: [{ type: "baseTenBlocks", thousands: dThousands, hundreds: dHundreds, tens: dTens, ones: dOnes, variant: "purple" }],
          label: String(distractorNum),
          isCorrect: false
        }
      ];
    }

    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Which place-value model shows {target_num}?" }
    ], baseTenVars);

    const shuffled = shuffledOrder.map(idx => customOptions[idx]);

    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    // Solution
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, baseTenVars);
    } else {
      // Dynamic solution based on shuffled order
      const model1Val = shuffled[0].label;
      const model2Val = shuffled[1].label;
      const model1Tens = Math.floor(Number(model1Val) / 10);
      const model2Tens = Math.floor(Number(model2Val) / 10);
      const ones = targetNum % 10;

      inst.solution = [
        { type: "text", content: "**Find the model that shows {target_num}.**" },
        { type: "text", content: `**Option 1:** This model has **${model1Tens} tens** and **${ones} ones**. It shows **${model1Val}**.` },
        { type: "text", content: `**Option 2:** This model has **${model2Tens} tens** and **${ones} ones**. It shows **${model2Val}**.` }
      ].map(p => hydrateNode(p, baseTenVars));
    }

    inst.type = 'mcq';
    inst.isVertical = true;
    const answerPayload = JSON.stringify({ ans_value: String(targetNum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }



  if (logic === 'which_model_matches_number_v1') {
    let targetNum, distractorNum, targetColor, distractorColor, isTargetOptionA;

    if (overrideVariables) {
      targetNum = overrideVariables.target_num;
      distractorNum = overrideVariables.distractor_num;
      targetColor = overrideVariables.target_color || "green";
      distractorColor = overrideVariables.distractor_color || "purple";
      isTargetOptionA = overrideVariables.is_target_option_a ?? true;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      targetNum = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      // Dynamic offsets based on range
      let offsets = [1, 10];
      if (range[1] >= 100) offsets.push(100);
      if (range[1] >= 1000) offsets.push(1000);

      let validDistractors = offsets.map(opt => targetNum + opt).filter(val => val <= range[1]);
      if (validDistractors.length === 0) {
        validDistractors = offsets.map(opt => targetNum - opt).filter(val => val >= range[0]);
      }
      // If still no valid distractors (rare), just pick a random number in range
      if (validDistractors.length === 0) {
        validDistractors = [targetNum === range[0] ? range[0] + 1 : range[0]];
      }
      distractorNum = validDistractors[Math.floor(Math.random() * validDistractors.length)];

      targetColor = Math.random() < 0.5 ? "green" : "purple";
      distractorColor = targetColor === "green" ? "purple" : "green";
      isTargetOptionA = Math.random() < 0.5;
    }

    const tThousands = Math.floor(targetNum / 1000);
    const tHundreds = Math.floor((targetNum % 1000) / 100);
    const tTens = Math.floor((targetNum % 100) / 10);
    const tOnes = targetNum % 10;

    const dThousands = Math.floor(distractorNum / 1000);
    const dHundreds = Math.floor((distractorNum % 1000) / 100);
    const dTens = Math.floor((distractorNum % 100) / 10);
    const dOnes = distractorNum % 10;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      target_num: targetNum,
      target_thousands: tThousands,
      target_hundreds: tHundreds,
      target_tens: tTens,
      target_ones: tOnes,
      distractor_num: distractorNum,
      distractor_thousands: dThousands,
      distractor_hundreds: dHundreds,
      distractor_tens: dTens,
      distractor_ones: dOnes,
      target_color: targetColor,
      distractor_color: distractorColor,
      option_a_color: isTargetOptionA ? targetColor : distractorColor,
      option_b_color: isTargetOptionA ? distractorColor : targetColor,
      is_target_option_a: isTargetOptionA,
    };

    inst.adaptiveConfig.variables = customVars;

    let customOptions = [];
    if (question.options && question.options.length > 0) {
      customOptions = hydrateNode(question.options, customVars).map(o => ({
        ...o,
        parts: o.parts ? o.parts : [{ type: 'text', content: o.label || o.content }],
        label: o.label || o.content || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? String(targetNum) : String(distractorNum)),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      customOptions = [
        {
          label: String(targetNum),
          parts: [{
            type: 'baseTenBlocks',
            thousands: tThousands,
            hundreds: tHundreds,
            tens: tTens,
            ones: tOnes,
            variant: targetColor
          }],
          isCorrect: true
        },
        {
          label: String(distractorNum),
          parts: [{
            type: 'baseTenBlocks',
            thousands: dThousands,
            hundreds: dHundreds,
            tens: dTens,
            ones: dOnes,
            variant: distractorColor
          }],
          isCorrect: false
        }
      ];
    }

    let shuffledOrder;
    if (overrideVariables && overrideVariables.shuffled_order) {
      shuffledOrder = overrideVariables.shuffled_order;
    } else {
      shuffledOrder = isTargetOptionA ? [0, 1] : [1, 0];
    }
    inst.adaptiveConfig.variables.shuffled_order = shuffledOrder;

    const shuffled = shuffledOrder.map(idx => customOptions[Number(idx)]);
    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Which place-value model shows **{target_num}**?" }
    ], customVars);

    // Build a dynamic solution if none provided or if it needs more detail
    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsed, customVars);
    } else {
      // Procedural fallback solution
      const breakdown = [];
      if (tThousands > 0) breakdown.push(`**${tThousands}** thousands (cubes)`);
      if (tHundreds > 0) breakdown.push(`**${tHundreds}** hundreds (flats)`);
      if (tTens > 0) breakdown.push(`**${tTens}** tens (rods)`);
      if (tOnes > 0) breakdown.push(`**${tOnes}** ones (units)`);

      inst.solution = [
        { type: "text", content: "### Solution Strategy", isVertical: true },
        { type: "text", content: `To find **${targetNum}**, break it into its place values:`, isVertical: true },
        { type: "text", content: breakdown.map(b => `- ${b}`).join('\n'), isVertical: true },
        { type: "text", content: `The **${targetColor}** model matches this breakdown, showing **${targetNum}**.`, isVertical: true }
      ];
    }

    inst.type = 'mcq';
    inst.isVertical = false;
    const answerPayload = JSON.stringify({ ans: String(targetNum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }
  if (logic === 'derivatives_of_square_root_compositions_v1') {
    let a, b;
    if (overrideVariables) {
      a = overrideVariables.a;
      b = overrideVariables.b;
    } else {
      a = Math.floor(Math.random() * 8) + 2; // 2 to 9
      if (Math.random() < 0.3) a = -a;

      b = Math.floor(Math.random() * 18) - 9; // -9 to 9
      if (b === 0) b = 5;
    }

    const aStr = a === 1 ? 'x' : (a === -1 ? '-x' : `${a}x`);
    const sign = b > 0 ? '+' : '-';
    let inner_f = `${aStr} ${sign} ${Math.abs(b)}`;

    const combined_f = `\\sqrt{${inner_f}}`;
    const deriv_inner = `${a}`;
    const final_ans = `\\frac{${deriv_inner}}{2\\sqrt{${inner_f}}}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      a,
      b,
      inner_f,
      combined_f,
      deriv_inner,
      final_ans
    };

    inst.adaptiveConfig.variables = customVars;

    // Use scaffold by default unless explicitly disabled, or if explicitly requested via adaptiveConfig
    const useScaffold = inst.adaptiveConfig?.useScaffold !== false;

    if (!useScaffold) {
      // Symbolic Mode: Single big input for the full LaTeX string
      inst.parts = [
        { type: 'text', content: 'Find the derivative of $f(x)$.', hasAudio: true },
        { type: 'mathLatex', content: `f(x) = ${combined_f}`, isDisplayMode: true },
        {
          type: 'sequence',
          children: [
            { type: 'text', content: 'f\'(x) = ' },
            {
              type: 'blank',
              id: 'ans',
              width: 350,
              placeholder: 'Type your answer...'
            }
          ]
        }
      ];

      // Inject the symbolic keypad
      inst.adaptiveConfig.showKeypad = true;
      inst.adaptiveConfig.keypadKeys = [
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="18" y2="12"/><rect x="8" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>', value: '\\frac{}{}', id: 'frac' },
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h2l3 9 4-18h10"/></svg>', value: '\\sqrt{}', id: 'sqrt' },
        'x', '(', ')', '+', '-', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '⌫'
      ];

      inst.correctAnswerText = JSON.stringify({ ans: final_ans.replace(/\s+/g, '') });
    } else {
      // Scaffold Mode: Fraction and Sqrt structure pre-provided as separate inputs
      inst.parts = hydrateNode(question.parts || [], customVars);
      inst.correctAnswerText = JSON.stringify({
        n: deriv_inner,
        d: inner_f.replace(/\s+/g, '')
      });
    }

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'base_ten_matching_v1') {
    let target_num;
    if (overrideVariables) {
      target_num = overrideVariables.target_num;
    } else {
      const min = inst.adaptiveConfig?.data_source?.range?.[0] || 1000;
      const max = inst.adaptiveConfig?.data_source?.range?.[1] || 9999;
      target_num = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const t_digit = Math.floor(target_num / 1000);
    const h_digit = Math.floor((target_num % 1000) / 100);
    const te_digit = Math.floor((target_num % 100) / 10);
    const o_digit = target_num % 10;

    // Distractor swaps Hundreds and Tens
    const distractor_num = t_digit * 1000 + te_digit * 100 + h_digit * 10 + o_digit;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      target_num,
      t_digit,
      h_digit,
      te_digit,
      o_digit,
      distractor_num
    };

    inst.adaptiveConfig.variables = customVars;

    // Build the MCQ parts
    let shuffledOrder = inst.adaptiveConfig?.shuffled_order;
    if (overrideVariables && overrideVariables.shuffled_order) {
      shuffledOrder = overrideVariables.shuffled_order;
    }
    if (!shuffledOrder) {
      // 0 is correct, 1 is distractor
      shuffledOrder = Math.random() < 0.5 ? [0, 1] : [1, 0];
    }
    inst.adaptiveConfig.shuffled_order = shuffledOrder;
    const order = inst.adaptiveConfig.shuffled_order;

    const correctOption = {
      type: 'baseTenBlocks',
      thousands: t_digit,
      hundreds: h_digit,
      tens: te_digit,
      ones: o_digit,
      variant: 'green'
    };

    const distractorOption = {
      type: 'baseTenBlocks',
      thousands: t_digit,
      hundreds: te_digit, // Swapped
      tens: h_digit,      // Swapped
      ones: o_digit,
      variant: 'blue'
    };

    const optionsArray = [correctOption, distractorOption];
    inst.options = [optionsArray[order[0]], optionsArray[order[1]]];
    inst.correctAnswerIndex = order.indexOf(0);

    inst.parts = hydrateNode(question.parts || [], customVars);
    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'mcq';
  }

  if (logic === 'derivatives_of_rational_functions_single_term_v1') {
    let num_a, num_b, power_n;
    if (overrideVariables) {
      num_a = overrideVariables.num_a;
      num_b = overrideVariables.num_b;
      power_n = overrideVariables.power_n;
    } else {
      num_a = Math.floor(Math.random() * 8) + 2;
      num_b = Math.floor(Math.random() * 9) + 1;
      power_n = Math.floor(Math.random() * 4) + 2;
    }

    const f_x = `\\frac{${num_a}x^{${power_n}} + ${num_b}}{x^{${power_n}}}`;
    const simplified_f_x = `${num_a} + x^{-${power_n}}`; // if num_b is 1, keep it clean
    const step1_f = `\\frac{${num_a}x^{${power_n}}}{x^{${power_n}}} + \\frac{${num_b}}{x^{${power_n}}}`;
    const simplified_final = num_b === 1 ? `${num_a} + x^{-${power_n}}` : `${num_a} + ${num_b}x^{-${power_n}}`;

    const coeff = -(num_b * power_n);
    const new_power = power_n + 1;
    const final_ans = `-\\frac{${Math.abs(coeff)}}{x^{${new_power}}}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_a,
      num_b,
      power_n,
      f_x,
      step1_f,
      simplified_final,
      coeff,
      abs_coeff: Math.abs(coeff),
      new_power,
      final_ans
    };

    inst.adaptiveConfig.variables = customVars;

    const useScaffold = inst.adaptiveConfig?.useScaffold !== false;

    if (!useScaffold) {
      inst.parts = [
        { type: 'text', content: 'Find the derivative of $f(x)$.', hasAudio: true },
        { type: 'mathLatex', content: `f(x) = ${f_x}`, isDisplayMode: true },
        {
          type: 'sequence',
          children: [
            { type: 'text', content: 'f\'(x) = ' },
            { type: 'blank', id: 'ans', width: 350, placeholder: 'Type your answer...' }
          ]
        }
      ];
      inst.adaptiveConfig.showKeypad = true;
      inst.adaptiveConfig.keypadKeys = [
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="18" y2="12"/><rect x="8" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>', value: '\\frac{}{}', id: 'frac' },
        'x', '^', '(', ')', '+', '-', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '⌫'
      ];
      inst.correctAnswerText = JSON.stringify({ ans: final_ans.replace(/\s+/g, '') });
    } else {
      inst.parts = hydrateNode(question.parts || [], customVars);
      inst.correctAnswerText = JSON.stringify({
        n: String(coeff),
        d: `x^{${new_power}}`
      });
    }

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'breaking_numbers_into_tens_and_ones_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 9999] };
      const range = dataSource.range || [11, 9999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const numStr = String(num);
    const hasThousands = numStr.length === 4;
    const hasHundreds = numStr.length >= 3;

    const th_digit = hasThousands ? Math.floor(num / 1000) : 0;
    const h_digit = hasHundreds ? Math.floor((num % 1000) / 100) : 0;
    const t_digit = Math.floor((num % 100) / 10);
    const o_digit = num % 10;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num,
      th_digit,
      h_digit,
      t_digit: t_digit,
      o_digit: o_digit
    };
    inst.adaptiveConfig.variables = customVars;

    // Dynamically Construct Equation Sequence
    const sequenceChildren = [{ type: 'text', content: `**${num}** = ` }];

    if (hasThousands) {
      sequenceChildren.push({ type: 'input', id: 'ans_thousands', width: 60 });
      sequenceChildren.push({ type: 'text', content: ` thousands + ` });
    }
    if (hasHundreds) {
      sequenceChildren.push({ type: 'input', id: 'ans_hundreds', width: 60 });
      sequenceChildren.push({ type: 'text', content: ` hundreds + ` });
    }
    sequenceChildren.push({ type: 'input', id: 'ans_tens', width: 60 });
    sequenceChildren.push({ type: 'text', content: ` tens + ` });
    sequenceChildren.push({ type: 'input', id: 'ans_ones', width: 60 });
    sequenceChildren.push({ type: 'text', content: ` ones` });

    // Dynamically construct Table Headers
    const headers = [];
    const rows = [[]];
    const equationText = [];

    if (hasThousands) {
      headers.push("thousands");
      rows[0].push(`**${th_digit}**`);
      equationText.push(`${th_digit} thousands`);
    }
    if (hasHundreds) {
      headers.push("hundreds");
      rows[0].push(`**${h_digit}**`);
      equationText.push(`${h_digit} hundreds`);
    }
    headers.push("tens");
    rows[0].push(`**${t_digit}**`);
    equationText.push(`${t_digit} tens`);

    headers.push("ones");
    rows[0].push(`**${o_digit}**`);
    equationText.push(`${o_digit} ones`);

    // Override the JSON Template structurally
    inst.parts = hydrateNode(question.parts || [], customVars).map(part => {
      if (part.type === 'sequence') {
        return { ...part, children: sequenceChildren };
      }
      return part;
    });

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars).map(part => {
        if (part.type === 'smartTable') {
          return { ...part, headers, rows };
        }
        if (typeof part.content === 'string' && part.content.includes("=")) {
          return { ...part, content: `### **${num} = ${equationText.join(' + ')}**` };
        }
        return part;
      });
    }

    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    const ansPayload = {
      ans_tens: String(t_digit),
      ans_ones: String(o_digit)
    };
    if (hasHundreds) ansPayload.ans_hundreds = String(h_digit);
    if (hasThousands) ansPayload.ans_thousands = String(th_digit);

    const answerPayload = JSON.stringify(ansPayload);
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'dots_multiplication_mcq_v1' || logic === 'dots_in_circles_v1') {
    let num_groups, dots_per_group;
    const existingVars = (question.adaptiveConfig?.variables || {});
    if (existingVars.num_groups && existingVars.dots_per_group) {
      num_groups = Number(existingVars.num_groups);
      dots_per_group = Number(existingVars.dots_per_group);
    } else if (overrideVariables) {
      num_groups = Number(overrideVariables.num_groups);
      dots_per_group = Number(overrideVariables.dots_per_group);
    } else {
      num_groups = Math.floor(Math.random() * 4) + 2;
      dots_per_group = Math.floor(Math.random() * 4) + 2;
    }

    const correct_raw = `${num_groups} × ${dots_per_group}`;
    let dist_g = dots_per_group;
    let dist_d = num_groups;
    if (dist_g === num_groups && dist_d === dots_per_group) {
      dist_d = dots_per_group + 1;
    }
    const distractor_raw = `${dist_g} × ${dist_d}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_groups,
      dots_per_group,
      total_dots: num_groups * dots_per_group,
      correct_val: correct_raw,
      distractor_val: distractor_raw,
      color: '#818CF8'
    };
    inst.adaptiveConfig.variables = customVars;

    const seedValue = (Number(num_groups) + Number(dots_per_group));
    let shuffledOrder = (seedValue % 2 === 0) ? [0, 1] : [1, 0];
    if (inst.adaptiveConfig?.shuffled_order && Array.isArray(inst.adaptiveConfig.shuffled_order)) {
      shuffledOrder = inst.adaptiveConfig.shuffled_order;
    }
    inst.adaptiveConfig.shuffled_order = shuffledOrder;
    inst.adaptiveConfig.shuffleOptions = false;

    const optionsRaw = (question.options && question.options.length > 0) ? question.options : [
      { type: "text", content: "{correct_val}" },
      { type: "text", content: "{distractor_val}" }
    ];

    const hydratedOptions = optionsRaw.map(opt => {
      const hyd = hydrateNode(opt, customVars);
      if (hyd && typeof hyd === 'object') {
        hyd.label = hyd.content || hyd.text || '';
      }
      return hyd;
    });
    inst.options = [hydratedOptions[shuffledOrder[0]], hydratedOptions[shuffledOrder[1]]];

    inst.correctAnswerIndex = shuffledOrder.indexOf(0);
    inst.correctAnswerText = correct_raw;
    inst.parts = hydrateNode(question.parts || [], customVars);
    inst.solution = hydrateNode(question.solution || [], customVars);
    inst.type = 'mcq';
  }

  if (logic === 'dots_multiplication_fib_groups_v1' || logic === 'dots_multiplication_fib_dots_v1' || logic === 'dots_multiplication_fib_total_v1') {
    let num_groups, dots_per_group;
    const existingVars = (question.adaptiveConfig?.variables || {});
    if (existingVars.num_groups && existingVars.dots_per_group) {
      num_groups = Number(existingVars.num_groups);
      dots_per_group = Number(existingVars.dots_per_group);
    } else if (overrideVariables) {
      num_groups = Number(overrideVariables.num_groups);
      dots_per_group = Number(overrideVariables.dots_per_group);
    } else {
      // Generation settings (2-5 groups, 2-5 dots)
      num_groups = Math.floor(Math.random() * 4) + 2;
      dots_per_group = Math.floor(Math.random() * 4) + 2;
    }

    const total = num_groups * dots_per_group;
    const target = logic.includes('groups') ? 'groups' : (logic.includes('dots') ? 'dots' : 'total');

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_groups,
      dots_per_group,
      total_dots: total,
      target,
      color: '#FB923C'
    };
    inst.adaptiveConfig.variables = customVars;

    let correct = 0;
    const sentenceParts = [];
    const mathTextStyle = { fontSize: '2.5rem', fontWeight: '600', padding: '0 0.5rem' };
    const inputStyle = { width: '80px', height: '80px', fontSize: '1.8rem', textAlign: 'center' };

    if (target === 'groups') {
      sentenceParts.push(
        { type: "blank", id: "ans", ...inputStyle },
        { type: "text", content: ` × ${dots_per_group} = ${total}`, ...mathTextStyle }
      );
      correct = num_groups;
    } else if (target === 'dots') {
      sentenceParts.push(
        { type: "text", content: `${num_groups} × `, ...mathTextStyle },
        { type: "blank", id: "ans", ...inputStyle },
        { type: "text", content: ` = ${total}`, ...mathTextStyle }
      );
      correct = dots_per_group;
    } else {
      sentenceParts.push(
        { type: "text", content: `${num_groups} × ${dots_per_group} = `, ...mathTextStyle },
        { type: "blank", id: "ans", ...inputStyle }
      );
      correct = total;
    }

    inst.parts = [
      {
        type: "dotsGrouping",
        numGroups: num_groups,
        dotsPerGroup: dots_per_group,
        color: customVars.color,
        marginBottom: '2.5rem'
      },
      {
        type: "sequence",
        children: sentenceParts,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '2.5rem'
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans: correct });
    inst.solution = [
      { type: "text", content: `### ${target === 'groups' ? 'How many groups?' : target === 'dots' ? 'How many dots in each?' : 'What is the total?'}` },
      { type: "dotsGrouping", numGroups: num_groups, dotsPerGroup: dots_per_group, color: customVars.color, showGroupLabels: (target === 'groups'), showDotLabels: (target === 'dots') },
      { type: "text", content: `The model shows **${num_groups} groups** of **${dots_per_group}** dots.` },
      { type: "text", content: `The multiplication sentence is: **${num_groups} × ${dots_per_group} = ${total}**` }
    ];
    inst.type = 'fillInTheBlank';
  }

  if (logic === 'dots_relate_addition_multiplication_v1') {
    let num_groups, dots_per_group;
    const existingVars = (question.adaptiveConfig?.variables || {});
    if (existingVars.num_groups && existingVars.dots_per_group) {
      num_groups = Number(existingVars.num_groups);
      dots_per_group = Number(existingVars.dots_per_group);
    } else if (overrideVariables) {
      num_groups = Number(overrideVariables.num_groups);
      dots_per_group = Number(overrideVariables.dots_per_group);
    } else {
      num_groups = Math.floor(Math.random() * 3) + 2;
      dots_per_group = Math.floor(Math.random() * 3) + 2;
    }

    const total = num_groups * dots_per_group;
    const addTerm = String(dots_per_group);
    const additionSentence = Array(num_groups).fill(addTerm).join(' + ') + ' = ' + total;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_groups,
      dots_per_group,
      total_dots: total,
      addition_sentence: additionSentence,
      color: '#10B981'
    };
    inst.adaptiveConfig.variables = customVars;

    inst.parts = [
      {
        type: "dotsGrouping",
        numGroups: num_groups,
        dotsPerGroup: dots_per_group,
        color: customVars.color,
        marginBottom: '2rem'
      },
      {
        type: "text",
        content: `There are [[groups_count]] groups of **${dots_per_group}** dots.`,
        fontSize: '1.4rem'
      },
      {
        type: "text",
        content: `## ${additionSentence}`,
        marginTop: '1.5rem',
        marginBottom: '1.5rem'
      },
      {
        type: "text",
        content: `[[mult_groups]] × ${dots_per_group} = ${total}`,
        fontSize: '1.8rem',
        fontWeight: 'bold'
      }
    ];

    inst.correctAnswerText = JSON.stringify({
      groups_count: num_groups,
      mult_groups: num_groups
    });

    inst.solution = [
      { type: "text", content: "### Relating Addition and Multiplication" },
      { type: "dotsGrouping", numGroups: num_groups, dotsPerGroup: dots_per_group, color: customVars.color, showGroupLabels: true },
      { type: "text", content: `You can see **${num_groups} groups** of **${dots_per_group}** dots.` },
      { type: "text", content: `Adding the groups: **${additionSentence}**` },
      { type: "text", content: `This is the same as: **${num_groups} × ${dots_per_group} = ${total}**` }
    ];
    inst.type = 'fillInTheBlank';
  }

  if (logic === 'dot_array_multiplication_mcq_v1') {
    let rows, cols;
    const existingVars = (question.adaptiveConfig?.variables || {});
    if (existingVars.rows && existingVars.cols) {
      rows = Number(existingVars.rows);
      cols = Number(existingVars.cols);
    } else if (overrideVariables) {
      rows = Number(overrideVariables.rows);
      cols = Number(overrideVariables.cols);
    } else {
      rows = Math.floor(Math.random() * 3) + 2;
      cols = Math.floor(Math.random() * 3) + 2;
    }

    const correct_raw = `${rows} × ${cols}`;
    let dist_rows = cols;
    let dist_cols = rows;
    if (dist_rows === rows && dist_cols === cols) {
      dist_cols = cols + 1;
    }
    const distractor_raw = `${dist_rows} × ${dist_cols}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      rows,
      cols,
      total_dots: rows * cols,
      correct_val: correct_raw,
      distractor_val: distractor_raw,
      color: '#818CF8'
    };
    inst.adaptiveConfig.variables = customVars;

    const seedValue = (Number(rows) + Number(cols));
    let shuffledOrder = (seedValue % 2 === 0) ? [0, 1] : [1, 0];
    if (inst.adaptiveConfig?.shuffled_order && Array.isArray(inst.adaptiveConfig.shuffled_order)) {
      shuffledOrder = inst.adaptiveConfig.shuffled_order;
    }
    inst.adaptiveConfig.shuffled_order = shuffledOrder;
    inst.adaptiveConfig.shuffleOptions = false;

    const optionsRaw = [
      { type: "text", content: "{correct_val}" },
      { type: "text", content: "{distractor_val}" }
    ];

    const hydratedOptions = optionsRaw.map(opt => {
      const hyd = hydrateNode(opt, customVars);
      if (hyd && typeof hyd === 'object') {
        hyd.label = hyd.content || hyd.text || '';
      }
      return hyd;
    });
    inst.options = [hydratedOptions[shuffledOrder[0]], hydratedOptions[shuffledOrder[1]]];

    inst.correctAnswerIndex = shuffledOrder.indexOf(0);
    inst.correctAnswerText = correct_raw;

    // Logic to prevent double-rendering if template already has a dotArray
    const hasExistingArray = (question.parts || []).some(p => p.type === 'dotArray' || p.type === 'dot_array');

    let finalParts = [];
    if (question.parts && question.parts.length > 0) {
      // Hydrate and specifically update the dotArray part inside the template
      finalParts = hydrateNode(question.parts, customVars).map(p => {
        if (p.type === 'dotArray' || p.type === 'dot_array') {
          return {
            ...p,
            rows: rows,
            cols: cols,
            color: p.color || customVars.color,
            gap: p.gap || 12,
            dotSize: p.dotSize || 35
          };
        }
        return p;
      });
    } else {
      // Default parts if template has nothing
      finalParts = [
        { type: "text", content: "Which expression describes this array?", hasAudio: true },
        {
          type: "dotArray",
          rows: rows,
          cols: cols,
          color: customVars.color,
          gap: 12,
          dotSize: 35
        }
      ];
    }
    inst.parts = finalParts;

    inst.solution = [
      { type: "text", content: "### Identifying the Array" },
      { type: "dotArray", rows: rows, cols: cols, color: customVars.color, showLabels: true },
      { type: "text", content: `This array has **${rows} rows** and **${cols} columns**.` },
      { type: "text", content: `The multiplication expression is: **${rows} × ${cols}**` }
    ];
    inst.type = 'mcq';
  }

  if (logic === 'dot_array_fib_groups_v1' || logic === 'dot_array_fib_cols_v1' || logic === 'dot_array_fib_total_v1') {
    let rows, cols;
    const existingVars = (question.adaptiveConfig?.variables || {});
    if (existingVars.rows && existingVars.cols) {
      rows = Number(existingVars.rows);
      cols = Number(existingVars.cols);
    } else if (overrideVariables) {
      rows = Number(overrideVariables.rows);
      cols = Number(overrideVariables.cols);
    } else {
      rows = Math.floor(Math.random() * 3) + 2;
      cols = Math.floor(Math.random() * 3) + 2;
    }

    const total = rows * cols;
    const target = logic.includes('groups') ? 'rows' : (logic.includes('cols') ? 'cols' : 'total');

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      rows,
      cols,
      total_dots: total,
      target,
      color: '#FB923C'
    };
    inst.adaptiveConfig.variables = customVars;

    let correct = 0;
    const sentenceParts = [];
    const mathTextStyle = { fontSize: '2.5rem', fontWeight: '600', padding: '0 0.5rem' };
    const inputStyle = { width: '80px', height: '80px', fontSize: '1.8rem', textAlign: 'center' };

    if (target === 'rows') {
      sentenceParts.push(
        { type: "blank", id: "ans", ...inputStyle },
        { type: "text", content: ` × ${cols} = ${total}`, ...mathTextStyle }
      );
      correct = rows;
    } else if (target === 'cols') {
      sentenceParts.push(
        { type: "text", content: `${rows} × `, ...mathTextStyle },
        { type: "blank", id: "ans", ...inputStyle },
        { type: "text", content: ` = ${total}`, ...mathTextStyle }
      );
      correct = cols;
    } else {
      sentenceParts.push(
        { type: "text", content: `${rows} × ${cols} = `, ...mathTextStyle },
        { type: "blank", id: "ans", ...inputStyle }
      );
      correct = total;
    }

    // Smart merge dotArray parts and ensure text
    let finalParts = [];
    if (question.parts && question.parts.length > 0) {
      finalParts = hydrateNode(question.parts, customVars).map(p => {
        if (p.type === 'dotArray' || p.type === 'dot_array') {
          return {
            ...p,
            rows: rows,
            cols: cols,
            color: p.color || customVars.color,
            gap: p.gap || 12,
            dotSize: p.dotSize || 45
          };
        }
        return p;
      });
    } else {
      finalParts = [
        { type: "text", content: "Complete the multiplication number sentence that describes the array.", hasAudio: true },
        { type: "dotArray", rows, cols, color: customVars.color, gap: 12, dotSize: 45 }
      ];
    }

    inst.parts = [
      ...finalParts,
      {
        type: "sequence",
        children: sentenceParts,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '2.5rem'
      }
    ];

    inst.correctAnswerText = JSON.stringify({ ans: correct });
    inst.solution = [
      { type: "text", content: `### ${target === 'rows' ? 'Counting rows' : target === 'cols' ? 'Counting columns' : 'Finding the total'}` },
      { type: "dotArray", rows: rows, cols: cols, color: customVars.color, showLabels: true, imageUrl: inst.parts.find(p => p.type === 'dotArray')?.imageUrl },
      { type: "text", content: `The array has **${rows} rows** and **${cols} columns**.` },
      { type: "text", content: `The multiplication sentence is: **${rows} × ${cols} = ${total}**` }
    ];
    inst.type = 'fillInTheBlank';
  }

  if (logic === 'vertical_addition_v1' || logic === 'vertical_addition_with_regrouping_v1') {
    let n1, n2, sum;
    let digits1 = [], digits2 = [], sums = [], resDigits = [], finalCarries = [];
    const isRegrouping = (logic === 'vertical_addition_with_regrouping_v1');

    const dataSource = (question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] });
    const range = dataSource.range || [100, 999];
    const numDigits = dataSource.num_digits || String(range[1]).length || 3;

    if (overrideVariables) {
      n1 = overrideVariables.num_1;
      n2 = overrideVariables.num_2;
      sum = overrideVariables.sum;
      const s1 = String(n1).padStart(numDigits, '0');
      const s2 = String(n2).padStart(numDigits, '0');
      let carryIdx = 0;
      for (let i = numDigits - 1; i >= 0; i--) {
        const d1 = Number(s1[i]);
        const d2 = Number(s2[i]);
        const s = d1 + d2 + carryIdx;
        digits1.unshift(d1);
        digits2.unshift(d2);
        sums.unshift(s);
        resDigits.unshift(s % 10);
        finalCarries.unshift(carryIdx);
        carryIdx = s > 9 ? 1 : 0;
      }
    } else {
      let valid = false;
      while (!valid) {
        digits1 = []; digits2 = []; sums = []; resDigits = []; finalCarries = [];
        let carry = 0;
        let anyRegroup = false;

        for (let i = 0; i < numDigits; i++) {
          const isLeading = (i === numDigits - 1);
          const min1 = isLeading ? 1 : 0;
          let d1, d2;

          if (isRegrouping) {
            d1 = Math.floor(Math.random() * (9 - min1 + 1)) + min1;
            // Attempt to force regrouping in at least one column
            d2 = Math.floor(Math.random() * 10);
          } else {
            d1 = Math.floor(Math.random() * (9 - min1 + 1)) + min1;
            d2 = Math.floor(Math.random() * (9 - d1 + 1));
          }

          const colSum = d1 + d2 + carry;
          if (colSum > 9) anyRegroup = true;

          digits1.unshift(d1);
          digits2.unshift(d2);
          sums.unshift(colSum);
          resDigits.unshift(colSum % 10);
          finalCarries.unshift(carry); // carry into this column
          carry = colSum > 9 ? 1 : 0;
        }

        if (!isRegrouping || anyRegroup) {
          valid = true;
          if (carry > 0) { // If final column carries, expand (e.g., 9+9=18)
            resDigits.unshift(carry);
            sums.unshift(carry);
            digits1.unshift(0); // padding for layout
            digits2.unshift(0);
            finalCarries.unshift(0);
          }
        }
      }

      n1 = Number(digits1.join(''));
      n2 = Number(digits2.join(''));
      sum = n1 + n2;
    }

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_1: n1, num_2: n2, sum: sum,
      digits1, digits2, sums, resDigits, finalCarries
    };
    inst.adaptiveConfig.variables = customVars;

    // Build Arithmetic Rows
    const rows = [];
    if (isRegrouping) {
      // Carry inputs row
      const carryCells = finalCarries.map((c, i) => {
        if (i === finalCarries.length - 1) return { kind: "empty" }; // No carry row for ones
        // Carry is written in the cell to the LEFT of where it was generated
        const carryValueFromNext = finalCarries[i + 1];
        if (carryValueFromNext > 0 || i < finalCarries.length - 1) { // Show box if carry exists or could exist
          return { id: `carry_${i}`, type: "digit", variant: "circular", placeholder: "" };
        }
        return { kind: "empty" };
      });
      rows.push({ kind: "carry", cells: carryCells });
    }

    rows.push({ kind: "text", text: '   ' + digits1.join('  ') });
    rows.push({ kind: "text", text: '+  ' + digits2.join('  ') });

    const answerCells = resDigits.map((_, i) => ({
      id: `ans_${resDigits.length - 1 - i}`,
      type: "digit",
      autoFocus: (i === resDigits.length - 1)
    }));

    rows.push({
      kind: "answer",
      variant: "joined",
      cells: answerCells
    });

    inst.parts = [
      { type: "text", content: question.parts?.[0]?.content || (isRegrouping ? "Add. Don't forget to regroup!" : "Add.") },
      {
        type: "arithmeticLayout",
        layout: { rows }
      }
    ];

    const solHeader = { type: "text", content: "### Solution strategy", isVertical: true };
    const solSteps = [];
    const placeNames = ["ones", "tens", "hundreds", "thousands", "ten thousands"];

    for (let i = digits1.length - 1; i >= 0; i--) {
      const place = placeNames[digits1.length - 1 - i] || `position ${digits1.length - i}`;
      const d1 = digits1[i];
      const d2 = digits2[i];
      const prevCarry = finalCarries[i];
      const s = sums[i];

      let text = `Add the ${place}. `;
      if (prevCarry > 0) text += `Add the carry: 1 + ${d1} + ${d2} = **${s}**. `;
      else text += `Add ${d1} + ${d2} = **${s}**. `;

      if (s > 9 && i > 0) {
        text += `Write the **${s % 10}** and carry the **1** to the ${placeNames[digits1.length - i] || 'next place'}.`;
      }

      solSteps.push({ type: "text", content: text, isVertical: true });

      // Grid for step showing carry
      const highlightRow1 = '   ' + digits1.map((d, idx) => idx === i ? `*${d}` : d).join('  ');
      const highlightRow2 = '+  ' + digits2.map((d, idx) => idx === i ? `*${d}` : d).join('  ');
      const carryRowText = '   ' + finalCarries.map((c, idx) => idx === i && c > 0 ? `(${c})` : (idx === i - 1 && sums[i] > 9 ? `[*1]` : ' ')).join('  ');
      const resultStr = '   ' + resDigits.map((d, idx) => idx >= i ? `*${d}` : ' ').join('  ');

      // Simplified grid for solution
      solSteps.push({
        type: "arithmeticLayout",
        layout: {
          rows: [
            { kind: "text", text: highlightRow1 },
            { kind: "text", text: highlightRow2 },
            { kind: "text", text: resultStr }
          ]
        },
        isVertical: true
      });
    }

    solSteps.push({ type: "text", content: `The sum is **${sum}**.`, isVertical: true });

    inst.solution = [solHeader, ...solSteps];
    inst.type = 'fillInTheBlank';

    const correctAns = {};
    for (let i = 0; i < resDigits.length; i++) {
      correctAns[`ans_${i}`] = String(resDigits[resDigits.length - 1 - i]);
    }
    // Also include carries in correct answer for validation if student fills them
    for (let i = 0; i < finalCarries.length - 1; i++) {
      if (finalCarries[i] > 0) correctAns[`carry_${i}`] = "1";
      else correctAns[`carry_${i}`] = "";
    }

    inst.correctAnswerText = JSON.stringify(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'shading_grids_v1') {
    const config = inst.adaptiveConfig || {};
    let rows, cols, target;

    if (overrideVariables) {
      rows = overrideVariables.rows || overrideVariables.gridRows || 3;
      cols = overrideVariables.cols || overrideVariables.gridCols || 3;
      target = overrideVariables.target || overrideVariables.targetShaded || 1;
    } else {
      if (config.gridMode === 'hundredGrid') {
        rows = 10;
        cols = 10;
      } else {
        rows = config.gridRows || config.rows || Math.floor(Math.random() * 3) + 2; // 2 to 4
        cols = config.gridCols || config.cols || Math.floor(Math.random() * 4) + 2; // 2 to 5
      }

      const total = rows * cols;
      // Randomize target if not explicitly fixed in config
    }

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      rows,
      cols,
      target,
      total: rows * cols,
      target_shaded: target
    };
    inst.adaptiveConfig.variables = customVars;
    inst.adaptiveConfig.gridRows = rows;
    inst.adaptiveConfig.gridCols = cols;
    inst.adaptiveConfig.targetShaded = target;
    inst.type = 'shadeGrid';
    inst.show_submit_button = true;

    const rawParts = question.parts && question.parts.length > 0 ? question.parts : [
      { type: "text", content: "Shade **{target}** out of **{total}** equal parts.", isVertical: true }
    ];
    inst.parts = hydrateNode(rawParts, customVars);

    const rawSolution = question.solution && (Array.isArray(question.solution) ? question.solution.length > 0 : true) ? question.solution : [
      { type: "text", content: `### Shading Strategy`, isVertical: true },
      { type: "text", content: `To solve this, look for the target number of parts to shade: **{target}**.`, isVertical: true },
      { type: "text", content: `Click on exactly **{target}** squares in the grid. When you click a square, it will change color to show it's shaded.`, isVertical: true },
      { type: "text", content: `Once you have shaded **{target}** parts, click the **Submit** button to check your answer.`, isVertical: true }
    ];
    inst.solution = hydrateNode(rawSolution, customVars);

    inst.correctAnswerText = String(target);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  const PRIMARY_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

  if (logic === 'decimal_grid_model_v1') {
    let shadedCount;
    if (overrideVariables) {
      shadedCount = overrideVariables.shaded_count;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 99] };
      shadedCount = Math.floor(Math.random() * (dataSource.range[1] - dataSource.range[0] + 1)) + dataSource.range[0];
    }

    // Pick a random primary color
    const color = PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];

    const tDigit = Math.floor(shadedCount / 10);
    const hDigit = shadedCount % 10;
    const decimalVal = (shadedCount / 100).toFixed(2);

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      shaded_count: shadedCount,
      decimal_val: decimalVal,
      tenths_digit: tDigit,
      hundredths_digit: hDigit,
      fill_color: color
    };
    inst.adaptiveConfig.variables = customVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    const rawParts = [
      {
        type: "fractionModel",
        modelConfig: {
          gridMode: "hundredGrid",
          targetShaded: shadedCount,
          gridFlow: "column",
          fillColor: color,
          lineColor: "#1F2937", // Darker lines for high contrast
          cellGap: 1.5
        }
      },
      { type: "text", content: "**What decimal number does the model represent?**", isVertical: true },
      { type: "text", content: "The large square represents 1 whole.", isVertical: true },
      { type: "text", content: "[[ans]]", isVertical: true }
    ];
    inst.parts = hydrateNode(rawParts, customVars);

    const rawSolution = [
      { type: "text", content: `### Count and Place Strategy`, isVertical: true },
      { type: "text", content: `In the model, **{shaded_count}** of the 100 small squares are shaded.`, isVertical: true },
      { type: "text", content: `This represents **{shaded_count} hundredths**.`, isVertical: true },
      { type: "text", content: `You can use a place value chart to write {shaded_count} hundredths as a decimal:`, isVertical: true },
      {
        type: "text",
        content: `| ones | . | tenths | hundredths |
|:---:|:---:|:---:|:---:|
| 0 | . | **{tenths_digit}** | **{hundredths_digit}** |`,
        isVertical: true
      },
      { type: "text", content: `So, the model represents the decimal number **{decimal_val}**.`, isVertical: true }
    ];
    inst.solution = hydrateNode(rawSolution, customVars);

    inst.correctAnswerText = JSON.stringify({ ans: decimalVal });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }


  if (logic === 'shade_fraction_bar_v1') {
    let den, num, ori, color;

    if (overrideVariables) {
      den = overrideVariables.denominator;
      num = overrideVariables.numerator;
      ori = overrideVariables.orientation;
      color = overrideVariables.fill_color || PRIMARY_COLORS[0];
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { denominators: [2, 3, 4, 5, 8, 10] };
      const dens = dataSource.denominators || [2, 3, 4, 5, 8, 10];
      den = dens[Math.floor(Math.random() * dens.length)];
      num = Math.floor(Math.random() * (den - 1)) + 1; // Random numerator < denominator
      ori = (Math.random() > 0.5) ? 'horizontal' : 'vertical';
      color = PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];
    }

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      numerator: num,
      denominator: den,
      orientation: ori,
      fill_color: color
    };
    inst.adaptiveConfig.variables = customVars;

    inst.type = 'shadeGrid';
    inst.show_submit_button = true;

    inst.adaptiveConfig.gridMode = "fractionbar";
    inst.adaptiveConfig.denominator = den;
    inst.adaptiveConfig.numerator = num;
    inst.adaptiveConfig.orientation = ori;
    inst.adaptiveConfig.targetShaded = num;
    inst.adaptiveConfig.fillColor = color;
    inst.adaptiveConfig.lineColor = "#334155";
    inst.adaptiveConfig.cellGap = 2;

    const rawParts = [
      { type: "text", content: "Show **{numerator}/{denominator}** by shading the model.", isVertical: true },
      { type: "text", content: "Click and drag to shade parts.", isVertical: true }
    ];
    inst.parts = hydrateNode(rawParts, customVars);

    const rawSolution = [
      { type: "text", content: `### Shading {numerator}/{denominator}`, isVertical: true },
      { type: "text", content: `The model is divided into **{denominator}** equal sections.`, isVertical: true },
      { type: "text", content: `To represent the fraction **{numerator}/{denominator}**, you must shade **{numerator}** of those sections.`, isVertical: true },
      { type: "text", content: `Click on exactly **{numerator}** ${den === 1 ? 'section' : 'sections'} to fill ${num === 1 ? 'it' : 'them'} with color.`, isVertical: true }
    ];
    inst.solution = hydrateNode(rawSolution, customVars);

    inst.correctAnswerText = String(num);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'shade_decimal_grid_v1') {
    let shadedCount;
    if (overrideVariables) {
      shadedCount = overrideVariables.shaded_count;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 99] };
      shadedCount = Math.floor(Math.random() * (dataSource.range[1] - dataSource.range[0] + 1)) + dataSource.range[0];
    }

    const tDigit = Math.floor(shadedCount / 10);
    const hDigit = shadedCount % 10;
    const decimalVal = (shadedCount / 100).toFixed(2);
    const color = PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      shaded_count: shadedCount,
      decimal_val: decimalVal,
      tenths_digit: tDigit,
      hundredths_digit: hDigit,
      fill_color: color
    };
    inst.adaptiveConfig.variables = customVars;
    inst.type = 'shadeGrid';
    inst.show_submit_button = true;

    inst.adaptiveConfig.gridMode = "hundredGrid";
    inst.adaptiveConfig.targetShaded = shadedCount;
    inst.adaptiveConfig.fillColor = color;
    inst.adaptiveConfig.lineColor = "#1F2937"; // High contrast lines
    inst.adaptiveConfig.cellGap = 1.5;

    const rawParts = [
      { type: "text", content: `Shade **{decimal_val}** of the whole square.`, isVertical: true },
      { type: "text", content: `(The large square represents 1 whole)`, isVertical: true }
    ];
    inst.parts = hydrateNode(rawParts, customVars);

    const rawSolution = [
      { type: "text", content: `### Shading {decimal_val} cells`, isVertical: true },
      { type: "text", content: `The decimal **{decimal_val}** represents **{shaded_count} hundredths**.`, isVertical: true },
      { type: "text", content: `Each full column of the grid is **10 hundredths** (or 0.1).`, isVertical: true },
      { type: "text", content: `To show **{decimal_val}**, you can shade:`, isVertical: true },
      { type: "text", content: `- **{tenths_digit}** full columns (**{tenths_digit}** tenths)`, isVertical: true },
      { type: "text", content: `- **{hundredths_digit}** extra squares (**{hundredths_digit}** hundredths)`, isVertical: true },
      { type: "text", content: `Total squares to shade: **{shaded_count}**.`, isVertical: true }
    ];
    inst.solution = hydrateNode(rawSolution, customVars);

    inst.correctAnswerText = String(shadedCount);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'dots_in_circles_v1') {
    let numGroups, dotsPerGroup;
    if (overrideVariables) {
      numGroups = overrideVariables.num_groups;
      dotsPerGroup = overrideVariables.dots_per_group;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { groups: [2, 5], dots: [1, 9] };
      numGroups = Math.floor(Math.random() * (dataSource.groups[1] - dataSource.groups[0] + 1)) + dataSource.groups[0];
      dotsPerGroup = Math.floor(Math.random() * (dataSource.dots[1] - dataSource.dots[0] + 1)) + dataSource.dots[0];
    }

    const color = PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];
    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_groups: numGroups,
      dots_per_group: dotsPerGroup,
      total_dots: numGroups * dotsPerGroup,
      fill_color: color
    };
    inst.adaptiveConfig.variables = customVars;
    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    const rawParts = [
      { type: "text", content: "Fill in the blanks to describe the model.", isVertical: true },
      {
        type: "dotsGrouping",
        numGroups: numGroups,
        dotsPerGroup: dotsPerGroup,
        color: color
      },
      { type: "text", content: "There are [[ans1]] groups of dots.", isVertical: true },
      { type: "text", content: "There are [[ans2]] dots in each group.", isVertical: true }
    ];
    inst.parts = hydrateNode(rawParts, customVars);

    const rawSolution = [
      { type: "text", content: "### Count the number of groups", isVertical: true },
      {
        type: "dotsGrouping",
        numGroups: numGroups,
        dotsPerGroup: dotsPerGroup,
        color: color,
        showGroupLabels: true
      },
      { type: "text", content: "There are **{num_groups} groups** of dots.", isVertical: true },
      { type: "text", content: "Each group has an equal number of dots. Count the number of dots in a group.", isVertical: true },
      {
        type: "dotsGrouping",
        numGroups: 1,
        dotsPerGroup: dotsPerGroup,
        color: color,
        showDotLabels: true
      },
      { type: "text", content: "There are **{dots_per_group} dots** in each group.", isVertical: true }
    ];
    inst.solution = hydrateNode(rawSolution, customVars);

    inst.correctAnswerText = JSON.stringify({ ans1: String(numGroups), ans2: String(dotsPerGroup) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'balanced_addition_equations_v1') {
    let n1, n2, n3, n4, total;
    let missingIndex = 0;

    if (overrideVariables) {
      n1 = overrideVariables.num_1; n2 = overrideVariables.num_2;
      n3 = overrideVariables.num_3; n4 = overrideVariables.num_4;
      total = n1 + n2;
      missingIndex = overrideVariables.missing_pos ?? 0;
    } else {
      const dataSource = (question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] });
      const range = dataSource.range || [300, 999];
      total = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      const splitLeft = Math.floor(Math.random() * (total - 100)) + 50;
      n1 = splitLeft; n2 = total - splitLeft;

      const splitRight = Math.floor(Math.random() * (total - 100)) + 50;
      n3 = splitRight; n4 = total - splitRight;

      missingIndex = Math.floor(Math.random() * 4);
    }

    const nums = [n1, n2, n3, n4];
    const missingAns = nums[missingIndex];
    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_1: n1, num_2: n2, num_3: n3, num_4: n4,
      missing_pos: missingIndex, missing_ans: missingAns, total
    };
    inst.adaptiveConfig.variables = customVars;

    const displayVals = nums.map((v, i) => i === missingIndex ? '[[ans_equ]]' : String(v));
    const equStr = `${displayVals[0]} + ${displayVals[1]} = ${displayVals[2]} + ${displayVals[3]}`;

    inst.parts = [
      { type: "text", content: question.parts?.[0]?.content || "Which number makes the equation true?" },
      { type: "mathLatex", content: equStr }
    ];

    const isMissingOnLeft = missingIndex < 2;
    const fullSideNums = isMissingOnLeft ? [n3, n4] : [n1, n2];
    const knownPartOnMissingSide = isMissingOnLeft ? (missingIndex === 0 ? n2 : n1) : (missingIndex === 2 ? n4 : n3);

    const solHeader = { type: "text", content: "### Balance Scale Strategy", isVertical: true };
    const solSteps = [
      { type: "text", content: "Think of the equals sign (=) as a balance scale. Both sides must have the same total value.", isVertical: true },
      { type: "text", content: `**Step 1: Find the total of the full side.** Add ${fullSideNums[0]} + ${fullSideNums[1]} = **${total}**.`, isVertical: true },
      { type: "text", content: `**Step 2: Identify the goal.** Now we know the missing side must also total **${total}**.`, isVertical: true },
      { type: "text", content: `**Step 3: Subtract to find the missing part.** Take the total and subtract the part you know: ${total} - ${knownPartOnMissingSide} = **${missingAns}**.`, isVertical: true },
      { type: "text", content: `The missing number is **${missingAns}**.`, isVertical: true }
    ];

    inst.solution = [solHeader, ...solSteps];
    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ ans_equ: String(missingAns) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'vertical_addition_missing_addend_v1') {
    let n1, n2, sum;
    let digits1 = [], digits2 = [], sums = [];

    const dataSource = (question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] });
    const range = dataSource.range || [100, 999];
    const numDigits = dataSource.num_digits || String(range[1]).length || 3;

    if (overrideVariables) {
      n1 = overrideVariables.num_1; // missing
      n2 = overrideVariables.num_2; // known
      sum = overrideVariables.sum;  // result
      const s1 = String(n1).padStart(numDigits, '0');
      const s2 = String(n2).padStart(numDigits, '0');
      const ss = String(sum).padStart(numDigits, '0');
      for (let i = 0; i < numDigits; i++) {
        digits1.push(Number(s1[i]));
        digits2.push(Number(s2[i]));
        sums.push(Number(ss[i]));
      }
    } else {
      // Subtraction must be borrowing-free: sum_digit >= known_digit
      for (let i = 0; i < numDigits; i++) {
        const isLeading = (i === numDigits - 1);
        const minS = isLeading ? 1 : 0;
        const sDigit = Math.floor(Math.random() * (9 - minS + 1)) + minS;
        const knownDigit = Math.floor(Math.random() * (sDigit + 1));
        const missingDigit = sDigit - knownDigit;

        sums.unshift(sDigit);
        digits2.unshift(knownDigit); // known addend
        digits1.unshift(missingDigit); // missing addend
      }

      n1 = Number(digits1.join(''));
      n2 = Number(digits2.join(''));
      sum = Number(sums.join(''));
    }

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_1: n1, num_2: n2, sum: sum,
      digits1, digits2, sums
    };
    inst.adaptiveConfig.variables = customVars;

    // Build Answer Cells for the TOP row
    const answerCells = digits1.map((_, i) => ({
      id: `ans_${numDigits - 1 - i}`,
      type: "digit",
      autoFocus: (i === numDigits - 1)
    }));

    inst.parts = [
      { type: "text", content: question.parts?.[0]?.content || "Find the missing number." },
      {
        type: "arithmeticLayout",
        layout: {
          rows: [
            { kind: "answer", variant: "joined", cells: answerCells },
            { kind: "text", text: `+  ${digits2.join('  ')}` },
            { kind: "divider" },
            { kind: "text", text: `   ${sums.join('  ')}` }
          ]
        }
      }
    ];

    const solHeader = { type: "text", content: "### Inverse Operation Strategy", isVertical: true };
    const solSteps = [
      { type: "text", content: `To find the missing number, use the opposite of addition, which is subtraction.`, isVertical: true },
      { type: "text", content: `Set up the subtraction: Take the total (**${sum}**) and subtract the number you know (**${n2}**).`, isVertical: true }
    ];

    const placeNames = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
    for (let i = numDigits - 1; i >= 0; i--) {
      const place = placeNames[numDigits - 1 - i] || `position ${numDigits - i}`;
      const d1 = digits1[i];
      const sDigit = sums[i];
      const knownDigit = digits2[i];

      solSteps.push({ type: "text", content: `Subtract the ${place}: ${sDigit} - ${knownDigit} = **${d1}**.`, isVertical: true });
    }
    solSteps.push({ type: "text", content: `The missing number is **${n1}**.`, isVertical: true });

    inst.solution = [solHeader, ...solSteps];
    inst.type = 'fillInTheBlank';

    const correctAns = {};
    for (let i = 0; i < numDigits; i++) correctAns[`ans_${i}`] = String(digits1[numDigits - 1 - i]);
    inst.correctAnswerText = JSON.stringify(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'function_table_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { rule: "add 100", rule_val: 100 };
    const ruleText = dataSource.rule || "add 100";
    const ruleVal = dataSource.rule_val || 100;

    let inValues = [], outValues = [];
    if (overrideVariables) {
      inValues = overrideVariables.in_values;
      outValues = overrideVariables.out_values;
    } else {
      for (let i = 0; i < 4; i++) {
        const v = Math.floor(Math.random() * 900);
        inValues.push(v);
        outValues.push(v + ruleVal);
      }
    }

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      rule_val: ruleVal, in_values: inValues, out_values: outValues
    };
    inst.adaptiveConfig.variables = customVars;

    // Header: "In" and "Out"
    // Row 0: Example (fixed)
    // Row 1-3: Inputs
    const tableLines = [
      `| In | Out |`,
      `|:---:|:---:|`,
      `| ${inValues[0]} | ${outValues[0]} |`,
      `| ${inValues[1]} | [[ans1]] |`,
      `| ${inValues[2]} | [[ans2]] |`,
      `| ${inValues[3]} | [[ans3]] |`
    ];
    const tableMd = tableLines.join('\n');

    inst.parts = [
      { type: "text", content: question.parts?.[0]?.content || "Complete the table." },
      { type: "text", content: `**Rule: ${ruleText}**` },
      { type: "text", content: tableMd, isVertical: true }
    ];

    const solHeader = { type: "text", content: "### Hundreds Jump Strategy", isVertical: true };
    const solSteps = [
      { type: "text", content: `Start with the numbers in the 'In' column. Add ${ruleVal} to each number.`, isVertical: true }
    ];

    if (ruleVal === 100) {
      solSteps.push({ type: "text", content: "When you add 100, only the hundreds place changes (unless you are crossing 1,000).", isVertical: true });
    }

    for (let i = 1; i < 4; i++) {
      solSteps.push({ type: "text", content: `${inValues[i]} + ${ruleVal} = **${outValues[i]}**`, isVertical: true });
    }
    solSteps.push({ type: "text", content: "Write the answers in the table.", isVertical: true });

    inst.solution = [solHeader, ...solSteps];
    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({
      ans1: String(outValues[1]),
      ans2: String(outValues[2]),
      ans3: String(outValues[3])
    });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'identifying_numbers_with_labeled_base_10_blocks_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num_raw ?? Number(String(overrideVariables.num).replace(/,/g, ''));
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] };
      const range = dataSource.range || [100, 999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const strNum = String(num).padStart(4, '0');
    const thDigit = Number(strNum[strNum.length - 4] || 0); // Thousands
    const hDigit = Number(strNum[strNum.length - 3] || 0);
    const tDigit = Number(strNum[strNum.length - 2]);
    const oDigit = Number(strNum[strNum.length - 1]);

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num: Number(num).toLocaleString('en-IN'),
      num_raw: num,
      th_digit: thDigit,
      h_digit: hDigit,
      t_digit: tDigit,
      o_digit: oDigit,
      th_val: thDigit * 1000,
      h_val: hDigit * 100,
      t_val: tDigit * 10,
    };

    inst.adaptiveConfig.variables = customVars;

    inst.parts = hydrateNode(question.parts || [
      {
        type: "labeledBaseTenGrid",
        thousands: "{th_digit}",
        hundreds: "{h_digit}",
        tens: "{t_digit}",
        ones: "{o_digit}"
      },
      {
        type: "text",
        content: "**What number is shown?**"
      },
      {
        type: "input",
        id: "ans_total"
      }
    ], customVars);

    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;

      if (thDigit === 0) {
        parsed = parsed.filter(step => {
          if (step.type === 'text' && typeof step.content === 'string') {
            return !step.content.includes('**Thousands:**');
          }
          return true;
        });
      }

      let finalSolution = hydrateNode(parsed, customVars);

      finalSolution = finalSolution.map(step => {
        if (step.type === 'text' && step.content && step.content.includes('{h_val} + {t_val}')) {
          const eq = thDigit > 0
            ? `### **${thDigit * 1000} + ${hDigit * 100} + ${tDigit * 10} + ${oDigit} = ${num}**`
            : `### **${hDigit * 100} + ${tDigit * 10} + ${oDigit} = ${num}**`;
          return { ...step, content: eq };
        }
        return step;
      });

      inst.solution = finalSolution;
    }

    inst.type = 'fillInTheBlank';
    inst.isVertical = true;

    // Set correct answer
    const answerPayload = JSON.stringify({ ans_total: String(num) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }




  if (logic === 'identifying_place_value_by_digit_v1') {
    let num, targetDigit, correctAns, targetPlaceIndex, strNum;

    if (overrideVariables) {
      num = overrideVariables.num_raw ?? Number(String(overrideVariables.num).replace(/,/g, ''));
      targetDigit = overrideVariables.target_digit;
      strNum = String(num);
      targetPlaceIndex = strNum.indexOf(String(targetDigit));
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];

      let attempts = 0;
      let isValid = false;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        strNum = String(num);

        let digits = strNum.split('');
        let uniqueDigits = new Set(digits);
        isValid = uniqueDigits.size === digits.length;

        targetPlaceIndex = Math.floor(Math.random() * strNum.length);
        targetDigit = strNum[targetPlaceIndex];

        attempts++;
      } while (!isValid && attempts < 200);
    }

    const INDIAN_PLACES = [
      "ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs", "crores", "ten crores"
    ];
    let distFromRight = strNum.length - targetPlaceIndex - 1;
    correctAns = `${INDIAN_PLACES[distFromRight]} place`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num: Number(num).toLocaleString('en-IN'),
      num_raw: num,
      num_str: Number(num).toLocaleString('en-IN'),
      target_digit: targetDigit,
      correct_ans: correctAns,
    };

    inst.adaptiveConfig.variables = customVars;

    let customOptions = [];
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
    const range = dataSource.range || [11, 99];

    if (question.options && question.options.length >= 3 && range[1] <= 99) {
      customOptions = hydrateNode(question.options, customVars).map(o => ({
        ...o,
        parts: o.parts ? o.parts : [{ type: 'text', content: o.label || o.content }],
        label: o.label || o.content || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? correctAns : "other place"),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      let selectedDistractors;
      if (overrideVariables && overrideVariables.selected_distractors) {
        selectedDistractors = overrideVariables.selected_distractors;
      } else {
        const maxPlaces = strNum.length;
        const allPossible = INDIAN_PLACES.slice(0, maxPlaces).map(p => `${p} place`);
        const distractors = allPossible.filter(p => p !== correctAns);
        distractors.sort(() => Math.random() - 0.5);
        selectedDistractors = distractors.slice(0, 3);
        inst.adaptiveConfig.variables.selected_distractors = selectedDistractors;
      }

      let candidates = [correctAns, ...selectedDistractors];

      customOptions = candidates.map(c => ({
        label: c,
        parts: [{ type: 'text', content: c }],
        isCorrect: c === correctAns
      }));
    }

    let shuffledOrder;
    if (overrideVariables && overrideVariables.shuffled_order) {
      shuffledOrder = overrideVariables.shuffled_order;
    } else {
      shuffledOrder = customOptions.map((_, i) => i);
      shuffledOrder.sort(() => Math.random() - 0.5);
    }
    inst.adaptiveConfig.variables.shuffled_order = shuffledOrder;

    const shuffled = shuffledOrder.map(idx => customOptions[Number(idx)]);
    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Where is the digit **{target_digit}** in the number below?" },
      { type: "text", content: "### **{num_str}**" }
    ], customVars);

    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;

      // Dynamically upgrade smartTable
      let hasSmartTable = parsed.some(p => p.type === 'smartTable');
      if (hasSmartTable) {
        let dynamicHeaders = [];
        let dynamicRow = [];
        for (let i = 0; i < strNum.length; i++) {
          dynamicHeaders.push(INDIAN_PLACES[strNum.length - i - 1]);
          const digit = strNum[i];
          dynamicRow.push(i === targetPlaceIndex ? `**${digit}**` : String(digit));
        }
        parsed = parsed.map(p => {
          if (p.type === 'smartTable') {
            return {
              ...p,
              headers: dynamicHeaders,
              rows: [dynamicRow]
            };
          }
          return p;
        });
      }

      inst.solution = hydrateNode(parsed, customVars);
    }

    inst.type = 'mcq';
    inst.isVertical = true;
    const answerPayload = JSON.stringify({ ans: correctAns });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }


  if (logic === 'rounding_mcq_v1') {

    let num, d1, d10, lowerTen, higherTen, isRoundUp, correctAns;

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % 10 === 0 && attempts < 50);
    }

    d1 = num % 10;
    d10 = Math.floor(num / 10);
    lowerTen = d10 * 10;
    higherTen = (d10 + 1) * 10;
    isRoundUp = d1 >= 5;
    correctAns = isRoundUp ? higherTen : lowerTen;

    const templateVars = {
      num,
      d1,
      d10,
      lower_ten: lowerTen,
      higher_ten: higherTen,
      correct_ans: correctAns,
      stay_error_ans: lowerTen,
      up_error_ans: higherTen,
      ones_error_ans: d1,
      hill_direction: isRoundUp ? "OVER the top to the higher ten" : "BACK DOWN to the lower ten"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.options) {
      const hydratedOptions = hydrateNode(question.options, templateVars);
      // Ensure options are unique (prevent correct answer appearing twice as a distractor)
      const seen = new Set();
      const uniqueOptions = [];

      for (const opt of hydratedOptions) {
        const val = String(typeof opt === 'object' ? (opt.content || opt.text || '') : opt);
        if (!seen.has(val)) {
          seen.add(val);
          uniqueOptions.push(opt);
        }
      }
      inst.options = uniqueOptions;
    }

    if (inst.options) {
      inst.correctAnswerIndex = inst.options.findIndex(opt => {
        const val = typeof opt === 'object' ? (opt.content || opt.text || '') : opt;
        return String(val) === String(correctAns);
      });
    }

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    inst.correctAnswerText = String(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'rounding_mcq_v2') {
    let num, roundTo;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [101, 999], round_to: 100 };
    roundTo = dataSource.round_to || 100;

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [101, 999];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % roundTo === 0 && attempts < 50);
    }

    const factor = roundTo;
    const rightFactor = factor / 10;

    const targetDigit = Math.floor(num / factor) % 10;
    const rightDigit = Math.floor(num / rightFactor) % 10; // The digit that decides (tens for hundreds, hundreds for thousands)

    const isRoundUp = rightDigit >= 5;
    const lowerMultiple = Math.floor(num / factor) * factor;
    const higherMultiple = (Math.floor(num / factor) + 1) * factor;
    const correctAns = isRoundUp ? higherMultiple : lowerMultiple;

    const names = { 10: "ten", 100: "hundred", 1000: "thousand", 10000: "ten thousand" };
    const rightNames = { 10: "ones", 100: "tens", 1000: "hundreds", 10000: "thousands" };

    const templateVars = {
      num,
      target_place: names[factor],
      right_place: rightNames[factor],
      target_digit: targetDigit,
      right_digit: rightDigit,
      lower_multiple: lowerMultiple,
      higher_multiple: higherMultiple,
      correct_ans: correctAns,
      stay_error_ans: lowerMultiple,
      up_error_ans: higherMultiple,
      hill_direction: isRoundUp ? `OVER the top to the higher ${names[factor]}` : `BACK DOWN to the lower ${names[factor]}`
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.options) {
      const hydratedOptions = hydrateNode(question.options, templateVars);
      const seen = new Set();
      const uniqueOptions = [];
      for (const opt of hydratedOptions) {
        const val = String(typeof opt === 'object' ? (opt.content || opt.text || '') : opt);
        if (!seen.has(val)) {
          seen.add(val);
          uniqueOptions.push(opt);
        }
      }
      inst.options = uniqueOptions;
    }

    if (inst.options) {
      inst.correctAnswerIndex = inst.options.findIndex(opt => {
        const val = typeof opt === 'object' ? (opt.content || opt.text || '') : opt;
        return String(val) === String(correctAns);
      });
    }

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    inst.correctAnswerText = String(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'rounding_fill_blank_v1') {
    let num, scale;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1100, 9999], scales: ["ten", "hundred", "thousand"] };

    // Pick a random scale from available ones
    const scales = dataSource.scales || ["ten", "hundred", "thousand"];
    scale = scales[Math.floor(Math.random() * scales.length)];

    if (overrideVariables) {
      num = overrideVariables.num;
      scale = overrideVariables.scale || scale;
    } else {
      const range = dataSource.range || [1100, 9999];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % 10 === 0 && attempts < 50);
    }

    const scaleFactors = { "ten": 10, "hundred": 100, "thousand": 1000 };
    const factor = scaleFactors[scale];
    const rightFactor = factor / 10;

    const targetDigit = Math.floor(num / factor) % 10;
    const checkDigit = Math.floor(num / rightFactor) % 10;

    const lowBenchmark = Math.floor(num / factor) * factor;
    const highBenchmark = (Math.floor(num / factor) + 1) * factor;
    const isRoundUp = checkDigit >= 5;
    const correctAns = isRoundUp ? highBenchmark : lowBenchmark;

    const templateVars = {
      num,
      num_formatted: num.toLocaleString('en-IN'),
      scale,
      target_digit: targetDigit,
      check_digit: checkDigit,
      low_benchmark: lowBenchmark,
      low_benchmark_formatted: lowBenchmark.toLocaleString('en-IN'),
      high_benchmark: highBenchmark,
      high_benchmark_formatted: highBenchmark.toLocaleString('en-IN'),
      value: correctAns,
      value_formatted: correctAns.toLocaleString('en-IN'),
      hill_action: isRoundUp ? "push up to the next ten" : "slide back down"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    // Set correct answer
    const answerPayload = JSON.stringify({ ans: String(correctAns) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'number_line_rounding_v1') {
    let num, targetScale;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [2100, 2900], target_scale: 1000 };
    targetScale = dataSource.target_scale || 1000;

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [2100, 2900];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const lowBenchmark = Math.floor(num / targetScale) * targetScale;
    const highBenchmark = lowBenchmark + targetScale;
    const midpoint = lowBenchmark + (targetScale / 2);

    const distLow = num - lowBenchmark;
    const distHigh = highBenchmark - num;
    const distMid = Math.abs(num - midpoint);

    const chosenBenchmark = (num >= midpoint) ? highBenchmark : lowBenchmark;

    const templateVars = {
      num,
      num_formatted: num.toLocaleString('en-IN'),
      low_benchmark: lowBenchmark,
      low_benchmark_formatted: lowBenchmark.toLocaleString('en-IN'),
      high_benchmark: highBenchmark,
      high_benchmark_formatted: highBenchmark.toLocaleString('en-IN'),
      midpoint: midpoint,
      midpoint_formatted: midpoint.toLocaleString('en-IN'),
      dist_low: distLow,
      dist_high: distHigh,
      dist_mid: distMid,
      target_ans: chosenBenchmark,
      target_ans_formatted: chosenBenchmark.toLocaleString('en-IN'),
      scale_name: targetScale === 10 ? 'ten' : (targetScale === 100 ? 'hundred' : (targetScale === 1000 ? 'thousand' : String(targetScale)))
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    const preHydratedParts = question.parts || [];
    inst.parts = hydrateNode(preHydratedParts, templateVars).map(p => {
      if (p.type === 'numberLineRounding') {
        return {
          ...p,
          min: lowBenchmark,
          max: highBenchmark,
          mid: midpoint,
          current: num,
          distLow: distLow,
          distHigh: distHigh,
          distMid: distMid
        };
      }
      return p;
    });

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const answerPayload = JSON.stringify({ ans: String(chosenBenchmark) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  function numberToWords(n) {
    const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) {
      const hundredPart = units[Math.floor(n / 100)] + " hundred";
      const rest = n % 100;
      if (rest === 0) return hundredPart;
      return hundredPart + " and " + numberToWords(rest);
    }
    return n.toString();
  }

  /**
   * instantiateTemplate implementation...
   */

  // (previous logic blocks...)

  if (logic === 'number_word_to_digit_v1') {
    inst.type = 'mcq';
    let num;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [101, 999] };

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [101, 999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const d3 = Math.floor(num / 100);
    const d2 = Math.floor((num % 100) / 10);
    const d1 = num % 10;

    const hundredWord = numberToWords(d3 * 100).split(" ")[0];
    const numberInWords = numberToWords(num);

    // Distractors
    let teenError = (d2 >= 2) ? (d3 * 100 + 10 + d1) : (d3 * 100 + 20 + d1);
    const swapError = d3 * 100 + d1 * 10 + d2;
    const hundredError = ((d3 + (Math.random() > 0.5 ? 1 : -1) - 1 + 9) % 9 + 1) * 100 + d2 * 10 + d1;

    const templateVars = {
      num,
      number_in_words: numberInWords,
      digit_3: d3,
      digit_2: d2,
      digit_1: d1,
      hundred_word: hundredWord,
      teen_error: teenError,
      swap_error: swapError,
      hundred_error: hundredError
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    // Create and shuffle options
    if (Array.isArray(question.options)) {
      let options = hydrateNode(question.options, templateVars);

      // Ensure options have all required labeling fields
      options = options.map(o => ({
        ...o,
        label: String(o.content),
        text: String(o.content)
      }));

      // Unique check
      const seen = new Set();
      options = options.filter(o => {
        const val = String(o.content);
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });

      // Shuffle
      inst.options = options.sort(() => Math.random() - 0.5);

      // Track correct index AFTER shuffle
      const correctIdx = inst.options.findIndex(o => String(o.content) === String(num));
      inst.correctAnswerIndex = correctIdx;
      inst.correctAnswerText = String(num);
    }

    inst.parts = hydrateNode(question.parts || [], templateVars);

    if (question.solution) {
      let solution = hydrateNode(question.solution, templateVars);
      // Clean up markdown markers if necessary
      if (Array.isArray(solution)) {
        solution = solution.map(s => {
          if (s.type === 'text') {
            return {
              ...s,
              content: s.content.replace(/^###\s*/, '').replace(/^##\s*/, '')
            };
          }
          return s;
        });
      }
      inst.solution = solution;
    }
  }

  if (logic === 'interactive_object_counting_v1') {
    let num, objectType, arrangement, imageUrl;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 10] };

    if (overrideVariables) {
      num = overrideVariables.num;
      objectType = overrideVariables.object_type;
      arrangement = overrideVariables.arrangement;
      imageUrl = overrideVariables.image_url;
    } else {
      const range = dataSource.range || [1, 20];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      const objectTypes = ["firefly", "ladybug", "star", "apple"];
      objectType = dataSource.object_type || inst.adaptiveConfig?.variables?.object_type || objectTypes[Math.floor(Math.random() * objectTypes.length)];

      const arrangements = ["grid", "scatter"];
      arrangement = dataSource.arrangement || inst.adaptiveConfig?.variables?.arrangement || arrangements[Math.floor(Math.random() * arrangements.length)];

      imageUrl = dataSource.image_url || inst.adaptiveConfig?.variables?.image_url || null;
    }

    const templateVars = {
      num,
      object_type: objectType,
      arrangement,
      image_url: imageUrl
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    // Create options: 1 to 10 if num <= 10, else 1 to 20
    const maxOption = num <= 10 ? 10 : 20;
    inst.options = Array.from({ length: maxOption }).map((_, i) => String(i + 1));
    inst.correctAnswerIndex = num - 1;
    inst.type = 'mcq';

    // Hydrate Parts
    const rawParts = question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How many {object_type}s are there?', hasAudio: true },
      { type: 'countingVisual', num: '{num}', object_type: '{object_type}', image_url: '{image_url}', arrangement: '{arrangement}' }
    ];
    inst.parts = hydrateNode(rawParts, templateVars);

    // Hydrate Solution
    const rawSolution = question.solution && (Array.isArray(question.solution) ? question.solution.length > 0 : true) ? question.solution : [
      { type: 'text', content: 'Count the {object_type}s one by one.', hasAudio: true },
      { type: 'countingVisual', num: '{num}', object_type: '{object_type}', image_url: '{image_url}', arrangement: '{arrangement}', showNumbers: true, highlightLast: true },
      { type: 'text', content: 'As we point to each bug, we say the next number. The last number we say is the total.', hasAudio: false },
      { type: 'text', content: 'There are {num} {object_type}s.', hasAudio: true }
    ];

    let parsedSolution = rawSolution;
    if (typeof parsedSolution === 'string') {
      try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
    }
    inst.solution = hydrateNode(parsedSolution, templateVars);

    const answerPayload = JSON.stringify({ ans_value: String(num) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'math_multiplication_from_image_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const groupRange = dataSource.group_count_range || [2, 4];
    const perGroupRange = dataSource.per_group_range || [2, 5];
    const maxProduct = Number(dataSource.max_product || 20);
    const emojiChoices = Array.isArray(dataSource.emoji_choices) && dataSource.emoji_choices.length > 0
      ? dataSource.emoji_choices
      : ['🌸', '🍎', '⭐', '🧱', '🐶'];

    let groupCount, perGroup, emoji, imageUrl;
    if (overrideVariables) {
      groupCount = overrideVariables.group_count;
      perGroup = overrideVariables.per_group;
      emoji = overrideVariables.emoji;
      imageUrl = overrideVariables.image_url;
    } else {
      let attempts = 0;
      do {
        groupCount = Math.floor(Math.random() * (groupRange[1] - groupRange[0] + 1)) + groupRange[0];
        perGroup = Math.floor(Math.random() * (perGroupRange[1] - perGroupRange[0] + 1)) + perGroupRange[0];
        attempts += 1;
      } while ((groupCount * perGroup) >= maxProduct && attempts < 50);

      emoji = dataSource.emoji || emojiChoices[Math.floor(Math.random() * emojiChoices.length)];
      imageUrl = dataSource.image_url || null;
    }

    const product = groupCount * perGroup;
    const objectLabel = dataSource.object_label || (emoji ? 'objects' : 'pictures');

    const renderGroupedSvg = () => {
      const iconSize = imageUrl ? 24 : 20;
      const cellWidth = imageUrl ? 46 : 36;
      const rowHeight = imageUrl ? 44 : 36;
      const leftPad = 12;
      const topPad = 10;
      const gapY = 6;
      const width = leftPad * 2 + (perGroup * cellWidth);
      const height = topPad * 2 + (groupCount * rowHeight) + ((groupCount - 1) * gapY);

      let rowMarkup = '';
      for (let row = 0; row < groupCount; row += 1) {
        const y = topPad + row * (rowHeight + gapY);
        rowMarkup += `<rect x="5" y="${y}" width="${width - 10}" height="${rowHeight}" fill="#ffffff" stroke="#111827" stroke-width="1" />`;

        for (let col = 0; col < perGroup; col += 1) {
          const x = leftPad + (col * cellWidth) + ((cellWidth - iconSize) / 2);
          if (imageUrl) {
            rowMarkup += `<image href="${imageUrl}" x="${x}" y="${y + 6}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" />`;
          } else {
            rowMarkup += `<text x="${x + (iconSize / 2)}" y="${y + 25}" text-anchor="middle" font-size="${iconSize - 1}">${emoji}</text>`;
          }
        }
      }

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="width:100%;height:auto;max-width:440px;">
          ${rowMarkup}
        </svg>
      `;
    };

    const templateVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      group_count: groupCount,
      per_group: perGroup,
      product,
      emoji,
      image_url: imageUrl,
      object_label: objectLabel
    };

    inst.adaptiveConfig.variables = templateVars;
    inst.type = 'textInput';
    inst.isVertical = true;
    inst.showSubmitButton = true;

    inst.parts = [
      {
        type: 'text',
        content: question.questionText || question.question_text || `Write the multiplication number sentence shown for these ${objectLabel}:`,
        isVertical: true
      },
      {
        type: 'svg',
        content: renderGroupedSvg(),
        isVertical: true
      },
      {
        type: 'text',
        content: 'Type the complete multiplication number sentence (for example, 2 x 3 = 6).',
        isVertical: true
      }
    ];

    inst.correctAnswerText = `${groupCount} x ${perGroup} = ${product}`;
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    inst.solution = [
      {
        type: 'text',
        content: `Count the groups first. There are **${groupCount} groups**.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `Count how many are in each group. There are **${perGroup}** in each group.`,
        isVertical: true
      },
      {
        type: 'text',
        content: `So the multiplication sentence is **${groupCount} x ${perGroup} = ${product}**.`,
        isVertical: true
      }
    ];
  }

  if (logic === 'even_odd_multi_v1') {
    let categoryTarget, numList;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];

    if (overrideVariables) {
      categoryTarget = overrideVariables.category_target;
      numList = overrideVariables.num_list;
    } else {
      categoryTarget = Math.random() < 0.5 ? "even" : "odd";
      // Ensure we have a mix of even and odd
      numList = [];
      const min = range[0];
      const max = range[1];

      while (numList.length < 4) {
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!numList.includes(n)) numList.push(n);
      }
      // Guarantee at least one correct
      const hasMatch = numList.some(n => (categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0));
      if (!hasMatch) {
        const pos = Math.floor(Math.random() * 4);
        const base = Math.floor(Math.random() * (max - min + 1)) + min;
        numList[pos] = categoryTarget === 'even' ? (base % 2 === 0 ? base : base + 1) : (base % 2 !== 0 ? base : base + 1);
        if (numList[pos] > max) numList[pos] -= 2; // Keep in range
      }
    }

    const otherCategory = categoryTarget === 'even' ? 'odd' : 'even';
    const rule = categoryTarget === 'even' ? 'ends in 0, 2, 4, 6, or 8' : 'ends in 1, 3, 5, 7, or 9';

    const matches = numList.filter(n => (categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0));
    const nonMatches = numList.filter(n => (categoryTarget === 'even' ? n % 2 !== 0 : n % 2 === 0));

    const templateVars = {
      category_target: categoryTarget,
      other_category: otherCategory,
      ones_digit_rule: rule,
      list_of_matches: matches.join(', '),
      list_of_non_matches: nonMatches.join(', '),
      num_1: String(numList[0]), num_2: String(numList[1]), num_3: String(numList[2]), num_4: String(numList[3]),
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars, num_list: numList };

    inst.type = 'mcq';
    inst.isMultiSelect = true;

    // Build options with isCorrect flag
    inst.options = numList.map(n => {
      const isCorr = categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0;
      return { content: String(n), isCorrect: isCorr };
    });

    inst.correctAnswerIndices = inst.options.map((opt, i) => opt.isCorrect ? i : null).filter(i => i !== null);
    inst.correctAnswerText = JSON.stringify(inst.correctAnswerIndices);

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which of the following numbers are **{category_target}**?', hasAudio: true }
    ], templateVars);

    // Build default solution if not provided
    const solParts = question.solution && (Array.isArray(question.solution) ? question.solution.length > 0 : true) ? question.solution : [
      { type: "text", content: "**Remember:**", isVertical: true },
      { type: "text", content: "A number is **even** if it ends in 0, 2, 4, 6, or 8.", isVertical: true },
      { type: "text", content: "A number is **odd** if it ends in 1, 3, 5, 7, or 9.", isVertical: true },
      { type: "text", content: "**Solve:**", isVertical: true },
      { type: "text", content: "Look at the last digit of each number:", isVertical: true },
      { type: "text", content: "**{list_of_matches}** are **{category_target}**.", isVertical: true },
      { type: "text", content: "**{list_of_non_matches}** are **{other_category}**.", isVertical: true }
    ];
    let parsedSol = solParts;
    if (typeof parsedSol === 'string') {
      try { parsedSol = JSON.parse(parsedSol); } catch (e) { }
    }
    inst.solution = hydrateNode(parsedSol, templateVars);

    // Build Scaffold
    const firstWrongNum = nonMatches[0] || 93;
    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold || {
      id: "even_odd_scaffold",
      trigger_on: ["incorrect_selection"],
      parts: [
        { type: "text", content: "Let's look closely at the **last digit** (the ones place).", isVertical: true },
        { type: "text", content: `For example, in **${String(firstWrongNum).slice(0, -1)}<span style="color:#FF4B4B;font-weight:900;text-decoration:underline">${String(firstWrongNum).slice(-1)}</span>**, the last digit is ${String(firstWrongNum).slice(-1)}.`, isVertical: true },
        { type: "numberPairs", num: String(firstWrongNum) },
        { type: "text", content: `Does every dot have a partner in ${firstWrongNum}?`, isVertical: true }
      ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'odd_even_neighbor_sequence_v1') {
    let numStart, category, seqType;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];

    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      category = overrideVariables.category;
      seqType = overrideVariables.seq_type;
    } else {
      category = dataSource.category && dataSource.category !== 'random' ? dataSource.category : (Math.random() < 0.5 ? "even" : "odd");
      seqType = dataSource.type || (Math.random() < 0.33 ? "before" : (Math.random() < 0.5 ? "after" : "middle"));

      const min = Math.max(range[0], 5);
      const max = range[1] - 10;

      numStart = Math.floor(Math.random() * (max - min + 1)) + min;
      // Force parity
      if (category === 'even' && numStart % 2 !== 0) numStart++;
      if (category === 'odd' && numStart % 2 === 0) numStart++;
    }

    let sequence = [numStart, numStart + 2, numStart + 4, numStart + 6];
    let correctId = "answer_1";
    let ansVal;
    let prompt = "";

    if (seqType === 'before') {
      ansVal = numStart - 2;
      prompt = `Which **${category}** number comes **before**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { id: "answer_1", type: "input", width: "60px" },
            { type: "text", content: String(sequence[0]) },
            { type: "text", content: String(sequence[1]) },
            { type: "text", content: String(sequence[2]) }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `To find the ${category} number before **${sequence[0]}**, count back 2.`, isVertical: true },
        { type: "text", content: `**${sequence[0]} - 2 = ${ansVal}**`, isVertical: true }
      ];
    } else if (seqType === 'after') {
      ansVal = sequence[3];
      prompt = `Which **${category}** number comes **after**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { type: "text", content: String(sequence[0]) },
            { type: "text", content: String(sequence[1]) },
            { type: "text", content: String(sequence[2]) },
            { id: "answer_1", type: "input", width: "60px" }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `To find the ${category} number after **${sequence[2]}**, count on 2.`, isVertical: true },
        { type: "text", content: `**${sequence[2]} + 2 = ${ansVal}**`, isVertical: true }
      ];
    } else {
      // Middle
      ansVal = sequence[1];
      prompt = `Which **${category}** number is **missing**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { type: "text", content: String(sequence[0]) },
            { id: "answer_1", type: "input", width: "60px" },
            { type: "text", content: String(sequence[2]) },
            { type: "text", content: String(sequence[3]) }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `The sequence follows the ${category} pattern (skip count by 2).`, isVertical: true },
        { type: "text", content: `**${sequence[0]} + 2 = ${ansVal}**`, isVertical: true }
      ];
    }

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ answer_1: String(ansVal) });
    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      num_start: numStart,
      ans_1: ansVal,
      category,
      seq_type: seqType
    };
  }

  if (logic === 'parity_of_operations_v1') {
    let num1, num2, operation;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];

    if (overrideVariables) {
      num1 = overrideVariables.num1;
      num2 = overrideVariables.num2;
      operation = overrideVariables.operation;
    } else {
      num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      operation = Math.random() < 0.5 ? "+" : "-";

      // Ensure num1 >= num2 for subtraction
      if (operation === "-" && num1 < num2) {
        const temp = num1;
        num1 = num2;
        num2 = temp;
      }
    }

    const p1 = num1 % 2 === 0 ? "even" : "odd";
    const p2 = num2 % 2 === 0 ? "even" : "odd";
    const result = operation === "+" ? num1 + num2 : num1 - num2;
    const rp = result % 2 === 0 ? "even" : "odd";
    const lastDigit = Math.abs(result) % 10;

    const templateVars = {
      num1, num2, operation,
      parity1: p1,
      parity2: p2,
      result,
      last_digit: lastDigit,
      result_parity: rp,
      other_parity: rp === "even" ? "odd" : "even"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = [
      { content: "Even", isCorrect: rp === "even" },
      { content: "Odd", isCorrect: rp === "odd" }
    ];
    inst.correctAnswerIndex = rp === "even" ? 0 : 1;
    inst.correctAnswerText = JSON.stringify({ ans_value: rp });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Is **{num1} {operation} {num2}** even or odd?', hasAudio: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: "text", content: "### 🔍 Step 1: Identify Parity", isVertical: true },
      { type: "text", content: "**{num1}** is **{parity1}**.", isVertical: true },
      { type: "text", content: "**{num2}** is **{parity2}**.", isVertical: true },
      { type: "text", content: "\n### 📈 Step 2: Apply the Rule", isVertical: true },
      { type: "text", content: "Use the rule: **{parity1} {operation} {parity2}** = **{result_parity}**.", isVertical: true },
      { type: "text", content: "\n### ✅ Step 3: Check by Calculation", isVertical: true },
      { type: "text", content: "**{num1} {operation} {num2} = {result}**", isVertical: true },
      { type: "text", content: "**{result}** ends in a **{last_digit}**, which makes it **{result_parity}**.", isVertical: true }
    ], templateVars);

    const scaffoldSrc = question.scaffold || {
      id: "parity_rules_scaffold",
      trigger_on: ["incorrect_selection", "time_limit_exceeded"],
      parts: [
        { type: "text", content: "### 💡 Key Idea: Parity Rules", isVertical: true },
        { type: "text", content: "You don't need to do the full math! Just look at the parities:", isVertical: true },
        { type: "text", content: "| Rule | Result |\n| :--- | :--- |\n| even ± even | **even** |\n| odd ± odd | **even** |\n| even ± odd | **odd** |\n| odd ± even | **odd** |", isVertical: true },
        { type: "text", content: `Since **{parity1} {operation} {parity2}** is our case, the answer must be **{result_parity}**.`, isVertical: true }
      ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'skip_counting_target_v1') {
    let name, startNum, skipInterval, targetNum;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 50] };
    const range = dataSource.range || [1, 50];

    if (overrideVariables) {
      name = overrideVariables.name;
      startNum = overrideVariables.start_num;
      skipInterval = overrideVariables.skip_interval;
      targetNum = overrideVariables.target_num;
    } else {
      const names = ["Danny", "Anya", "Zaid", "Meera", "Leo", "Priya"];
      name = names[Math.floor(Math.random() * names.length)];

      const intervals = [2, 5, 10];
      skipInterval = intervals[Math.floor(Math.random() * intervals.length)];

      const min = Math.max(range[0], 1);
      const max = range[1] - (skipInterval * 3);
      startNum = Math.floor(Math.random() * (max - min + 1)) + min;

      const offset = (Math.floor(Math.random() * 5) + 1) * skipInterval;
      const isPossible = Math.random() < 0.5;
      targetNum = isPossible ? (startNum + offset) : (startNum + offset - 1);
    }

    const isPossible = (targetNum - startNum) % skipInterval === 0;

    // Generate sequence
    const seq = [];
    let cur = startNum;
    while (cur <= targetNum + skipInterval) {
      seq.push(cur);
      if (cur >= targetNum) break;
      cur += skipInterval;
    }

    const templateVars = {
      name, start_num: startNum, skip_interval: skipInterval, target_num: targetNum,
      sequence: seq.join(', '),
      is_possible: isPossible ? "Yes" : "No",
      conclusion: isPossible
        ? `Yes, you say **${targetNum}**. ${name} could have been counting by **${skipInterval}s**.`
        : `No, you skip over **${targetNum}**. ${name} could not have been counting by **${skipInterval}s**.`
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = ["Yes", "No"];
    inst.correctAnswerIndex = isPossible ? 0 : 1;
    inst.correctAnswerText = JSON.stringify({ ans_value: isPossible ? "Yes" : "No" });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: '{name} began at **{start_num}**. He skip-counted until he reached **{target_num}**.', hasAudio: true },
      { type: 'text', content: 'Could he have been counting by **{skip_interval}s**?', hasAudio: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: "text", content: "### 🔭 Step 1: Restate the Goal", isVertical: true },
      { type: "text", content: "We know **{name}** started at **{start_num}** and counted toward **{target_num}**.", isVertical: true },
      { type: "\n### 👣 Step 2: Try the Path", content: "Try counting by **{skip_interval}s** from **{start_num}** until you hit **{target_num}** or pass it.", isVertical: true },
      { type: "text", content: "The sequence is: **{sequence}**...", isVertical: true },
      { type: "\n### ✅ Conclusion", content: "**{conclusion}**", isVertical: true }
    ], templateVars);

    const scaffoldSrc = question.scaffold || {
      id: "skip_count_scaffold",
      trigger_on: ["incorrect_selection"],
      parts: [
        { type: "text", content: "Let's see the jumps on a number line!", isVertical: true },
        { type: "numberLineJumps", start: startNum, target: targetNum, interval: skipInterval },
        { type: "text", content: "Did the jump land right on **{target_num}**?", isVertical: true }
      ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'decreasing_sequence_v1') {
    let numStart, step;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [20, 100] };
    const range = dataSource.range || [20, 100];

    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      step = overrideVariables.step;
    } else {
      const steps = [1, 2, 3, 4, 5, 10];
      step = steps[Math.floor(Math.random() * steps.length)];

      const minStart = 5 * step + 1;
      const min = Math.max(range[0], minStart);
      const max = range[1];
      numStart = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const sequence = [];
    for (let i = 0; i < 5; i++) {
      sequence.push(numStart - (i * step));
    }
    const correctAns = numStart - (5 * step);

    // Distractors
    const distractors = new Set();
    [correctAns + step, correctAns - step, numStart, numStart - step].forEach(d => {
      if (d !== correctAns && d > 0) distractors.add(d);
    });
    // Ensure we have 3 distinct distractors
    let offset = 1;
    while (distractors.size < 3) {
      let d = correctAns + (offset * step);
      if (d !== correctAns && d > 0) distractors.add(d);
      offset++;
    }
    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
      num_start: numStart,
      step,
      num1: sequence[0], num2: sequence[1], num3: sequence[2], num4: sequence[3], num5: sequence[4],
      correct_ans: correctAns,
      full_sequence: sequence.join(', ') + ', ___'
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = opts.map(opt => String(opt));
    inst.correctAnswerIndex = correctIndex;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(correctAns) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which number is missing from this sequence?', hasAudio: true },
      { type: 'text', content: '### **{full_sequence}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: "text", content: "### 🧩 Step 1: Pattern Recognition", isVertical: true },
      { type: "text", content: "First, look for a pattern. Notice how each number is **{step} less** than the previous number.", isVertical: true },
      { type: "\n### 📈 Step 2: The Sequence", content: "**{num1}, {num2}, {num3}, {num4}, {num5}, ___**", isVertical: true },
      { type: "text", content: "To make the pattern complete, the number **{correct_ans}** must go in the blank space.", isVertical: true },
      { type: "\n### ✅ Math Check", content: "**{num5} - {step} = {correct_ans}**", isVertical: true }
    ], templateVars);
  }

  if (logic === 'increasing_sequence_v1') {
    let numStart, step;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 50] };
    const range = dataSource.range || [1, 50];

    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      step = overrideVariables.step;
    } else {
      const steps = [1, 2, 3, 5, 10];
      step = steps[Math.floor(Math.random() * steps.length)];

      const min = range[0];
      const max = range[1] - (5 * step);
      numStart = Math.floor(Math.random() * (Math.max(max, min) - min + 1)) + min;
    }

    const sequence = [];
    for (let i = 0; i < 5; i++) {
      sequence.push(numStart + (i * step));
    }
    const correctAns = numStart + (5 * step);

    // Distractors
    const distractors = new Set();
    [correctAns + step, correctAns - step, numStart, numStart + step].forEach(d => {
      if (d !== correctAns && d > 0) distractors.add(d);
    });
    let offset = 1;
    while (distractors.size < 3) {
      let d = correctAns + (offset * step);
      if (d !== correctAns && d > 0) distractors.add(d);
      offset++;
    }
    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
      num_start: numStart,
      step,
      num1: sequence[0], num2: sequence[1], num3: sequence[2], num4: sequence[3], num5: sequence[4],
      correct_ans: correctAns,
      full_sequence: sequence.join(', ') + ', ___'
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = opts.map(opt => String(opt));
    inst.correctAnswerIndex = correctIndex;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(correctAns) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which number is missing from this sequence?', hasAudio: true },
      { type: 'text', content: '### **{full_sequence}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: "text", content: "### 🧩 Step 1: Pattern Recognition", isVertical: true },
      { type: "text", content: "First, look for a pattern. Notice how each number is **{step} more** than the previous number.", isVertical: true },
      { type: "\n### 📈 Step 2: The Sequence", content: "**{num1}, {num2}, {num3}, {num4}, {num5}, ___**", isVertical: true },
      { type: "text", content: "To make the pattern complete, the number **{correct_ans}** must go in the blank space.", isVertical: true },
      { type: "\n### ✅ Math Check", content: "**{num5} + {step} = {correct_ans}**", isVertical: true }
    ], templateVars);
  }

  if (logic === 'ordinal_cardinal_v1') {
    let targetType;
    const cardPool = ["one", "five", "ten", "twelve", "twenty", "fifty", "eighty", "hundred"].sort();
    const ordPool = ["first", "fifth", "tenth", "twelfth", "twentieth", "fiftieth", "eightieth", "hundredth"].sort();

    if (overrideVariables) {
      targetType = overrideVariables.target_type;
    } else {
      targetType = Math.random() > 0.5 ? 'ordinal' : 'cardinal';
    }

    const otherType = targetType === 'ordinal' ? 'cardinal' : 'ordinal';

    // Pick words deterministically if variables provided, otherwise pick randomly
    // For simplicity and stability, we use slices that are constant for a session
    // Or better: salt the random index with numStart if we had one.
    // Here we'll just pick based on targetType's existence to ensure stability.

    // To be truly stable, we should ideally put the picked words in variables too.
    const card1 = overrideVariables?.card1 || cardPool[Math.floor(Math.random() * cardPool.length)];
    const card2 = overrideVariables?.card2 || cardPool.filter(c => c !== card1)[Math.floor(Math.random() * (cardPool.length - 1))];
    const ord1 = overrideVariables?.ord1 || ordPool[Math.floor(Math.random() * ordPool.length)];
    const ord2 = overrideVariables?.ord2 || ordPool.filter(o => o !== ord1)[Math.floor(Math.random() * (ordPool.length - 1))];

    const allOptionsRaw = [
      { text: card1, type: 'cardinal' },
      { text: card2, type: 'cardinal' },
      { text: ord1, type: 'ordinal' },
      { text: ord2, type: 'ordinal' }
    ].sort((a, b) => a.text.localeCompare(b.text)); // Alphabetical sort for stability

    const options = allOptionsRaw.map(o => o.text);
    const correctIndices = [];
    allOptionsRaw.forEach((o, i) => {
      if (o.type === targetType) correctIndices.push(i);
    });

    const matches = allOptionsRaw.filter(o => o.type === targetType).map(o => o.text);
    const nonMatches = allOptionsRaw.filter(o => o.type !== targetType).map(o => o.text);

    const templateVars = {
      target_type: targetType,
      other_type: otherType,
      list_of_matches: matches.join('\n'),
      list_of_non_matches: nonMatches.join('\n'),
      card1, card2, ord1, ord2
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.isMultiSelect = true;
    inst.showSubmitButton = true;
    inst.options = options;
    inst.correctAnswerIndices = correctIndices;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_indices: correctIndices });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which of the following are **{target_type}** numbers?', hasAudio: true },
      { type: 'text', content: '(There may be more than one.)', isVertical: true, style: { fontSize: '0.9rem', opacity: 0.7 } }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "key idea",
        parts: [
          { type: "text", content: "**Cardinal** numbers tell how many.\nCounting numbers like *one (1)*, *two (2)*, and *three (3)* are cardinal numbers.", isVertical: true },
          { type: "text", content: "\n**Ordinal** numbers tell position.\nPosition numbers like *first (1st)*, *second (2nd)*, and *third (3rd)* are ordinal numbers.", isVertical: true }
        ]
      },
      {
        type: "section",
        label: "solution",
        parts: [
          { type: "text", content: "These are **{target_type}** numbers:", isVertical: true },
          { type: "text", content: "{list_of_matches}", isVertical: true, style: { paddingLeft: '20px', fontWeight: 'bold' } },
          { type: "text", content: "\nThis is not a **{target_type}** number. It is a **{other_type}** number:", isVertical: true },
          { type: "text", content: "{list_of_non_matches}", isVertical: true, style: { paddingLeft: '20px', fontWeight: 'bold' } }
        ]
      }
    ], templateVars);
  }

  if (logic === 'numeral_type_v1') {
    let num, isOrdinal;
    const range = question.data_source?.range || [1, 100];

    if (overrideVariables) {
      num = overrideVariables.num;
      isOrdinal = overrideVariables.is_ordinal;
    } else {
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      isOrdinal = Math.random() > 0.5;
    }

    const getSuffix = (n) => {
      const lastDigit = n % 10;
      const lastTwoDigits = n % 100;
      if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";
      if (lastDigit === 1) return "st";
      if (lastDigit === 2) return "nd";
      if (lastDigit === 3) return "rd";
      return "th";
    };

    const suffix = getSuffix(num);
    const displayFormat = isOrdinal ? `${num}${suffix}` : `${num}`;
    const correctAnsText = isOrdinal ? "Ordinal" : "Cardinal";
    const otherType = isOrdinal ? "Cardinal" : "Ordinal";

    const options = ["Cardinal", "Ordinal"];
    const correctIndex = options.indexOf(correctAnsText);

    const templateVars = {
      num,
      suffix,
      display_format: displayFormat,
      correct_answer: correctAnsText,
      other_type: otherType,
      is_ordinal: isOrdinal
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = options;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: correctAnsText });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Is the following number **cardinal** or **ordinal**?', hasAudio: true },
      { type: 'text', content: '### **{display_format}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "key idea",
        parts: [
          { type: "text", content: "**Cardinal** numbers (like 1, 2, 3) tell us how many objects there are in total.", isVertical: true },
          { type: "text", content: "**Ordinal** numbers (like 1st, 2nd, 3rd) tell us the position or order of an object.", isVertical: true }
        ]
      },
      {
        type: "section",
        label: "solution",
        parts: [
          {
            type: "text", content: isOrdinal
              ? "The number **{display_format}** has a **'{suffix}'** at the end, which tells us a position. This makes it an **ordinal** number."
              : "The number **{display_format}** does not have a position suffix. It tells us a count. This makes it a **cardinal** number.", isVertical: true
          },
          { type: "text", content: "\n**Conclusion:** **{display_format}** is a/an **{correct_answer}** number.", isVertical: true }
        ]
      }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
      id: "race_scaffold",
      trigger_on: ["incorrect_selection"],
      parts: [{
        type: 'text',
        content: "Think of a race: If you are number **{num}**, that is your **cardinal** count. \nIf you finish in **{num}{suffix}** place, that is your **ordinal** position!"
      }]
    }, templateVars);
  }

  if (logic === 'number_to_words_21_99_v1') {
    let num;
    const range = question.data_source?.range || [21, 99];

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      // Avoid teens for this specific skill logic
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      } while (num >= 11 && num <= 19);
    }

    const tens = Math.floor(num / 10);
    const ones = num % 10;

    const tensMap = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };
    const onesMap = { 0: "", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine" };

    const tensWord = tensMap[tens];
    const onesWord = onesMap[ones];
    const correctAns = ones === 0 ? tensWord : `${tensWord}-${onesWord}`;

    // Distractors
    const distractors = new Set();

    // 1. Swapped (if valid tens word for ones digit)
    if (ones >= 2 && tensMap[ones]) {
      const swapped = `${tensMap[ones]}-${onesMap[tens]}`;
      if (swapped !== correctAns) distractors.add(swapped);
    }

    // 2. Just tens or just ones
    if (tensWord !== correctAns) distractors.add(tensWord);
    if (onesWord && onesWord !== correctAns) distractors.add(onesWord);

    // 3. Round Tens
    const roundTens = [20, 30, 40, 50, 60, 70, 80, 90];
    roundTens.forEach(rt => {
      const w = tensMap[rt / 10];
      if (w !== correctAns) distractors.add(w);
    });

    // Fill to 4 options total
    const possibleOnes = Object.values(onesMap).filter(v => v !== "");
    let i = 0;
    while (distractors.size < 3) {
      const d = `${tensWord}-${possibleOnes[i % possibleOnes.length]}`;
      if (d !== correctAns) distractors.add(d);
      i++;
    }

    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a.localeCompare(b));
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
      num,
      tens_digit: tens,
      ones_digit: ones,
      tens_word: tensWord,
      ones_word: onesWord || "zero",
      correct_ans: correctAns
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = opts;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: correctAns });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How do you write this number using words?', hasAudio: true },
      { type: 'text', content: '### **{num}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "strategy",
        parts: [
          { type: "text", content: "Remember how to write numbers from **21 to 99**.", isVertical: true },
          { type: "text", content: "\nFirst, write the **tens** part. Then, put a **hyphen** and write the **ones** part.", isVertical: true },
          { type: "text", content: "\n| TENS | | ONES | |\n| :--- | :--- | :--- | :--- |\n| 20 | twenty | 1 | one |\n| 30 | thirty | 2 | two |\n| 40 | forty | 3 | three |\n| 50 | fifty | 4 | four |\n| 60 | sixty | 5 | five |\n| 70 | seventy | 6 | six |\n| 80 | eighty | 7 | seven |\n| 90 | ninety | 9 | nine |", isVertical: true },
          { type: "text", content: "\nYou write **{num}** as **{correct_ans}**.", isVertical: true }
        ]
      }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
      id: "pv_scaffold",
      trigger_on: ["incorrect_selection"],
      parts: [
        { type: "text", content: "Let's look at the place values for **{num}**:", isVertical: true },
        {
          type: "table",
          content: "| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |",
          isVertical: true
        },
        {
          type: "text",
          content: "\nThe **{tens_digit}** is in the tens place, so it means **{tens_word}**.\nThe **{ones_digit}** is in the ones place, so it means **{ones_word}**.\n\nLet's put them together!",
          isVertical: true
        }
      ]
    }, templateVars);
  }

  if (logic === 'words_to_digits_21_99_v1') {
    let num;
    const range = question.data_source?.range || [21, 99];

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      } while (num >= 11 && num <= 19);
    }

    const tens = Math.floor(num / 10);
    const ones = num % 10;

    const tensMap = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };
    const onesMap = { 0: "", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine" };

    const tensWord = tensMap[tens];
    const onesWord = onesMap[ones];
    const fullWord = ones === 0 ? tensWord : `${tensWord}-${onesWord}`;

    // Distractors
    const distractors = new Set();

    // 1. Swapped
    const swapped = (ones * 10) + tens;
    if (ones >= 2 && swapped !== num) {
      distractors.add(swapped);
    }

    // 2. Round ten
    if (tens * 10 !== num) distractors.add(tens * 10);

    // 3. Off-by-ten
    const offTen = (tens === 9 ? tens - 1 : tens + 1) * 10 + ones;
    if (offTen !== num) distractors.add(offTen);

    // 4. Neighbors
    [num + 1, num - 1, num + 10, num - 10].forEach(d => {
      if (d > 0 && d !== num) distractors.add(d);
    });

    const opts = [num, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(num);

    const templateVars = {
      num,
      tens_digit: tens,
      ones_digit: ones,
      tens_word: tensWord,
      ones_word: onesWord || "zero",
      full_word: fullWord
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = opts.map(o => String(o));
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(num) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How do you write this number using digits?', hasAudio: true },
      { type: 'text', content: '### **{full_word}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "strategy",
        parts: [
          { type: "text", content: "To write **{full_word}** in digits, look at the two parts:", isVertical: true },
          { type: "text", content: "\n1. **{tens_word}** means there are **{tens_digit}** tens.\n2. **{ones_word}** means there are **{ones_digit}** ones.", isVertical: true },
          {
            type: "table",
            content: "| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |",
            isVertical: true
          },
          { type: "text", content: "\nPut them together to get **{num}**.", isVertical: true }
        ]
      }
    ], templateVars);
  }

  if (logic === 'comparison_counting_order_v1') {
    let num1, num2;
    const range = question.data_source?.range || [1, 100];

    if (overrideVariables) {
      num1 = overrideVariables.num1;
      num2 = overrideVariables.num2;
    } else {
      num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      // 20% chance of equal
      if (Math.random() < 0.2) {
        num2 = num1;
      } else {
        num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        if (num2 === num1) num2 = (num1 === range[1]) ? num1 - 1 : num1 + 1;
      }
    }

    let orderWord, comparisonResult;
    if (num1 > num2) {
      orderWord = "comes after";
      comparisonResult = "is greater than";
    } else if (num1 < num2) {
      orderWord = "comes before";
      comparisonResult = "is less than";
    } else {
      orderWord = "is the same as";
      comparisonResult = "is equal to";
    }

    const options = ["is greater than", "is less than", "is equal to"];
    const correctIndex = options.indexOf(comparisonResult);

    const templateVars = {
      num1,
      num2,
      order_word: orderWord,
      comparison_result: comparisonResult
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'mcq';
    inst.options = options;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: comparisonResult });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which words make this statement true?', hasAudio: true },
      { type: 'text', content: '### **{num1}** ____ **{num2}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "strategy",
        parts: [
          { type: "text", content: "When you count, **{num1}** **{order_word}** **{num2}**.", isVertical: true },
          { type: "text", content: "\n**Conclusion:** **{num1}** **{comparison_result}** **{num2}**.", isVertical: true }
        ]
      }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
      id: "counting_scaffold",
      trigger_on: ["incorrect_selection"],
      parts: [
        { type: "text", content: "Think about counting to **100**.", isVertical: true },
        {
          type: "text",
          content: num1 > num2
            ? "You say **{num2}** first, and then you keep counting to reach **{num1}**. This means **{num1}** is bigger!"
            : num1 < num2
              ? "You say **{num1}** first, and then you have to keep counting to reach **{num2}**. This means **{num1}** is smaller."
              : "Since both numbers are the same, they are equal!",
          isVertical: true
        }
      ]
    }, templateVars);
  }

  if (logic === 'sorting_numbers_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [1, 100];
    const count = Math.min(6, Math.max(3, Number(dataSource.count || 4)));
    const order = dataSource.order || inst.adaptiveConfig?.order || 'ascending';

    let nums = [];
    if (overrideVariables && Array.isArray(overrideVariables.nums)) {
      nums = overrideVariables.nums;
    } else {
      const set = new Set();
      while (set.size < count) {
        set.add(Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
      }
      nums = Array.from(set);
    }

    // Determine correct sort order
    const sortedNums = [...nums].sort((a, b) => (order === 'descending' ? b - a : a - b));
    const sorted_desc = [...nums].sort((a, b) => b - a);
    const sorted_asc = [...nums].sort((a, b) => a - b);

    const itemObjects = nums.map((n, i) => ({ id: `item_${i}`, content: String(n), value: n }));
    const correctIds = sortedNums.map(sn => itemObjects.find(io => io.value === sn).id);

    const sortedList = sortedNums.join(', ');
    const templateVars = {
      nums: nums,
      sorted: sortedNums,
      sorted_asc,
      sorted_desc,
      sorted_list: sortedList,
      smallest: sorted_asc[0],
      largest: sorted_asc[sorted_asc.length - 1],
      order: order
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.type = 'sorting';
    inst.items = itemObjects;
    inst.correctAnswerIndex = -1;
    inst.correctAnswerText = JSON.stringify(correctIds);

    const defaultSmallestToLargestParts = [
      { type: 'text', content: 'Put these numbers in order from **smallest** to **largest**.', hasAudio: true }
    ];
    const defaultLargestToSmallestParts = [
      { type: 'text', content: 'Put these numbers in order from **largest** to **smallest**.', hasAudio: true }
    ];

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : (order === 'descending' ? defaultLargestToSmallestParts : defaultSmallestToLargestParts), templateVars);

    inst.solution = hydrateNode(question.solution || [
      {
        type: "section",
        label: "strategy",
        parts: [
          { type: "text", content: `To sort numbers from ${order === 'descending' ? 'largest to smallest' : 'smallest to largest'}, always start by looking for the **${order === 'descending' ? 'greatest' : 'smallest'}** number in the group.`, isVertical: true },
          { type: "text", content: `\n1. Find the ${order === 'descending' ? 'largest' : 'smallest'} number: **${order === 'descending' ? '{largest}' : '{smallest}'}**.\n2. Look at the remaining numbers and find the next ${order === 'descending' ? 'largest' : 'smallest'}.\n3. Keep going until all numbers are sorted!`, isVertical: true },
          { type: "text", content: "\n**The correct order is:**", isVertical: true },
          { type: "text", content: "### **{sorted_list}**", isVertical: true }
        ]
      }
    ], templateVars);
  }

  if (logic === 'multiplication_compare_to_36_sort_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const targetValue = Number(dataSource.target_value || 36);
    const itemCount = Math.max(3, Number(dataSource.item_count || 3));
    const factorRange = dataSource.factor_range || [2, 12];
    const requireLess = dataSource.require_less !== false;
    const requireEqual = dataSource.require_equal !== false;
    const requireGreater = dataSource.require_greater !== false;

    const makeExpr = (a, b) => ({
      a,
      b,
      product: a * b,
      content: `${a} × ${b}`
    });

    const allExpressions = [];
    for (let a = factorRange[0]; a <= factorRange[1]; a += 1) {
      for (let b = factorRange[0]; b <= factorRange[1]; b += 1) {
        allExpressions.push(makeExpr(a, b));
      }
    }

    const lessPool = allExpressions.filter((expr) => expr.product < targetValue);
    const equalPool = allExpressions.filter((expr) => expr.product === targetValue);
    const greaterPool = allExpressions.filter((expr) => expr.product > targetValue);

    const requiredBuckets = [];
    if (requireLess) requiredBuckets.push({ id: 'less_than', label: `less than ${targetValue}`, pool: lessPool });
    if (requireEqual) requiredBuckets.push({ id: 'equal_to', label: `equal to ${targetValue}`, pool: equalPool });
    if (requireGreater) requiredBuckets.push({ id: 'greater_than', label: `greater than ${targetValue}`, pool: greaterPool });

    const pickUniqueFromPool = (pool, usedContents) => {
      const choices = pool.filter((expr) => !usedContents.has(expr.content));
      if (choices.length === 0) return null;
      return choices[Math.floor(Math.random() * choices.length)];
    };

    const selected = [];
    const usedContents = new Set();

    requiredBuckets.forEach((bucket) => {
      const expr = pickUniqueFromPool(bucket.pool, usedContents);
      if (expr) {
        selected.push({ ...expr, bucketId: bucket.id, bucketLabel: bucket.label });
        usedContents.add(expr.content);
      }
    });

    while (selected.length < itemCount) {
      const availableBuckets = requiredBuckets.filter((bucket) => bucket.pool.length > 0);
      if (availableBuckets.length === 0) break;
      const bucket = availableBuckets[Math.floor(Math.random() * availableBuckets.length)];
      const expr = pickUniqueFromPool(bucket.pool, usedContents);
      if (!expr) break;
      selected.push({ ...expr, bucketId: bucket.id, bucketLabel: bucket.label });
      usedContents.add(expr.content);
    }

    const shuffled = [...selected].sort(() => Math.random() - 0.5);
    const dragItems = shuffled.map((expr, idx) => ({
      id: `expr_${idx + 1}`,
      content: expr.content,
      targetGroupId: expr.bucketId
    }));

    inst.type = 'dragAndDrop';
    inst.dropGroups = requiredBuckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label
    }));
    inst.dragItems = dragItems;
    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      {
        type: 'text',
        content: `Multiply to find the products. Is each product less than ${targetValue}, equal to ${targetValue}, or greater than ${targetValue}?`,
        isVertical: true
      },
      {
        type: 'text',
        content: 'Place each expression into the correct box.',
        isVertical: true
      }
    ], { target_value: targetValue });
    inst.correctAnswerIndex = -1;
    inst.correctAnswerText = JSON.stringify(
      Object.fromEntries(dragItems.map((item) => [item.id, item.targetGroupId]))
    );
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      target_value: targetValue,
      expressions: selected.map((expr) => ({
        expression: expr.content,
        product: expr.product,
        bucket: expr.bucketLabel
      }))
    };

    const repeatedAddition = (groups, size) => Array.from({ length: groups }, () => String(size)).join(' + ');
    const bucketed = {
      less_than: selected.filter((expr) => expr.bucketId === 'less_than'),
      equal_to: selected.filter((expr) => expr.bucketId === 'equal_to'),
      greater_than: selected.filter((expr) => expr.bucketId === 'greater_than')
    };
    const renderFinalBucket = (title, exprs) => `
      <div style="flex:1;min-width:0;border:2px solid #8fd3ff;border-radius:2px;padding:10px 8px 14px;background:#fff;">
        <div style="font-size:14px;font-weight:500;color:#666;text-align:center;padding-bottom:8px;border-bottom:3px solid #8fd3ff;margin-bottom:12px;">
          ${title}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;min-height:64px;">
          ${exprs.map((expr) => `<span style="display:inline-flex;align-items:center;justify-content:center;background:#4b86e8;color:#fff;padding:6px 12px;border-radius:2px;font-size:16px;font-weight:500;">${expr.content}</span>`).join('')}
        </div>
      </div>
    `;

    const solutionParts = [
      {
        type: 'text',
        content: 'Look at one expression at a time.',
        isVertical: true
      },
      {
        type: 'text',
        content: `Multiply to find the product of each expression. Then, compare the product to ${targetValue}.`,
        isVertical: true
      }
    ];

    selected.forEach((expr, idx) => {
      solutionParts.push(
        {
          type: 'text',
          content: `**${expr.content}**`,
          isVertical: true
        },
        {
          type: 'text',
          content: `The expression ${expr.content} means ${expr.a} groups of ${expr.b}.`,
          isVertical: true
        },
        {
          type: 'text',
          content: `${repeatedAddition(expr.a, expr.b)} = ${expr.product}`,
          isVertical: true
        },
        {
          type: 'text',
          content: `${expr.content} = ${expr.product}`,
          isVertical: true
        },
        {
          type: 'text',
          content: `${expr.content} belongs in the **${expr.bucketLabel}** box.`,
          isVertical: true
        }
      );

      if (idx < selected.length - 1) {
        solutionParts.push({
          type: 'html',
          content: '<div style="height:1px;background:#d9d9d9;margin:14px 0;"></div>',
          isVertical: true
        });
      }
    });

    solutionParts.push(
      {
        type: 'text',
        content: 'Place each expression into the correct box.',
        isVertical: true
      },
      {
        type: 'html',
        isVertical: true,
        content: `
          <div style="display:flex;gap:8px;align-items:stretch;margin-top:8px;">
            ${renderFinalBucket(`less than ${targetValue}`, bucketed.less_than)}
            ${renderFinalBucket(`equal to ${targetValue}`, bucketed.equal_to)}
            ${renderFinalBucket(`greater than ${targetValue}`, bucketed.greater_than)}
          </div>
        `
      }
    );

    inst.solution = hydrateNode(question.solution && question.solution.length > 0 ? question.solution : solutionParts, {
      target_value: targetValue
    });
  }

  if (logic === 'base10_remediation_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = question.data_source?.range || [11, 99];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }
    const tens_digit = Math.floor(num / 10);
    const ones_digit = num % 10;

    const templateVars = {
      num,
      tens_digit,
      ones_digit
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = hydrateNode(question.parts || [
      { type: 'base10Visual', value: '{num}', isVertical: true },
      { type: 'text', content: 'How many blocks are there?', isVertical: true },
      { type: 'blank', id: 'ans', isVertical: true }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || question.adaptive_config?.scaffold || {
      id: "counting_by_groups",
      trigger_on: ["sum_of_digits_error", "incorrect_selection"],
      parts: [
        { type: "text", content: "Let's count the different types of blocks!" },
        {
          "type": "table",
          "content": "| Type | How many? |\n| :--- | :---: |\n| **Tens Rods** | [input: ans_tens] |\n| **Single Blocks** | [input: ans_ones] |"
        },
        {
          "type": "text",
          "content": "\nNow put them in the place value chart to find the total:"
        },
        {
          "type": "table",
          "content": "| Tens | Ones | Total |\n| :---: | :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** | [input: ans_final] |"
        }
      ]
    }, templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: 'text', content: 'Count the groups: **{tens_digit} tens** and **{ones_digit} ones**.', isVertical: true },
      { type: 'text', content: 'This means: **{tens_digit}0 + {ones_digit} = {num}**.', isVertical: true }
    ], templateVars);

    const partsStr = JSON.stringify(inst.parts);
    const answerPayload = {};
    if (partsStr.includes('"ans"')) answerPayload.ans = String(num);
    if (partsStr.includes('"ans_tens"')) answerPayload.ans_tens = String(tens_digit);
    if (partsStr.includes('"ans_ones"')) answerPayload.ans_ones = String(ones_digit);
    if (partsStr.includes('"ans_final"')) answerPayload.ans_final = String(num);

    inst.correctAnswerText = JSON.stringify(answerPayload);
    inst.adaptiveConfig.correctAnswerText = JSON.stringify(answerPayload);
  }

  if (logic === 'base_10_object_counting_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 9999] };
      const range = dataSource.range || [1, 9999];
      const min = range[0] || 1;
      const max = range[1] || 9999;
      num = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const thousands_digit = Math.floor(num / 1000);
    const hundreds_digit = Math.floor((num % 1000) / 100);
    const tens_digit = Math.floor((num % 100) / 10);
    const ones_digit = num % 10;

    const templateVars = {
      num,
      thousands_digit,
      hundreds_digit,
      tens_digit,
      ones_digit,
      num_formatted: num.toLocaleString('en-IN')
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = hydrateNode(question.parts || [
      { type: 'base_ten_blocks', thousands: '{thousands_digit}', hundreds: '{hundreds_digit}', tens: '{tens_digit}', ones: '{ones_digit}' },
      { type: 'text', content: 'How many blocks are there?', isVertical: true },
      { type: 'text', content: '[ans]', isVertical: true }
    ], templateVars);

    // Build dynamic solution rows
    const solParts = [{ type: "text", content: "Count the blocks in groups:", isVertical: true }];
    if (thousands_digit > 0) solParts.push({ type: "text", content: `**Thousands:** Count the large cubes. There are ${thousands_digit} thousands. That is ${thousands_digit},000.`, isVertical: true });
    if (hundreds_digit > 0) solParts.push({ type: "text", content: `**Hundreds:** Count the squares. There are ${hundreds_digit} hundreds. That is ${hundreds_digit}00.`, isVertical: true });
    if (tens_digit > 0) solParts.push({ type: "text", content: `**Tens:** Count the tall rods. There are ${tens_digit} rods of ten. That is ${tens_digit}0.`, isVertical: true });
    solParts.push({ type: "text", content: `**Ones:** Count the single cubes. There are ${ones_digit} cubes.`, isVertical: true });

    solParts.push({ type: "text", content: "Put them together in a chart:", isVertical: true });
    const chartHeaders = []; const chartData = [];
    if (thousands_digit > 0) { chartHeaders.push('Th'); chartData.push(thousands_digit); }
    if (hundreds_digit > 0 || thousands_digit > 0) { chartHeaders.push('H'); chartData.push(hundreds_digit); }
    if (tens_digit > 0 || hundreds_digit > 0 || thousands_digit > 0) { chartHeaders.push('T'); chartData.push(tens_digit); }
    chartHeaders.push('O'); chartData.push(ones_digit);

    const chartText = `| ${chartHeaders.join(' | ')} |\n| ${chartHeaders.map(() => '---').join(' | ')} |\n| ${chartData.join(' | ')} |`;
    solParts.push({ type: "text", content: chartText, isVertical: true });
    solParts.push({ type: "text", content: `There are **${num}** blocks in total.`, isVertical: true });

    inst.solution = hydrateNode(question.solution || solParts, templateVars);
    inst.correctAnswerText = JSON.stringify({ ans: String(num) });
    inst.adaptiveConfig.correctAnswerText = JSON.stringify({ ans: String(num) });
  }

  if (logic === 'identifying_places_and_models_v1') {
    // Template 1: Where is the Digit? (Focused exclusively)
    const num = Math.floor(Math.random() * 90) + 10;
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    const useTens = Math.random() < 0.5;
    const targetDigit = useTens ? tens : ones;
    const correctPlace = useTens ? 'tens place' : 'ones place';

    const templateVars = {
      num,
      tens_digit: tens,
      ones_digit: ones,
      target_digit: targetDigit,
      correct_place: correctPlace
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.type = 'mcq';

    // Hydrate prompts and options
    inst.parts = hydrateNode([
      { type: 'text', content: `**{num}**`, isVertical: true },
      { type: 'text', content: `Where is the digit **{target_digit}**?`, isVertical: true }
    ], templateVars);

    const options = ['tens place', 'ones place'];
    inst.options = options;
    inst.correctAnswerIndex = options.indexOf(correctPlace);

    inst.solution = hydrateNode([
      { type: 'text', content: 'It can be helpful to use a place-value chart:', isVertical: true },
      { type: 'table', content: '| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |' },
      { type: 'text', content: 'The **{target_digit}** is in the **{correct_place}**.', isVertical: true }
    ], templateVars);
  }

  if (logic === 'addition_master' || logic === 'math_arithmetic_v1') {
    // Dynamic extraction: support root, nested, and adaptiveConfig sources
    const config = inst.layout_config || inst.adaptiveConfig?.layout_config || inst.adaptiveConfig || {};
    const data = inst.question_data || inst.adaptiveConfig?.question_data || inst.data_source || inst.adaptiveConfig?.data_source || inst;
    const val = inst.validation || inst.adaptiveConfig?.validation || {};
    const scaffold = inst.scaffold || inst.adaptiveConfig?.scaffold || {};

    let operands = data.operands;

    // Auto-generate operands if missing or empty
    if (!operands || !Array.isArray(operands) || operands.length === 0) {
      const instr = String(scaffold.instruction || '').toLowerCase();
      const count = data.operand_count || 2;
      const explicitRange = data.range;

      operands = Array.from({ length: count }).map((_, i) => {
        // 1. Priority: Fixed operands (n1, n2, n3...)
        const fixedVal = data[`n${i + 1}`];
        if (fixedVal !== undefined && fixedVal !== null) return Number(fixedVal);

        // 2. Priority: Explicit range from JSON
        if (explicitRange && Array.isArray(explicitRange)) {
          return Math.floor(Math.random() * (explicitRange[1] - explicitRange[0] + 1)) + explicitRange[0];
        }

        // 3. Fallback: Instruction-based heuristics
        if (instr.includes('two-digit') || instr.includes('two digit')) {
          if (i === 1 && (instr.includes('one-digit') || instr.includes('one digit'))) return Math.floor(Math.random() * 9) + 1;
          return Math.floor(Math.random() * 80) + 11;
        }

        // 4. Default: Single digit
        return Math.floor(Math.random() * 9) + 1;
      });
    }

    const operator = data.operator || '+';
    const missingIdx = data.missing_index ?? operands.length;
    const ans = val.answer ?? (operator === '+' ? operands.reduce((a, b) => a + Number(b), 0) : operands[0] - operands[1]);

    const inputType = config.input_type || 'numpad';

    if (inputType === 'multiple_choice') {
      inst.type = 'mcq';
    } else if (inputType === 'drag_drop') {
      inst.type = 'dragAndDropv2'; // Note: Requires specific dragItems/dropGroups setup
    } else {
      inst.type = 'fillInTheBlank';
    }

    inst.showSubmitButton = config.show_submit ?? (inst.type !== 'mcq');

    const parts = [];

    // 1. Instruction
    if (scaffold.instruction) {
      parts.push({
        type: 'text',
        content: scaffold.instruction,
        hasAudio: Boolean(scaffold.has_audio),
        isVertical: true
      });
    }

    // 2. Hint
    if (data.hint_value) {
      parts.push({
        type: 'text',
        content: `*Hint: ${data.hint_value}*`,
        isVertical: true
      });
    }

    // 3. Problem Rendering (Shared for most modes)
    if (config.orientation === 'vertical') {
      const maxLen = Math.max(...operands.map(o => String(o).length), String(ans).length);
      const rows = [];

      if (config.allow_regrouping_visuals) {
        rows.push({
          kind: 'carry',
          cells: Array.from({ length: maxLen }).map((_, i) => ({ id: `carry_${i}`, type: 'digit' }))
        });
      }

      operands.forEach((op, idx) => {
        const isLastOp = idx === operands.length - 1;
        const prefix = isLastOp ? `${operator} ` : '  ';
        if (idx === missingIdx) {
          if (inst.type === 'mcq') {
            rows.push({ kind: 'text', text: prefix + '?' });
          } else {
            const cells = String(op).split('').map((char, charIdx) => ({ id: `op_${idx}_${charIdx}`, correctValue: char, type: 'digit' }));
            rows.push({ kind: 'answer', prefix, cells });
          }
        } else {
          rows.push({ kind: 'text', text: prefix + String(op) });
        }
      });

      rows.push({ kind: 'divider' });

      if (missingIdx === operands.length) {
        if (inst.type === 'mcq') {
          rows.push({ kind: 'text', text: '?' });
        } else {
          const ansStr = String(ans);
          const cells = ansStr.split('').map((char, i) => ({ id: `ans_${i}`, correctValue: char, type: 'digit' }));
          rows.push({ kind: 'answer', variant: 'joined', cells });
        }
      } else {
        rows.push({ kind: 'text', text: String(ans) });
      }

      parts.push({
        type: 'arithmeticLayout',
        layout: {
          rows,
          inputMode: 'digitpad',
          mode: config.allow_regrouping_visuals ? 'beginner' : 'standard'
        },
        isVertical: true
      });
    } else {
      const eqTokens = [];
      operands.forEach((op, idx) => {
        if (idx === missingIdx) eqTokens.push(inst.type === 'mcq' ? '?' : '[ans]');
        else eqTokens.push(String(op));
        if (idx < operands.length - 1) eqTokens.push(operator);
      });
      eqTokens.push('=');
      if (missingIdx === operands.length) eqTokens.push(inst.type === 'mcq' ? '?' : '[ans]');
      else eqTokens.push(String(ans));

      parts.push({
        type: 'text',
        content: `\\(${eqTokens.join(' ')}\\)`,
        isVertical: true
      });
    }

    inst.parts = parts;

    // Mode-specific Logic (Options generation, Answer mapping)
    const ansMap = {};
    if (inst.type === 'mcq') {
      if (!inst.options || inst.options.length === 0) {
        const optionValues = [ans];
        const distractorOffsets = [1, -1, 10, -10, 2, -2];
        for (const offset of distractorOffsets) {
          if (optionValues.length >= 4) break;
          const dist = ans + offset;
          if (dist >= 0 && !optionValues.includes(dist)) optionValues.push(dist);
        }
        while (optionValues.length < 4) {
          const dist = ans + (Math.floor(Math.random() * 20) - 10);
          if (dist >= 0 && !optionValues.includes(dist)) optionValues.push(dist);
        }
        inst.options = optionValues.sort(() => Math.random() - 0.5).map(v => ({ content: String(v) }));
      }
      inst.correctAnswerIndex = inst.options.findIndex(o => String(o.content || o) === String(ans));
      inst.correctAnswerText = String(ans);
    } else if (inst.type === 'fillInTheBlank') {
      if (config.orientation === 'vertical') {
        parts.forEach(p => {
          if (p.type === 'arithmeticLayout') {
            p.layout.rows.forEach(r => {
              if (r.cells) {
                r.cells.forEach(c => {
                  if (c.id && c.correctValue !== undefined) ansMap[c.id] = String(c.correctValue);
                });
              }
            });
          }
        });
      }
      if (Object.keys(ansMap).length === 0) ansMap.ans = String(ans);

      // Store BOTH as JSON and as a raw value for multi-engine compatibility
      inst.correctAnswerText = JSON.stringify(ansMap);
      inst.correct_answer_text = String(ans);
    }

    // Ensure validation object is updated for the session
    inst.validation = { ...val, answer: ans };
    inst.correctAnswer = ans; // Root level help

    // Hydrate Solution
    if (val.steps) {
      inst.solution = val.steps.map(s => `**Step ${s.step}:** ${s.note}`).join('\n\n');
    }
  }

  if (logic === 'picture_addition_v1') {
    const data = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = data.range || [1, 5];
    const n1 = data.n1 !== undefined ? Number(data.n1) : Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    const n2 = data.n2 !== undefined ? Number(data.n2) : Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    const sum = n1 + n2;

    const emojiChoices = data.emoji_choices || ['🐦', '🍎', '⭐', '🎈', '🐱', '🐶', '🍕'];
    const emoji = data.emoji || emojiChoices[Math.floor(Math.random() * emojiChoices.length)];
    const imageUrl = data.image_url || null;

    const missingIndex = data.missing_index !== undefined ? Number(data.missing_index) : 3;

    const renderBox = (count) => {
      let content = '';
      for (let i = 0; i < count; i++) {
        if (imageUrl) {
          content += `<img src="${imageUrl}" class="pictureImage" />`;
        } else {
          content += `<span>${emoji}</span>`;
        }
      }
      return `<div class="pictureBox">${content}</div>`;
    };

    const term1 = missingIndex === 1 ? `<div class="inlineBlankWrap">[ans]</div>` : `
      ${renderBox(n1)}
      <div class="pictureLabel">${n1}</div>
    `;
    const term2 = missingIndex === 2 ? `<div class="inlineBlankWrap">[ans]</div>` : `
      ${renderBox(n2)}
      <div class="pictureLabel">${n2}</div>
    `;
    const result = missingIndex === 3 ? `<div class="inlineBlankWrap">[ans]</div>` : `
      <div class="pictureBox" style="border:none"></div>
      <div class="pictureLabel">${sum}</div>
    `;

    inst.type = 'fillInTheBlank';
    inst.parts = [
      {
        type: 'text',
        content: inst.questionText || inst.question_text || "Add:",
        hasAudio: true,
        isVertical: true
      },
      {
        type: 'html',
        content: `
          <div class="pictureEq">
            <div class="pictureTerm">${term1}</div>
            <div class="pictureOp">+</div>
            <div class="pictureTerm">${term2}</div>
            <div class="pictureOp">=</div>
            <div class="pictureTerm">${result}</div>
          </div>
        `,
        isVertical: true
      }
    ];

    const ansValue = missingIndex === 1 ? n1 : (missingIndex === 2 ? n2 : sum);
    inst.correctAnswerText = JSON.stringify({ ans: String(ansValue) });
    inst.adaptiveConfig.variables = { n1, n2, sum, emoji, image_url: imageUrl, missing_index: missingIndex };
    return inst;
  }

  if (logic === 'subtraction_notebook_v1') {

    const data = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = data.range || [1000, 9999];
    const trapMode = data.trap_mode || '';
    const vars = inst.adaptiveConfig?.variables || {};

    let n1, n2, diff, s1, s2, sDiff;

    // Priority: 1. Provided n1/n2 from data_source, 2. Persisted variables, 3. Random generation
    if (data.n1 !== undefined && data.n2 !== undefined) {
      n1 = Number(data.n1);
      n2 = Number(data.n2);
    } else if (vars.n1 !== undefined && vars.n2 !== undefined) {
      n1 = Number(vars.n1);
      n2 = Number(vars.n2);
    } else {
      let attempts = 0;
      while (attempts < 50) {
        n1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        // Ensure n2 is between a reasonable minimum (at least 1 digit) and n1
        const n2Min = Math.min(range[0], Math.floor(n1 / 2));
        n2 = Math.floor(Math.random() * (n1 - n2Min + 1)) + n2Min;

        const testS1 = String(n1);
        const testS2 = String(n2).padStart(testS1.length, '0');
        let borrowCount = 0;
        for (let i = testS1.length - 1; i >= 0; i--) {
          if (Number(testS1[i]) < Number(testS2[i])) borrowCount++;
        }

        if (trapMode === 'borrowing_required' && borrowCount === 0) { attempts++; continue; }
        if (trapMode === 'multi_borrowing' && borrowCount < 2) { attempts++; continue; }
        break;
      }
    }

    diff = n1 - n2;
    s1 = String(n1);
    s2 = String(n2).padStart(s1.length, ' ');
    sDiff = String(diff).padStart(s1.length, '0');



    let carries = Array(s1.length).fill(null);
    let strikes = Array(s1.length).fill(false);
    let tempDigits = s1.split('').map(Number);
    let solutionSteps = [];
    const placeNames = ["Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands"];

    for (let i = s1.length - 1; i >= 0; i--) {
      const d1 = s1[i];
      const d2 = s2[i] === ' ' ? 0 : Number(s2[i]);
      const currentD1 = tempDigits[i];
      const place = placeNames[s1.length - 1 - i];

      if (currentD1 < d2) {
        let borrowIdx = i - 1;
        while (borrowIdx >= 0 && tempDigits[borrowIdx] === 0) {
          borrowIdx--;
        }

        if (borrowIdx >= 0) {
          solutionSteps.push({
            type: 'text',
            content: `**${place} Column**: We cannot subtract ${d2} from ${currentD1}. We must borrow from the ${placeNames[s1.length - 1 - borrowIdx]} place.`
          });

          // Apply borrowing logic for multi-step (zeros)
          let k = i - 1;
          while (k >= 0 && tempDigits[k] === 0) {
            strikes[k] = true;
            tempDigits[k] = 9;
            carries[k] = 9;
            k--;
          }
          if (k >= 0) {
            strikes[k] = true;
            tempDigits[k] -= 1;
            carries[k] = tempDigits[k];
          }
          strikes[i] = true;
          carries[i] = currentD1 + 10;
          tempDigits[i] = currentD1 + 10;
        }
      }

      const resDigit = tempDigits[i] - d2;
      solutionSteps.push({
        type: 'text',
        content: `${place} Column: ${tempDigits[i]} - ${d2} = **${resDigit}**`
      });
    }

    const cells = [];
    const colCount = s1.length + 1;

    carries.forEach((c, i) => {
      if (c !== null) cells.push({ r: 0, c: i + 1, content: String(c) });
    });

    s1.split('').forEach((digit, i) => {
      cells.push({ r: 1, c: i + 1, content: digit, highlight: strikes[i] });
    });

    const padSize = s1.length;
    s2 = String(n2).padStart(padSize, ' ');

    cells.push({ r: 2, c: 0, content: '-' }); // Column 0 is for the operator
    s2.split('').forEach((digit, i) => {
      if (digit !== " ") cells.push({ r: 2, c: i + 1, content: digit });
    });

    for (let i = 0; i < s1.length; i++) {
      cells.push({
        r: 3,
        c: i + 1,
        type: 'input',
        id: `digit_${i}`,
        answerType: 'digit'
      });
    }

    inst.type = 'fillInTheBlank';
    inst.parts = [
      {
        type: 'text',
        content: inst.questionText || "Look at the work below and find the final answer:",
        hasAudio: true,
        isVertical: true
      },
      {
        type: 'smartTable',
        className: 'arithmeticWork',
        config: {
          rows: 4,
          cols: colCount,
          showBorders: false,
          alignment: 'left'
        },
        cells: cells,
        isVertical: true
      }
    ];

    const expected = {};
    for (let i = 0; i < s1.length; i++) {
      expected[`digit_${i}`] = sDiff[i];
    }


    inst.correctAnswerText = JSON.stringify(expected);
    inst.solution = [
      {
        type: 'section',
        title: 'Step-by-Step Solution',
        parts: [
          { type: 'text', content: `To solve **${n1} - ${n2}**, we work from right to left:`, isVertical: true },
          ...solutionSteps.map(s => ({ ...s, isVertical: true })),
          { type: 'text', content: `The final result is **${diff}**.`, isVertical: true }
        ]
      }
    ];
    inst.adaptiveConfig = {
      ...(inst.adaptiveConfig || {}),
      variables: { n1, n2, diff },
      autoAdvance: true
    };
    return inst;
  }




  if (logic === 'math_addition_dynamic_v4') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [100, 999];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      const fixedN1 = Number(dataSource.n1);
      const fixedN2 = Number(dataSource.n2);
      const fixedSum = Number(dataSource.sum);

      if (!isNaN(fixedN1) && !isNaN(fixedN2)) {
        n1 = fixedN1;
        n2 = fixedN2;
      } else if (!isNaN(fixedSum)) {
        if (!isNaN(fixedN1)) {
          n1 = fixedN1;
          n2 = fixedSum - n1;
        } else if (!isNaN(fixedN2)) {
          n2 = fixedN2;
          n1 = fixedSum - n2;
        } else {
          // Fixed sum, random operands
          const minVal = range[0];
          n1 = Math.floor(Math.random() * (fixedSum - 2 * minVal)) + minVal;
          n2 = fixedSum - n1;
        }
      } else {
        const ensureCarry = dataSource.ensure_carry !== false;
        let attempts = 0;
        do {
          n1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
          n2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

          const hasAnyCarry = (a, b) => {
            let c = 0;
            let sa = String(a).split('').reverse();
            let sb = String(b).split('').reverse();
            for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
              let cur = Number(sa[i] || 0) + Number(sb[i] || 0) + c;
              if (cur >= 10) return true;
              c = Math.floor(cur / 10);
            }
            return false;
          };

          const anyCarry = hasAnyCarry(n1, n2);
          if (ensureCarry === anyCarry || attempts > 50) break;
          attempts++;
        } while (true);
      }
    }

    const sum = n1 + n2;
    const maxLen = Math.max(String(n1).length, String(n2).length);
    const sumLen = String(sum).length;
    const cols = Math.max(maxLen, sumLen);

    // Right-aligned digit strings
    const s1 = String(n1).padStart(cols, ' ');
    const s2 = String(n2).padStart(cols, ' ');
    const ss = String(sum).padStart(cols, ' ');

    const cells = [];
    const ansMap = {};
    const carryList = []; // stores carry value for each column (idx 0 to cols-1)

    let currentCarry = 0;
    for (let i = cols - 1; i >= 0; i--) {
      const d_1 = s1[i] === ' ' ? 0 : Number(s1[i]);
      const d_2 = s2[i] === ' ' ? 0 : Number(s2[i]);
      const colSum = d_1 + d_2 + currentCarry;
      const nextCarry = Math.floor(colSum / 10);
      carryList[i] = nextCarry;
      currentCarry = nextCarry;
    }

    const missingRow = Number(dataSource.missing_row || 3); // 1: n1, 2: n2, 3: answer

    // 1. Generate Digits (Row 1 & 2)
    for (let c = 0; c < cols; c++) {
      const placeValue = Math.pow(10, cols - 1 - c);

      // Row 1 (n1)
      if (s1[c] !== ' ') {
        if (missingRow === 1) {
          const id = `n1_${placeValue}`;
          cells.push({ r: 1, c, type: 'input', id: id });
          ansMap[id] = s1[c];
        } else {
          cells.push({ r: 1, c, content: s1[c] });
        }
      }

      // Row 2 (n2)
      if (s2[c] !== ' ') {
        const cellBase = { r: 2, c };
        if (c === 0 || s2[c - 1] === ' ') cellBase.prefix = '+';

        if (missingRow === 2) {
          const id = `n2_${placeValue}`;
          cells.push({ ...cellBase, type: 'input', id: id });
          ansMap[id] = s2[c];
        } else {
          cells.push({ ...cellBase, content: s2[c] });
        }
      }
    }

    // 2. Generate Carry Row (Row 0)
    const showCarry = dataSource.show_carry !== false;
    if (showCarry) {
      for (let c = cols - 1; c > 0; c--) {
        const placeValue = Math.pow(10, cols - 1 - (c - 1));
        const carryId = `c_${placeValue}`;
        const carryValue = carryList[c];

        cells.push({ r: 0, c: c - 1, type: 'input', id: carryId, placeholder: 'c' });
        if (carryValue > 0) ansMap[carryId] = String(carryValue);
      }
    }

    // 3. Generate Answer Row (Row 3)
    for (let c = 0; c < cols; c++) {
      const placeValue = Math.pow(10, cols - 1 - c);
      const ansId = `a_${placeValue}`;

      if (ss[c] !== ' ') {
        if (missingRow === 3) {
          cells.push({ r: 3, c, type: 'input', id: ansId });
          ansMap[ansId] = ss[c];
        } else {
          cells.push({ r: 3, c, content: ss[c] });
        }
      }
    }

    // 4. Update Question Structure
    inst.parts = [
      {
        type: 'text',
        content: `Calculate the sum of **${n1}** and **${n2}** using column addition.`,
        isVertical: true
      },
      {
        id: 'addition_grid',
        type: 'smartTable',
        config: { rows: 4, cols: cols, showBorders: false, alignment: 'right' },
        cells: cells
      }
    ];

    inst.correctAnswerText = ansMap;
    inst.adaptiveConfig.variables = { n1, n2, sum };

    // 5. High-Fidelity Solution Structure (as seen in screenshot)
    const solutionParts = [];
    for (let i = cols - 1; i >= 0; i--) {
      const placeValue = Math.pow(10, cols - 1 - i);
      const pName = placeValue === 1 ? 'ones' : (placeValue === 10 ? 'tens' : (placeValue === 100 ? 'hundreds' : 'thousands'));

      const d_1 = s1[i] === ' ' ? 0 : Number(s1[i]);
      const d_2 = s2[i] === ' ' ? 0 : Number(s2[i]);
      const prevCarry = i === cols - 1 ? 0 : carryList[i + 1];
      const colSum = d_1 + d_2 + prevCarry;
      const digit = colSum % 10;
      const nextCarry = carryList[i];

      let note = `### **Add the ${pName}.** Add ${d_1} + ${d_2}${prevCarry > 0 ? ' + ' + prevCarry + ' (carry)' : ''}. `;
      if (nextCarry > 0) note += `Remember to regroup.`;

      // Create a solution-specific smartTable for this step
      const stepCells = [];

      // Addends
      for (let c = 0; c < cols; c++) {
        if (s1[c] !== ' ') {
          stepCells.push({ r: 1, c, content: s1[c], highlight: c === i });
        }
        if (s2[c] !== ' ') {
          const cell = { r: 2, c, content: s2[c], highlight: c === i };
          if (c === 0 || s2[c - 1] === ' ') cell.prefix = '+';
          stepCells.push(cell);
        }
      }

      // Carries in this step (only show relevant ones)
      for (let j = cols - 1; j >= i; j--) {
        if (j > 0) {
          const val = carryList[j];
          if (val > 0) {
            stepCells.push({ r: 0, c: j - 1, content: String(val), highlight: (j - 1) === (i - 1), color: '#3b82f6' });
          }
        }
      }

      // Answer digits revealed so far
      for (let j = cols - 1; j >= i; j--) {
        if (ss[j] !== ' ') {
          stepCells.push({ r: 3, c: j, content: ss[j], highlight: j === i });
        }
      }

      solutionParts.push({ type: 'text', content: note, isVertical: true });
      solutionParts.push({
        type: 'smartTable',
        config: { rows: 4, cols: cols, showBorders: false, alignment: 'right', isReadOnly: true },
        cells: stepCells
      });
    }

    solutionParts.push({ type: 'text', content: `\n### **The sum is ${sum}.**`, isVertical: true });
    inst.solution = solutionParts;
  }

  if (logic === 'math_subtraction_dynamic_v4') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [100, 999];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      const fixedN1 = Number(dataSource.n1);
      const fixedN2 = Number(dataSource.n2);
      const fixedDiff = Number(dataSource.diff || dataSource.difference);

      if (!isNaN(fixedN1) && !isNaN(fixedN2)) {
        n1 = fixedN1;
        n2 = fixedN2;
      } else if (!isNaN(fixedDiff)) {
        n2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        n1 = n2 + fixedDiff;
      } else {
        // Standard random: Ensure n1 >= n2
        let a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        let b = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        n1 = Math.max(a, b);
        n2 = Math.min(a, b);
      }
    }

    const diff = n1 - n2;
    const maxLen = Math.max(String(n1).length, String(n2).length);
    const cols = maxLen;

    const s1 = String(n1).padStart(cols, ' ');
    const s2 = String(n2).padStart(cols, ' ');
    const sd = String(diff).padStart(cols, ' ');

    const cells = [];
    const ansMap = {};
    const missingRow = Number(dataSource.missing_row || 3); // 1: n1, 2: n2, 3: diff

    // 1. Generate Digits (Row 1 & 2)
    for (let c = 0; c < cols; c++) {
      const placeValue = Math.pow(10, cols - 1 - c);

      // Row 1 (n1)
      if (s1[c] !== ' ') {
        if (missingRow === 1) {
          const id = `n1_${placeValue}`;
          cells.push({ r: 1, c, type: 'input', id: id });
          ansMap[id] = s1[c];
        } else {
          cells.push({ r: 1, c, content: s1[c] });
        }
      }

      // Row 2 (n2)
      if (s2[c] !== ' ') {
        const cellBase = { r: 2, c };
        if (c === 0 || s2[c - 1] === ' ') cellBase.prefix = '-';

        if (missingRow === 2) {
          const id = `n2_${placeValue}`;
          cells.push({ ...cellBase, type: 'input', id: id });
          ansMap[id] = s2[c];
        } else {
          cells.push({ ...cellBase, content: s2[c] });
        }
      }
    }

    // 2. Borrow Row (Row 0)
    // Subtraction Borrowing logic simplified for template UI
    const showBorrow = dataSource.show_borrow !== false;
    if (showBorrow) {
      for (let c = 0; c < cols; c++) {
        const placeValue = Math.pow(10, cols - 1 - c);
        cells.push({ r: 0, c, type: 'input', id: `b_${placeValue}`, placeholder: 'b' });
      }
    }

    // 3. Difference Row (Row 3)
    for (let c = 0; c < cols; c++) {
      const placeValue = Math.pow(10, cols - 1 - c);
      const ansId = `d_${placeValue}`;

      if (sd[c] !== ' ') {
        if (missingRow === 3) {
          cells.push({ r: 3, c, type: 'input', id: ansId });
          ansMap[ansId] = sd[c];
        } else {
          cells.push({ r: 3, c, content: sd[c] });
        }
      }
    }

    inst.parts = [
      {
        type: 'text',
        content: `Calculate **${n1}** minus **${n2}** using column subtraction.`,
        isVertical: true
      },
      {
        id: 'subtraction_grid',
        type: 'smartTable',
        config: { rows: 4, cols: cols, showBorders: false, alignment: 'right' },
        cells: cells
      }
    ];

    inst.correctAnswerText = ansMap;
    inst.adaptiveConfig.variables = { n1, n2, diff };

    // 4. Solution with Grids
    const solutionParts = [];
    let activeBorrow = 0;

    for (let i = cols - 1; i >= 0; i--) {
      const placeValue = Math.pow(10, cols - 1 - i);
      const pName = placeValue === 1 ? 'ones' : (placeValue === 10 ? 'tens' : (placeValue === 100 ? 'hundreds' : 'thousands'));

      let d1 = s1[i] === ' ' ? 0 : Number(s1[i]);
      const d2 = s2[i] === ' ' ? 0 : Number(s2[i]);

      let note = `### **Subtract the ${pName}.**\n`;

      const originalD1 = d1;
      if (activeBorrow > 0) {
        d1 -= activeBorrow;
        note += `We borrowed 1 from this column earlier, so **${originalD1}** becomes **${d1}**.\n\n`;
      }

      const currentBorrowNeeded = d1 < d2 ? 1 : 0;
      if (currentBorrowNeeded) {
        const borrowedD1 = d1 + 10;
        note += `Since **${d1}** is less than **${d2}**, we borrow 1 from the next place to make it **${borrowedD1}**.\n`;
        note += `**${borrowedD1} - ${d2} = ${borrowedD1 - d2}.**`;
      } else {
        if (i === 0 && d1 === 0) {
          // leading zero
        } else {
          note += `**${d1} - ${d2} = ${d1 - d2}.**`;
        }
      }
      activeBorrow = currentBorrowNeeded;

      const stepCells = [];
      for (let c = 0; c < cols; c++) {
        if (s1[c] !== ' ') stepCells.push({ r: 1, c, content: s1[c], highlight: c === i });
        if (s2[c] !== ' ') {
          const cell = { r: 2, c, content: s2[c], highlight: c === i };
          if (c === 0 || s2[c - 1] === ' ') cell.prefix = '-';
          stepCells.push(cell);
        }
        if (sd[c] !== ' ' && c >= i) stepCells.push({ r: 3, c, content: sd[c], highlight: c === i });
      }

      solutionParts.push({ type: 'text', content: note, isVertical: true });
      solutionParts.push({
        type: 'smartTable',
        config: { rows: 4, cols: cols, showBorders: false, alignment: 'right', isReadOnly: true },
        cells: stepCells
      });
    }

    solutionParts.push({ type: 'text', content: `\n### **The difference is ${diff}.**`, isVertical: true });
    inst.solution = solutionParts;
    inst.type = 'fillInTheBlank';
  }

  // Always provide a unique instance ID if it was hydrated from a template
  if (!overrideVariables) {
    const ts = Date.now();
    const rd = Math.floor(Math.random() * 100000);
    inst.id = `inst_${question.id || question.template_id || 'tpl'}_${ts}_${rd}`;
  }

  if (logic === 'math_multiplication_dynamic_v4') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range1 = dataSource.range1 || [10, 99];
    const range2 = dataSource.range2 || [10, 99];

    const allowCarry = dataSource.allow_carry !== false;

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      let attempts = 0;
      do {
        n2 = Math.floor(Math.random() * (range2[1] - range2[0] + 1)) + range2[0];

        if (!allowCarry && n2 < 10) {
          // Constructive bias: pick digits that are less likely to carry
          const dMax = Math.floor(9 / n2);
          const len = String(range1[1]).length;
          let res = "";
          for (let i = 0; i < len; i++) {
            res += Math.floor(Math.random() * (dMax + 1));
          }
          n1 = Number(res);
        } else {
          n1 = Math.floor(Math.random() * (range1[1] - range1[0] + 1)) + range1[0];
        }

        // Range check
        if (n1 < range1[0] || n1 > range1[1]) {
          attempts++;
          continue;
        }

        if (allowCarry) break;

        // Strict Validation check
        if (n2 < 10) {
          let hasCarry = false;
          let carry = 0;
          const digits = String(n1).split('').reverse();
          for (let d of digits) {
            const prod = (Number(d) * n2) + carry;
            if (prod >= 10) { hasCarry = true; break; }
            carry = Math.floor(prod / 10);
          }
          if (!hasCarry) break;
        } else {
          // Multi-digit multiplier: just accept if allowed, or keep trying
          break;
        }
        attempts++;
      } while (attempts < 200);
    }

    const prod = n1 * n2;
    const s1 = String(n1);
    const s2 = String(n2);
    const mDigits = s2.split('').reverse();
    const cols = String(prod).length + 1;
    const cells = [];
    const ansMap = {};

    // Base Rows
    const f1Str = s1.padStart(cols, ' ');
    const f2Str = s2.padStart(cols, ' ');

    // Multiplicand (Top Row)
    for (let c = 0; c < cols; c++) {
      if (f1Str[c] !== ' ') cells.push({ r: 1, c, content: f1Str[c] });
    }

    // Multiplier Row (with Multiplication Line)
    for (let c = 0; c < cols; c++) {
      if (f2Str[c] !== ' ') {
        const cell = { r: 2, c, content: f2Str[c], style: { borderBottom: '2px solid #333' } };
        if (c === (cols - s2.length)) cell.prefix = '×';
        cells.push(cell);
      } else {
        // Add empty cells with border to complete the line
        cells.push({ r: 2, c, content: ' ', style: { borderBottom: '2px solid #333' } });
      }
    }

    // Partial Product Rows
    const isSingleDigit = mDigits.length === 1;
    mDigits.forEach((digit, pIdx) => {
      const pVal = Number(digit) * n1 * Math.pow(10, pIdx);
      const pStr = String(pVal).padStart(cols, ' ');
      for (let c = 0; c < cols; c++) {
        const content = pStr[c] === ' ' ? (c >= (cols - pIdx - 1) ? '0' : ' ') : pStr[c];
        if (content !== ' ' && !isSingleDigit) {
          const style = { opacity: 0.8 };
          // Add summation line on the last partial product (only if multi-digit)
          if (pIdx === mDigits.length - 1) style.borderBottom = '2px solid #333';
          cells.push({ r: 3 + pIdx, c, content, style });
        } else if (!isSingleDigit && pIdx === mDigits.length - 1) {
          // Complete the line
          cells.push({ r: 3 + pIdx, c, content: ' ', style: { borderBottom: '2px solid #333' } });
        }
      }
    });

    // Final Product Answer Boxes (Shifted down by 1 for spacing)
    const spacerRowOffset = 1;
    const finalRow = (isSingleDigit ? 3 : (3 + mDigits.length)) + spacerRowOffset;
    const resStr = String(prod).padStart(cols, ' ');
    const finalAnsMap = {};
    let autoFocusDone = false;
    for (let c = cols - 1; c >= 0; c--) {
      if (resStr[c] !== ' ' || c >= (cols - String(prod).length)) {
        const id = `ans_${String(c).padStart(2, '0')}`;
        const inputCell = { r: finalRow, c, type: 'input', id };
        if (!autoFocusDone) {
          inputCell.autoFocus = true;
          autoFocusDone = true;
        }
        cells.push(inputCell);
        finalAnsMap[id] = resStr[c] === ' ' ? '0' : resStr[c];
      }
    }

    inst.parts = [
      { type: 'text', content: `Multiply **${n1}** by **${n2}**.`, isVertical: true },
      { id: 'mult_grid', type: 'smartTable', config: { rows: finalRow + 1, cols, alignment: 'right' }, cells }
    ];

    // SOLUTION GENERATION (High Fidelity)
    const solution = [];
    mDigits.forEach((mDigit, idx) => {
      const placeName = idx === 0 ? 'ones' : (idx === 1 ? 'tens' : 'hundreds');
      const pVal = Number(mDigit) * n1;
      const stepVal = pVal * Math.pow(10, idx);

      // Calculate Carries for this digit
      let cLine = "";
      let tempCarry = 0;
      s1.split('').reverse().forEach(d => {
        let step = (Number(d) * Number(mDigit)) + tempCarry;
        tempCarry = Math.floor(step / 10);
        cLine = (tempCarry > 0 ? tempCarry : " ") + cLine;
      });
      cLine = cLine.slice(1).padStart(cols, ' '); // Trim last excess carry for display

      const stepCells = [
        ...s1.padStart(cols, ' ').split('').map((char, c) => ({ r: 1, c, content: char, style: { color: '#5a67d8', fontWeight: 'bold' } })),
        ...s2.padStart(cols, ' ').split('').map((char, c) => ({ r: 2, c, content: char, prefix: (c === (cols - s2.length) ? '×' : ''), style: { color: (char === mDigit && (cols - 1 - c) === idx ? 'blue' : 'black') } })),
        ...cLine.split('').map((char, c) => ({ r: 0, c, content: char, style: { color: '#5a67d8', fontSize: '14px' } })),
        ...String(stepVal).padStart(cols, ' ').split('').map((char, c) => ({ r: 3, c, content: char, style: { color: 'green', fontWeight: 'bold' } }))
      ].filter(c => c.content !== ' ');

      solution.push({ type: 'text', content: `### Multiply the ${placeName}. Remember to regroup.`, isVertical: true });
      solution.push({ type: 'smartTable', config: { rows: 4, cols, alignment: 'right' }, cells: stepCells });
    });

    solution.push({ type: 'text', content: `### Now add the results.`, isVertical: true });
    const addCells = [
      ...s1.padStart(cols, ' ').split('').map((char, c) => ({ r: 0, c, content: char })),
      ...s2.padStart(cols, ' ').split('').map((char, c) => ({ r: 1, c, content: char, prefix: (c === (cols - s2.length) ? '×' : '') })),
      ...mDigits.map((d, i) => {
        const p = String(Number(d) * n1 * Math.pow(10, i)).padStart(cols, ' ');
        return p.split('').map((char, c) => ({ r: 2 + i, c, content: char, style: { color: 'blue' }, prefix: (i > 0 && c === (cols - String(Number(d) * n1 * Math.pow(10, i)).length) ? '+' : '') }));
      }).flat(),
      ...String(prod).padStart(cols, ' ').split('').map((char, c) => ({ r: 2 + mDigits.length, c, content: char, style: { color: 'green', fontWeight: 'bold' } }))
    ].filter(c => c.content !== ' ');

    solution.push({ type: 'smartTable', config: { rows: 3 + mDigits.length, cols, alignment: 'right' }, cells: addCells });
    solution.push({ type: 'text', content: `The product is **${prod.toLocaleString()}**.` });

    inst.solution = solution;
    inst.correctAnswerText = finalAnsMap;
    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.variables = { n1, n2, prod };
  }

  if (logic === 'place_face_value_diff_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range = dataSource.range || [1000, 99999];

    let number, digit, targetIdx;
    if (overrideVariables && overrideVariables.number) {
      number = parseInt(String(overrideVariables.number).replace(/,/g, ''));
      digit = Number(overrideVariables.digit);
      targetIdx = String(number).indexOf(String(digit));
    } else {
      number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      const sNum = String(number);
      const validIdxs = sNum.split('').map((d, i) => d !== '0' ? i : null).filter(v => v !== null);
      targetIdx = validIdxs[Math.floor(Math.random() * validIdxs.length)];
      digit = Number(sNum[targetIdx]);
    }

    const sNumFinal = String(number);
    const power = sNumFinal.length - 1 - targetIdx;
    const placeValue = digit * Math.pow(10, power);
    const faceValue = digit;
    const diff = placeValue - faceValue;

    inst.adaptiveConfig.variables = {
      number: number.toLocaleString(),
      digit,
      placeValue: placeValue.toLocaleString(),
      faceValue,
      diff: diff.toLocaleString()
    };

    if (Array.isArray(inst.parts)) {
      inst.parts = inst.parts.map(p => hydrateNode(p, inst.adaptiveConfig.variables));
    }

    const optionsArray = [
      { label: String(diff.toLocaleString()), isCorrect: true },
      { label: String(placeValue.toLocaleString()), isCorrect: false },
      { label: String(faceValue), isCorrect: false },
      { label: String((placeValue + faceValue).toLocaleString()), isCorrect: false }
    ];

    const seededShuffle = (arr, seed) => {
      let m = arr.length;
      let x = seed;
      while (m) {
        x = (1103515245 * x + 12345) & 0x7FFFFFFF;
        let i = x % m--;
        let t = arr[m]; arr[m] = arr[i]; arr[i] = t;
      }
      return arr;
    };

    inst.options = seededShuffle(optionsArray, number);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect);
    inst.type = 'mcq';

    inst.solution = [
      { type: 'text', content: `### **Solution:**` },
      { type: 'text', content: `Place value of **${digit}** = **${placeValue.toLocaleString()}**` },
      { type: 'text', content: `Face value of **${digit}** = **${faceValue}**` },
      { type: 'text', content: `**Difference** = ${placeValue.toLocaleString()} - ${faceValue} = **${diff.toLocaleString()}**` }
    ];
  }

  if (logic === 'successor_predecessor_prod_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    let type, digits, number;
    const params = dataSource.params || {};
    const digitList = params.digit_range || [3];
    const typeList = params.number_types || ['smallest', 'greatest'];

    if (overrideVariables && overrideVariables.number) {
      number = parseInt(String(overrideVariables.number).replace(/,/g, ''));
      type = overrideVariables.type;
      digits = overrideVariables.digits;
    } else {
      type = typeList[Math.floor(Math.random() * typeList.length)];
      digits = digitList[Math.floor(Math.random() * digitList.length)];
      if (type.toLowerCase().includes('small')) { number = Math.pow(10, digits - 1); }
      else { number = Math.pow(10, digits) - 1; }
    }

    const succ = number + 1;
    const pred = number - 1;
    const prod = succ * pred;
    const label = `${type} ${digits}-digit number`;

    inst.adaptiveConfig.variables = {
      number: number.toLocaleString(), succ: succ.toLocaleString(), pred: pred.toLocaleString(), prod: prod.toLocaleString(), label, type, digits
    };

    if (Array.isArray(inst.parts)) {
      inst.parts = inst.parts.map(p => hydrateNode(p, inst.adaptiveConfig.variables));
    }

    const optionsArray = [
      { label: String(prod.toLocaleString()), isCorrect: true },
      { label: String((number * number).toLocaleString()), isCorrect: false },
      { label: String((number * number + 1).toLocaleString()), isCorrect: false },
      { label: String((number * number - 101).toLocaleString()), isCorrect: false }
    ];

    const seededShuffle = (arr, seed) => {
      let m = arr.length; let x = seed;
      while (m) { x = (1103515245 * x + 12345) & 0x7FFFFFFF; let i = x % m--; let t = arr[m]; arr[m] = arr[i]; arr[i] = t; }
      return arr;
    };

    inst.options = seededShuffle(optionsArray, number);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect);
    inst.type = 'mcq';

    inst.solution = [
      { type: 'text', content: `### **Solution:**`, isVertical: true },
      { type: 'text', content: `1. **${label}** = **${number.toLocaleString()}**`, isVertical: true },
      { type: 'text', content: `2. **Successor** = ${number.toLocaleString()} + 1 = **${succ.toLocaleString()}**`, isVertical: true },
      { type: 'text', content: `3. **Predecessor** = ${number.toLocaleString()} - 1 = **${pred.toLocaleString()}**`, isVertical: true },
      { type: 'text', content: `4. **Product** = ${succ.toLocaleString()} × ${pred.toLocaleString()} = **${prod.toLocaleString()}**`, isVertical: true }
    ];
  }

  if (logic === 'forming_numbers_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const params = dataSource.params || {};
    const countList = params.digit_count || [4];
    const goals = params.goals || ['smallest', 'greatest'];
    let count, goal, digits;
    if (overrideVariables && overrideVariables.result) {
      count = Number(overrideVariables.count);
      goal = overrideVariables.goal;
      digits = String(overrideVariables.digitList).split(', ').map(Number);
    } else {
      count = countList[Math.floor(Math.random() * countList.length)];
      goal = goals[Math.floor(Math.random() * goals.length)];
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      digits = [];
      if (params.include_zero !== false) { digits.push(0); pool.splice(0, 1); }
      while (digits.length < count) { const idx = Math.floor(Math.random() * pool.length); digits.push(pool[idx]); pool.splice(idx, 1); }
    }

    let sorted = [...digits].sort((a, b) => a - b);
    let result; let ruleText = "";
    if (goal === 'smallest') {
      if (sorted[0] === 0 && sorted.length > 1) {
        const fnzIdx = sorted.findIndex(d => d > 0); const fnz = sorted[fnzIdx];
        const rest = [...sorted]; rest.splice(fnzIdx, 1);
        result = String(fnz) + '0' + rest.slice(1).join('');
        ruleText = `A number cannot start with **0**. So we put the smallest non-zero digit (**${fnz}**) first, then **0**, and then the rest!`;
      } else { result = sorted.join(''); ruleText = "To get the smallest number, we arrange the digits from **smallest to largest**."; }
    } else { result = [...digits].sort((a, b) => b - a).join(''); ruleText = "To get the biggest number, we arrange the digits from **largest to smallest**."; }

    inst.adaptiveConfig.variables = { count, goal, digitList: [...digits].sort(() => Math.random() - 0.5).join(', '), sortedDigits: [...digits].sort((a, b) => a - b).join(', '), result, ruleText };
    if (Array.isArray(inst.parts)) { inst.parts = inst.parts.map(p => hydrateNode(p, inst.adaptiveConfig.variables)); }

    const resNum = parseInt(result);
    const optionsSet = new Set();
    optionsSet.add(String(result));
    optionsSet.add([...digits].sort((a, b) => a - b).join(''));
    optionsSet.add([...digits].sort((a, b) => b - a).join(''));
    while (optionsSet.size < 4) { optionsSet.add([...digits].sort(() => Math.random() - 0.5).join('')); }

    const optionsArray = Array.from(optionsSet).map(label => ({ label, isCorrect: label === String(result) }));
    const seededShuffle = (arr, seed) => { let m = arr.length; let x = seed; while (m) { x = (1103515245 * x + 12345) & 0x7FFFFFFF; let i = x % m--; let t = arr[m]; arr[m] = arr[i]; arr[i] = t; } return arr; };
    inst.options = seededShuffle(optionsArray, resNum);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect);
    inst.type = 'mcq';
    inst.solution = [
      { type: 'text', content: `### **Step-by-Step Solution:**`, isVertical: true },
      { type: 'text', content: `1. **Digits provided:** **{sortedDigits}**`, isVertical: true },
      { type: 'text', content: `2. **Rule:** {ruleText}`, isVertical: true },
      { type: 'text', content: `3. **Result:** The finished number is **{result}**.`, isVertical: true }
    ];
    inst.solution = inst.solution.map(s => hydrateNode(s, inst.adaptiveConfig.variables));
  }

  if (logic === 'forming_numbers_condition_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const params = dataSource.params || {};
    const countList = params.digit_count || [4];
    const goal = params.goal || 'smallest';
    const cond = params.condition || 'odd';
    let count, digits;
    if (overrideVariables && overrideVariables.result) {
      count = Number(overrideVariables.count); digits = String(overrideVariables.digitList).split(', ').map(Number);
    } else {
      count = countList[Math.floor(Math.random() * countList.length)];
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; digits = [];
      const odds = [1, 3, 5, 7, 9]; const evens = [0, 2, 4, 6, 8];
      digits.push(odds[Math.floor(Math.random() * odds.length)]); digits.push(evens[Math.floor(Math.random() * evens.length)]);
      const combinedPool = pool.filter(d => !digits.includes(d));
      while (digits.length < count) { const idx = Math.floor(Math.random() * combinedPool.length); digits.push(combinedPool[idx]); combinedPool.splice(idx, 1); }
    }

    const candidates = [];
    const validEnds = cond === 'even' ? digits.filter(d => d % 2 === 0) : digits.filter(d => d % 2 !== 0);
    validEnds.forEach(endDigit => {
      const remaining = []; let found = false; digits.forEach(d => { if (!found && d === endDigit) { found = true; } else remaining.push(d); });
      const sorted = [...remaining].sort((a, b) => goal === 'smallest' ? a - b : b - a);
      let formed;
      if (goal === 'smallest') {
        if (sorted[0] === 0 && sorted.length > 0) {
          const fnzIdx = sorted.findIndex(d => d > 0); const fnz = sorted[fnzIdx]; const rest = [...sorted]; rest.splice(fnzIdx, 1);
          formed = String(fnz) + '0' + rest.slice(1).join('') + String(endDigit);
        } else formed = sorted.join('') + String(endDigit);
      } else formed = sorted.join('') + String(endDigit);
      candidates.push(formed);
    });

    const result = goal === 'smallest' ? candidates.sort((a, b) => parseInt(a) - parseInt(b))[0] : candidates.sort((a, b) => parseInt(b) - parseInt(a))[0];
    const validEndText = cond === 'even' ? 'an even digit (0, 2, 4, 6, 8)' : 'an odd digit (1, 3, 5, 7, 9)';
    inst.adaptiveConfig.variables = { count, goal, condition: cond, result, digitList: [...digits].sort(() => Math.random() - 0.5).join(', '), validEnds: validEndText };
    if (Array.isArray(inst.parts)) inst.parts = inst.parts.map(p => hydrateNode(p, inst.adaptiveConfig.variables));

    const resNum = parseInt(result);
    const optionsSet = new Set(); optionsSet.add(result);
    const sorted = [...digits].sort((a, b) => a - b);
    if (sorted[0] === 0) { const fnzIdx = sorted.findIndex(d => d > 0); const fnz = sorted[fnzIdx]; const rest = [...sorted]; rest.splice(fnzIdx, 1); optionsSet.add(String(fnz) + '0' + rest.slice(1).join('')); } else optionsSet.add(sorted.join(''));
    while (optionsSet.size < 4) { const r = resNum + (Math.floor(Math.random() * 21) - 10); if (r > 0) optionsSet.add(String(r).padStart(count, '0')); }

    const optionsArray = Array.from(optionsSet).map(l => ({ label: l, isCorrect: l === result }));
    const seededShuffle = (arr, seed) => { let m = arr.length; let x = seed; while (m) { x = (1103515245 * x + 12345) & 0x7FFFFFFF; let i = x % m--; let t = arr[m]; arr[m] = arr[i]; arr[i] = t; } return arr; };
    inst.options = seededShuffle(optionsArray, resNum);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect); inst.type = 'mcq';
    inst.solution = [
      { type: 'text', content: `### **Step-by-Step Solution:**`, isVertical: true },
      { type: 'text', content: `1. **Rule Check:** An **{condition}** number must end in **{validEnds}**.`, isVertical: true },
      { type: 'text', content: `2. **Result:** The **{goal}** **{condition}** number is **{result}**.`, isVertical: true }
    ];
    inst.solution = inst.solution.map(s => hydrateNode(s, inst.adaptiveConfig.variables));
  }

  if (logic === 'forming_numbers_diff_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const params = dataSource.params || {};
    const countList = params.digit_count || [4];
    const op = params.operation || 'difference';
    let count, digits;
    if (overrideVariables && overrideVariables.result) {
      count = Number(overrideVariables.count); digits = String(overrideVariables.digitList).split(', ').map(Number);
    } else {
      count = countList[Math.floor(Math.random() * countList.length)];
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; digits = [0]; pool.splice(0, 1);
      while (digits.length < count) { const idx = Math.floor(Math.random() * pool.length); digits.push(pool[idx]); pool.splice(idx, 1); }
    }

    const sortedDesc = [...digits].sort((a, b) => b - a); const greatest = sortedDesc.join('');
    const sortedAsc = [...digits].sort((a, b) => a - b);
    let smallest;
    if (sortedAsc[0] === 0) { const fnzIdx = sortedAsc.findIndex(d => d > 0); const fnz = sortedAsc[fnzIdx]; const rest = [...sortedAsc]; rest.splice(fnzIdx, 1); smallest = String(fnz) + '0' + rest.slice(1).join(''); } else { smallest = sortedAsc.join(''); }

    const resultVal = op === 'difference' ? parseInt(greatest) - parseInt(smallest) : parseInt(greatest) + parseInt(smallest);
    inst.adaptiveConfig.variables = { count, greatest, smallest, operation: op, opSymbol: (op === 'difference' ? '-' : '+'), result: resultVal.toLocaleString(), digitList: [...digits].sort(() => Math.random() - 0.5).join(', ') };
    if (Array.isArray(inst.parts)) inst.parts = inst.parts.map(p => hydrateNode(p, inst.adaptiveConfig.variables));

    const optionsSet = new Set(); optionsSet.add(resultVal.toLocaleString());
    const trap = op === 'difference' ? parseInt(greatest) + parseInt(smallest) : parseInt(greatest) - parseInt(smallest);
    optionsSet.add(trap.toLocaleString());
    while (optionsSet.size < 4) { optionsSet.add((resultVal + (Math.floor(Math.random() * 21) - 10)).toLocaleString()); }

    const optionsArray = Array.from(optionsSet).map(l => ({ label: l, isCorrect: l === resultVal.toLocaleString() }));
    const seededShuffle = (arr, seed) => { let m = arr.length; let x = seed; while (m) { x = (1103515245 * x + 12345) & 0x7FFFFFFF; let i = x % m--; let t = arr[m]; arr[m] = arr[i]; arr[i] = t; } return arr; };
    inst.options = seededShuffle(optionsArray, resultVal);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect); inst.type = 'mcq';
    inst.solution = [
      { type: 'text', content: `### **Step-by-Step Solution:**`, isVertical: true },
      { type: 'text', content: `1. **Greatest:** **${greatest}**, **Smallest:** **${smallest}**`, isVertical: true },
      { type: 'text', content: `2. **Result:** ${greatest} {opSymbol} ${smallest} = **{result}**`, isVertical: true }
    ];
    inst.solution = inst.solution.map(s => hydrateNode(s, inst.adaptiveConfig.variables));
  }

  if (logic === 'math_multiplication_missing_v1') {
    // ... same as before
  }

  if (logic === 'math_multiplication_missing_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const range1 = dataSource.range1 || [10, 99];
    const range2 = dataSource.range2 || [10, 99];

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      n1 = Math.floor(Math.random() * (range1[1] - range1[0] + 1)) + range1[0];
      n2 = Math.floor(Math.random() * (range2[1] - range2[0] + 1)) + range2[0];
    }

    const prod = n1 * n2;
    const s1 = String(n1);
    const s2 = String(n2);
    const mDigits = s2.split('').reverse();
    const cols = String(prod).length + 2;
    const cells = [];
    const ansMap = {};

    // Base Rows
    const f1Str = s1.padStart(cols, ' ');
    const f2Str = s2.padStart(cols, ' ');
    for (let c = 0; c < cols; c++) {
      if (f1Str[c] !== ' ') cells.push({ r: 1, c, content: f1Str[c] });
      if (f2Str[c] !== ' ') {
        const cell = { r: 2, c, content: f2Str[c], style: { borderBottom: '2px solid #333' } };
        if (c === (cols - s2.length)) cell.prefix = '×';
        cells.push(cell);
      } else { cells.push({ r: 2, c, content: ' ', style: { borderBottom: '2px solid #333' } }); }
    }

    // Pick a missing row (0 = ones partial, 1 = tens partial, 2 = total)
    const targetIdx = Math.floor(Math.random() * (mDigits.length + 1));

    // Partial Product Rows
    let hiddenValue = "";
    const isTargetPartial = targetIdx < mDigits.length;

    mDigits.forEach((digit, pIdx) => {
      const pVal = Number(digit) * n1 * Math.pow(10, pIdx);
      const pStr = String(pVal).padStart(cols, ' ');
      for (let c = 0; c < cols; c++) {
        const char = pStr[c] === ' ' ? (c >= (cols - pIdx - 1) ? '0' : ' ') : pStr[c];
        if (char !== ' ') {
          if (isTargetPartial && pIdx === targetIdx) {
            const id = `cell_${Math.pow(10, cols - 1 - c)}`;
            cells.push({ r: 3 + pIdx, c, type: 'input', id });
            ansMap[id] = char;
            hiddenValue += char;
          } else {
            const cell = { r: 3 + pIdx, c, content: char, style: { opacity: 0.8 } };
            if (pIdx > 0 && c === (cols - String(pVal).length)) cell.prefix = '+';
            cells.push(cell);
          }
        }
      }
      if (pIdx === mDigits.length - 1) {
        cells.filter(cl => cl.r === 3 + pIdx).forEach(cl => {
          cl.style = { ...cl.style, borderBottom: '2px solid #333' };
        });
      }
    });

    // Final Total Row
    const finalRow = 3 + mDigits.length + 1; // 1 row spacer
    const resStr = String(prod).padStart(cols, ' ');
    const isTargetTotal = targetIdx === mDigits.length;
    if (isTargetTotal) hiddenValue = String(prod);

    for (let c = 0; c < cols; c++) {
      const char = resStr[c] === ' ' ? '0' : resStr[c];
      if (resStr[c] !== ' ' || c >= (cols - String(prod).length)) {
        if (isTargetTotal) {
          const id = `cell_${Math.pow(10, cols - 1 - c)}`;
          cells.push({ r: finalRow, c, type: 'input', id });
          ansMap[id] = char;
        } else {
          cells.push({ r: finalRow, c, content: char, style: { fontWeight: 'bold' } });
        }
      }
    }

    // Apply autoFocus to the rightmost input cell
    let rightmostCell = null;
    cells.forEach(cl => {
      if (cl.type === 'input') {
        if (!rightmostCell || cl.r > rightmostCell.r || (cl.r === rightmostCell.r && cl.c > rightmostCell.c)) {
          rightmostCell = cl;
        }
      }
    });
    if (rightmostCell) rightmostCell.autoFocus = true;

    inst.parts = [
      { type: 'text', content: `Complete the multiplication algorithm. Fill in the missing numbers.`, isVertical: true },
      { id: 'mult_grid', type: 'smartTable', config: { rows: finalRow + 1, cols, alignment: 'right' }, cells }
    ];

    const stepName = targetIdx === 0 ? "first" : (targetIdx === 1 ? "second" : "final");
    const stepAction = targetIdx === 0 ? "ones" : (targetIdx === 1 ? "tens" : "addition");
    const stepAdvice = targetIdx === 1 ? " Remember to write the zero at the end." : "";

    inst.solution = [
      { type: 'text', content: `First, multiply by the ones.\n\nSecond, multiply by the tens. Remember to write the zero at the end.\n\nFinally, add to find the answer.`, isVertical: true, style: { background: '#f0f9ff', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #0ea5e9' } },
      { type: 'text', content: `### **Solve**\nThe ${stepName} step is missing. Multiply by the ${stepAction} to find the missing number.${stepAdvice}`, isVertical: true },
      {
        id: 'sol_grid', type: 'smartTable', config: { rows: finalRow + 1, cols, alignment: 'right' }, cells: cells.map(cl => {
          if (cl.type === 'input') {
            return { ...cl, type: 'content', content: ansMap[cl.id], style: { color: 'green', fontWeight: 'bold' } };
          }
          return cl;
        })
      },
      { type: 'text', content: `The missing number is **${hiddenValue.toLocaleString()}**.` }
    ];

    inst.correctAnswerText = hiddenValue;
    inst.ansMap = ansMap;
    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.variables = { n1, n2, prod, targetIdx, hiddenValue };
  }

  if (logic === 'math_number_smallest_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const categories = dataSource.categories || ["Natural", "Whole", "Even", "Odd", "Prime", "Composite"];

    let category, mode;
    if (overrideVariables && overrideVariables.category && overrideVariables.mode) {
      category = overrideVariables.category;
      mode = overrideVariables.mode;
    } else {
      category = categories[Math.floor(Math.random() * categories.length)];
      mode = Math.random() > 0.5 ? "smallest" : "greatest";
    }

    const data = {
      "Natural": { smallest: 1, greatest: 9, definition: "Natural numbers are counting numbers starting from 1." },
      "Whole": { smallest: 0, greatest: 9, definition: "Whole numbers include zero and counting numbers." },
      "Even": { smallest: 2, greatest: 8, definition: "Even numbers are exactly divisible by 2." },
      "Odd": { smallest: 1, greatest: 9, definition: "Odd numbers are not exactly divisible by 2." },
      "Prime": { smallest: 2, greatest: 7, definition: "Prime numbers have exactly two factors: 1 and itself." },
      "Composite": { smallest: 4, greatest: 9, definition: "Composite numbers have more than two factors." }
    };

    const target = data[category];
    if (!target) return; // safety

    const resultVal = target[mode];
    const modeLabel = mode === 'smallest' ? "smallest" : "greatest 1-digit";

    // Generate Distractors - Use a seed based on variables for stability if possible, 
    // but usually overrideVariables doesn't have options. Let's make it stable via category/mode.
    const optionsSet = new Set([resultVal]);
    const traps = mode === 'smallest' ? [0, 1, 2, 3, 4] : [9, 8, 7, 6, 4];

    // Simple deterministic trap selector based on category string length
    let trapIdx = category.length % traps.length;
    while (optionsSet.size < 4) {
      optionsSet.add(traps[trapIdx]);
      trapIdx = (trapIdx + 1) % traps.length;
    }

    const optionsArray = Array.from(optionsSet).map(val => ({
      label: String(val),
      isCorrect: val === resultVal
    }));

    // Seeded Shuffle
    const seededShuffle = (arr, seed) => {
      let m = arr.length, t, i;
      let x = seed;
      while (m) {
        x = (1103515245 * x + 12345) & 0x7FFFFFFF;
        i = x % m--;
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
      }
      return arr;
    };
    inst.options = seededShuffle(optionsArray, resultVal + category.length + mode.length);
    inst.correctAnswerIndex = inst.options.findIndex(o => o.isCorrect);
    inst.type = 'mcq';

    inst.parts = [
      { type: 'text', content: `Which of the following is the **${modeLabel}** ${category} number?` }
    ];

    inst.solution = [
      { type: 'text', content: `### **Conceptual Solution**`, isVertical: true },
      { type: 'text', content: `The question asks for the **${modeLabel}** ${category} number.`, isVertical: true },
      { type: 'text', content: `1. **Category**: ${target.definition}`, isVertical: true },
      { type: 'text', content: `2. **Identification**: Looking at the ${modeLabel} ${category} numbers, we find **${resultVal}**.`, isVertical: true }
    ];

    inst.concepts = [
      {
        type: "text",
        content: `**${category} Numbers**: ${target.definition}`
      },
      {
        type: "text",
        content: `The **smallest** ${category} is **${target.smallest}**, and the **greatest 1-digit** ${category} is **${target.greatest}**.`
      }
    ];

    inst.adaptiveConfig.variables = { category, mode, resultVal };
  }

  if (logic === 'math_multiplication_area_model_v1') {
    const dataSource = inst.data_source || inst.adaptiveConfig?.data_source || {};
    const difficulty = (inst.difficulty || 'medium').toLowerCase();

    let range1, range2;
    if (difficulty === 'easy') {
      range1 = dataSource.easy_range1 || dataSource.range1 || [10, 99];
      range2 = dataSource.easy_range2 || dataSource.range2 || [10, 19];
    } else if (difficulty === 'hard') {
      range1 = dataSource.hard_range1 || dataSource.range1 || [100, 999];
      range2 = dataSource.hard_range2 || dataSource.range2 || [20, 99];
    } else {
      range1 = dataSource.med_range1 || dataSource.range1 || [10, 99];
      range2 = dataSource.med_range2 || dataSource.range2 || [10, 99];
    }

    let n1, n2;
    if (overrideVariables) {
      n1 = Number(overrideVariables.n1);
      n2 = Number(overrideVariables.n2);
    } else {
      n1 = Math.floor(Math.random() * (range1[1] - range1[0] + 1)) + range1[0];
      n2 = Math.floor(Math.random() * (range2[1] - range2[0] + 1)) + range2[0];
    }

    const decompose = (num) => {
      const parts = [];
      const s = String(num);
      for (let i = 0; i < s.length; i++) {
        const digit = Number(s[i]);
        if (digit > 0 || s.length === 1) {
          parts.push(digit * Math.pow(10, s.length - 1 - i));
        }
      }
      return parts;
    };

    const p1 = decompose(n1);
    const p2 = decompose(n2);

    const maxDigits = 4; // Support up to thousands for partial sums
    const rowCount = p1.length + 2;
    const areaCols = p2.length + 1;
    const spacerCols = 1;
    const colCount = areaCols + spacerCols + maxDigits;

    const cells = [];
    const solutionCells = [];
    const ansMap = {};

    // --- AREA MODEL PART (Left side) ---
    cells.push({ r: 0, c: 0, content: "×", style: { fontWeight: "bold", borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' } });
    solutionCells.push({ r: 0, c: 0, content: "×", fontWeight: "bold" });

    p2.forEach((val, cIdx) => {
      cells.push({ r: 0, c: cIdx + 1, content: String(val), style: { fontWeight: "bold", textAlign: "center", borderBottom: '1px solid #ccc' } });
      solutionCells.push({ r: 0, c: cIdx + 1, content: String(val), fontWeight: "bold" });
    });

    p1.forEach((v1, rIdx) => {
      cells.push({ r: rIdx + 1, c: 0, content: String(v1), style: { fontWeight: "bold", textAlign: "center", borderRight: '1px solid #ccc' } });
      solutionCells.push({ r: rIdx + 1, c: 0, content: String(v1), fontWeight: "bold" });

      p2.forEach((v2, cIdx) => {
        const partialProd = v1 * v2;
        const id = `scaffold_p_${rIdx}_${cIdx}`;
        cells.push({
          r: rIdx + 1,
          c: cIdx + 1,
          type: "input",
          id,
          maxLength: 6,
          style: { textAlign: 'center', width: '70px', height: '44px', fontWeight: 'bold' }
        });
        ansMap[id] = String(partialProd);
        solutionCells.push({
          r: rIdx + 1,
          c: cIdx + 1,
          content: String(partialProd),
          renderAsInput: true,
          color: '#15803d',
          fontWeight: 'bold',
          highlight: true
        });
      });
    });

    // --- ADDITION GRID PART (Right side) ---
    let totalValue = 0;
    p1.forEach((v1, rIdx) => {
      let rowSum = 0;
      p2.forEach((v2) => { rowSum += (v1 * v2); });
      totalValue += rowSum;

      // Only show boxes needed for this specific sum
      const rowSumStr = String(rowSum);
      const rowSumDigits = rowSumStr.length;

      for (let d = 0; d < rowSumDigits; d++) {
        const char = rowSumStr[d];
        // Right-align by shifting col start
        const colShift = 4 - rowSumDigits;
        const col = areaCols + spacerCols + colShift + d;
        const id = `scaffold_row_sum_${rIdx}_d${d}`;

        cells.push({
          r: rIdx + 1,
          c: col,
          type: "input",
          id,
          maxLength: 1,
          style: {
            textAlign: 'center',
            width: '32px',
            height: '32px',
            border: '1px solid #000',
            borderRadius: '0px',
            margin: '0',
            backgroundColor: '#fff',
            color: '#000'
          }
        });
        solutionCells.push({
          r: rIdx + 1,
          c: col,
          content: char,
          renderAsInput: true,
          color: '#15803d',
          fontWeight: 'bold'
        });
      }
    });

    // --- FINAL TOTAL PART (Bottom right) ---
    const totalStr = String(totalValue);
    const totalDigits = totalStr.length;
    for (let d = 0; d < totalDigits; d++) {
      const char = totalStr[d];
      const colShift = 4 - totalDigits;
      const col = areaCols + spacerCols + colShift + d;
      const id = `scaffold_total_sum_d${d}`;

      cells.push({
        r: rowCount - 1,
        c: col,
        type: "input",
        id,
        maxLength: 1,
        style: {
          textAlign: 'center',
          width: '32px',
          height: '32px',
          fontWeight: 'bold',
          border: '1px solid #000',
          borderRadius: '0px',
          margin: '0',
          backgroundColor: '#fff',
          color: '#000'
        }
      });
      solutionCells.push({
        r: rowCount - 1,
        c: col,
        content: char,
        renderAsInput: true,
        color: '#15803d',
        fontWeight: 'bold',
        highlight: true
      });
    }

    inst.parts = [
      { type: "text", content: `Break apart the numbers and multiply to fill the area model representing **${n1} × ${n2}**. Then, add by place value.`, isVertical: true },
      {
        id: "area_table",
        type: "smartTable",
        config: {
          rows: rowCount,
          cols: areaCols + spacerCols + 4,
          cellPadding: '8px',
          borderType: 'none'
        },
        cells
      },
      { type: "text", content: `What is the final product of **${n1}** and **${n2}**?`, isVertical: true },
      { type: "text", content: "[[total]]", isVertical: true }
    ];

    // Only validate the final total, the rest is "Work Area" scaffolding
    const validationMap = {
      "total": String(n1 * n2)
    };

    inst.solution = [
      { type: 'text', content: `Break apart **${n1}** into ${p1.join(' + ')} and **${n2}** into ${p2.join(' + ')}.`, isVertical: true },
      { type: 'text', content: `Multiply each row part by each column part, then add the partial sums to get the product.`, isVertical: true },
      {
        id: 'area_table_solution',
        type: 'smartTable',
        config: {
          rows: rowCount,
          cols: areaCols + spacerCols + 4,
          cellPadding: '8px',
          borderType: 'none'
        },
        cells: solutionCells
      },
      { type: 'text', content: `The final product is **${n1 * n2}**.`, isVertical: true }
    ];

    inst.correctAnswerText = JSON.stringify(validationMap);
    inst.correct_answer_text = String(n1 * n2);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    inst.adaptiveConfig.variables = { n1, n2, total: n1 * n2 };
    inst.validation = {
      ...(inst.validation || {}),
      ignoreExtraAnswerPrefixes: ['scaffold_']
    };
    inst.correctAnswer = n1 * n2;
    inst.type = 'fillInTheBlank';
  }

  if (logic === 'ranking_comparison_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    const defaultEntities = ["Virat", "Rohit", "Surya", "Gill", "Rahul", "Pant", "Hardik", "Ishan"];
    const entities = ds.entities || defaultEntities;
    const unit = ds.unit || "runs";
    const context = ds.context || "an IPL match";

    let p1, p2, p3, s1, s2;

    if (overrideVariables && overrideVariables.p1) {
      // Use existing variables for validation/explanation
      p1 = overrideVariables.p1;
      p2 = overrideVariables.p2;
      p3 = overrideVariables.p3;
      s1 = overrideVariables.statement1;
      s2 = overrideVariables.statement2;
    } else {
      // First time generation
      const picked = [...entities].sort(() => Math.random() - 0.5).slice(0, 3);
      [p1, p2, p3] = picked; // p3 > p1 > p2

      s1 = Math.random() > 0.5 
        ? `**${p1}** scored more ${unit} than **${p2}**` 
        : `**${p2}** scored fewer ${unit} than **${p1}**`;

      s2 = Math.random() > 0.5
        ? `**${p1}** scored fewer ${unit} than **${p3}**`
        : `**${p3}** scored more ${unit} than **${p1}**`;
    }

    const variations = [
      `${p3} > ${p1} > ${p2}`, // Correct
      `${p2} > ${p1} > ${p3}`, // Reversed
      `${p1} > ${p3} > ${p2}`, // Swapped highest/middle
      `${p3} > ${p2} > ${p1}`  // Swapped middle/lowest
    ];

    const templateVars = {
      p1, p2, p3,
      statement1: s1,
      statement2: s2,
      context,
      unit,
      highest: p3,
      middle: p1,
      lowest: p2,
      chain: variations[0]
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = [
      { 
        type: 'text', 
        content: `In ${context}, ${s1}, but ${s2}. Which logical chain correctly ranks their scores from highest to lowest?`,
        isVertical: true 
      }
    ];

    // Only shuffle if we are NOT in validation/explanation mode
    const shuffled = (overrideVariables && overrideVariables.p1) 
      ? variations 
      : [...variations].sort(() => Math.random() - 0.5);
      
    const correctIdx = shuffled.indexOf(variations[0]);

    inst.options = shuffled.map(v => ({ label: v, content: v }));
    inst.correctAnswerIndex = correctIdx;
    inst.correctAnswerText = variations[0];

    inst.solution = [
      { type: 'text', content: `To find the correct ranking, let's break down the statements:`, isVertical: true },
      { type: 'text', content: `1. **${s1.replace(/\*\*/g, '')}**: This means **${p1} > ${p2}**.`, isVertical: true },
      { type: 'text', content: `2. **${s2.replace(/\*\*/g, '')}**: This means **${p3} > ${p1}**.`, isVertical: true },
      { type: 'text', content: `### Combined Chain:`, isVertical: true },
      { type: 'text', content: `Connecting them through **${p1}** (the middle player):`, isVertical: true },
      { type: 'text', content: `**${p3} (Highest) > ${p1} (Middle) > ${p2} (Lowest)**`, isVertical: true },
      { type: 'text', content: `Therefore, the correct map is **${variations[0]}**.`, isVertical: true }
    ];

    inst.type = 'mcq';
    return inst;
  }

  if (logic === 'ranking_extreme_v1') {
    const config = inst.adaptiveConfig || {};
    const ds = inst.data_source || config.data_source || {};
    
    const defaultEntities = ["GT", "CSK", "MI", "LSG", "RCB", "SRH", "DC", "KKR"];
    const entities = ds.entities || defaultEntities;
    const unit = ds.unit || "points";
    const context = ds.context || "the IPL Points Table logic";

    let p1, p2, p3, p4, s1, s2, s3, targetType;

    if (overrideVariables && overrideVariables.p1) {
      p1 = overrideVariables.p1;
      p2 = overrideVariables.p2;
      p3 = overrideVariables.p3;
      p4 = overrideVariables.p4;
      s1 = overrideVariables.statement1;
      s2 = overrideVariables.statement2;
      s3 = overrideVariables.statement3;
      targetType = overrideVariables.targetType;
    } else {
      // Pick 4 distinct entities for a longer chain
      const picked = [...entities].sort(() => Math.random() - 0.5).slice(0, 4);
      [p1, p2, p3, p4] = picked; // Chain: p4 > p3 > p2 > p1

      // Build the statements
      s1 = `**${p4}** has more ${unit} than **${p3}**`;
      s2 = `**${p3}** has more ${unit} than **${p2}**`;
      s3 = Math.random() > 0.5 
        ? `**${p2}** has more ${unit} than **${p1}**`
        : `**${p1}** has fewer ${unit} than **${p2}**`;

      targetType = Math.random() > 0.5 ? 'highest' : 'lowest';
    }

    const correctAnswer = targetType === 'highest' ? p4 : p1;

    const templateVars = {
      p1, p2, p3, p4,
      statement1: s1,
      statement2: s2,
      statement3: s3,
      context,
      unit,
      highest: p4,
      lowest: p1,
      targetType
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = [
      { 
        type: 'text', 
        content: `Look at ${context}:\n* ${s1}\n* ${s2}\n* ${s3}\n\nWhich team has the **${targetType === 'highest' ? 'most' : 'least'}** (${targetType === 'highest' ? 'highest' : 'lowest'}) number of ${unit}?`,
        isVertical: true 
      }
    ];

    const displayOrder = (overrideVariables && overrideVariables.p1)
      ? [p1, p2, p3, p4]
      : [p1, p2, p3, p4].sort(() => Math.random() - 0.5);

    inst.options = displayOrder.map(v => ({ label: v, content: v }));
    inst.correctAnswerIndex = displayOrder.indexOf(correctAnswer);
    inst.correctAnswerText = correctAnswer;

    inst.solution = [
      { type: 'text', content: `Let's build the ${unit} chain step-by-step:`, isVertical: true },
      { type: 'text', content: `1. **${p4} > ${p3}**`, isVertical: true },
      { type: 'text', content: `2. **${p3} > ${p2}**`, isVertical: true },
      { type: 'text', content: `3. **${p2} > ${p1}** (Since ${s3.replace(/\*\*/g, '')})`, isVertical: true },
      { type: 'text', content: `### Full Ranking:`, isVertical: true },
      { type: 'text', content: `**${p4} (1st) > ${p3} (2nd) > ${p2} (3rd) > ${p1} (4th)**`, isVertical: true },
      { type: 'text', content: `**Conclusion:** **${correctAnswer}** is at the ${targetType === 'highest' ? 'top' : 'bottom'} of the chain, meaning they have the **${targetType === 'highest' ? 'most' : 'least'}** ${unit}.`, isVertical: true }
    ];

    inst.type = 'mcq';
    return inst;
  }

  // Always provide a unique instance ID if it was hydrated from a template
  if (!overrideVariables) {
    const ts = Date.now();
    const rd = Math.floor(Math.random() * 100000);
    inst.id = `inst_${question.id || question.template_id || 'tpl'}_${ts}_${rd}`;
  }

  // Final Type Safety: Never return "template" as the type to the renderer
  if ((inst.type === 'template' || !inst.type) && (inst.logic_type || inst.adaptiveConfig?.logic_type)) {
    inst.type = 'fillInTheBlank';
  }

  // GLOBAL HYDRATION PASS: Catch any missed placeholders in any field
  const finalVars = inst.adaptiveConfig?.variables || {};
  if (Object.keys(finalVars).length > 0) {
    // Hydrate top-level fields
    // Hydrate top-level fields (only if they contain a placeholder to avoid unnecessary work)
    if (inst.questionText && String(inst.questionText).includes('{')) inst.questionText = hydrateNode(inst.questionText, finalVars);
    if (inst.question_text && String(inst.question_text).includes('{')) inst.question_text = hydrateNode(inst.question_text, finalVars);
    if (inst.solution && (typeof inst.solution !== 'string' || inst.solution.includes('{'))) inst.solution = hydrateNode(inst.solution, finalVars);

    // Ensure both naming conventions for core answer fields are synced and hydrated
    const rawAns = inst.correctAnswerText || inst.correct_answer_text || inst.adaptiveConfig?.correctAnswerText;
    if (rawAns) {
      const hydratedAns = hydrateNode(rawAns, finalVars);
      inst.correctAnswerText = hydratedAns;
      inst.correct_answer_text = hydratedAns;
      inst.adaptiveConfig.correctAnswerText = hydratedAns;
    }

    // Recurse into parts/options if they exist
    if (inst.parts) inst.parts = hydrateNode(inst.parts, finalVars);
    if (inst.options) inst.options = hydrateNode(inst.options, finalVars);
  }

  return inst;
}
