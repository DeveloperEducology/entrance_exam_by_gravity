'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './GuidedStepRenderer.module.css';

export default function GuidedStepRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepData, setStepData] = useState({}); // Stores user input for each step
    const [stepCorrectness, setStepCorrectness] = useState({}); // Stores if step was checked and correct
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const steps = question.steps || [];
    const containerRef = useRef(null);

    // Scroll to bottom when new step is added
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [currentStepIndex]);

    const handleStepInputChange = (stepId, fieldId, value) => {
        setStepData(prev => ({
            ...prev,
            [stepId]: {
                ...(prev[stepId] || {}),
                [fieldId]: value
            }
        }));
        setErrorMessage('');
    };

    const handleStepSelection = (stepIndex, listKey, itemIdx, value) => {
        const step = steps[stepIndex];
        const stepId = step.step_number;
        const tokenId = `${listKey}_${itemIdx}`;
        const currentSelections = stepData[stepId]?.selections || [];
        
        let nextSelections;
        if (currentSelections.some(s => s.id === tokenId)) {
            nextSelections = currentSelections.filter(s => s.id !== tokenId);
        } else {
            nextSelections = [...currentSelections, { id: tokenId, value: Number(value) }];
        }

        setStepData(prev => ({
            ...prev,
            [stepId]: {
                ...(prev[stepId] || {}),
                selections: nextSelections
            }
        }));
        setErrorMessage('');
    };

    const checkStep = (index) => {
        const step = steps[index];
        const stepId = step.step_number;
        const data = stepData[stepId] || {};
        let stepIsCorrect = false;

        if (step.type === 'input_array') {
            const expected = step.expected_answer || [];
            const allMatch = expected.every((val, i) => {
                const userVal = String(data[`input_${i}`] || '').trim().toLowerCase();
                return userVal === String(val).trim().toLowerCase();
            });
            stepIsCorrect = allMatch;
        } else if (step.type === 'multi_select') {
            const selections = data.selections || [];
            const selectedValues = [...new Set(selections.map(s => s.value))];
            const expected = step.expected_answer || [];
            
            // Check if user found all unique common multiples
            const match = selectedValues.length === expected.length && 
                          selectedValues.every(v => expected.includes(v)) &&
                          expected.every(v => selectedValues.includes(v));
            stepIsCorrect = match;
        } else if (step.type === 'single_input') {
            stepIsCorrect = String(data.value || '').trim().toLowerCase() === String(step.expected_answer || '').trim().toLowerCase();
        }

        if (stepIsCorrect) {
            setStepCorrectness(prev => ({ ...prev, [stepId]: true }));
            setSuccessMessage(step.feedback?.success || 'Perfect!');
            setErrorMessage('');
            
            if (index < steps.length - 1) {
                setTimeout(() => {
                    setCurrentStepIndex(index + 1);
                    setSuccessMessage('');
                }, 1000);
            } else {
                onSubmit(data.value || data.selections || data);
            }
        } else {
            setErrorMessage(step.feedback?.fail || 'Not quite right. Try again!');
            setSuccessMessage('');
        }
    };

    const renderStepContent = (step, index) => {
        const stepId = step.step_number;
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex || stepCorrectness[stepId];
        const data = stepData[stepId] || {};

        return (
            <div 
                key={stepId} 
                className={`${styles.stepWrapper} ${isActive ? styles.stepWrapperActive : ''} ${isCompleted ? styles.stepWrapperCompleted : ''}`}
            >
                <div className={styles.stepHeader}>
                    <div className={styles.stepTitle}>Step {step.step_number}</div>
                    {isCompleted && <div className={styles.feedbackSuccess}>✓ Done</div>}
                </div>
                
                <div 
                    className={styles.stepPrompt} 
                    dangerouslySetInnerHTML={{ __html: step.instruction || step.prompt }} 
                />

                {step.type === 'input_array' && (
                    <div className={styles.inputGroup}>
                        {step.expected_answer.map((_, i) => (
                            <div key={i} className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    className={`${styles.multiplesInput} ${isCompleted ? styles.multiplesInputStatic : ''} ${stepCorrectness[stepId] ? styles.multiplesInputCorrect : ''}`}
                                    value={data[`input_${i}`] || ''}
                                    onChange={(e) => handleStepInputChange(stepId, `input_${i}`, e.target.value)}
                                    disabled={!isActive}
                                    placeholder={step.placeholder?.[i] || '?'}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {step.type === 'multi_select' && step.ui_layout === 'side_by_side_lists' && (
                    <div className={styles.visualComparison}>
                        {Object.entries(step.data_source).map(([listKey, listData]) => (
                            <div key={listKey} className={styles.comparisonRow}>
                                <div className={styles.rowLabel}>{listData.label}:</div>
                                <div className={styles.tokenList}>
                                    {listData.values.map((val, vIdx) => {
                                        const tokenId = `${listKey}_${vIdx}`;
                                        const isSel = data.selections?.some(s => s.id === tokenId);
                                        const isCommon = step.expected_answer.includes(val);
                                        return (
                                            <div
                                                key={tokenId}
                                                className={`${styles.token} ${isSel ? styles.tokenSelected : ''} ${isCompleted && isCommon ? styles.tokenCorrect : ''}`}
                                                onClick={() => isActive && handleStepSelection(index, listKey, vIdx, val)}
                                            >
                                                {val}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {step.type === 'single_input' && (
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            className={`${styles.lcmFinalInput} ${stepCorrectness[stepId] ? styles.multiplesInputCorrect : ''}`}
                            value={data.value || ''}
                            onChange={(e) => handleStepInputChange(stepId, 'value', e.target.value)}
                            disabled={!isActive}
                            placeholder="?"
                        />
                    </div>
                )}

                {isActive && (
                    <div className={styles.stepFooter}>
                        <button 
                            className={styles.checkButton}
                            onClick={() => checkStep(index)}
                        >
                            {index === steps.length - 1 ? 'Finish!' : 'Check Step'}
                        </button>
                    </div>
                )}

                {isActive && errorMessage && <div className={styles.feedbackError}>{errorMessage}</div>}
                {isActive && successMessage && <div className={styles.feedbackSuccess}>{successMessage}</div>}
            </div>
        );
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {steps.map((step, idx) => {
                if (idx > currentStepIndex) return null;
                return renderStepContent(step, idx);
            })}
        </div>
    );
}
