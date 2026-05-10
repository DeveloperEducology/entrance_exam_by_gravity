/**
 * SVG Generators for Visual Models
 */

/**
 * Builds an SVG for a shape showing numerator/denominator with coloured parts.
 * shapeType: 'circle' | 'rectangle' | 'kite' | 'pentagon'
 */
export const buildIdentifyShapeSvg = ({ shapeType, numerator, denominator, fillColor, strokeColor, size = 200 }) => {
  const W = 200;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2;

  // Helper: pie-wedge builder (reused by circle + kite)
  const makePieWedges = (cx, cy, r, n, d, fill, stroke) =>
    Array.from({ length: d }, (_, i) => {
      const a0 = -Math.PI / 2 + (2 * Math.PI * i) / d;
      const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / d;
      const x1 = (cx + r * Math.cos(a0)).toFixed(3);
      const y1 = (cy + r * Math.sin(a0)).toFixed(3);
      const x2 = (cx + r * Math.cos(a1)).toFixed(3);
      const y2 = (cy + r * Math.sin(a1)).toFixed(3);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const cellFill = i < n ? fill : '#ffffff';
      return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${cellFill}" stroke="${stroke}" stroke-width="2.5"/>`;
    }).join('');

  // Circle
  if (shapeType === 'circle') {
    const r = 72;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} circle">
      ${makePieWedges(cx, cy, r, numerator, denominator, fillColor, strokeColor)}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // Rectangle (columns)
  if (shapeType === 'rectangle') {
    const safeDenom = Math.min(denominator, 6);
    const safeNum = Math.min(numerator, safeDenom);
    const rx = 20, ry = 50, rw = 160, rh = 100;
    const colW = rw / safeDenom;
    const cells = Array.from({ length: safeDenom }, (_, i) => {
      const cellFill = i < safeNum ? fillColor : '#ffffff';
      return `<rect x="${(rx + i * colW).toFixed(2)}" y="${ry}" width="${colW.toFixed(2)}" height="${rh}" fill="${cellFill}" stroke="${strokeColor}" stroke-width="2"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} rectangle">
      ${cells}
      <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // Kite / Diamond
  if (shapeType === 'kite') {
    const r = 68;
    const wedges = makePieWedges(cx, cy, r, numerator, denominator, fillColor, strokeColor);
    const diamond = `M${cx},${cy - 82} L${cx + 66},${cy} L${cx},${cy + 72} L${cx - 66},${cy} Z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} kite">
      <clipPath id="kite-clip-${numerator}-${denominator}">
        <path d="${diamond}"/>
      </clipPath>
      <g clip-path="url(#kite-clip-${numerator}-${denominator})">
        ${wedges}
      </g>
      <path d="${diamond}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  // Pentagon / Polygon
  if (shapeType === 'pentagon') {
    const sides = Math.max(3, Math.min(denominator, 8));
    const safeNum = Math.min(numerator, sides);
    const r = 74;
    const angleOffset = -Math.PI / 2;
    const vertices = Array.from({ length: sides }, (_, i) => {
      const angle = angleOffset + (2 * Math.PI * i) / sides;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    const paths = vertices.map((v, i) => {
      const next = vertices[(i + 1) % sides];
      const cellFill = i < safeNum ? fillColor : '#ffffff';
      return `<path d="M${cx},${cy} L${v[0].toFixed(2)},${v[1].toFixed(2)} L${next[0].toFixed(2)},${next[1].toFixed(2)} Z" fill="${cellFill}" stroke="${strokeColor}" stroke-width="2.5"/>`;
    }).join('');
    const outline = vertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${v[0].toFixed(2)},${v[1].toFixed(2)}`).join(' ') + ' Z';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-label="${numerator}/${denominator} polygon">
      ${paths}
      <path d="${outline}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
    </svg>`;
  }

  return buildIdentifyShapeSvg({ shapeType: 'circle', numerator, denominator, fillColor, strokeColor, size });
};

// ============================================================================
// Equal Parts SVG Builders
// ============================================================================

export const getShapeRect = ({ shape, orientation }) => {
  if (shape === 'square') return { x: 50, y: 42, width: 220, height: 220 };
  if (orientation === 'horizontal') return { x: 76, y: 28, width: 174, height: 236 };
  return { x: 28, y: 82, width: 264, height: 132 };
};

export const getShapePartitionLines = ({ rect, orientation, parts, isEqual }) => {
  if (orientation === 'grid') {
    const midX = rect.x + rect.width / 2;
    const midY = rect.y + rect.height / 2;
    if (isEqual) {
      return [
        { x1: midX, y1: rect.y, x2: midX, y2: rect.y + rect.height },
        { x1: rect.x, y1: midY, x2: rect.x + rect.width, y2: midY },
      ];
    }
    return [
      { x1: rect.x + rect.width * 0.42, y1: rect.y, x2: rect.x + rect.width * 0.42, y2: rect.y + rect.height },
      { x1: rect.x, y1: rect.y + rect.height * 0.58, x2: rect.x + rect.width, y2: rect.y + rect.height * 0.58 },
    ];
  }
  const isHorizontalCuts = orientation === 'horizontal';
  const length = isHorizontalCuts ? rect.height : rect.width;
  const start = isHorizontalCuts ? rect.y : rect.x;
  const equalPositions = Array.from({ length: parts - 1 }, (_, i) => start + (length / parts) * (i + 1));
  const unequalRatios = parts === 2 ? [0.34] : parts === 3 ? [0.28, 0.7] : [0.22, 0.62, 0.82];
  const positions = isEqual
    ? equalPositions
    : unequalRatios.slice(0, parts - 1).map((r) => start + length * r);
  return positions.map((pos) => (
    isHorizontalCuts
      ? { x1: rect.x, y1: pos, x2: rect.x + rect.width, y2: pos }
      : { x1: pos, y1: rect.y, x2: pos, y2: rect.y + rect.height }
  ));
};

export const makeRectPicture = ({ variant, palette, isEqual, size = 320 }) => {
  const rect = getShapeRect(variant);
  const lines = getShapePartitionLines({ ...variant, rect, isEqual });
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="${size}" height="${size}" role="img" aria-label="${isEqual ? 'Equal' : 'Unequal'} parts">
      <rect x="4" y="4" width="312" height="312" rx="4" fill="#ffffff" stroke="#aeeaff" stroke-width="3"/>
      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="4"/>
      <g stroke="${palette.stroke}" stroke-width="4" stroke-linecap="square">
        ${lines.map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('')}
      </g>
    </svg>
  `;
};

// ============================================================================
// Shape Set SVG Builders (Fraction of a Set)
// ============================================================================

export const buildShapeSetSvg = ({ shapes = [], size = 80, maxPerRow = 8 }) => {
  const gap = 20;
  const padding = 10;
  
  const columns = Math.min(shapes.length, maxPerRow);
  const rows = Math.ceil(shapes.length / maxPerRow);
  
  const W = (size * columns) + (gap * (columns - 1)) + (padding * 2);
  const H = (size * rows) + (gap * (rows - 1)) + (padding * 2);

  const renderShape = (shape, cx, cy, r) => {
    const fill = shape.fill || '#3b82f6';
    const stroke = shape.stroke || '#2563eb';
    const sw = 3;

    switch (shape.type) {
      case 'circle':
        return `<circle cx="${cx}" cy="${cy}" r="${r - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      case 'rectangle':
      case 'square':
        return `<rect x="${cx - r + sw}" y="${cy - r + sw}" width="${(r - sw)*2}" height="${(r - sw)*2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="4"/>`;
      case 'triangle':
        const h = (r - sw) * 2;
        const w = (r - sw) * 2.2;
        return `<polygon points="${cx},${cy - h/2} ${cx - w/2},${cy + h/2} ${cx + w/2},${cy + h/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      case 'pentagon':
        const sides = 5;
        const angleOffset = -Math.PI / 2;
        const pr = r - sw;
        const vertices = Array.from({ length: sides }, (_, i) => {
          const angle = angleOffset + (2 * Math.PI * i) / sides;
          return `${(cx + pr * Math.cos(angle)).toFixed(2)},${(cy + pr * Math.sin(angle)).toFixed(2)}`;
        });
        return `<polygon points="${vertices.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      default:
        return `<circle cx="${cx}" cy="${cy}" r="${r - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
  };

  const svgShapes = shapes.map((shape, index) => {
    const col = index % maxPerRow;
    const row = Math.floor(index / maxPerRow);
    
    const cx = padding + (size / 2) + (col * (size + gap));
    const cy = padding + (size / 2) + (row * (size + gap));
    const r = size / 2;
    return renderShape(shape, cx, cy, r);
  }).join('\\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width: ${W}px;" role="img" aria-label="A set of shapes">
    ${svgShapes}
  </svg>`;
};
