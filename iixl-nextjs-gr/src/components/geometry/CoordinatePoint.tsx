
"use client"

import { motion, useMotionValue } from 'framer-motion';
import { useGeometryStore } from '@/store/geometryStore';
import { CoordinateSystem } from '@/engine/geometry/coordinate';
import { useEffect } from 'react';

export const CoordinatePoint = ({ id, width, height, scale }: { id: string; width?: number; height?: number; scale?: number }) => {
  const { points, updatePoint, setDragging } = useGeometryStore();
  const point = points[id];
  
  if (!point || !width || !height || !scale) return null;

  const pos = CoordinateSystem.toSvg(point.x, point.y, width, height, scale);

  const handleDrag = (_: any, info: any) => {
      // info.point is absolute, we need delta or offset
      const newX = point.x + info.delta.x / scale;
      const newY = point.y - info.delta.y / scale; // Flip Y
      updatePoint(id, Number(newX.toFixed(1)), Number(newY.toFixed(1)));
  };

  return (
    <motion.g
      drag
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      onDrag={handleDrag}
      style={{ cursor: 'grab' }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9, cursor: 'grabbing' }}
    >
      {/* Halo/Touch target */}
      <circle cx={pos.x} cy={pos.y} r="20" fill="transparent" />
      
      {/* Visual Point */}
      <circle cx={pos.x} cy={pos.y} r="8" fill="white" stroke="#3b82f6" strokeWidth="3" />
      <circle cx={pos.x} cy={pos.y} r="3" fill="#3b82f6" />
      
      {/* Label */}
      <g transform={`translate(${pos.x + 12}, ${pos.y - 12})`}>
          <rect x="0" y="-20" width="60" height="20" rx="4" fill="#1e293b" />
          <text x="30" y="-6" fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">
            {id} ({point.x}, {point.y})
          </text>
      </g>
    </motion.g>
  );
};

export const DistanceVisualizer = ({ width, height, scale }: { width?: number; height?: number; scale?: number }) => {
    const { points } = useGeometryStore();
    if (!width || !height || !scale) return null;

    const pA = CoordinateSystem.toSvg(points.A.x, points.A.y, width, height, scale);
    const pB = CoordinateSystem.toSvg(points.B.x, points.B.y, width, height, scale);

    return (
        <g>
            {/* Dashed Helper Triangle */}
            <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pA.y} stroke="#94a3b8" strokeDasharray="4" />
            <line x1={pB.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#94a3b8" strokeDasharray="4" />
            
            {/* Delta Labels */}
            <text x={(pA.x + pB.x)/2} y={pA.y + 15} fontSize="12" fill="#64748b" textAnchor="middle">
                Δx = {Math.abs(points.B.x - points.A.x).toFixed(1)}
            </text>
            <text x={pB.x + 10} y={(pA.y + pB.y)/2} fontSize="12" fill="#64748b" textAnchor="start">
                Δy = {Math.abs(points.B.y - points.A.y).toFixed(1)}
            </text>

            {/* Main Distance Line */}
            <motion.line 
                x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} 
                stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" 
            />
        </g>
    );
};
