'use client';

import React, { useState, useEffect } from 'react';
import FingerCountingLab from '@/components/practice/FingerCountingLab';

export default function FingerCountingTestPage() {
  const [userAnswer, setUserAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [factors, setFactors] = useState({ a: 3, b: 4 });

  useEffect(() => {
    setIsMounted(true);
    setFactors({
      a: Math.floor(Math.random() * 5) + 1,
      b: Math.floor(Math.random() * 5) + 1
    });
  }, []);

  const mockQuestion = {
    id: 'test_count_01',
    type: 'fingerCounting',
    questionText: `Multiply ${factors.a} and ${factors.b} by counting dots on your fingers.`,
    adaptiveConfig: {
      variables: { a: factors.a, b: factors.b }
    },
    correctAnswerText: JSON.stringify({ total: factors.a * factors.b })
  };

  const handleSubmit = () => {
    const correct = userAnswer?.total === (factors.a * factors.b);
    setIsCorrect(correct);
    setIsAnswered(true);
  };

  if (!isMounted) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Finger Counting Test Page (1-5)</h1>
      <p>Testing the new <code>FingerCountingLab</code> component for smaller numbers.</p>
      
      <div style={{ border: '2px dashed #ccc', padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <FingerCountingLab
          question={mockQuestion}
          userAnswer={userAnswer}
          onAnswer={setUserAnswer}
          isAnswered={isAnswered}
          isCorrect={isCorrect}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button 
          onClick={handleSubmit}
          disabled={isAnswered}
          style={{
            padding: '1rem 2rem',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: isAnswered ? 'not-allowed' : 'pointer'
          }}
        >
          {isAnswered ? 'Submitted' : 'Submit Answer'}
        </button>

        {isAnswered && (
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: isCorrect ? 'green' : 'red' 
          }}>
            {isCorrect ? '✅ Well done!' : '❌ Oops, try counting again!'}
          </div>
        )}

        <button 
          onClick={() => {
            setIsAnswered(false);
            setIsCorrect(null);
            setUserAnswer(null);
            setFactors({
              a: Math.floor(Math.random() * 5) + 1,
              b: Math.floor(Math.random() * 5) + 1
            });
          }}
          style={{
            padding: '0.5rem 1rem',
            background: '#f3f4f6',
            border: '1px solid #ccc',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reset / New Problem
        </button>
      </div>

      <div style={{ marginTop: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <h3>Current Lab State:</h3>
        <pre>{JSON.stringify(userAnswer, null, 2)}</pre>
      </div>
    </div>
  );
}
