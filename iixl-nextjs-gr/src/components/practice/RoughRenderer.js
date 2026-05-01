'use client';

import React, { useEffect, useRef, useId } from 'react';

// CDN Loader for Rough.js
let roughLoadingPromise = null;
const loadRough = () => {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.rough) return Promise.resolve(window.rough);
  if (roughLoadingPromise) return roughLoadingPromise;

  roughLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/roughjs/dist/rough.umd.js';
    script.async = true;
    script.onload = () => resolve(window.rough);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return roughLoadingPromise;
};

export default function RoughRenderer({ 
  width = 600, 
  height = 200, 
  shapes = [], 
  seed = 1 // Keeps the "sketch" consistent on re-renders
}) {
  const canvasRef = useRef(null);
  const containerId = useId();

  useEffect(() => {
    let isMounted = true;

    const draw = async () => {
      const rough = await loadRough();
      if (!isMounted || !canvasRef.current) return;

      const rc = rough.canvas(canvasRef.current);
      const context = canvasRef.current.getContext('2d');
      context.clearRect(0, 0, width, height);

      shapes.forEach(shape => {
        const options = { 
          seed, 
          stroke: shape.color || '#4f57ff', 
          strokeWidth: shape.weight || 2,
          roughness: shape.roughness || 1.5,
          fill: shape.fill,
          fillStyle: shape.fillStyle || 'hachure',
          ...shape.options 
        };

        switch (shape.type) {
          case 'line':
            rc.line(shape.x1, shape.y1, shape.x2, shape.y2, options);
            break;
          case 'rectangle':
            rc.rectangle(shape.x, shape.y, shape.w, shape.h, options);
            break;
          case 'circle':
            rc.circle(shape.x, shape.y, shape.diameter, options);
            break;
          case 'ellipse':
            rc.ellipse(shape.x, shape.y, shape.w, shape.h, options);
            break;
          case 'text':
            context.font = shape.font || '20px "Comic Sans MS", cursive';
            context.fillStyle = shape.color || '#000';
            context.textAlign = 'center';
            context.fillText(shape.text, shape.x, shape.y);
            break;
        }
      });
    };

    draw();
    return () => { isMounted = false; };
  }, [shapes, width, height, seed]);

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
