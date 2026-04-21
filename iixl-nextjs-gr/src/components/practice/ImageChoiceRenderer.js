'use client';

import QuestionParts from './QuestionParts';
import styles from './ImageChoiceRenderer.module.css';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SafeImage from './SafeImage';
import SpeakerButton from './SpeakerButton';

export default function ImageChoiceRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered
}) {
    const handleOptionClick = (index) => {
        if (isAnswered) return;

        if (question.isMultiSelect) {
            const currentAnswers = userAnswer || [];
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
            return (userAnswer || []).includes(index);
        }
        return userAnswer === index;
    };

    const promptParts = Array.isArray(question?.parts) ? question.parts : [];
    const promptText =
        String(question?.questionText || promptParts.find((part) => part?.type === 'text')?.content || '').trim();
    const remainingParts = promptParts.length > 0 ? promptParts.slice(1) : [];

    return (
        <div className={styles.container}>
            <div className={styles.questionCard}>
                <div className={styles.questionContent}>
                    <div className={styles.promptRow}>
                        {promptText ? <SpeakerButton text={promptText} className={styles.promptSpeaker} /> : null}
                        <div className={styles.promptText}>
                            <QuestionParts parts={[{ type: 'text', content: promptText }]} />
                        </div>
                    </div>
                    {remainingParts.length > 0 ? (
                        <div className={styles.promptMedia}>
                            <QuestionParts parts={remainingParts} />
                        </div>
                    ) : null}
                </div>

                <div className={styles.contentWrapper}>
                    <div className={`${styles.optionsGrid} ${question.isVertical ? styles.vertical : ''}`}>
                        {question.options.map((optionValue, index) => {
                            const actualOption = Array.isArray(optionValue) && optionValue.length > 0 
                                ? optionValue[0] 
                                : optionValue;
                            const src = getImageSrc(actualOption);
                            const optionText =
                                typeof actualOption === 'string'
                                    ? actualOption
                                    : actualOption?.label || actualOption?.text || '';
                            const inlineSvgMarkup = isInlineSvg(actualOption)
                                ? actualOption
                                : isInlineSvg(src)
                                    ? src
                                    : null;
                            return (
                            <button
                                key={index}
                                className={`${styles.option} ${isSelected(index) ? styles.selected : ''} ${isAnswered ? styles.disabled : ''}`}
                                onClick={() => handleOptionClick(index)}
                                disabled={isAnswered}
                            >
                                {question.isMultiSelect && (
                                    <div className={styles.checkbox}>
                                        {isSelected(index) && '✓'}
                                    </div>
                                )}
                                <div className={styles.imageWrapper}>
                                    {inlineSvgMarkup ? (
                                        <div
                                            className={styles.inlineSvg}
                                            dangerouslySetInnerHTML={{ __html: inlineSvgMarkup }}
                                        />
                                    ) : isImageUrl(src) ? (
                                        <SafeImage
                                            src={src}
                                            alt={`Option ${index + 1}`}
                                            className={styles.optionImage}
                                            width={420}
                                            height={300}
                                            sizes="(max-width: 768px) 88vw, 420px"
                                        />
                                    ) : !src ? (
                                        <span className={styles.optionFallback}>No image</span>
                                    ) : (
                                        hasInlineHtml(optionText) ? (
                                            <span
                                                className={styles.optionText}
                                                dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(optionText) }}
                                            />
                                        ) : (
                                            <span className={styles.optionText}>{optionText || 'No image'}</span>
                                        )
                                    )}
                                </div>
                            </button>
                            );
                        })}
                    </div>

                    {question.showSubmitButton && userAnswer !== null && !isAnswered && (
                        <button className={styles.submitButton} onClick={() => onSubmit()}>
                            Submit Answer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
