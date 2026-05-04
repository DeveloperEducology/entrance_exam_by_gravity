'use client';

import React, { useState } from 'react';
import FingerMultiplicationLab from '@/components/practice/FingerMultiplicationLab';

export default function FingerTestPage() {
  const [userAnswer, setUserAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [factors, setFactors] = useState({ a: 7, b: 8 });

  useEffect(() => {
    setIsMounted(true);
    // Randomize only on client side to avoid hydration mismatch
    setFactors({
      a: Math.floor(Math.random() * 5) + 6,
      b: Math.floor(Math.random() * 5) + 6
    });
  }, []);

  const mockQuestion = {
    id: 'test_finger_01',
    type: 'fingerMultiplication',
    questionText: `Multiply ${factors.a} and ${factors.b} using the hand trick.`,
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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Finger Multiplication Test Page</h1>
      <p>Testing the new <code>FingerMultiplicationLab</code> component.</p>
      
      <div style={{ border: '2px dashed #ccc', padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <FingerMultiplicationLab
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
            background: '#0076c0',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: isAnswered ? 'not-allowed' : 'pointer'
          }}
        >
          {isAnswered ? 'Submitted' : 'Submit Test Answer'}
        </button>

        {isAnswered && (
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: isCorrect ? 'green' : 'red' 
          }}>
            {isCorrect ? '✅ Correct!' : '❌ Incorrect!'}
          </div>
        )}

        <button 
          onClick={() => {
            setIsAnswered(false);
            setIsCorrect(null);
            setUserAnswer(null);
            setFactors({
              a: Math.floor(Math.random() * 5) + 6,
              b: Math.floor(Math.random() * 5) + 6
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
          Reset
        </button>
      </div>

      <div style={{ marginTop: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <h3>User Answer State:</h3>
        <pre>{JSON.stringify(userAnswer, null, 2)}</pre>
      </div>
    </div>
  );
}
