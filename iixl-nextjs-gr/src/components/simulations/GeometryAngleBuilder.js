'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './GeometryAngleBuilder.module.css';

const clampAngle = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(180, numeric));
};

const polarPoint = (cx, cy, radius, angleDeg) => {
  const radians = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
};

export default function GeometryAngleBuilder() {
  const svgRef = useRef(null);
  const [angle, setAngle] = useState(52);
  const [dragging, setDragging] = useState(false);

  const center = { x: 200, y: 200 };
  const armLength = 148;
  const movableAngle = clampAngle(angle);

  const baselineEnd = polarPoint(center.x, center.y, armLength, 0);
  const movableEnd = polarPoint(center.x, center.y, armLength, movableAngle);
  const arcRadius = 58;
  const arcEnd = polarPoint(center.x, center.y, arcRadius, movableAngle);
  const largeArcFlag = movableAngle > 180 ? 1 : 0;

  const angleType = useMemo(() => {
    if (movableAngle === 0) return 'Zero angle';
    if (movableAngle < 90) return 'Acute angle';
    if (movableAngle === 90) return 'Right angle';
    if (movableAngle < 180) return 'Obtuse angle';
    return 'Straight angle';
  }, [movableAngle]);

  const challenge = useMemo(() => {
    if (movableAngle < 45) return 'Try dragging the top arm until it becomes a right angle.';
    if (movableAngle <= 120) return 'Can you make this angle larger without reaching a straight line?';
    return 'Now reduce it and compare how the arc changes as the angle gets smaller.';
  }, [movableAngle]);

  useEffect(() => {
    if (!dragging) return undefined;

    const updateFromPointer = (clientX, clientY) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const dx = localX - center.x;
      const dy = center.y - localY;
      const degrees = Math.atan2(dy, dx) * (180 / Math.PI);
      setAngle(clampAngle(degrees));
    };

    const handleMove = (event) => {
      if ('touches' in event) {
        const touch = event.touches[0];
        if (touch) updateFromPointer(touch.clientX, touch.clientY);
        return;
      }
      updateFromPointer(event.clientX, event.clientY);
    };

    const stopDragging = () => setDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopDragging);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [dragging]);

  return (
    <section className={styles.shell}>
      <div className={styles.stageCard}>
        <div className={styles.stageHeader}>
          <div>
            <span className={styles.eyebrow}>Interactive Geometry Demo</span>
            <h2 className={styles.title}>Angle Builder</h2>
          </div>
          <div className={styles.angleReadout}>
            <span className={styles.angleValue}>{movableAngle.toFixed(0)}°</span>
            <span className={styles.angleType}>{angleType}</span>
          </div>
        </div>

        <div className={styles.canvasWrap}>
          <svg
            ref={svgRef}
            viewBox="0 0 400 260"
            className={styles.canvas}
            role="img"
            aria-label={`Angle builder showing ${movableAngle.toFixed(0)} degrees`}
          >
            <defs>
              <linearGradient id="angleArmGradient" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#ef7b45" />
                <stop offset="100%" stopColor="#f2b134" />
              </linearGradient>
            </defs>

            {Array.from({ length: 19 }).map((_, index) => {
              const degrees = index * 10;
              const outer = polarPoint(center.x, center.y, 172, degrees);
              const inner = polarPoint(center.x, center.y, degrees % 30 === 0 ? 156 : 162, degrees);
              return (
                <line
                  key={degrees}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  className={styles.tick}
                />
              );
            })}

            {Array.from({ length: 7 }).map((_, index) => {
              const degrees = index * 30;
              const point = polarPoint(center.x, center.y, 184, degrees);
              return (
                <text key={`label-${degrees}`} x={point.x} y={point.y} className={styles.tickLabel}>
                  {degrees}°
                </text>
              );
            })}

            <path
              d={`M ${center.x + arcRadius} ${center.y} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 0 ${arcEnd.x} ${arcEnd.y}`}
              className={styles.arc}
            />

            <line x1={center.x} y1={center.y} x2={baselineEnd.x} y2={baselineEnd.y} className={styles.baseArm} />
            <line x1={center.x} y1={center.y} x2={movableEnd.x} y2={movableEnd.y} className={styles.movableArm} />

            <circle cx={center.x} cy={center.y} r="8" className={styles.vertex} />
            <circle
              cx={movableEnd.x}
              cy={movableEnd.y}
              r="14"
              className={styles.handle}
              onMouseDown={() => setDragging(true)}
              onTouchStart={() => setDragging(true)}
            />

            <text x={center.x + 78} y={center.y - 14} className={styles.angleText}>
              {movableAngle.toFixed(0)}°
            </text>
          </svg>
        </div>

        <div className={styles.controls}>
          <label className={styles.sliderLabel}>
            <span>Adjust angle</span>
            <input
              type="range"
              min="0"
              max="180"
              step="1"
              value={movableAngle}
              onChange={(event) => setAngle(clampAngle(event.target.value))}
              className={styles.slider}
            />
          </label>

          <div className={styles.presetRow}>
            {[30, 60, 90, 120, 180].map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.presetButton}
                onClick={() => setAngle(preset)}
              >
                {preset}°
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.infoCard}>
          <h3>What students can learn</h3>
          <p>
            Students can drag the ray, read the angle in degrees, and connect the number
            with the visual opening between the rays.
          </p>
        </div>

        <div className={styles.infoCard}>
          <h3>Prompt</h3>
          <p>{challenge}</p>
        </div>

        <div className={styles.infoCard}>
          <h3>Suggested extensions</h3>
          <ul className={styles.list}>
            <li>Ask learners to build an acute, right, and obtuse angle.</li>
            <li>Challenge them to make an angle exactly 15° more than 60°.</li>
            <li>Compare 45° and 135° and discuss how the opening changes.</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
