'use client';

import { useState, useMemo } from 'react';
import styles from './TokenSelectionRenderer.module.css';
import QuestionParts from './QuestionParts';

export default function TokenSelectionRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit, // Added
  isAnswered,
}) {
  // Parse existing answer or initialize
  const selectedIds = useMemo(() => {
    if (!userAnswer) return [];
    if (Array.isArray(userAnswer)) return userAnswer;
    try {
      return JSON.parse(userAnswer);
    } catch {
      return [];
    }
  }, [userAnswer]);

  const tokens = useMemo(() => {
    // If we have an adaptive structure, look in adaptiveConfig or parts
    if (Array.isArray(question.tokens) && question.tokens.length > 0) return question.tokens;
    
    if (Array.isArray(question.parts) && question.parts.length > 0) {
      const sentencePart = question.parts.find(p => p.type === 'token_sentence');
      if (sentencePart && Array.isArray(sentencePart.tokens)) {
        return sentencePart.tokens;
      }
      // Fallback: extract from parts if possible
      return question.parts.filter(p => p.type === 'token');
    }
    return [];
  }, [question]);

  const headerParts = useMemo(() => {
    if (!Array.isArray(question.parts)) return [];
    return question.parts.filter(p => p.type !== 'token_sentence' && p.type !== 'token');
  }, [question]);

  const handleToggle = (id) => {
    if (isAnswered) return;

    let newSelection;
    if (question.isMultiSelect) {
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
    <div className={styles.container}>
      {question.questionText && (
        <div className={styles.questionTextRow}>
          <span className={styles.questionText}>{question.questionText}</span>
        </div>
      )}

      {headerParts.length > 0 && (
        <div className={styles.questionTextRow}>
          <QuestionParts parts={headerParts} />
        </div>
      )}

      <div className={styles.tokenBox}>
        {tokens.map((token) => {
          const isSelected = selectedIds.includes(String(token.id));
          
          return (
            <span
              key={token.id}
              onClick={() => handleToggle(String(token.id))}
              className={`
                ${styles.token} 
                ${isSelected ? styles.selected : ''} 
                ${isAnswered ? styles.disabled : ''}
              `}
            >
              {token.text}
            </span>
          );
        })}
      </div>

      {question.showSubmitButton && selectedIds.length > 0 && !isAnswered && (
        <button 
          className={styles.submitButton} 
          onClick={() => onSubmit()} // FIX: don't pass the event
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
