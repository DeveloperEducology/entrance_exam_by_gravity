'use client';

import { useMemo } from 'react';
import styles from './TokenSelectionRenderer.module.css';
import QuestionParts from './QuestionParts';
import { getImageSrc, hasInlineHtml, isImageUrl, isInlineSvg, sanitizeInlineHtml } from './contentUtils';
import SafeImage from './SafeImage';
import { isRawLatex } from './latexUtils';

function toCssSize(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return `${value}px`;
  return String(value);
}

function normalizeMode(value) {
  const mode = String(value ?? '').trim().toLowerCase();
  return mode === 'vertical' ? 'vertical' : 'para';
}

function normalizeOption(option, index) {
  const isArray = Array.isArray(option);
  const raw = !isArray && typeof option === 'object' && option !== null ? option : { text: String(option ?? '') };
  const content = raw.content ?? raw.text ?? raw.label ?? raw.value ?? '';
  const imageUrl = raw.imageUrl ?? raw.image_url ?? (looksLikeImage(content) ? content : null);
  
  return {
    ...raw,
    id: raw.id ?? String(index),
    answerId: String(index),
    text: String(content ?? ''),
    content: String(content ?? ''),
    imageUrl,
    parts: isArray ? option : (Array.isArray(raw.parts) ? raw.parts : null),
    fontSize: raw.fontSize ?? raw.font_size ?? null,
    layoutMode: raw.layoutMode ?? raw.renderMode ?? null,
  };
}

function looksLikeImage(value) {
  return (
    typeof value === 'string' &&
    (isImageUrl(value) || isInlineSvg(value) || hasInlineHtml(value))
  );
}

function renderTokenContent(token, index, optionFontSize) {
  if (token.parts && token.parts.length > 0) {
    return (
      <div className={styles.v2TokenParts}>
        <QuestionParts parts={token.parts} />
      </div>
    );
  }

  const raw = String(token.content ?? token.text ?? token.label ?? '');
  const imageSrc = token.imageUrl || getImageSrc(raw);

  if (imageSrc && isImageUrl(imageSrc)) {
    return (
      <div className={styles.v2TokenMediaWrap}>
        <SafeImage
          src={imageSrc}
          alt={String(token.label || token.text || `Option ${index + 1}`)}
          className={styles.v2TokenImage}
          width={240}
          height={160}
        />
        {token.label ? (
          <div className={styles.v2TokenCaption} style={optionFontSize ? { '--token-v2-option-font-size': optionFontSize } : undefined}>
            {token.label}
          </div>
        ) : null}
      </div>
    );
  }

  if (isInlineSvg(raw)) {
    return <div className={styles.v2TokenMedia} dangerouslySetInnerHTML={{ __html: raw }} />;
  }

  if (hasInlineHtml(raw)) {
    return <div className={styles.v2TokenMedia} dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(raw) }} />;
  }

  const isLatex = isRawLatex(raw);
  return (
    <div
      className={styles.v2TokenText}
      style={optionFontSize ? { '--token-v2-option-font-size': optionFontSize } : undefined}
    >
      {isLatex ? (
        <QuestionParts parts={[{ type: 'mathLatex', content: raw }]} />
      ) : (
        raw
      )}
    </div>
  );
}

export default function TokenSelectionRendererV2({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const config = question?.tokenSelectionV2Config
    || question?.tokenSelectionConfig
    || question?.layoutConfig
    || question?.ui_config?.tokenSelection
    || question?.adaptiveConfig?.tokenSelection
    || {};

  const layoutMode = normalizeMode(config.layoutMode ?? config.renderMode ?? question?.renderMode);
  const questionFontSize = toCssSize(config.questionFontSize ?? question?.questionFontSize ?? null);
  const optionFontSize = toCssSize(config.optionFontSize ?? config.fontSize ?? question?.optionFontSize ?? null);

  const selectedIds = useMemo(() => {
    if (!userAnswer) return [];
    if (Array.isArray(userAnswer)) return userAnswer.map((value) => String(value));
    try {
      const parsed = JSON.parse(userAnswer);
      return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [String(parsed)];
    } catch {
      return [];
    }
  }, [userAnswer]);

  const tokens = useMemo(() => {
    if (Array.isArray(question?.options) && question.options.length > 0) {
      return question.options.map(normalizeOption);
    }

    if (Array.isArray(question?.tokens) && question.tokens.length > 0) {
      return question.tokens.map(normalizeOption);
    }

    if (Array.isArray(question?.parts) && question.parts.length > 0) {
      const sentencePart = question.parts.find((part) => part.type === 'token_sentence');
      if (sentencePart && Array.isArray(sentencePart.tokens)) {
        return sentencePart.tokens.map(normalizeOption);
      }
      return question.parts.filter((part) => part.type === 'token').map(normalizeOption);
    }

    return [];
  }, [question]);

  const headerParts = useMemo(() => {
    if (!Array.isArray(question?.parts)) return [];
    return question.parts.filter((part) => part.type !== 'token_sentence' && part.type !== 'token');
  }, [question]);

  const handleToggle = (id) => {
    if (isAnswered) return;

    let newSelection;
    if (question?.isMultiSelect) {
      if (selectedIds.includes(id)) {
        newSelection = selectedIds.filter((sid) => sid !== id);
      } else {
        newSelection = [...selectedIds, id];
      }
    } else {
      newSelection = [id];
    }

    onAnswer(JSON.stringify(newSelection));
  };

  return (
    <div className={styles.v2Container}>
      {question?.questionText && (
        <div className={styles.v2QuestionTextRow}>
          <span className={styles.v2QuestionText} style={questionFontSize ? { '--token-v2-question-font-size': questionFontSize } : undefined}>
            {question.questionText}
          </span>
        </div>
      )}

      {headerParts.length > 0 && (
        <div className={styles.v2QuestionTextRow}>
          <QuestionParts parts={headerParts} />
        </div>
      )}

      <div
        className={[
          styles.v2Tokens,
          layoutMode === 'vertical' ? styles.v2TokensVertical : styles.v2TokensPara,
        ].join(' ')}
      >
        {tokens.map((token, index) => {
          const tokenId = String(token.answerId ?? token.id);
          const tokenKey = String(token.id ?? token.answerId ?? index);
          const isSelected = selectedIds.includes(tokenId);
          const tokenMode = normalizeMode(token.layoutMode ?? layoutMode);
          const tokenSize = toCssSize(token.fontSize ?? optionFontSize, null);

          if (layoutMode === 'para' && tokenMode !== 'vertical' && !token.imageUrl && !(token.parts && token.parts.length > 0)) {
            return (
              <span
                key={tokenKey}
                className={[
                  styles.v2InlineToken,
                  isSelected ? styles.v2InlineSelected : '',
                  isAnswered ? styles.v2Disabled : '',
                ].join(' ')}
                style={tokenSize ? { '--token-v2-option-font-size': tokenSize } : undefined}
                onClick={() => handleToggle(tokenId)}
                role="button"
                tabIndex={isAnswered ? -1 : 0}
                aria-pressed={isSelected}
              >
                {token.content || token.text}
              </span>
            );
          }

          return (
            <div
              key={tokenKey}
              className={[
                styles.v2Token,
                tokenMode === 'vertical' ? styles.v2TokenBlock : styles.v2TokenInline,
                token.imageUrl ? styles.v2TokenHasMedia : '',
                isSelected ? styles.v2Selected : '',
                isAnswered ? styles.v2Disabled : '',
              ].join(' ')}
              style={tokenSize ? { '--token-v2-option-font-size': tokenSize } : undefined}
              onClick={() => handleToggle(tokenId)}
              role="button"
              tabIndex={isAnswered ? -1 : 0}
              aria-pressed={isSelected}
            >
              {question?.isMultiSelect && (
                <div className={styles.checkbox}>
                  {isSelected && '✓'}
                </div>
              )}
              {renderTokenContent(token, index, tokenSize)}
            </div>
          );
        })}
      </div>

      {question?.showSubmitButton && selectedIds.length > 0 && !isAnswered && (
        <button
          className={styles.submitButton}
          onClick={() => onSubmit()}
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
