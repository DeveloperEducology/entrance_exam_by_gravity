
'use client';

import React from 'react';

export default function FractionShapeVisual({ 
  shape = 'square', 
  partitions = 2, 
  isEqual = true, 
  rotation = 0, 
  fill = '#bfdbfe', 
  stroke = '#3b82f6',
  size = 140 
}) {
  const center = size / 2;
  const strokeWidth = 2.5;
  const elements = [];

  // 1. Drawing Logic
  if (shape === 'square' || shape === 'rectangle') {
    const w = shape === 'square' ? 100 : 120;
    const h = shape === 'square' ? 100 : 80;
    const x = -w / 2;
    const y = -h / 2;
    
    elements.push(<rect key="base" x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />);
    
    for (let i = 1; i < partitions; i++) {
      let pos = x + (w / partitions) * i;
      if (!isEqual) {
        // Deterministic "unequalness" based on partitions to keep it consistent for this specific instance
        pos += (i % 2 === 0 ? 15 : -15);
      }
      elements.push(<line key={`line-${i}`} x1={pos} y1={y} x2={pos} y2={y + h} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />);
    }
  } else if (shape === 'circle' || shape === 'oval') {
    const rx = 55;
    const ry = shape === 'circle' ? 55 : 40;
    elements.push(<ellipse key="base" cx="0" cy="0" rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />);
    
    for (let i = 0; i < partitions; i++) {
      const angle = (isEqual ? (2 * Math.PI / partitions) * i : (2 * Math.PI / partitions) * i + 0.6);
      const x2 = rx * Math.cos(angle);
      const y2 = ry * Math.sin(angle);
      elements.push(<line key={`line-${i}`} x1="0" y1="0" x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />);
    }
  } else if (shape === 'triangle') {
    const w = 110, h = 90;
    const pts = `0,${-h/2} ${-w/2},${h/2} ${w/2},${h/2}`;
    elements.push(<polygon key="base" points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />);
    
    if (partitions === 2) {
      let xOffset = isEqual ? 0 : 20;
      elements.push(<line key="line-1" x1={xOffset} y1={-h/2} x2={xOffset} y2={h/2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />);
    } else {
      for(let i=1; i<partitions; i++) {
        let px = (-w/2) + (w/partitions)*i + (isEqual ? 0 : 15);
        elements.push(<line key={`line-${i}`} x1={px} y1={h/2} x2="0" y2={-h/2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />);
      }
    }
  } else if (shape === 'hexagon') {
    const r = 55;
    let hexPts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      hexPts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
    }
    elements.push(<polygon key="base" points={hexPts.join(' ')} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />);
    
    for (let i = 0; i < partitions/2; i++) {
      const angle = (Math.PI / (partitions/2)) * i + (isEqual ? 0 : 0.5);
      const x1 = r * Math.cos(angle), y1 = r * Math.sin(angle);
      const x2 = r * Math.cos(angle + Math.PI), y2 = r * Math.sin(angle + Math.PI);
      elements.push(<line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />);
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${center}, ${center}) rotate(${rotation})`}>
        {elements}
      </g>
    </svg>
  );
}
