'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './LongDivisionStepRenderer.module.css';

/**
 * Professional Long Division Renderer with "Smart Cells"
 * Each digit gets its own cell for perfect place-value alignment.
 */
export default function LongDivisionStepRenderer({
    question,
    onSubmit
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepData, setStepData] = useState({}); 
    const [completedSteps, setCompletedSteps] = useState([]);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const steps = question.steps || [];
    const problem = question.problem || {};
    const { divisor, dividend } = problem;
    const currentStep = steps[currentStepIndex];

    const dividendStr = String(dividend);
    const numCols = dividendStr.length; // Number of columns for dividend digits

    const handleInputChange = (stepId, digitIdx, val) => {
        setStepData(prev => {
            const currentStepVal = prev[stepId] || {};
            return {
                ...prev,
                [stepId]: {
                    ...currentStepVal,
                    [digitIdx]: val.slice(-1) // Only keep last digit
                }
            };
        });
        setFeedback({ type: '', message: '' });
    };

    const getFullValue = (stepId) => {
        const data = stepData[stepId] || {};
        const step = steps.find(s => s.step_id === stepId);
        if (!step) return '';
        const len = String(step.expected_answer).length;
        let out = '';
        for (let i = 0; i < len; i++) {
            out += data[i] || '';
        }
        return out;
    };

    const checkStep = () => {
        const userVal = getFullValue(currentStep.step_id);
        const expected = String(currentStep.expected_answer);

        if (userVal === expected) {
            setFeedback({ type: 'success', message: currentStep.feedback?.success || 'Correct!' });
            setCompletedSteps(prev => [...prev, currentStep.step_id]);
            
            if (currentStepIndex < steps.length - 1) {
                setTimeout(() => {
                    setCurrentStepIndex(prev => prev + 1);
                    setFeedback({ type: '', message: '' });
                }, 800);
            } else {
                onSubmit(String(problem.quotient || ''));
            }
        } else {
            setFeedback({ type: 'error', message: currentStep.feedback?.fail || 'Try again!' });
        }
    };

    const isDone = (id) => completedSteps.includes(id);
    const isTarget = (id) => currentStep?.step_id === id;

    /**
     * SmartCell renders one or more digit boxes for a single mathematical step result.
     * It ensures perfect alignment with the columns above.
     */
    const SmartCell = ({ stepId, colorClass, colOffset = 0 }) => {
        const step = steps.find(s => s.step_id === stepId);
        if (!step && !isTarget(stepId)) return null;
        
        const expected = String(step?.expected_answer || '');
        const length = expected.length;
        const done = isDone(stepId);
        const active = isTarget(stepId);

        return (
            <div className={styles.smartCellGroup} style={{ marginLeft: `${colOffset * 3.5}rem` }}>
                {expected.split('').map((digit, idx) => {
                    if (done) {
                        return (
                            <div key={idx} className={`${styles.digitCell} ${colorClass}`}>
                                {digit}
                            </div>
                        );
                    }
                    if (active) {
                        return (
                            <input
                                key={idx}
                                type="text"
                                className={`${styles.digitInput} ${colorClass}`}
                                value={(stepData[stepId] || {})[idx] || ''}
                                onChange={(e) => handleInputChange(stepId, idx, e.target.value)}
                                autoFocus={idx === 0}
                                placeholder="?"
                            />
                        );
                    }
                    return <div key={idx} className={styles.digitSpacer} />;
                })}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.ladderGrid}>
                {/* Row 1: Quotient Line */}
                <div className={styles.row}>
                    <div className={styles.divisorSpace} />
                    <div className={styles.bracketSpace} />
                    <SmartCell stepId="D1" colorClass={styles.orange} colOffset={0} />
                    <SmartCell stepId="D2" colorClass={styles.orange} colOffset={0} />
                </div>

                {/* Row 2: The House (Divisor | Dividend) */}
                <div className={styles.row}>
                    <div className={`${styles.digitCell} ${styles.purple}`}>{divisor}</div>
                    <div className={styles.houseBracket}>|</div>
                    {dividendStr.split('').map((digit, i) => (
                        <div key={i} className={`${styles.digitCell} ${styles.blue} ${styles.houseTop}`}>
                            {digit}
                        </div>
                    ))}
                </div>

                {/* Cycle 1: Multiply & Subtract */}
                {(isDone('M1') || isTarget('M1')) && (
                    <div className={styles.row}>
                        <div className={styles.signCell}>-</div>
                        <div className={styles.bracketSpace} />
                        <SmartCell stepId="M1" colorClass={styles.red} colOffset={0} />
                    </div>
                )}

                {(isDone('S1') || isTarget('S1') || isDone('B1') || isTarget('B1')) && (
                    <>
                        <div className={styles.row}><div className={styles.line} /></div>
                        <div className={styles.row}>
                            <div className={styles.divisorSpace} />
                            <div className={styles.bracketSpace} />
                            <SmartCell stepId="S1" colorClass={styles.yellow} colOffset={0} />
                            <SmartCell stepId="B1" colorClass={styles.green} colOffset={0} />
                            {isTarget('B1') && <div className={styles.arrow}>↓</div>}
                        </div>
                    </>
                )}

                {/* Cycle 2: Multiply & Subtract */}
                {(isDone('M2') || isTarget('M2')) && (
                    <div className={styles.row}>
                        <div className={styles.signCell}>-</div>
                        <div className={styles.bracketSpace} />
                        {/* M2 (e.g. 15) starts under the combined result */}
                        <SmartCell stepId="M2" colorClass={styles.red} colOffset={0} />
                    </div>
                )}

                {(isDone('S2') || isTarget('S2')) && (
                    <>
                        <div className={styles.row}><div className={styles.line} /></div>
                        <div className={styles.row}>
                            <div className={styles.divisorSpace} />
                            <div className={styles.bracketSpace} />
                            <SmartCell stepId="S2" colorClass={styles.yellow} colOffset={1} />
                        </div>
                    </>
                )}
            </div>

            <div className={styles.card}>
                <div className={styles.instruction}>{currentStep?.instruction}</div>
                <div className={styles.feedback}>{feedback.message}</div>
                <button className={styles.btn} onClick={checkStep}>
                    {currentStepIndex === steps.length - 1 ? 'Finish!' : 'Next Step'}
                </button>
            </div>
        </div>
    );
}
