'use client';

import { useEffect, useRef } from 'react';
import QuestionParts from './QuestionParts';
import styles from './TextInputRenderer.module.css';

export default function TextInputRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isAnswered && inputRef.current) {
            inputRef.current.focus();
        }
    }, [question?.id, isAnswered]);

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                <div className={styles.questionContent}>
                    <QuestionParts parts={question.parts} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={userAnswer || ''}
                    onChange={(e) => onAnswer(e.target.value)}
                    disabled={isAnswered}
                    placeholder="Type your answer..."
                />

                {question.showSubmitButton && userAnswer && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit()}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}
