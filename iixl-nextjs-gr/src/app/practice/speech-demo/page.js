'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuestionRenderer from '@/components/practice/QuestionRenderer';
import { englishGenerators } from '@/lib/practice/generators/english';
import styles from '../demo/demo.module.css';

function SpeechDemoContent() {
    const searchParams = useSearchParams();
    const category = searchParams.get('category') || 'short_sentences';

    const [currentQuestion, setCurrentQuestion] = useState(() => 
        englishGenerators.english_stt_demo({ engineParams: { seed: 'demo-1', category } })
    );
    const [userAnswer, setUserAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(null);

    // Sync if category changes
    useEffect(() => {
        const nextQ = englishGenerators.english_stt_demo({ engineParams: { seed: `init-${Date.now()}`, category } });
        setCurrentQuestion(nextQ);
        setUserAnswer(null);
        setIsAnswered(false);
        setIsCorrect(null);
    }, [category]);

    const handleNext = () => {
        const nextQ = englishGenerators.english_stt_demo({ engineParams: { seed: `demo-${Date.now()}`, category } });
        setCurrentQuestion(nextQ);
        setUserAnswer(null);
        setIsAnswered(false);
        setIsCorrect(null);
    };

    // Auto-advance logic
    useEffect(() => {
        if (isCorrect && isAnswered) {
            const timer = setTimeout(() => {
                handleNext();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isCorrect, isAnswered]);

    const handleSubmit = () => {
        // If we don't have a state yet, but we're calling submit, 
        // it means we might be in an auto-submit flow.
        // We'll check the latest state if possible, but the useEffect will handle the next qn.
        setIsAnswered(true);
        if (userAnswer) {
            setIsCorrect(userAnswer.isCorrect);
        }
    };

    return (
        <div className={styles.pageContainer} style={{ minHeight: '100vh', background: '#0f172a', color: 'white' }}>
            <header className={styles.header} style={{ borderBottom: '1px solid #1e293b' }}>
                <h1 style={{ color: '#6366f1' }}>English Speech-to-Text Demo</h1>
                <p style={{ color: '#94a3b8' }}>Test your pronunciation and see the magic of browser-native speech recognition.</p>
            </header>

            <main className={styles.main} style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <div className={styles.rendererWrapper} style={{ background: '#1e293b', padding: '2rem', borderRadius: '24px' }}>
                    <QuestionRenderer
                        question={currentQuestion}
                        userAnswer={userAnswer}
                        onAnswer={setUserAnswer}
                        onSubmit={handleSubmit}
                        isAnswered={isAnswered}
                        isCorrect={isCorrect}
                    />

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        {!isAnswered ? (
                            <button 
                                onClick={handleSubmit}
                                disabled={!userAnswer?.transcript}
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '12px',
                                    background: userAnswer?.transcript ? '#6366f1' : '#334155',
                                    color: 'white',
                                    border: 'none',
                                    cursor: userAnswer?.transcript ? 'pointer' : 'not-allowed',
                                    fontWeight: '600'
                                }}
                            >
                                Submit
                            </button>
                        ) : (
                            <button 
                                onClick={handleNext}
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '12px',
                                    background: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Try Another One
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function SpeechDemoPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SpeechDemoContent />
        </Suspense>
    );
}
