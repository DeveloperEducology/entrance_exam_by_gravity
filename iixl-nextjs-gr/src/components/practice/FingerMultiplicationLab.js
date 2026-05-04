'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Hand = ({ side, selectedCount, onSelect, value }) => {
  const isLeft = side === 'left';
  
  // Finger locations for a simple hand representation
  const fingers = [
    { id: 1, label: '6', x: isLeft ? 30 : 170, y: 110 },
    { id: 2, label: '7', x: isLeft ? 55 : 145, y: 70 },
    { id: 3, label: '8', x: 100, y: 50 },
    { id: 4, label: '9', x: isLeft ? 145 : 55, y: 70 },
    { id: 5, label: '10', x: isLeft ? 170 : 30, y: 110 },
  ];

  return (
    <div style={{ position: 'relative', width: '220px', height: '260px', userSelect: 'none' }}>
      <svg viewBox="0 0 200 220" style={{ width: '100%', height: '100%' }}>
        {/* Palm */}
        <path
          d={isLeft 
            ? "M40,150 Q40,210 100,210 Q160,210 160,150 L140,130 Q100,110 60,130 Z"
            : "M160,150 Q160,210 100,210 Q40,210 40,150 L60,130 Q100,110 140,130 Z"
          }
          fill="#fee2e2"
          stroke="#b91c1c"
          strokeWidth="3"
        />
        
        {/* Fingers */}
        {fingers.map((f, i) => {
          const isSelected = i < selectedCount;
          return (
            <g 
              key={f.id} 
              onClick={() => onSelect(i + 1)}
              style={{ cursor: 'pointer' }}
            >
              {/* Finger Path - Toggles between extended and folded */}
              <motion.path
                animate={{
                  d: isSelected 
                    ? `M${f.x-12},${f.y+20} Q${f.x},${f.y+45} ${f.x+12},${f.y+20} L${f.x+8},${f.y+50} L${f.x-8},${f.y+50} Z`
                    : `M${f.x-12},${f.y+20} Q${f.x},${f.y-50} ${f.x+12},${f.y+20} L${f.x+8},${f.y+35} L${f.x-8},${f.y+35} Z`,
                  fill: isSelected ? "#ef4444" : "#fee2e2"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                stroke="#b91c1c"
                strokeWidth="2"
              />
              <text
                x={f.x}
                y={isSelected ? f.y + 45 : f.y - 15}
                textAnchor="middle"
                style={{ fontSize: '14px', fontWeight: 'bold', fill: '#7f1d1d' }}
              >
                {f.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ 
        position: 'absolute', 
        bottom: '-15px', 
        width: '100%', 
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#991b1b',
        fontSize: '1.1rem'
      }}>
        {value ? `Hand: ${value}` : 'Select finger'}
      </div>
    </div>
  );
};

export default function FingerMultiplicationLab({ question, onAnswer, userAnswer, isAnswered }) {
  const [leftSelected, setLeftSelected] = useState(0);
  const [rightSelected, setRightSelected] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const targetA = question?.adaptiveConfig?.variables?.a || 6;
  const targetB = question?.adaptiveConfig?.variables?.b || 6;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (userAnswer && typeof userAnswer === 'object') {
      setLeftSelected(userAnswer.left || 0);
      setRightSelected(userAnswer.right || 0);
    }
  }, [userAnswer]);

  const tens = (leftSelected + rightSelected) * 10;
  const onesLeft = 5 - leftSelected;
  const onesRight = 5 - rightSelected;
  const ones = onesLeft * onesRight;
  const total = tens + ones;

  const handleSelect = (side, count) => {
    if (isAnswered) return;
    const next = side === 'left' 
      ? { left: count, right: rightSelected, total } 
      : { left: leftSelected, right: count, total };
    
    if (side === 'left') setLeftSelected(count);
    else setRightSelected(count);
    
    onAnswer?.(next);
  };

  if (!isMounted) return <div style={{ minHeight: '400px' }} />;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '2rem',
      padding: '1.5rem',
      background: '#fff5f5',
      borderRadius: '32px',
      border: '4px solid #fecaca',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 600px) {
          .hands-container {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          .hand-multiplier {
            transform: rotate(90deg);
            margin: 1rem 0;
          }
        }
      `}} />
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'clamp(0.8rem, 2vw, 1.2rem)', color: '#b91c1c', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Hand Multiplication Trick
        </div>
        <div style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: '900', color: '#7f1d1d' }}>
          {targetA} × {targetB}
        </div>
      </div>

      <div className="hands-container" style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <div style={{ flex: '1', maxWidth: '220px' }}>
          <Hand 
            side="left" 
            selectedCount={leftSelected} 
            onSelect={(c) => handleSelect('left', c)}
            value={leftSelected > 0 ? leftSelected + 5 : null} 
          />
        </div>
        <div className="hand-multiplier" style={{ fontSize: '3rem', color: '#f87171', fontWeight: 'bold' }}>×</div>
        <div style={{ flex: '1', maxWidth: '220px' }}>
          <Hand 
            side="right" 
            selectedCount={rightSelected} 
            onSelect={(c) => handleSelect('right', c)}
            value={rightSelected > 0 ? rightSelected + 5 : null}
          />
        </div>
      </div>

      <div style={{ 
        width: '100%', 
        maxWidth: '550px',
        padding: 'clamp(1rem, 4vw, 2rem)',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #fee2e2'
      }}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>
            <span style={{ color: '#4b5563' }}>Lowered Fingers (Tens):</span>
            <span style={{ fontWeight: 'bold', color: '#dc2626' }}>({leftSelected} + {rightSelected}) × 10 = {tens}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>
            <span style={{ color: '#4b5563' }}>Raised Fingers (Ones):</span>
            <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>{onesLeft} × {onesRight} = {ones}</span>
          </div>
          <div style={{ 
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '2px dashed #f3f4f6',
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: 'clamp(1.2rem, 5vw, 1.5rem)'
          }}>
            <span style={{ fontWeight: 'bold', color: '#111827' }}>Final Result:</span>
            <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{tens} + {ones} = {total}</span>
          </div>
        </div>
      </div>

      {!isAnswered && (
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          background: '#fee2e2', 
          borderRadius: '99px', 
          color: '#991b1b',
          fontWeight: 'bold',
          fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
          textAlign: 'center'
        }}>
          💡 Select finger {targetA} on left and {targetB} on right!
        </div>
      )}
    </div>
  );
}
