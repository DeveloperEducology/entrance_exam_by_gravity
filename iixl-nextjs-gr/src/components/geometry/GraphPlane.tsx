
"use client"

import React, { useRef, useEffect, useState } from 'react';
import { useGeometryStore } from '@/store/geometryStore';
import { CoordinateSystem } from '@/engine/geometry/coordinate';

export const Axis = ({ width, height, scale }: { width: number; height: number; scale: number }) => {
  const midX = width / 2;
  const midY = height / 2;

  return (
    <g className="axes">
      {/* X Axis */}
      <line x1="0" y1={midY} x2={width} y2={midY} stroke="#94a3b8" strokeWidth="2" />
      {/* Y Axis */}
      <line x1={midX} y1="0" x2={midX} y2={height} stroke="#94a3b8" strokeWidth="2" />
      
      {/* Tick Marks (Simple version) */}
      {Array.from({ length: 21 }).map((_, i) => {
        const val = i - 10;
        const pos = CoordinateSystem.toSvg(val, 0, width, height, scale);
        return (
          <g key={`x-tick-${i}`}>
            <line x1={pos.x} y1={midY - 5} x2={pos.x} y2={midY + 5} stroke="#94a3b8" />
            {val !== 0 && <text x={pos.x} y={midY + 20} fontSize="10" textAnchor="middle" fill="#64748b">{val}</text>}
          </g>
        );
      })}
    </g>
  );
};

export const Grid = ({ width, height, scale }: { width: number; height: number; scale: number }) => {
  const lines: React.ReactNode[] = [];
  for (let i = -10; i <= 10; i++) {
    const xPos = CoordinateSystem.toSvg(i, 0, width, height, scale).x;
    const yPos = CoordinateSystem.toSvg(0, i, width, height, scale).y;
    
    lines.push(<line key={`v-${i}`} x1={xPos} y1="0" x2={xPos} y2={height} stroke="#e2e8f0" strokeWidth="1" />);
    lines.push(<line key={`h-${i}`} x1="0" y1={yPos} x2={width} y2={yPos} stroke="#e2e8f0" strokeWidth="1" />);
  }
  return <g className="grid-lines">{lines}</g>;
};

export const GraphPlane = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { gridScale } = useGeometryStore();

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      setDimensions({
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative bg-white overflow-hidden select-none">
      <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
        <Grid width={dimensions.width} height={dimensions.height} scale={gridScale} />
        <Axis width={dimensions.width} height={dimensions.height} scale={gridScale} />
        {/* Render children (Points, Lines, etc.) and pass dimensions */}
        {React.Children.map(children, child => 
          React.isValidElement(child) ? React.cloneElement(child, { width: dimensions.width, height: dimensions.height, scale: gridScale } as any) : child
        )}
      </svg>
    </div>
  );
};
