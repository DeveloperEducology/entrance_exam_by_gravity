'use client';

import QuestionParts from './QuestionParts';
import styles from './MCQRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SafeImage from './SafeImage';
import SpeakerButton from './SpeakerButton';
import { isRawLatex } from './latexUtils';

/**
 * MCQRenderer - Optimized for the "Unique MCQ" Schema
 * Supports:
 * - layoutConfig (JSON-driven styles)
 * - hasAudio & audioText
 * - Multi-select
 * - Rich options (JSON objects vs Strings)
 */
export default function MCQRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    // 1. Dynamic Unique Style Mapping (CSS-in-JSON)
    const layout = question.layoutConfig || {};
    const dynamicStyle = {
        '--mcq-accent': layout.accentColor || layout.theme || '#22c55e',
        '--mcq-font-size': layout.fontSize || '1.1rem',
        '--mcq-gap': layout.gap || '1rem',
        '--mcq-columns': layout.columns || (question.isGrid ? 2 : 1),
    };

    const handleOptionClick = (index) => {
        if (isAnswered) return;

        if (question.isMultiSelect) {
            const currentAnswers = Array.isArray(userAnswer) ? userAnswer : [];
            const newAnswers = currentAnswers.includes(index)
                ? currentAnswers.filter(i => i !== index)
                : [...currentAnswers, index];
            onAnswer(newAnswers);
        } else {
            onAnswer(index);
        }
    };

    const isSelected = (index) => {
        if (question.isMultiSelect) {
            return Array.isArray(userAnswer) ? userAnswer.includes(index) : false;
        }
        return userAnswer === index;
    };

    return (
        <div className={styles.container} style={dynamicStyle}>
            <div className={styles.questionCard}>
                
                {/* 2. Top-Level Content Wrapper with Audio Support */}
                <div className={styles.questionHeader}>
                    <div className={styles.questionContent}>
                        <QuestionParts parts={question.parts} isVertical={question.isVertical} />
                    </div>
                    {question.hasAudio && (
                        <SpeakerButton 
                            text={question.audioText || question.parts?.[0]?.content || ''} 
                            className={styles.mainSpeaker} 
                        />
                    )}
                </div>

                {/* 3. Options Grid Wrapper */}
                <div className={`
                    ${styles.optionsGrid} 
                    ${question.isVertical ? styles.vertical : ''} 
                    ${question.isGrid || layout.columns > 1 ? styles.gridMode : ''}
                `}>
                    {question.options.map((option, index) => (
                        (() => {
                            // Standardize Option detection for Unique MC schema
                            const isComplexParts = Array.isArray(option) || (option && typeof option === 'object' && Array.isArray(option.parts));
                            const optionParts = Array.isArray(option) ? option : (option?.parts || []);
                            
                            // Check for content/label vs raw string
                            const rawContent = typeof option === 'string' ? option : (option?.content || option?.value || '');
                            const labelText = typeof option === 'string' ? option : (option?.label || option?.text || rawContent);
                            
                            const optionImageSrc = !isComplexParts ? getImageSrc(rawContent) : '';

                            return (
                                <div
                                    key={index}
                                    className={`${styles.option} ${isSelected(index) ? styles.selected : ''} ${isAnswered ? styles.disabled : ''}`}
                                    onClick={() => handleOptionClick(index)}
                                    role="button"
                                    tabIndex={isAnswered ? -1 : 0}
                                    aria-pressed={isSelected(index)}
                                >
                                    {question.isMultiSelect && (
                                        <div className={styles.checkbox}>
                                            {isSelected(index) && '✓'}
                                        </div>
                                    )}

                                    {/* Sub-Renderer logic for option content */}
                                    {isComplexParts ? (
                                        <div className={styles.optionParts}>
                                            <QuestionParts parts={optionParts} className={styles.partsInOption} />
                                        </div>
                                    ) : isInlineSvg(rawContent) ? (
                                        <div
                                            className={styles.optionMedia}
                                            dangerouslySetInnerHTML={{ __html: rawContent }}
                                        />
                                    ) : isImageUrl(optionImageSrc) ? (
                                        <SafeImage
                                            src={optionImageSrc}
                                            alt={labelText || `Option ${index + 1}`}
                                            className={styles.optionImage}
                                            width={220}
                                            height={140}
                                        />
                                    ) : (() => {
                                        const isRaw = isRawLatex(labelText);
                                        
                                        return (
                                            <div className={styles.optionParts}>
                                                <QuestionParts 
                                                    parts={[{ 
                                                        type: isRaw ? 'mathLatex' : 'text', 
                                                        content: labelText 
                                                    }]} 
                                                    className={styles.partsInOption} 
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()
                    ))}
                </div>

                {/* Submit Button Logic */}
                {question.showSubmitButton && userAnswer !== null && !isAnswered && (
                    <button className={styles.submitButton} onClick={() => onSubmit()}>
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}

