/**
 * SVG Generators for Number Lines
 */

export const buildNumberLineSvg = ({
  min = 0,
  max = 1,
  denominator = 4,
  showLabels = true,      // Show fraction labels under ticks
  showWholeNumbersOnly = false, // If true, only show 0, 1, etc.
  showTickMarks = true,   // Show the vertical tick marks
  markedPoints = [],      // Array of objects: { numerator, label, color, size, labelPosition, labelFraction: {num, den} }
  width = 600,
  height = 140,
  padding = 40
}) => {
  const lineY = height / 2;
  const startX = padding;
  const endX = width - padding;
  const usableWidth = endX - startX;
  
  // Total number of segments
  const totalSegments = (max - min) * denominator;
  const segmentWidth = usableWidth / totalSegments;

  let svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width: ${width}px;" role="img" aria-label="Number line from ${min} to ${max}">
      <defs>
        <marker id="arrow-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
        </marker>
        <marker id="arrow-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#374151" />
        </marker>
      </defs>
      
      <!-- Main Line -->
      <line x1="${startX - 15}" y1="${lineY}" x2="${endX + 15}" y2="${lineY}" stroke="#374151" stroke-width="4" marker-end="url(#arrow-right)" marker-start="url(#arrow-left)" />
  `;

  // Draw ticks and labels
  for (let i = 0; i <= totalSegments; i++) {
    const x = startX + i * segmentWidth;
    const isWholeNumber = i % denominator === 0;
    const tickHeight = isWholeNumber ? 40 : 28;
    const strokeWidth = isWholeNumber ? 4 : 3;
    
    if (showTickMarks) {
      svgContent += `
        <line x1="${x}" y1="${lineY - tickHeight/2}" x2="${x}" y2="${lineY + tickHeight/2}" stroke="#374151" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      `;
    }

    if (showLabels) {
      if (isWholeNumber) {
        const wholeValue = min + (i / denominator);
        svgContent += `
          <text x="${x}" y="${lineY + 40}" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#1f2937">${wholeValue}</text>
        `;
      } else if (!showWholeNumbersOnly) {
        const currentNumerator = (min * denominator) + i;
        svgContent += `
          <g transform="translate(${x}, ${lineY + 30})">
            <text x="0" y="0" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#4b5563">${currentNumerator}</text>
            <line x1="-10" y1="6" x2="10" y2="6" stroke="#4b5563" stroke-width="2"/>
            <text x="0" y="22" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#4b5563">${denominator}</text>
          </g>
        `;
      }
    }
  }

  // Draw marked points
  markedPoints.forEach(point => {
    // point.numerator is the absolute numerator (e.g., if min=0, 3/4 -> 3)
    // We calculate offset relative to min
    const offsetNumerator = point.numerator - (min * denominator);
    if (offsetNumerator >= 0 && offsetNumerator <= totalSegments) {
      const x = startX + offsetNumerator * segmentWidth;
      const pointColor = point.color || '#3b82f6';
      const pointSize = point.size || 8;
      
      svgContent += `
        <circle cx="${x}" cy="${lineY}" r="${pointSize}" fill="${pointColor}" stroke="#ffffff" stroke-width="3" />
      `;

      if (point.label) {
        const yPos = point.labelPosition === 'bottom' ? lineY + 30 : lineY - 25;
        svgContent += `
          <text x="${x}" y="${yPos}" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#000000">${point.label}</text>
        `;
      }

      if (point.labelFraction) {
        const yPos = point.labelPosition === 'bottom' ? lineY + 30 : lineY - 35;
        svgContent += `
          <g transform="translate(${x}, ${yPos})">
            <text x="0" y="0" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#000000">${point.labelFraction.num}</text>
            <line x1="-12" y1="6" x2="12" y2="6" stroke="#000000" stroke-width="2"/>
            <text x="0" y="24" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#000000">${point.labelFraction.den}</text>
          </g>
        `;
      }
    }
  });

  svgContent += `</svg>`;
  return svgContent;
};
