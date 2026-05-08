
/**
 * Coordinate System Converter
 * Handles conversion between Cartesian (Math) and SVG (Pixel) coordinates.
 */

export const CoordinateSystem = {
  /**
   * Convert Graph Coords (-10 to 10) to SVG Viewbox Coords (0 to Width)
   */
  toSvg: (x: number, y: number, width: number, height: number, scale: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    return {
      x: centerX + x * scale,
      y: centerY - y * scale // Flip Y because SVG Y increases downwards
    };
  },

  /**
   * Convert SVG Viewbox Coords to Graph Coords
   */
  toGraph: (svgX: number, svgY: number, width: number, height: number, scale: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    return {
      x: (svgX - centerX) / scale,
      y: (centerY - svgY) / scale
    };
  }
};

/**
 * Formula Engine
 * Pure mathematical functions for geometry calculations.
 */
export const FormulaEngine = {
  calculateDistance: (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    
    return {
      dx,
      dy,
      d,
      steps: [
        `\\Delta x = ${p2.x} - ${p1.x} = ${dx}`,
        `\\Delta y = ${p2.y} - ${p1.y} = ${dy}`,
        `d = \\sqrt{(${dx})^2 + (${dy})^2}`,
        `d = \\sqrt{${dx*dx} + ${dy*dy}}`,
        `d = \\sqrt{${d2}}`,
        `d \\approx ${d.toFixed(2)}`
      ]
    };
  },

  calculateSlope: (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    if (dx === 0) return { m: Infinity, isVertical: true, steps: ["Vertical line: \\Delta x = 0"] };
    
    const m = dy / dx;
    return {
      m,
      isVertical: false,
      steps: [
        `m = \\frac{${p2.y} - ${p1.y}}{${p2.x} - ${p1.x}}`,
        `m = \\frac{${dy}}{${dx}}`,
        `m = ${m.toFixed(2)}`
      ]
    };
  }
};
