'use client';

import SpeechToText from './SpeechToText';
import styles from './FillInTheBlankRenderer.module.css'; // Reuse some layout styles

export default function SpeechRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const handleValidation = (success, transcript) => {
        onAnswer({
            transcript,
            isCorrect: success,
            ans: success ? (question.correctAnswerText || 'correct') : 'incorrect'
        });

        // Auto-submit if correct
        if (success && onSubmit) {
            setTimeout(onSubmit, 500);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.questionSection}>
                <h2 className={styles.questionText}>
                    {question.questionText || "Listen and repeat the sentence below:"}
                </h2>
                
                <SpeechToText
                    targetText={question.targetText || question.correctAnswerText || "Hello world"}
                    onValidation={handleValidation}
                    isAnswered={isAnswered}
                    userAnswer={userAnswer}
                />
            </div>
        </div>
    );
}
