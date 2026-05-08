
import { GeometryEngine } from '@/lib/practice/engines/geometryEngine';

export function generatePerimeterQuestion(config = {}) {
  const cfg = config.config || config;
  const vars = config.variables || {};

  // 1. Configuration
  const dimensionMode = vars.dimensionMode || cfg.dimensionMode || '2D';
  const questionType = vars.questionType || cfg.questionType || (dimensionMode === '3D' ? 'volume' : 'perimeter');
  const lengthType = vars.lengthType || cfg.lengthType || 'integer';
  const isInteractive = vars.isInteractive || cfg.isInteractive || false;

  const default_shapes_3d = ['cube', 'rectangular_prism', 'triangular_prism', 'cylinder', 'cone', 'sphere'];
  const pool = cfg.allowedShapes || (dimensionMode === '3D' ? default_shapes_3d : ['square', 'rectangle']);
  const shapeType = vars.shapeType || cfg.shapeType || pool[Math.floor(Math.random() * pool.length)];

  const min = cfg.min || 4;
  const max = cfg.max || (dimensionMode === '3D' ? 8 : 10);
  const unit = cfg.unit || vars.unit || 'in';

  const generateVal = () => {
    let val = Math.floor(Math.random() * (max - min + 1)) + min;
    if (lengthType === 'decimal' && Math.random() > 0.5) val += 0.5;
    return val;
  };

  let width = vars.width || cfg.width || generateVal();
  let height = vars.height || cfg.height || generateVal();
  let depth = vars.depth || cfg.depth || generateVal();
  const radius = width / 2;

  if (shapeType === 'cube') { height = width; depth = width; }

  const color = '#3b82f6';
  let answer = 0;
  let shapes = [];
  let formula = "";
  let explanation_steps = [];
  let question_text_suffix = "";

  const startX = 250;
  const canvasHeight = 340;
  const centerY = canvasHeight / 2;
  const scale = 32;
  const PI = 3.14159;
  const labelStyle = { color: '#1e293b', font: 'bold 18px sans-serif' };

  // Calculation logic
  if (shapeType === 'cylinder') {
    const r = radius, h = height;
    answer = (questionType === 'volume') ? Math.round(PI * r * r * h) : Math.round(2 * PI * r * h + 2 * PI * r * r);
    formula = (questionType === 'volume') ? "V = π × r² × h" : "SA = 2πrh + 2πr²";
    explanation_steps = [`1. **${r}² = ${r * r}**`, `2. **3.14 × ${r * r} = ${(PI * r * r).toFixed(3)}**`, `3. **${(PI * r * r).toFixed(3)} × ${h} = ${(PI * r * r * h).toFixed(3)}**`];

    const rw = width * scale, rh = 30, hScale = height * scale, cy = centerY - hScale / 2;
    shapes.push({ type: 'ellipse', x: startX, y: cy, w: rw, h: rh, color, weight: 2.5 });
    shapes.push({ type: 'line', x1: startX - rw / 2, y1: cy, x2: startX - rw / 2, y2: cy + hScale, color, weight: 2.5 });
    shapes.push({ type: 'line', x1: startX + rw / 2, y1: cy, x2: startX + rw / 2, y2: cy + hScale, color, weight: 2.5 });
    shapes.push({ type: 'arc', x: startX, y: cy + hScale, w: rw, h: rh, start: 0, stop: PI, color, weight: 2.5 });
    shapes.push({ type: 'arc', x: startX, y: cy + hScale, w: rw, h: rh, start: PI, stop: 2 * PI, color, weight: 1.5, options: { strokeDasharray: [6, 6] } });
    shapes.push({ type: 'text', text: `r=${r}`, x: startX + rw / 4, y: cy + 15, ...labelStyle });
    shapes.push({ type: 'text', text: `h=${h}`, x: startX - rw / 2 - 45, y: centerY, ...labelStyle });
    question_text_suffix = `cylinder`;

  } else if (shapeType === 'cone') {
    const r = radius, h = height;
    answer = (questionType === 'volume') ? Math.round((1 / 3) * PI * r * r * h) : Math.round(PI * r * r + PI * r * Math.sqrt(r ** 2 + h ** 2));
    formula = (questionType === 'volume') ? "V = 1/3 × π × r² × h" : "SA = πr² + πrL";
    const rw = width * scale, rh = 30, hScale = height * scale, apexY = centerY - hScale / 2, baseY = centerY + hScale / 2;
    shapes.push({ type: 'line', x1: startX, y1: apexY, x2: startX - rw / 2, y2: baseY, color, weight: 2.5 });
    shapes.push({ type: 'line', x1: startX, y1: apexY, x2: startX + rw / 2, y2: baseY, color, weight: 2.5 });
    shapes.push({ type: 'arc', x: startX, y: baseY, w: rw, h: rh, start: 0, stop: PI, color, weight: 2.5 });
    shapes.push({ type: 'arc', x: startX, y: baseY, w: rw, h: rh, start: PI, stop: 2 * PI, color, weight: 1.5, options: { strokeDasharray: [6, 6] } });
    shapes.push({ type: 'text', text: `r=${r}`, x: startX + rw / 4, y: baseY + 20, ...labelStyle });
    shapes.push({ type: 'text', text: `h=${h}`, x: startX - 45, y: centerY, ...labelStyle });
    question_text_suffix = `cone`;

  } else if (shapeType === 'sphere') {
    const r = radius;
    answer = (questionType === 'volume') ? Math.round((4 / 3) * PI * r * r * r) : Math.round(4 * PI * r * r);
    formula = (questionType === 'volume') ? "V = 4/3 × π × r³" : "SA = 4πr²";
    const d = width * scale;
    shapes.push({ type: 'circle', x: startX, y: centerY, diameter: d, color, weight: 2.5 });
    shapes.push({ type: 'arc', x: startX, y: centerY, w: d, h: d / 2.5, start: 0, stop: PI, color, weight: 1.5 });
    shapes.push({ type: 'arc', x: startX, y: centerY, w: d, h: d / 2.5, start: PI, stop: 2 * PI, color, weight: 1.5, options: { strokeDasharray: [6, 6] } });
    shapes.push({ type: 'text', text: `r=${r}`, x: startX, y: centerY - 15, ...labelStyle });
    question_text_suffix = `sphere`;

  } else if (shapeType === 'rectangular_prism' || shapeType === 'cube') {
    answer = (questionType === 'volume') ? Math.round(width * height * depth) : Math.round(2 * (width * height + height * depth + depth * width));
    formula = (questionType === 'volume') ? "V = l × w × h" : "SA = 2(lw + wh + lh)";
    const v = GeometryEngine.getPrismVertices(width * scale, -height * scale, depth * scale, startX - (width * scale) / 2, centerY + (height * scale) / 4);
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    edges.forEach(e => shapes.push({ type: 'line', x1: v[e[0]][0], y1: v[e[0]][1], x2: v[e[1]][0], y2: v[e[1]][1], color, weight: 2.5 }));
    shapes.push({ type: 'text', text: `l=${width}`, x: (v[0][0] + v[1][0]) / 2, y: v[0][1] + 25, ...labelStyle });
    shapes.push({ type: 'text', text: `w=${depth}`, x: (v[1][0] + v[5][0]) / 2 + 35, y: (v[1][1] + v[5][1]) / 2, ...labelStyle });
    shapes.push({ type: 'text', text: `h=${height}`, x: v[0][0] - 40, y: (v[0][1] + v[3][1]) / 2, ...labelStyle });
    question_text_suffix = shapeType.replace('_', ' ');
  }

  const ansUnit = (questionType === 'volume') ? `${unit}³` : `${unit}²`;
  const validationAnswers = { ans: String(answer) };
  const parts = [
    { type: 'text', content: `*(Round to the nearest whole number)*`, style: { fontSize: '14px', color: '#64748b', marginBottom: '8px' } },
    { type: 'rough', width: 600, height: canvasHeight, shapes, isVertical: true }
  ];

  if (isInteractive) {
    // Step 1: Identification (Vertical)
    if (shapeType === 'cylinder' || shapeType === 'cone') {
      validationAnswers.v1 = String(radius); validationAnswers.v2 = String(height);
      parts.push({
        type: 'container', isVertical: true, style: { marginBottom: '8px' }, parts: [
          { type: 'text', content: 'Step 1: Identify Variables', style: { fontWeight: 'bold', color: '#334155' } },
          { type: 'container', parts: [{ type: 'text', content: 'Radius (r): ' }, { type: 'input', id: 'v1', size: 'small' }, { type: 'text', content: ' | Height (h): ' }, { type: 'input', id: 'v2', size: 'small' }] }
        ]
      });
    } else if (shapeType === 'rectangular_prism' || shapeType === 'cube') {
      validationAnswers.l = String(width); validationAnswers.w = String(depth); validationAnswers.h = String(height);
      parts.push({
        type: 'container', isVertical: true, style: { marginBottom: '8px' }, parts: [
          { type: 'text', content: 'Step 1: Identify Dimensions', style: { fontWeight: 'bold' } },
          { type: 'container', parts: [{ type: 'text', content: 'L: ' }, { type: 'input', id: 'l', size: 'small' }, { type: 'text', content: ' W: ' }, { type: 'input', id: 'w', size: 'small' }, { type: 'text', content: ' H: ' }, { type: 'input', id: 'h', size: 'small' }] }
        ]
      });
    } else if (shapeType === 'sphere') {
      validationAnswers.r = String(radius);
      parts.push({
        type: 'container', isVertical: true, style: { marginBottom: '8px' }, parts: [
          { type: 'text', content: 'Step 1: Radius (r): ' }, { type: 'input', id: 'r', size: 'small' }
        ]
      });
    }

    // Step 2: Formula (Vertical)
    parts.push({
      type: 'container', isVertical: true, style: { marginBottom: '8px' }, parts: [
        { type: 'text', content: 'Step 2: Formula', style: { fontWeight: 'bold', color: '#334155' } },
        { type: 'text', content: formula, style: { fontSize: '20px', color: '#3b82f6', fontWeight: '600' } }
      ]
    });

    // Step 3: Calculation (Vertical)
    parts.push({
      type: 'container', isVertical: true, parts: [
        { type: 'text', content: 'Step 3: Calculate ' + questionType, style: { fontWeight: 'bold', color: '#334155' } },
        { type: 'container', parts: [{ type: 'text', content: 'Result: ' }, { type: 'input', id: 'ans', size: 'small' }, { type: 'text', content: ' ' + ansUnit }] }
      ]
    });
  } else {
    parts.push({ type: 'pair', style: { marginTop: '10px', fontSize: '24px' }, isVertical: true, parts: [{ type: 'input', id: 'ans', size: 'small' }, { type: 'text', content: ' ' + ansUnit }] });
  }

  return {
    type: 'fillInTheBlank',
    isVertical: true,
    questionText: `What is the ${questionType} of the ${question_text_suffix}?`,
    parts,
    adaptiveConfig: { config: cfg, variables: { questionType, dimensionMode, shapeType, width, height, depth, unit, answer } },
    solution: [{ type: 'text', content: `### Step-by-step calculation:`, isVertical: true }, ...explanation_steps.map((step, idx) => ({ type: 'text', content: `${idx + 1}. ${step}`, isVertical: true })), { type: 'text', content: `So, the rounded ${questionType} is **${answer} ${ansUnit}**.`, isVertical: true }],
    correctAnswerText: JSON.stringify(validationAnswers),
    validation: { type: 'exact', answers: validationAnswers }
  };
}
