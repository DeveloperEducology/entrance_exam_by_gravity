'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './JourneyRenderer.module.css';
import QuestionParts from './QuestionParts';
import MCQRenderer from './MCQRenderer';
import DragDropRenderer from './DragDropRenderer';
import DragDropRendererV2 from './DragDropRendererV2';
import FillInTheBlankRenderer from './FillInTheBlankRenderer';

const STEP_RENDERERS = {
    'mcq': MCQRenderer,
    'dragAndDrop': DragDropRenderer,
    'dragAndDropv2': DragDropRendererV2,
    'fillInTheBlank': FillInTheBlankRenderer,
    'fib': FillInTheBlankRenderer // alias
};

export default function JourneyRenderer({ question: journey, onAnswer, isAnswered, isCorrect: parentIsCorrect }) {
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [localSelection, setLocalSelection] = useState(null);
    
    const steps = journey?.steps || journey?.adaptiveConfig?.steps || [];
    const currentStep = steps[currentStepIdx];
    const accentColor = journey?.adaptiveConfig?.accent_color || '#4f46e5';

    if (!currentStep) return null;

    const isLastStep = currentStepIdx === steps.length - 1;

    const handleSubmitStep = () => {
        if (localSelection === null) return;

        let isStepCorrect = false;
        const qType = currentStep.question?.type?.toLowerCase();

        if (qType === 'mcq') {
            const correctIdx = currentStep.question?.correct_answer_index ?? currentStep.question?.correct_answer_indices?.[0];
            isStepCorrect = String(localSelection) === String(correctIdx);
        } else if (qType === 'fillintheblank' || qType === 'fib' || qType === 'textinput') {
            const expected = String(currentStep.question?.correct_answer_text || currentStep.question?.correctAnswerText || '').trim().toLowerCase();
            if (typeof localSelection === 'object' && localSelection !== null) {
                const firstVal = Object.values(localSelection)[0] || '';
                isStepCorrect = String(firstVal).trim().toLowerCase() === expected;
            } else {
                isStepCorrect = String(localSelection).trim().toLowerCase() === expected;
            }
        } else if (qType === 'draganddrop' || qType === 'draganddropv2') {
            isStepCorrect = true; 
        }

        if (isStepCorrect) {
            setShowSolution(false);
            setLocalSelection(null); // Reset for next step
            if (isLastStep) {
                setTimeout(() => setIsComplete(true), 1200);
            } else {
                setTimeout(() => setCurrentStepIdx(prev => prev + 1), 1200);
            }
        } else {
            setTimeout(() => setShowSolution(true), 600);
        }
        onAnswer?.(localSelection);
    };

    if (isComplete) {
         // (Receipt view remains same but I can polish it later if needed)
         return (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.receiptContainer}>
                <div className={styles.receiptCard}>
                    <div className={styles.receiptHeader}><h3>Adventure Complete! 🌟</h3></div>
                    <p className={styles.receiptSub}>You helped {journey?.adaptiveConfig?.character_name} perfectly!</p>
                    <button className={styles.doneButton} onClick={() => window.location.reload()}>Finish</button>
                </div>
            </motion.div>
         );
    }

    return (
        <div className={styles.journeyLayout} style={{ '--accent': accentColor }}>
            {/* Sidebar Map */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h4>Your Mission</h4>
                    <p>{journey.title}</p>
                </div>
                <div className={styles.verticalTimeline}>
                    {steps.map((step, idx) => (
                        <div key={step.id} className={`${styles.timelineNode} ${idx === currentStepIdx ? styles.activeNode : ''} ${idx < currentStepIdx ? styles.doneNode : ''}`}>
                            <div className={styles.nodeIconBox}>
                                {idx < currentStepIdx ? '✅' : step.icon}
                            </div>
                            <div className={styles.nodeLabel}>{step.label}</div>
                            {idx < steps.length - 1 && <div className={styles.nodeConnector} />}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Hero */}
            <main className={styles.mainHero}>
                <header className={styles.mobileHeader}>
                    <div className={styles.stepBadge}>Step {currentStepIdx + 1} of {steps.length}</div>
                    <h2>{currentStep.label}</h2>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep.id + (showSolution ? '_s' : '_q')}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className={styles.heroCardWrapper}
                    >
                        {!showSolution ? (
                            <div className={styles.heroCard}>
                                <div className={styles.rendererContainer}>
                                    {(() => {
                                        const Renderer = STEP_RENDERERS[currentStep.question?.type] || MCQRenderer;
                                        return <Renderer 
                                            question={currentStep.question} 
                                            onAnswer={setLocalSelection} 
                                            userAnswer={localSelection}
                                            isAnswered={isAnswered} 
                                        />;
                                    })()}
                                </div>
                                <div className={styles.stepFooter}>
                                    <button 
                                        className={styles.missionSubmitBtn} 
                                        disabled={localSelection === null}
                                        onClick={handleSubmitStep}
                                    >
                                        Submit Answer 🚀
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.solutionHeroCard}>
                                <div className={styles.solHeader}>💡 Let's Learn!</div>
                                <div className={styles.solBody}>
                                    <QuestionParts parts={currentStep.question.solution} />
                                </div>
                                <button className={styles.retryBtn} onClick={() => setShowSolution(false)}>Try Again 🚀</button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
