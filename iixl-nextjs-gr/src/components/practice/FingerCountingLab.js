'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HandFinger = ({ index, dots, onDotClick, countedDots }) => {
  const isThumb = index === 4;
  
  return (
    <div style={{ position: 'relative', width: '40px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Finger Shape */}
      <div style={{
        width: '30px',
        height: isThumb ? '70px' : '100px',
        background: '#fef3c7',
        border: '2px solid #d97706',
        borderRadius: '15px 15px 5px 5px',
        position: 'absolute',
        bottom: 0,
        zIndex: 1
      }} />
      
      {/* Dots on Finger */}
      <div style={{
        position: 'absolute',
        top: isThumb ? '40px' : '10px',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'center'
      }}>
        {Array.from({ length: dots }).map((_, dIdx) => {
          const dotId = `${index}-${dIdx}`;
          const isCounted = countedDots.includes(dotId);
          return (
            <motion.div
              key={dotId}
              whileTap={{ scale: 0.8 }}
              onClick={() => onDotClick(dotId)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isCounted ? '#ef4444' : '#fde68a',
                border: `1px solid ${isCounted ? '#b91c1c' : '#d97706'}`,
                cursor: 'pointer',
                boxShadow: isCounted ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default function FingerCountingLab({ question, onAnswer, userAnswer, isAnswered, onSubmit, isCorrect }) {
  const [countedDots, setCountedDots] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  const factorA = question?.adaptiveConfig?.variables?.a || 3; // Groups (fingers)
  const factorB = question?.adaptiveConfig?.variables?.b || 4; // Dots per finger

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (userAnswer && Array.isArray(userAnswer.counted)) {
      setCountedDots(userAnswer.counted);
    }
  }, [userAnswer]);

  const handleDotClick = (id) => {
    if (isAnswered) return;
    setCountedDots(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      onAnswer?.({ counted: next, total: next.length });
      return next;
    });
  };

  if (!isMounted) return <div style={{ minHeight: '400px' }} />;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
      padding: '2rem',
      background: '#f0fdf4',
      borderRadius: '32px',
      border: '4px solid #bbf7d0',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Finger Counting Trick
        </div>
        <div style={{ fontSize: '3rem', fontWeight: '900', color: '#14532d' }}>
          {factorA} × {factorB} = ?
        </div>
      </div>

      <p style={{ color: '#166534', textAlign: 'center', maxWidth: '400px' }}>
        Show <b>{factorA}</b> fingers. Each finger has <b>{factorB}</b> dots. Tap the dots to count!
      </p>

      {/* Hand area */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '10px', 
        height: '180px', 
        padding: '20px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: '20px'
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ opacity: i < factorA ? 1 : 0.2, transition: 'opacity 0.3s' }}>
            <HandFinger 
              index={i} 
              dots={factorB} 
              onDotClick={handleDotClick} 
              countedDots={countedDots} 
            />
          </div>
        ))}
      </div>

      <div style={{ 
        width: '100%', 
        padding: '1.5rem', 
        background: 'white', 
        borderRadius: '24px',
        border: '2px solid #dcfce7',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Dots Counted</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a' }}>{countedDots.length}</div>
          </div>
          <div style={{ width: '2px', height: '40px', background: '#f1f5f9' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Final Product</div>
            <input
              type="number"
              value={userAnswer?.inputValue || ''}
              onChange={(e) => {
                const val = e.target.value;
                onAnswer?.({ ...userAnswer, counted: countedDots, inputValue: val, total: parseInt(val) });
              }}
              disabled={isAnswered}
              placeholder="?"
              style={{
                width: '80px',
                height: '50px',
                fontSize: '1.5rem',
                textAlign: 'center',
                borderRadius: '12px',
                border: `3px solid ${isAnswered ? (isCorrect ? '#22c55e' : '#ef4444') : '#10b981'}`,
                outline: 'none',
                fontWeight: 'bold',
                color: '#14532d'
              }}
            />
          </div>
        </div>

        {isAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              color: isCorrect ? '#059669' : '#ef4444', 
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            {isCorrect ? '🌟 Correct!' : `❌ Incorrect! The answer is ${factorA * factorB}`}
          </motion.div>
        )}

        {!isAnswered && (
          <button
            onClick={() => onSubmit?.()}
            disabled={!userAnswer?.inputValue}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '99px',
              fontWeight: 'bold',
              cursor: userAnswer?.inputValue ? 'pointer' : 'not-allowed',
              opacity: userAnswer?.inputValue ? 1 : 0.6,
              transition: 'all 0.2s ease'
            }}
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );
}
