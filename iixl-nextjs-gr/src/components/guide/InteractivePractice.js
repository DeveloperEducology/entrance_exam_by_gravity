'use client';

import { useState, useMemo } from 'react';
import styles from './InteractivePractice.module.css';
import QuestionParts from '../practice/QuestionParts';

/**
 * InteractivePractice - A component for embedding checks in MDX guides.
 * Supports MCQ and Input types with full LaTeX/Markdown rendering.
 */
export default function InteractivePractice({ type, question, options, answer, hint }) {
    const [userValue, setUserValue] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isCorrect, setIsCorrect] = useState(false);

    const normalizedType = String(type ?? 'mcq').toLowerCase().trim();
    const qText = String(question ?? '');

    // Robust parsing for options (handles both MDX arrays and legacy Markdown strings)
    const parsedOptions = useMemo(() => {
        if (Array.isArray(options)) return options;
        if (typeof options === 'string' && options.trim()) {
            try {
                // Handle single-quote substitution common in MDX attributes
                return JSON.parse(options.replace(/'/g, '"'));
            } catch (e) {
                console.warn('InteractivePractice: Failed to parse options string', options);
                return [];
            }
        }
        return [];
    }, [options]);
    
    const handleSubmit = () => {
        const isRight = String(userValue).trim().toLowerCase() === String(answer).trim().toLowerCase();
        setIsCorrect(isRight);
        setFeedback(isRight ? 'Correct! Well done.' : 'Not quite. Try again!');
    };

    const handleOptionSelect = (opt) => {
        setUserValue(opt);
        const isRight = String(opt).trim().toLowerCase() === String(answer).trim().toLowerCase();
        setIsCorrect(isRight);
        setFeedback(isRight ? 'Correct! Well done.' : 'Not quite. Try again!');
    };

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                <h3 className={styles.title}>Quick Check</h3>
                
                <div className={styles.questionText}>
                    <QuestionParts parts={[{ type: 'text', content: qText }]} />
                </div>
                
                {normalizedType === 'mcq' ? (
                    <div className={styles.optionsGrid}>
                        {parsedOptions.map((opt, idx) => (
                            <button
                                key={idx}
                                className={`${styles.optionButton} ${userValue === opt ? (isCorrect ? styles.correct : styles.incorrect) : ''}`}
                                onClick={() => handleOptionSelect(opt)}
                                disabled={isCorrect}
                            >
                                <QuestionParts parts={[{ type: 'text', content: String(opt) }]} />
                            </button>
                        ))}
                        {parsedOptions.length === 0 && (
                            <div className={styles.error}>No options provided for MCQ.</div>
                        )}
                    </div>
                ) : (
                    <div className={styles.inputArea}>
                        <input
                            type="text"
                            className={`${styles.input} ${feedback && !isCorrect ? styles.inputError : ''} ${isCorrect ? styles.inputSuccess : ''}`}
                            value={userValue}
                            onChange={(e) => setUserValue(e.target.value)}
                            placeholder="Type your answer here..."
                            disabled={isCorrect}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <button 
                            className={styles.submitButton} 
                            onClick={handleSubmit}
                            disabled={isCorrect || !userValue.trim()}
                        >
                            Check
                        </button>
                    </div>
                )}

                {feedback && (
                    <div className={`${styles.feedback} ${isCorrect ? styles.feedbackSuccess : styles.feedbackError}`}>
                        {isCorrect ? '✅ ' : '❌ '} {feedback}
                    </div>
                )}
                
                {!isCorrect && feedback && hint && (
                    <div className={styles.hint}>
                        <strong>Hint:</strong> {hint}
                    </div>
                )}
            </div>
        </div>
    );
}
