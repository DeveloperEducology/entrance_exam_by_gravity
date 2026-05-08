
/**
 * WEXLS Geometry Engine
 * Handles coordinate generation, projections, and mathematical positioning.
 */

const ISOMETRIC_ANGLE = Math.PI / 4; // 45 degrees
const ISOMETRIC_RATIO = 0.5; // Depth factor

export const GeometryEngine = {
  /**
   * Project 3D coordinate (x, y, z) to 2D screen coordinate (x', y')
   */
  project: (x, y, z) => {
    return [
      x + z * Math.cos(ISOMETRIC_ANGLE) * ISOMETRIC_RATIO,
      y - z * Math.sin(ISOMETRIC_ANGLE) * ISOMETRIC_RATIO
    ];
  },

  /**
   * Generate vertices for a 2D Rectangle / Square
   */
  getRectangleVertices: (width, height, originX, originY) => {
    return [
      [originX, originY],
      [originX + width, originY],
      [originX + width, originY + height],
      [originX, originY + height]
    ];
  },

  /**
   * Generate vertices for a 3D Rectangular Prism (Cuboid)
   */
  getPrismVertices: (w, h, d, originX, originY) => {
    // 8 vertices of a cuboid
    const v3d = [
      [0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0], // Front face
      [0, 0, d], [w, 0, d], [w, h, d], [0, h, d]  // Back face
    ];
    
    // Project each to 2D
    return v3d.map(p => {
        const [px, py] = GeometryEngine.project(p[0], p[1], p[2]);
        return [originX + px, originY + py];
    });
  },

  /**
   * Generate vertices for a Triangular Prism
   */
  getTriangularPrismVertices: (b, h, l, originX, originY) => {
    // 6 vertices of a triangular prism
    const v3d = [
      [0, 0, 0], [b, 0, 0], [b/2, h, 0], // Front face triangle
      [0, 0, l], [b, 0, l], [b/2, h, l]  // Back face triangle
    ];
    
    return v3d.map(p => {
        const [px, py] = GeometryEngine.project(p[0], p[1], p[2]);
        return [originX + px, originY + py];
    });
  },

  /**
   * Generate vertices for a Regular Polygon
   */
  getRegularPolygonVertices: (sides, sideLength, originX, originY) => {
    const radius = sideLength / (2 * Math.sin(Math.PI / sides));
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2);
        points.push([
            originX + radius * Math.cos(angle),
            originY + radius * Math.sin(angle)
        ]);
    }
    return points;
  },

  /**
   * Calculate midpoint of an edge with an offset for labels
   */
  getLabelPosition: (p1, p2, offset = 20, position = 'auto') => {
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    
    // Vector perpendicular to the edge
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    
    const nx = -dy / len;
    const ny = dx / len;
    
    return [midX + nx * offset, midY + ny * offset];
  }
};
