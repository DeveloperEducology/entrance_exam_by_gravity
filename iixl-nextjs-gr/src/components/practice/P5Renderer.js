'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

// CDN Loader for p5.js
let p5LoadingPromise = null;
const loadP5 = () => {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.p5) return Promise.resolve(window.p5);
  if (p5LoadingPromise) return p5LoadingPromise;

  p5LoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js';
    script.async = true;
    script.onload = () => resolve(window.p5);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return p5LoadingPromise;
};

export default function P5Renderer({ 
  width = 600, 
  height = 400, 
  mode = 'pattern_lab', 
  config = {}, 
  onStateChange = null 
}) {
  const containerRef = useRef(null);
  const p5Instance = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dots, setDots] = useState(config.initialDots || []);
  const memoConfig = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    let isMounted = true;
    const currentConfig = JSON.parse(memoConfig);

    const initP5 = async () => {
      try {
        const p5Lib = await loadP5();
        if (!isMounted || !containerRef.current) return;

        if (p5Instance.current) p5Instance.current.remove();

        const sketch = (p) => {
          let gridSize = currentConfig.gridSize || 40;
          let n = currentConfig.n || 5;
          let targetAngle = currentConfig.targetAngle || 45;
          let targetLength = currentConfig.targetLength || 10; 
          let variant = currentConfig.variant || 'roof';
          let customImg = null;

          // Algebra Lab State
          let algPoints = [
            { x: -2, y: 0, isDragging: false },
            { x: 2, y: 4, isDragging: false }
          ];
          let unitScale = 30; // pixels per unit

          let tool = {
            x: 50,
            y: height - 80,
            rotation: 0,
            isDragging: false,
            isRotating: false,
            offset: { x: 0, y: 0 }
          };

          p.preload = () => {
            if (currentConfig.imageUrl) customImg = p.loadImage(currentConfig.imageUrl);
          };

          p.setup = () => {
            const canvas = p.createCanvas(width, height);
            canvas.style('display', 'block');
            p.pixelDensity(1); 
            p.angleMode(p.DEGREES);
          };

          p.draw = () => {
            p.background(255);
            p.push();
            p.translate(width / 2, height / 2);
            p.scale(zoom);
            p.translate(-width / 2, -height / 2);

            if (mode === 'pattern_lab') renderPatternLab(p, gridSize, n);
            else if (mode === 'angle_lab') renderAngleLab(p, targetAngle, tool, variant, customImg);
            else if (mode === 'ruler_lab') renderRulerLab(p, targetLength, tool);
            else if (mode === 'algebra_lab') renderAlgebraLab(p, algPoints, unitScale);
            p.pop();
          };

          const getMappedMouse = () => {
            return {
              mx: (p.mouseX - width / 2) / zoom + width / 2,
              my: (p.mouseY - height / 2) / zoom + height / 2
            };
          };

          const renderPatternLab = (p, gSize, num) => {
            p.stroke(242, 245, 249);
            for (let x = 0; x <= width; x += gSize) p.line(x, 0, x, height);
            for (let y = 0; y <= height; y += gSize) p.line(0, y, width, y);
            p.noFill(); p.stroke(79, 87, 255, 100); p.strokeWeight(3);
            p.rect(gSize, gSize, (num - 1) * gSize, (num - 1) * gSize, 12);
            dots.forEach((dot, idx) => {
              p.noStroke(); p.fill(79, 87, 255);
              p.circle(dot.x, dot.y, 18 + p.sin(p.frameCount * 5 + idx * 10) * 2);
            });
          };

          const renderAlgebraLab = (p, pts, scale) => {
            const centerX = width / 2;
            const centerY = height / 2;

            p.stroke(241, 245, 249); p.strokeWeight(1);
            for (let x = -10; x <= 10; x++) p.line(centerX + x * scale, 0, centerX + x * scale, height);
            for (let y = -10; y <= 10; y++) p.line(0, centerY + y * scale, width, centerY + y * scale);

            p.stroke(148, 163, 184); p.strokeWeight(2);
            p.line(centerX, 0, centerX, height);
            p.line(0, centerY, width, centerY);

            p.fill(100); p.noStroke(); p.textSize(10); p.textAlign(p.CENTER, p.CENTER);
            for (let x = -10; x <= 10; x++) if(x!==0) p.text(x, centerX + x * scale, centerY + 15);
            for (let y = -10; y <= 10; y++) if(y!==0) p.text(-y, centerX - 15, centerY + y * scale);

            const p1 = pts[0]; const p2 = pts[1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const m = dx === 0 ? Infinity : dy / dx;
            const b = p1.y - m * p1.x;

            p.stroke(79, 87, 255); p.strokeWeight(3);
            if (m === Infinity) {
                p.line(centerX + p1.x * scale, 0, centerX + p1.x * scale, height);
            } else {
                let xLeft = -10; let yLeft = m * xLeft + b;
                let xRight = 10; let yRight = m * xRight + b;
                p.line(centerX + xLeft * scale, centerY - yLeft * scale, centerX + xRight * scale, centerY - yRight * scale);
            }

            pts.forEach((pt, idx) => {
                p.noStroke();
                p.fill(pt.isDragging ? [239, 68, 68] : [79, 87, 255]);
                p.circle(centerX + pt.x * scale, centerY - pt.y * scale, 12);
                p.fill(255); p.textSize(9);
                p.text(idx === 0 ? "A" : "B", centerX + pt.x * scale, centerY - pt.y * scale);
            });

            const hideIntercept = currentConfig.hideInterceptInEquation ?? true;
            p.push();
            p.translate(20, 40);
            p.fill(255, 255, 255, 220); p.stroke(226, 232, 240); p.rect(0, 0, 160, 60, 10);
            p.fill(30, 41, 59); p.noStroke(); p.textAlign(p.LEFT);
            p.textSize(14); p.textStyle(p.BOLD);
            let mStr = m === Infinity ? "und." : m.toFixed(2);
            let bStr = b >= 0 ? `+ ${b.toFixed(2)}` : `- ${Math.abs(b).toFixed(2)}`;
            if (hideIntercept) {
                p.text(`Equation: y = ${mStr}x + b`, 10, 25);
                p.textSize(11); p.textStyle(p.NORMAL); p.fill(100);
                p.text(`(Find 'b' on the graph)`, 10, 45);
            } else {
                p.text(`Equation: y = ${mStr}x ${bStr}`, 10, 25);
                p.textSize(12); p.textStyle(p.NORMAL);
                p.text(`Slope (m): ${mStr}`, 10, 45);
            }
            p.pop();
          };

          const renderAngleLab = (p, angle, pt, v, img) => {
            p.push();
            p.translate(width / 2, height / 2 + 20);
            if (img) {
                p.imageMode(p.CENTER);
                let dw = currentConfig.imageWidth || 200;
                let dh = dw * (img.height / img.width);
                p.push(); p.translate(0, -20); p.image(img, 0, 0, dw, dh); p.pop();
                p.stroke(30, 41, 59, 150); p.strokeWeight(5);
                p.line(0, 0, dw/2, 0); p.rotate(-angle); p.line(0, 0, dw/2, 0);
            } else if (v === 'scissors') {
              p.stroke(71, 85, 105); p.strokeWeight(8);
              p.push(); p.rotate(10); p.line(0, 0, 140, 0); p.noStroke(); p.fill(71, 85, 105); p.rect(-40, -15, 40, 30, 15); p.pop();
              p.push(); p.rotate(10 - angle); p.stroke(100, 116, 139); p.line(0, 0, 140, 0); p.noStroke(); p.fill(100, 116, 139); p.rect(-40, -15, 40, 30, 15); p.pop();
              p.fill(200); p.noStroke(); p.circle(0, 0, 10);
            } else if (v === 'clock') {
              p.stroke(50); p.strokeWeight(2); p.noFill(); p.circle(0, 0, 200); p.strokeWeight(6);
              p.push(); p.rotate(-90); p.line(0, 0, 60, 0); p.pop();
              p.push(); p.rotate(-90 + angle); p.line(0, 0, 90, 0); p.pop();
              p.fill(0); p.circle(0, 0, 12);
            } else if (v === 'laptop') {
                p.stroke(30); p.strokeWeight(10); p.line(-100, 0, 100, 0);
                p.push(); p.translate(-100, 0); p.rotate(-angle); p.stroke(60); p.line(0, 0, 180, 0); p.pop();
            } else {
              p.translate(width * 0.2, 0);
              p.stroke(30, 41, 59); p.strokeWeight(6); p.strokeCap(p.ROUND);
              p.line(0, 0, -150, 0); p.rotate(angle); p.line(0, 0, -150, 0); 
            }
            p.pop();

            p.push();
            p.translate(pt.x, pt.y); p.rotate(pt.rotation);
            p.fill(255, 255, 255, 180); p.stroke(148, 163, 184); p.strokeWeight(1);
            p.arc(0, 0, 260, 260, 180, 360, p.CHORD);
            p.stroke(71, 85, 105);
            for (let a = 0; a <= 180; a += 1) {
              let isMajor = a % 10 === 0; let isFive = a % 5 === 0;
              if (isMajor || isFive || a % 1 === 0) {
                let r1 = 130; let r2 = isMajor ? 110 : (isFive ? 118 : 124);
                p.strokeWeight(isMajor ? 1.5 : (isFive ? 0.8 : 0.3));
                p.line(p.cos(180+a)*r1, p.sin(180+a)*r1, p.cos(180+a)*r2, p.sin(180+a)*r2);
              }
              if (isMajor) {
                p.push(); p.noStroke(); p.fill(30, 41, 59); p.textSize(10); p.textAlign(p.CENTER);
                p.text(a, p.cos(180+a)*102, p.sin(180+a)*102);
                p.fill(79, 87, 255); p.text(180-a, p.cos(180+a)*85, p.sin(180+a)*85);
                p.pop();
              }
            }
            p.fill(239, 68, 68); p.noStroke(); p.circle(0, 0, 8);
            p.fill(79, 87, 255); p.circle(0, -150, 26);
            p.fill(255); p.text("↺", 0, -150);
            p.pop();
          };

          const renderRulerLab = (p, len, rl) => {
            p.push();
            p.translate(width / 2 - (len * 15), height / 2);
            p.stroke(30, 41, 59); p.strokeWeight(4); p.line(0, 0, len * 30, 0);
            p.pop();
            p.push();
            p.translate(rl.x, rl.y); p.rotate(rl.rotation);
            p.fill(255, 255, 255, 180); p.stroke(148, 163, 184);
            p.rect(-10, -30, 15 * 30 + 20, 60, 4); 
            p.stroke(71, 85, 105);
            for (let i = 0; i <= 150; i++) {
              let x = i * 3; let isCm = i % 10 === 0; let h = isCm ? 15 : (i % 5 === 0 ? 10 : 6);
              p.strokeWeight(isCm ? 1.5 : 0.5); p.line(x, -30, x, -30 + h);
              if (isCm) { p.noStroke(); p.fill(50); p.textSize(10); p.textAlign(p.CENTER); p.text(i / 10, x, -10); }
            }
            p.fill(239, 68, 68); p.noStroke(); p.circle(0, 0, 6);
            p.fill(79, 87, 255); p.circle(15 * 30 + 10, 0, 24);
            p.fill(255); p.text("↺", 15 * 30 + 10, 0);
            p.pop();
          };

          p.mousePressed = () => {
            const { mx, my } = getMappedMouse();
            if (mode === 'ruler_lab' || mode === 'angle_lab') {
                let rotX = (mode === 'ruler_lab') ? (tool.x + p.cos(tool.rotation)*(15*30+10)) : (tool.x + p.cos(tool.rotation-90)*150);
                let rotY = (mode === 'ruler_lab') ? (tool.y + p.sin(tool.rotation)*(15*30+10)) : (tool.y + p.sin(tool.rotation-90)*150);
                if (p.dist(mx, my, rotX, rotY) < 30) { tool.isRotating = true; return; }
                if (p.dist(mx, my, tool.x, tool.y) < 130) { tool.isDragging = true; tool.offset.x = mx - tool.x; tool.offset.y = my - tool.y; }
            } else if (mode === 'pattern_lab') {
                const gx = Math.round(mx / gridSize) * gridSize;
                const gy = Math.round(my / gridSize) * gridSize;
                let nextDots = [...dots];
                const existingIdx = nextDots.findIndex(d => d.x === gx && d.y === gy);
                if (existingIdx >= 0) nextDots.splice(existingIdx, 1);
                else nextDots.push({ x: gx, y: gy });
                setDots(nextDots);
                if (onStateChange) onStateChange({ dotsCount: nextDots.length });
            } else if (mode === 'algebra_lab') {
                algPoints.forEach(pt => {
                    if (p.dist(mx, my, width/2 + pt.x * unitScale, height/2 - pt.y * unitScale) < 20) {
                        pt.isDragging = true;
                    }
                });
            }
          };

          p.mouseDragged = () => {
            const { mx, my } = getMappedMouse();
            if (tool.isRotating) {
              if (mode === 'ruler_lab') tool.rotation = p.atan2(my - tool.y, mx - tool.x);
              else tool.rotation = p.atan2(my - tool.y, mx - tool.x) + 90;
            } else if (tool.isDragging) { tool.x = mx - tool.offset.x; tool.y = my - tool.offset.y; }
            else if (mode === 'algebra_lab') {
                algPoints.forEach(pt => {
                    if (pt.isDragging) {
                        pt.x = Math.round((mx - width/2) / unitScale);
                        pt.y = Math.round((height/2 - my) / unitScale);
                        pt.x = p.constrain(pt.x, -10, 10);
                        pt.y = p.constrain(pt.y, -10, 10);
                        if (onStateChange) {
                            const dx = algPoints[1].x - algPoints[0].x;
                            const dy = algPoints[1].y - algPoints[0].y;
                            const m = dx === 0 ? Infinity : dy / dx;
                            const b = algPoints[0].y - m * algPoints[0].x;
                            onStateChange({ slope: m, intercept: b });
                        }
                    }
                });
            }
          };

          p.mouseReleased = () => { 
            tool.isDragging = false; tool.isRotating = false; 
            if (mode === 'algebra_lab') algPoints.forEach(pt => pt.isDragging = false);
          };
        };

        p5Instance.current = new p5Lib(sketch, containerRef.current);
        setIsReady(true);
      } catch (err) {
        console.error(err);
      }
    };

    initP5();

    return () => {
      isMounted = false;
      if (p5Instance.current) p5Instance.current.remove();
    };
  }, [width, height, mode, memoConfig, zoom, dots]);

  return (
    <div className="p5-lab-outer" style={{ 
      width: '100%', margin: '0.25rem 0', display: 'flex', flexDirection: 'column', 
      alignItems: 'flex-start', position: 'relative', background: '#f8fafc', padding: '0.5rem', borderRadius: '16px', border: '1px solid #e2e8f0'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .p5-lab-scroll-wrapper::-webkit-scrollbar {
          height: 20px;
        }
        .p5-lab-scroll-wrapper::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 5px;
        }
        .p5-lab-scroll-wrapper::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
          border: 2px solid #f1f5f9;
        }
        .p5-lab-scroll-wrapper::-webkit-scrollbar-thumb:hover {
          // background: #1a6fe6ff;
        }
      `}} />
      
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, pointerEvents: 'none' }}>
        <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '20px', fontWeight: 'bold', color: '#475569', pointerEvents: 'auto' }}>+</button>
        <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '20px', fontWeight: 'bold', color: '#475569', pointerEvents: 'auto' }}>-</button>
        <button onClick={() => setZoom(1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', pointerEvents: 'auto' }}>Reset</button>
      </div>

      <div className="p5-lab-scroll-wrapper" style={{
        width: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '0.25rem 0',
        display: 'block',
        touchAction: 'pan-x'
      }}>
        <div className="p5-lab-container" style={{ 
          background: '#ffffff',
          borderRadius: '12px',
          width: width,
          margin: '0 auto',
          position: 'relative',
          flexShrink: 0
        }}>
          <div ref={containerRef} style={{ 
            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)', 
            borderRadius: '12px', 
            overflow: 'hidden',
            visibility: isReady ? 'visible' : 'hidden'
          }} />
        </div>
      </div>
      
      {isReady && (
         <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            {/* <span style={{ fontSize: '1rem' }}>↔️</span> 
            <span style={{ fontWeight: 500 }}>Scroll horizontally to see the full lab</span> */}
         </div>
      )}
    </div>
  );
}
