'use client';

import React, { useEffect, useState, useId, useRef } from 'react';

// Use a global variable to track if mermaid is loaded from CDN
let mermaidLoadingPromise = null;

const loadMermaid = () => {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.mermaid) return Promise.resolve(window.mermaid);
  
  if (mermaidLoadingPromise) return mermaidLoadingPromise;

  mermaidLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => resolve(window.mermaid);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return mermaidLoadingPromise;
};

export default function MermaidRenderer({ chart, onInputChange, userAnswer = {}, isAnswered = false }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [blanks, setBlanks] = useState([]);
  const containerRef = useRef(null);
  const uniqueId = useId().replace(/:/g, '');
  const chartId = `mermaid_${uniqueId}`;

  const placeholderRegex = /\[\[(.*?)\]\]/g;

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart) return;
      
      try {
        const mermaid = await loadMermaid();
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        let processedChart = chart;
        const foundBlanks = [];
        let match;
        const prefix = `BLNK${Math.floor(Math.random() * 1000)}X`;
        
        while ((match = placeholderRegex.exec(chart)) !== null) {
          const id = match[1];
          const token = `${prefix}${id}`;
          processedChart = processedChart.replace(`[[${id}]]`, token);
          foundBlanks.push({ id, token });
        }

        const { svg: svgCode } = await mermaid.render(chartId, processedChart);
        
        if (isMounted) {
          setSvg(svgCode);
          setBlanks(foundBlanks);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid error:', err);
        if (isMounted) setError('Failed to load diagram engine');
      }
    };

    renderChart();
    return () => { isMounted = false; };
  }, [chart, chartId]);

  const [blankPositions, setBlankPositions] = useState([]);

  useEffect(() => {
    if (!svg || blanks.length === 0 || !containerRef.current) return;

    const updatePositions = () => {
      const container = containerRef.current;
      const svgEl = container.querySelector('svg');
      if (!svgEl) return;

      const containerRect = container.getBoundingClientRect();
      const newPositions = [];

      blanks.forEach((blank) => {
        const allElements = Array.from(svgEl.querySelectorAll('text, tspan, .label'));
        const target = allElements.find(el => el.textContent && el.textContent.includes(blank.token));
        
        if (target) {
          const rect = target.getBoundingClientRect();
          newPositions.push({
            id: blank.id,
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height,
          });
          
          if (target.textContent.includes(blank.token)) {
             target.style.display = 'none';
          }
        }
      });
      
      if (newPositions.length > 0) {
        setBlankPositions(newPositions);
      }
    };

    const timers = [
      setTimeout(updatePositions, 100),
      setTimeout(updatePositions, 500),
      setTimeout(updatePositions, 1500)
    ];
    
    window.addEventListener('resize', updatePositions);
    return () => {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', updatePositions);
    };
  }, [svg, blanks]);

  if (error) return <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>;
  
  return (
    <div 
      ref={containerRef}
      className="mermaid-interactive-container"
      style={{ 
        position: 'relative',
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '20px 0',
        minHeight: svg ? 'auto' : '80px',
      }}
    >
      {svg ? (
        <>
          <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', textAlign: 'center' }} />
          {blankPositions.map((pos) => (
            <input
              key={pos.id}
              type="text"
              autoComplete="off"
              value={(userAnswer || {})[pos.id] || ''}
              onChange={(e) => onInputChange?.(pos.id, e.target.value)}
              disabled={isAnswered}
              style={{
                position: 'absolute',
                top: `${pos.top - 4}px`,
                left: `${pos.left - 8}px`,
                width: `${Math.max(50, pos.width + 16)}px`,
                height: `${pos.height + 10}px`,
                padding: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                textAlign: 'center',
                border: '2px solid #4f57ff',
                borderRadius: '6px',
                background: '#fff',
                zIndex: 50,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
          ))}
        </>
      ) : (
        <div style={{ padding: '20px', color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
          Loading visual...
        </div>
      )}
    </div>
  );
}
