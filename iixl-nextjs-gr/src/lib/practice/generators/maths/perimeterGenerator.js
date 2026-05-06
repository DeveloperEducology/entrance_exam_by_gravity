
export function generatePerimeterQuestion(config = {}) {
  const min = config.min || 2;
  const max = config.max || 10;
  const unit = config.unit || 'in';
  
  // Random dimensions
  const width = Math.floor(Math.random() * (max - min + 1)) + min;
  const height = Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Palette of nice colors
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const perimeter = 2 * (width + height);
  
  // Define shapes for RoughRenderer
  // We'll center a rectangle of size approx 200x150 (scaled)
  const baseWidth = 200;
  const baseHeight = 150;
  
  // Scaling factors to make it look proportional but not tiny
  const scaleX = 150 / max;
  const scaleY = 120 / max;
  
  const rectW = width * scaleX;
  const rectH = height * scaleY;
  
  const centerX = 300;
  const centerY = 150;
  
  const x = centerX - rectW / 2;
  const y = centerY - rectH / 2;
  
  const shapes = [
    {
      type: 'rectangle',
      x, y, w: rectW, h: rectH,
      fill: color,
      fillStyle: 'hachure',
      color: color,
      weight: 3,
      options: { fillWeight: 3, hachureGap: 8 }
    },
    // Top Label
    { type: 'text', text: `${width} ${unit}`, x: centerX, y: y - 20, color: '#334155' },
    // Bottom Label
    { type: 'text', text: `${width} ${unit}`, x: centerX, y: y + rectH + 30, color: '#334155' },
    // Left Label
    { type: 'text', text: `${height} ${unit}`, x: x - 40, y: centerY + 5, color: '#334155' },
    // Right Label
    { type: 'text', text: `${height} ${unit}`, x: x + rectW + 40, y: centerY + 5, color: '#334155' }
  ];

  return {
    type: 'fillInTheBlank',
    questionText: `What is the perimeter of the rectangle?`,
    parts: [
      {
        type: 'rough',
        width: 600,
        height: 300,
        shapes: shapes
      },
      {
        type: 'pair',
        style: { marginTop: '20px', fontSize: '24px', justifyContent: 'center' },
        parts: [
          { type: 'input', id: 'ans', size: 'small', style: { marginRight: '10px' } },
          { type: 'text', content: unit }
        ]
      }
    ],
    solution: [
      { type: 'text', content: `### Finding the Perimeter`, isVertical: true },
      { type: 'text', content: `The perimeter is the distance around the outside of a shape. To find it, we add up all the sides!`, isVertical: true },
      { type: 'text', content: `For this rectangle, the sides are: **${width}**, **${height}**, **${width}**, and **${height}**.`, isVertical: true },
      { type: 'text', content: `**${width} + ${height} + ${width} + ${height} = ${perimeter}**`, isVertical: true },
      { type: 'text', content: `So, the perimeter is **${perimeter} ${unit}**.`, isVertical: true }
    ],
    correctAnswerText: JSON.stringify({ ans: String(perimeter) }),
    validation: {
        type: 'exact',
        answers: { ans: String(perimeter) }
    }
  };
}
