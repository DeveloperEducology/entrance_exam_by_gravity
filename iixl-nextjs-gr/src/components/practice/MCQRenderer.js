'use client';

import QuestionParts from './QuestionParts';
import styles from './MCQRenderer.module.css';
import { getImageSrc, isImageUrl, isInlineSvg } from './contentUtils';
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
        '--mcq-columns': layout.columns || (question.isGrid ? 4 : 1),
    };

    const promptParts = Array.isArray(question?.parts) ? question.parts : [];
    const promptTextPart = promptParts.find((part) => part?.type === 'text' && String(part?.content || '').trim());
    const promptText = String(question?.questionText || question?.title || promptTextPart?.content || '').trim();
    const bodyParts = promptText
        ? promptParts.filter((part) => part !== promptTextPart)
        : promptParts;

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

    const getOptionMeta = (option) => {
        const isComplexParts = Array.isArray(option) || (option && typeof option === 'object' && Array.isArray(option.parts));
        const optionParts = Array.isArray(option) ? option : (option?.parts || []);
        const rawContent = typeof option === 'string' ? option : (option?.content || option?.value || '');
        const labelText = typeof option === 'string' ? option : (option?.label || option?.text || rawContent);
        const optionImageSrc = !isComplexParts ? getImageSrc(rawContent) : '';
        const hasRichMediaPart = optionParts.some((part) => {
            const source = getImageSrc(part?.imageUrl || part?.image_url || part?.content || '');
            return part?.type === 'image' || isInlineSvg(part?.content) || isImageUrl(source);
        });
        const isMediaOption = Boolean(
            isInlineSvg(rawContent) ||
            isImageUrl(optionImageSrc) ||
            hasRichMediaPart
        );

        return {
            isComplexParts,
            optionParts,
            rawContent,
            labelText,
            optionImageSrc,
            isMediaOption,
        };
    };

    const optionMetas = Array.isArray(question.options)
        ? question.options.map((option) => getOptionMeta(option))
        : [];
    const hasMediaOptions = optionMetas.some((meta) => meta.isMediaOption);
    const shouldUseGrid = hasMediaOptions || question.isGrid === true;

    return (
        <div className={styles.container} style={dynamicStyle}>
            <div className={styles.questionCard}>
                <div className={styles.questionHeader}>
                    {promptText ? (
                        <div className={styles.promptRow}>
                            {(question.hasAudio || promptTextPart?.hasAudio) && (
                                <SpeakerButton
                                    text={question.audioText || promptText}
                                    className={styles.mainSpeaker}
                                />
                            )}
                            <div className={styles.promptText}>
                                <QuestionParts parts={[{ type: 'text', content: promptText }]} />
                            </div>
                        </div>
                    ) : null}
                    {bodyParts.length > 0 ? (
                        <div className={styles.questionContent}>
                            <QuestionParts parts={bodyParts} isVertical={question.isVertical} />
                        </div>
                    ) : null}
                </div>

                <div className={`
                    ${styles.optionsGrid} 
                    ${question.isVertical ? styles.vertical : ''}
                    ${shouldUseGrid ? styles.gridMode : styles.textMode}
                    ${hasMediaOptions ? styles.mediaMode : styles.choiceMode}
                `}>
                    {question.options.map((option, index) => (
                        (() => {
                            const {
                                isComplexParts,
                                optionParts,
                                rawContent,
                                labelText,
                                optionImageSrc,
                                isMediaOption,
                            } = optionMetas[index] || getOptionMeta(option);

                            return (
                                <div
                                    key={index}
                                    className={`
                                        ${styles.option}
                                        ${isMediaOption ? styles.mediaOption : styles.textOption}
                                        ${isSelected(index) ? styles.selected : ''}
                                        ${isAnswered ? styles.disabled : ''}
                                    `}
                                    onClick={() => handleOptionClick(index)}
                                    role="button"
                                    tabIndex={isAnswered ? -1 : 0}
                                    aria-pressed={isSelected(index)}
                                    onKeyDown={(event) => {
                                        if (isAnswered) return;
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleOptionClick(index);
                                        }
                                    }}
                                >
                                    {question.isMultiSelect && (
                                        <div className={`${styles.checkbox} ${isMediaOption ? styles.mediaCheckbox : styles.textCheckbox}`}>
                                            {isSelected(index) && '✓'}
                                        </div>
                                    )}

                                    {isComplexParts ? (
                                        <div className={`${styles.optionParts} ${isMediaOption ? styles.mediaOptionParts : ''}`}>
                                            <QuestionParts parts={optionParts} className={styles.partsInOption} />
                                        </div>
                                    ) : isInlineSvg(rawContent) ? (
                                        <div
                                            className={`${styles.optionMedia} ${isMediaOption ? styles.mediaOptionMedia : ''}`}
                                            dangerouslySetInnerHTML={{ __html: rawContent }}
                                        />
                                    ) : isImageUrl(optionImageSrc) ? (
                                        <div className={styles.mediaFrame}>
                                            <SafeImage
                                                src={optionImageSrc}
                                                alt={labelText || `Option ${index + 1}`}
                                                className={styles.optionImage}
                                                width={420}
                                                height={300}
                                                sizes="(max-width: 768px) 88vw, 420px"
                                            />
                                        </div>
                                    ) : (() => {
                                        const isRaw = isRawLatex(labelText);
                                        
                                        return (
                                            <div className={`${styles.optionParts} ${styles.textOptionParts}`}>
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
