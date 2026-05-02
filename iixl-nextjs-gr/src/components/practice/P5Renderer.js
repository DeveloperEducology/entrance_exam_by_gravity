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

          let tool = {
            x: 50,
            y: height - 80,
            rotation: 0,
            isDragging: false,
            isRotating: false,
            offset: { x: 0, y: 0 }
          };

          p.preload = () => {
            if (currentConfig.imageUrl) {
              customImg = p.loadImage(currentConfig.imageUrl);
            }
          };

          p.setup = () => {
            const canvas = p.createCanvas(width, height);
            canvas.style('width', '100%');
            canvas.style('height', 'auto');
            canvas.style('display', 'block');
            p.pixelDensity(1); 
            p.angleMode(p.DEGREES);
          };

          p.draw = () => {
            p.background(255);
            if (mode === 'pattern_lab') renderPatternLab(p, gridSize, n);
            else if (mode === 'angle_lab') renderAngleLab(p, targetAngle, tool, variant, customImg);
            else if (mode === 'ruler_lab') renderRulerLab(p, targetLength, tool);
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

          const renderAngleLab = (p, angle, pt, v, img) => {
            p.push();
            p.translate(width / 2, height / 2 + 20);
            
            if (img) {
                p.imageMode(p.CENTER);
                // Calculate manual or auto dimensions
                let dw = currentConfig.imageWidth || 200;
                let dh = currentConfig.imageHeight || 0;
                if (dh === 0) {
                    // Maintain aspect ratio if height not provided
                    dh = dw * (img.height / img.width);
                }
                
                p.push();
                p.translate(0, -20);
                p.image(img, 0, 0, dw, dh);
                p.pop();
                
                p.stroke(30, 41, 59, 150);
                p.strokeWeight(5);
                p.line(0, 0, dw/2, 0); 
                p.rotate(-angle);
                p.line(0, 0, dw/2, 0);
            } else if (v === 'scissors') {
              p.stroke(71, 85, 105); p.strokeWeight(8);
              p.push(); p.rotate(10); p.line(0, 0, 140, 0);
              p.noStroke(); p.fill(71, 85, 105); p.rect(-40, -15, 40, 30, 15); p.pop();
              p.push(); p.rotate(10 - angle); p.stroke(100, 116, 139); p.line(0, 0, 140, 0);
              p.noStroke(); p.fill(100, 116, 139); p.rect(-40, -15, 40, 30, 15); p.pop();
              p.fill(200); p.noStroke(); p.circle(0, 0, 10);
            } else if (v === 'clock') {
              p.stroke(50); p.strokeWeight(2); p.noFill(); p.circle(0, 0, 200);
              p.strokeWeight(6);
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

            // Draw Protractor
            p.push();
            p.translate(pt.x, pt.y);
            p.rotate(pt.rotation);
            p.fill(255, 255, 255, 180); p.stroke(148, 163, 184); p.strokeWeight(1);
            p.arc(0, 0, 260, 260, 180, 360, p.CHORD);
            p.stroke(71, 85, 105);
            for (let a = 0; a <= 180; a += 10) {
              p.strokeWeight(1);
              p.line(p.cos(180+a)*115, p.sin(180+a)*115, p.cos(180+a)*130, p.sin(180+a)*130);
              if (a % 20 === 0) {
                p.noStroke(); p.fill(50); p.textSize(10); p.textAlign(p.CENTER);
                p.text(a, p.cos(180+a)*105, p.sin(180+a)*105);
                p.fill(79, 87, 255); p.text(180-a, p.cos(180+a)*85, p.sin(180+a)*85);
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
            p.stroke(30, 41, 59); p.strokeWeight(4);
            p.line(0, 0, len * 30, 0);
            p.pop();

            p.push();
            p.translate(rl.x, rl.y);
            p.rotate(rl.rotation);
            p.fill(255, 255, 255, 180); p.stroke(148, 163, 184);
            p.rect(-10, -30, 15 * 30 + 20, 60, 4); 
            p.stroke(71, 85, 105);
            for (let i = 0; i <= 150; i++) {
              let x = i * 3;
              let isCm = i % 10 === 0;
              let h = isCm ? 15 : (i % 5 === 0 ? 10 : 6);
              p.strokeWeight(isCm ? 1.5 : 0.5);
              p.line(x, -30, x, -30 + h);
              if (isCm) {
                p.noStroke(); p.fill(50); p.textSize(10); p.textAlign(p.CENTER);
                p.text(i / 10, x, -10);
              }
            }
            p.fill(239, 68, 68); p.noStroke(); p.circle(0, 0, 6);
            p.fill(79, 87, 255); p.circle(15 * 30 + 10, 0, 24);
            p.fill(255); p.text("↺", 15 * 30 + 10, 0);
            p.pop();
          };

          p.mousePressed = () => {
            if (mode === 'ruler_lab' || mode === 'angle_lab') {
                let rotX = (mode === 'ruler_lab') ? (tool.x + p.cos(tool.rotation)*(15*30+10)) : (tool.x + p.cos(tool.rotation-90)*150);
                let rotY = (mode === 'ruler_lab') ? (tool.y + p.sin(tool.rotation)*(15*30+10)) : (tool.y + p.sin(tool.rotation-90)*150);
                if (p.dist(p.mouseX, p.mouseY, rotX, rotY) < 30) { tool.isRotating = true; return; }
                if (p.dist(p.mouseX, p.mouseY, tool.x, tool.y) < 130) {
                    tool.isDragging = true;
                    tool.offset.x = p.mouseX - tool.x; tool.offset.y = p.mouseY - tool.y;
                }
            } else if (mode === 'pattern_lab') {
                const gx = Math.round(p.mouseX / gridSize) * gridSize;
                const gy = Math.round(p.mouseY / gridSize) * gridSize;
                let nextDots = [...dots];
                const existingIdx = nextDots.findIndex(d => d.x === gx && d.y === gy);
                if (existingIdx >= 0) nextDots.splice(existingIdx, 1);
                else nextDots.push({ x: gx, y: gy });
                setDots(nextDots);
                if (onStateChange) onStateChange({ dotsCount: nextDots.length });
            }
          };

          p.mouseDragged = () => {
            if (tool.isRotating) {
              if (mode === 'ruler_lab') tool.rotation = p.atan2(p.mouseY - tool.y, p.mouseX - tool.x);
              else tool.rotation = p.atan2(p.mouseY - tool.y, p.mouseX - tool.x) + 90;
            } else if (tool.isDragging) {
              tool.x = p.mouseX - tool.offset.x;
              tool.y = p.mouseY - tool.offset.y;
            }
          };

          p.mouseReleased = () => { tool.isDragging = false; tool.isRotating = false; };
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
  }, [width, height, mode, memoConfig]);

  return (
    <div className="p5-lab-outer" style={{ width: '100%', margin: '0.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="p5-lab-fluid-container" style={{ 
        width: '100%', maxWidth: width, display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: '#ffffff', padding: '0.25rem', borderRadius: '12px', border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden'
      }}>
        <div ref={containerRef} style={{ 
          width: '100%', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', borderRadius: '8px', 
          overflow: 'hidden', visibility: isReady ? 'visible' : 'hidden', border: '1px solid #f1f5f9'
        }} />
      </div>
    </div>
  );
}
