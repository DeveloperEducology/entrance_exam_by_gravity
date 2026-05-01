'use client';

import React, { useEffect, useRef, useId } from 'react';

// CDN Loader for JSXGraph
let jsxGraphLoadingPromise = null;
const loadJSXGraph = () => {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.JXG) return Promise.resolve(window.JXG);
  if (jsxGraphLoadingPromise) return jsxGraphLoadingPromise;

  jsxGraphLoadingPromise = new Promise((resolve, reject) => {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraphcore.js';
    script.async = true;
    script.onload = () => resolve(window.JXG);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return jsxGraphLoadingPromise;
};

export default function JSXGraphRenderer({ 
  width = 500, 
  height = 500, 
  boundingBox = [-10, 10, 10, -10], // [left, top, right, bottom]
  elements = [],
  onBoardReady = null // Callback to access the JXG board instance directly
}) {
  const boardRef = useRef(null);
  const containerId = `jxgbox_${useId().replace(/:/g, '')}`;

  useEffect(() => {
    let board = null;

    const initBoard = async () => {
      const JXG = await loadJSXGraph();
      
      // Cleanup existing board if any
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
      }

      board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: boundingBox,
        axis: true,
        showCopyright: false,
        showNavigation: true,
        ...boundingBox.options
      });

      const objects = {};

      elements.forEach(el => {
        // Resolve references in params (e.g. if a param is a string, check if it's an object ID)
        const resolvedParams = el.params.map(p => {
            if (typeof p === 'string' && objects[p]) return objects[p];
            return p;
        });

        const item = board.create(el.type, resolvedParams, {
          id: el.id,
          ...el.options
        });

        if (el.id) objects[el.id] = item;
        
        if (el.on) {
            Object.entries(el.on).forEach(([event, handler]) => {
                item.on(event, (e) => handler(e, item, board));
            });
        }
      });

      // Handle board-level events (like clicking the background)
      if (boundingBox.on) {
          Object.entries(boundingBox.on).forEach(([event, handler]) => {
              board.on(event, (e) => handler(e, board, objects));
          });
      }

      boardRef.current = board;
      if (onBoardReady) onBoardReady(board, JXG);
    };

    initBoard();

    return () => {
      if (boardRef.current && window.JXG) {
        window.JXG.JSXGraph.freeBoard(boardRef.current);
      }
    };
  }, [boundingBox, elements]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
      <div 
        id={containerId} 
        className="jxgbox" 
        style={{ width: `${width}px`, height: `${height}px`, borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '100%' }}
      />
    </div>
  );
}
